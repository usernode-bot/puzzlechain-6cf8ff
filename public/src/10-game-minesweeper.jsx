/* ============================================================
   Game 4 — Minesweeper (8×8, 10 mines, classic game)
   ============================================================ */
const MS_ROWS = 8, MS_COLS = 8, MS_MINES = 10, MS_SAFE = MS_ROWS * MS_COLS - MS_MINES; // 54

const MS_HISTORY_KEY = 'puzzlechain_minesweeper_history';
const MS_HISTORY_MAX = 50;
// Looping background-music asset (served by express.static from public/audio).
const MS_MUSIC_URL = '/audio/minesweeper-bg.mp3';
// Tab ids stay stable (drive activeTab state + history reload); only the
// displayed label changed ("History" -> "My Best Runs").
const MS_TAB_LABELS = { game: 'Game', history: 'My Best Runs', leaderboard: 'Leaderboard', settings: 'Settings' };

function msLoadHistory() { return loadHistory(MS_HISTORY_KEY); }
function msSaveEntry(entry) { saveHistory(MS_HISTORY_KEY, entry, MS_HISTORY_MAX); }

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
  // The board follows the APP theme now (its own light/dark button is gone —
  // one control, in Settings). Base .ms-* rules are dark and
  // [data-ms-theme="light"] overrides them, so the resolved value maps directly.
  const { resolved: theme } = useTheme();
  const [activeTab, setActiveTab] = useState('game');
  const [mineSet, setMineSet] = useState(null);
  const [adjacency, setAdjacency] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [flagged, setFlagged] = useState(() => new Set());
  const [done, setDone] = useState(false);
  const [gameOverMine, setGameOverMine] = useState(null);
  const [steps, setSteps] = useState(0);
  const [isMock, setIsMock] = useState(false);
  const [walletAddr, setWalletAddr] = useState(null);
  const [gameHistory, setGameHistory] = useState(() => msLoadHistory());
  // Audio: `soundOn` mirrors the shared cgPrefs.sound master switch (controls
  // both SFX and music); `musicPaused` is the player's in-game music pause that
  // leaves SFX untouched.
  const [soundOn, setSoundOn] = useState(() => cgPrefs.sound);
  const [musicPaused, setMusicPaused] = useState(false);
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
    setMusicPaused(false);
  }, [resetKey]);

  // Background music: plays while a game is live (board generated on first
  // reveal), sound is enabled, and the player hasn't paused it. Starting only
  // after the first reveal means it's triggered by a user gesture, satisfying
  // browser autoplay policy. Any change to these conditions re-evaluates.
  useEffect(() => {
    const shouldPlay = mineSet !== null && !done && soundOn && !musicPaused;
    if (shouldPlay) startBackgroundMusic(MS_MUSIC_URL);
    else stopBackgroundMusic();
  }, [mineSet, done, soundOn, musicPaused]);

  // Always silence the track when leaving the game (unmount → back to lobby).
  useEffect(() => () => stopBackgroundMusic(), []);

  // Toggle the shared sound master switch (persists to localStorage via cgPrefs)
  // and mirror it into local state so the component re-renders.
  const toggleSound = () => {
    const next = !cgPrefs.sound;
    cgSetPref('sound', next);
    setSoundOn(next);
  };

  // Bridge: detect mock mode and fetch wallet address
  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
    if (window.usernode && typeof window.usernode.getNodeAddress === 'function') {
      window.usernode.getNodeAddress().then(addr => { if (addr) setWalletAddr(addr); }).catch(() => {});
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
      cgSound('lose'); cgHaptic([20, 40, 20]);
      const baseScore = 0;
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss', score: 0, steps: newSteps, secs, safeRevealed, cashOut: false, cashoutMultiplier: null,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Mine Finder Classic ${entry.date} — 💥 Game Over · ${safeRevealed}/54 safe · ${secs}s · +0 pts`;
      onLose(newSteps, secs, { share: shareText });
      return;
    }

    const newRevealed = floodReveal(idx, adj, mines, revealed, flagged);
    setRevealed(newRevealed);

    const newSafeRevealed = Array.from(newRevealed).filter(i => !mines.has(i)).length;
    if (newSafeRevealed >= MS_SAFE) {
      // Full board clear
      setDone(true);
      cgSound('win'); cgHaptic([15, 30, 15]);
      const baseScore = Math.max(newSafeRevealed * 30 - secs * 2, 100) + 200;
      const dateStr = new Date().toISOString().slice(0, 10);
      const entry = {
        id: String(Date.now()),
        date: dateStr,
        outcome: 'win', score: baseScore, steps: newSteps, secs, safeRevealed: newSafeRevealed, cashOut: false, cashoutMultiplier: 1.0,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Mine Finder Classic ${dateStr} — ✅ Full Clear · ${newSafeRevealed}/54 safe · ${secs}s · +${baseScore} pts`;
      submitClassicScore('minesweeper', baseScore, { safeRevealed: newSafeRevealed, timeSecs: secs });
      onWin(baseScore, newSteps, secs, { share: shareText, cashOut: false });
    }
  };

  const handleCashOut = () => {
    if (!cashOutActive || !mineSet) return;
    setDone(true);
    cgSound('win'); cgHaptic([15, 30, 15]);
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
    const shareText = `Mine Finder Classic ${dateStr} — 🔒×${cashoutMultiplier} · ${safeRevealed}/54 safe · ${secs}s · +${finalScore} pts`;
    submitClassicScore('minesweeper', finalScore, { safeRevealed, timeSecs: secs });
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

  /* #136 — chording. Tapping a revealed number used to do nothing at all.
     When its adjacent flag count equals the number, clear every unflagged
     neighbour; a wrong flag loses the game, exactly like tapping a mine.
     Ported from the daily Mine Finder, which already had both this and the
     flag-mode toggle below. */
  const handleChord = (idx) => {
    if (done || !mineSet || !adjacency) return false;
    if (!revealed.has(idx)) return false;
    const n = adjacency[idx];
    if (!(n > 0)) return false;
    const r = Math.floor(idx / MS_COLS), c = idx % MS_COLS;
    const neigh = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < MS_ROWS && cc >= 0 && cc < MS_COLS) neigh.push(rr * MS_COLS + cc);
    }
    const flags = neigh.filter(i => flagged.has(i));
    if (flags.length !== n) return false;
    const toOpen = neigh.filter(i => !flagged.has(i) && !revealed.has(i));
    if (!toOpen.length) return false;

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    // A misplaced flag means one of these is a mine — same loss path as a tap.
    const boom = toOpen.find(i => mineSet.has(i));
    if (boom != null) {
      setGameOverMine(boom);
      setDone(true);
      cgSound('lose'); cgHaptic([20, 40, 20]);
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss', score: 0, steps: newSteps, secs, safeRevealed, cashOut: false, cashoutMultiplier: null,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      onLose(newSteps, secs, {
        share: `Mine Finder Classic ${entry.date} — 💥 Game Over · ${safeRevealed}/54 safe · ${secs}s · +0 pts`,
      });
      return true;
    }

    let next = revealed;
    for (const i of toOpen) next = floodReveal(i, adjacency, mineSet, next, flagged);
    setRevealed(next);
    cgSound('move');

    const newSafe = Array.from(next).filter(i => !mineSet.has(i)).length;
    if (newSafe >= MS_SAFE) {
      setDone(true);
      cgSound('win'); cgHaptic([15, 30, 15]);
      const baseScore = Math.max(newSafe * 30 - secs * 2, 100) + 200;
      const dateStr = new Date().toISOString().slice(0, 10);
      const entry = {
        id: String(Date.now()), date: dateStr,
        outcome: 'win', score: baseScore, steps: newSteps, secs, safeRevealed: newSafe, cashOut: false, cashoutMultiplier: 1.0,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      submitClassicScore('minesweeper', baseScore, { safeRevealed: newSafe, timeSecs: secs });
      onWin(baseScore, newSteps, secs, {
        share: `Mine Finder Classic ${dateStr} — ✅ Full Clear · ${newSafe}/54 safe · ${secs}s · +${baseScore} pts`,
        cashOut: false,
      });
    }
    return true;
  };

  /* #136 — a real flag/dig toggle. Long-press was previously the ONLY way to
     flag, which is undiscoverable and awkward one-handed. Per-run state, not
     localStorage: it's a choice about this board, not a preference. */
  const [flagMode, setFlagMode] = useState(false);

  // One dispatcher: chord a revealed number, flag or dig a covered cell.
  const handleCellTap = (idx) => {
    if (done) return;
    if (revealed.has(idx)) { handleChord(idx); return; }
    if (flagMode) { handleFlag(idx); return; }
    handleReveal(idx);
  };

  // Long-press stays as the INVERSE of the current mode, so both gestures work.
  const onPointerDown = (idx) => {
    flagTimerRef.current = setTimeout(() => {
      flagTimerRef.current = null;
      if (revealed.has(idx)) return;
      if (flagMode) handleReveal(idx); else handleFlag(idx);
      cgHaptic(12);
    }, 500);
  };
  const onPointerUp = () => { if (flagTimerRef.current) { clearTimeout(flagTimerRef.current); flagTimerRef.current = null; } };

  const minesLeft = MS_MINES - flagged.size;

  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>

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

          {/* #136 — flag/dig toggle. Mirrors the daily Mine Finder's
              .mf-mode-btn pair so the two mine games read the same. */}
          <div className="mf-controls" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              className={'mf-mode-btn' + (flagMode ? '' : ' on')}
              onClick={() => setFlagMode(false)}
              aria-pressed={!flagMode}
            >
              ⛏️ Dig<span className="mf-mode-label">tap to reveal</span>
            </button>
            <button
              className={'mf-mode-btn flag' + (flagMode ? ' on' : '')}
              onClick={() => setFlagMode(true)}
              aria-pressed={flagMode}
            >
              🚩 Flag<span className="mf-mode-label">tap to mark</span>
            </button>
          </div>
          {/* #136 — chording was completely undiscoverable: tapping a revealed
              number simply did nothing, with no hint that it ever would. */}
          <div className="p6-hint" style={{ textAlign: 'center' }}>
            Long-press does the opposite of the current mode.
            Tap a number whose flags all match to clear around it.
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
                  onClick={() => handleCellTap(idx)}
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
                Lock In 🔒 ×{cashoutMultiplier}
              </button>
              {isMock && <div className="ms-dev-badge">Dev — simulated</div>}
            </div>
            <button
              className={'ms-music-btn' + (!soundOn ? ' off' : musicPaused ? ' paused' : '')}
              onClick={() => setMusicPaused(p => !p)}
              disabled={!soundOn}
              title={!soundOn ? 'Sound is off (Settings)' : musicPaused ? 'Resume music' : 'Pause music'}
              aria-label={!soundOn ? 'Sound off' : musicPaused ? 'Resume music' : 'Pause music'}
            >
              {!soundOn ? '🔇' : musicPaused ? '▶' : '⏸'}
            </button>
            <button className="ms-newgame-btn" onClick={() => {
              setMineSet(null); setAdjacency(null); setRevealed(new Set());
              setFlagged(new Set()); setDone(false); setGameOverMine(null); setSteps(0);
              setMusicPaused(false);
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
        <div style={{ padding: '0.25rem' }}>
          <ClassicLeaderboard gameId="minesweeper" />
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ padding: '0.5rem 0' }}>
          <div className="ms-settings-section">
            <h4>Audio</h4>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Sound &amp; music</span>
              <button className="ms-theme-toggle" onClick={toggleSound}>
                {soundOn ? '🔊 On' : '🔇 Off'}
              </button>
            </div>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Background music</span>
              <button
                className="ms-theme-toggle"
                onClick={() => setMusicPaused(p => !p)}
                disabled={!soundOn}
                style={!soundOn ? { opacity: 0.5, cursor: 'default' } : undefined}
              >
                {!soundOn ? '🔇 Off' : musicPaused ? '▶ Paused' : '⏸ Playing'}
              </button>
            </div>
          </div>
          <div className="ms-settings-section">
            <h4>Appearance</h4>
            <ThemeChoice />
          </div>
        </div>
      )}

      <div className="ms-bottom-nav">
        {['game', 'history', 'leaderboard', 'settings'].map(tab => (
          <button
            key={tab}
            className={'ms-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setGameHistory(msLoadHistory()); }}
          >
            {MS_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </div>
  );
}
