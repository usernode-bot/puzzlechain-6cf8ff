/* ============================================================
   Game — Knight's Tour (8×8, visit every square exactly once)
   ============================================================ */
const KT_HISTORY_KEY = 'puzzlechain_knights_history';
const KT_HISTORY_MAX = 50;
const KT_MOVES = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function ktLoadHistory() { return loadHistory(KT_HISTORY_KEY); }
function ktSaveEntry(entry) { saveHistory(KT_HISTORY_KEY, entry, KT_HISTORY_MAX); }
/* #176 — the board is a parameter now. Knight's Tour was the one game in the
   registry with NOTHING: no daily, no story, no arcade, no opponent, and the
   same fixed 8×8 board every single session, so it was not even random. The
   ladder is the obvious one — board size, then blocked squares — and it needs
   no corpus, because Warnsdorff's rule decides solvability at generation time.

   `blocked` is a Set of indices the knight may not enter; a tour must cover
   every UNBLOCKED square exactly once. */
function ktValidMoves(pos, visited, size = 8, blocked = null) {
  if (pos === null) return [];
  const r = Math.floor(pos / size), c = pos % size;
  const out = [];
  for (const [dr, dc] of KT_MOVES) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      const idx = nr * size + nc;
      if (!visited[idx] && !(blocked && blocked.has(idx))) out.push(idx);
    }
  }
  return out;
}

/* Warnsdorff's rule: always step to the square with the fewest onward moves.
   It finds a full tour on almost every solvable instance almost instantly,
   which is exactly the property that lets the generator VERIFY a board before
   handing it to a player — no corpus, no offline job, a millisecond at mount.
   Ties are broken deterministically so the check is reproducible per seed. */
function ktHasTour(size, start, blocked) {
  const total = size * size - (blocked ? blocked.size : 0);
  const visited = new Array(size * size).fill(0);
  if (blocked) for (const b of blocked) visited[b] = 1;
  let pos = start, n = 1;
  visited[pos] = 1;
  while (n < total) {
    const opts = ktValidMoves(pos, visited, size, blocked);
    if (!opts.length) return false;
    let best = opts[0], bestDeg = Infinity;
    for (const o of opts) {
      const deg = ktValidMoves(o, visited, size, blocked).length;
      if (deg < bestDeg || (deg === bestDeg && o < best)) { bestDeg = deg; best = o; }
    }
    pos = best; visited[pos] = 1; n += 1;
  }
  return true;
}

/* The ladder: 5×5 up to 8×8, then blocked squares on the largest board.
   Every rung is verified solvable from its start square before it ships. */
const KT_BANDS = [
  { size: 5, blocks: 0 },
  { size: 6, blocks: 0 },
  { size: 7, blocks: 0 },
  { size: 8, blocks: 0 },
  { size: 8, blocks: 2 },
  { size: 8, blocks: 4 },
];

function ktBuildBoard(rng, bandIdx) {
  const spec = KT_BANDS[Math.min(KT_BANDS.length - 1, Math.max(0, bandIdx))];
  const { size } = spec;
  for (let attempt = 0; attempt < 60; attempt++) {
    const blocked = new Set();
    while (blocked.size < spec.blocks) blocked.add(Math.floor(rng() * size * size));
    let start = Math.floor(rng() * size * size);
    if (blocked.has(start)) continue;
    if (ktHasTour(size, start, blocked)) return { size, start, blocked, total: size * size - blocked.size };
  }
  /* No verified board in 60 tries — fall back to a plain board of that size
     from a corner, which is the classic solvable case for every size here.
     Shipping an unverified board would be worse than shipping an easier one. */
  return { size, start: 0, blocked: new Set(), total: size * size };
}
function ktFmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function ktFmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function KnightsTourGame({ onWin, onStepChange, resetKey, playMode, band, offset }) {
  /* Board comes from the mode. Free play keeps the classic full 8×8 from a
     free choice of start, which is what this game has always been. */
  const boardRef = useRef(null);
  if (!boardRef.current) {
    if (playMode === 'story' || playMode === 'arcade' || playMode === 'daily') {
      const bandIdx = playMode === 'story' ? (band || 0)
        : playMode === 'arcade'
          ? [1, 3, 5][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))]
          : 3; // the daily is the classic 8×8, seeded start
      const { rng } = modeSeed(playMode, 'knights-tour', bandIdx, offset);
      boardRef.current = ktBuildBoard(rng, bandIdx);
    } else {
      boardRef.current = { size: 8, start: null, blocked: new Set(), total: 64 };
    }
  }
  const KB = boardRef.current;
  const KN = KB.size * KB.size;
  const [visited, setVisited]       = useState(() => {
    const v = new Array(KN).fill(0);
    if (KB.start !== null) v[KB.start] = 1;
    return v;
  });
  /* A seeded board fixes the START square, which is what makes the board a
     shared puzzle rather than a free exploration. Free play keeps its
     pick-your-own-square opening. */
  const [currentPos, setCurrentPos] = useState(KB.start);
  const [moves, setMoves]           = useState(KB.start !== null ? 1 : 0);
  const [undoStack, setUndoStack]   = useState([]);
  const [done, setDone]             = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [activeTab, setActiveTab]   = useState('game');
  const [history, setHistory]       = useState(() => ktLoadHistory());
  const [lastWinId, setLastWinId]   = useState(null);
  const startTimeRef = useRef(null);
  const timerRef     = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const resetGame = () => {
    stopTimer();
    setVisited(() => {
      const v = new Array(KN).fill(0);
      if (KB.start !== null) v[KB.start] = 1;
      return v;
    });
    setCurrentPos(KB.start);
    setMoves(KB.start !== null ? 1 : 0);
    setUndoStack([]);
    setDone(false);
    setElapsed(0);
    startTimeRef.current = null;
    setActiveTab('game');
  };

  useEffect(() => { resetGame(); }, [resetKey]);
  useEffect(() => () => stopTimer(), []);

  const validMvs  = ktValidMoves(currentPos, visited, KB.size, KB.blocked);
  const stuck     = currentPos !== null && !done && validMvs.length === 0;

  const handleCellClick = (idx) => {
    if (done) return;

    if (currentPos === null) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);
      }
      const v = visited.slice(); v[idx] = 1;
      setVisited(v); setCurrentPos(idx); setMoves(1); setUndoStack([]);
      onStepChange(1);
      return;
    }

    if (!validMvs.includes(idx)) return;

    const newUndoStack = [...undoStack, { visited: visited.slice(), currentPos, moves }];
    const v = visited.slice();
    const m = moves + 1;
    v[idx] = m;

    if (m === KB.total) {
      stopTimer();
      const finalSecs = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : elapsed;
      // Score scales with board area so a 5×5 tour cannot outscore an 8×8.
      const score = Math.max(100, Math.round(KB.total * 100 - finalSecs * 8));
      const today = new Date().toISOString().slice(0, 10);
      const entryId = Date.now();
      ktSaveEntry({ id: entryId, timeSecs: finalSecs, score, date: today });
      setHistory(ktLoadHistory());
      setLastWinId(entryId);
      setVisited(v); setCurrentPos(idx); setMoves(m); setUndoStack(newUndoStack); setDone(true);
      onStepChange(m);
      submitClassicScore('knights-tour', score, { timeSecs: finalSecs, moves: m });
      onWin(score, KB.total, finalSecs);
    } else {
      setVisited(v); setCurrentPos(idx); setMoves(m); setUndoStack(newUndoStack);
      onStepChange(m);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || done) return;
    const prev = undoStack[undoStack.length - 1];
    setVisited(prev.visited.slice());
    setCurrentPos(prev.currentPos);
    setMoves(prev.moves);
    setUndoStack(undoStack.slice(0, -1));
    onStepChange(prev.moves);
  };

  const sortedHistory = history.slice().sort((a, b) => a.timeSecs - b.timeSecs);
  const bestEntry = sortedHistory[0] || null;

  return (
    <div>
      {activeTab === 'game' && (
        <div className="kt-wrap">
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{ktFmtTime(elapsed)}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue" style={stuck ? { color: C.rose } : {}}>{moves}/{KB.total}</div>
            </div>
            <div className="pill">
              <div className="plabel">Left</div>
              <div className="pvalue">{KB.total - moves}</div>
            </div>
          </div>

          <div className="kt-board" style={{ '--kt-size': KB.size }}>
            {Array.from({ length: KN }, (_, idx) => {
              const r = Math.floor(idx / KB.size), c = idx % KB.size;
              const isLight    = (r + c) % 2 === 0;
              const isCurrent  = idx === currentPos;
              const isVisited  = visited[idx] > 0;
              const isValid    = !done && !isCurrent && validMvs.includes(idx);
              const canPlace   = currentPos === null && !isVisited;

              const isBlocked  = KB.blocked.has(idx);
              let cls = 'kt-cell ' + (isLight ? 'kt-light' : 'kt-dark');
              if (isBlocked)      cls += ' kt-blocked';
              else if (isCurrent) cls += ' kt-current';
              else if (isVisited) cls += ' kt-visited';
              else if (isValid)   cls += ' kt-valid';

              return (
                <div
                  key={idx}
                  className={cls}
                  style={(!isBlocked && (canPlace || isValid)) ? { cursor: 'pointer' } : {}}
                  onClick={() => !isBlocked && (canPlace || isValid) && handleCellClick(idx)}
                >
                  {isBlocked ? null
                   : isCurrent  ? <span className="kt-knight">♞</span>
                   : isVisited ? <span className="kt-num">{visited[idx]}</span>
                   : null}
                </div>
              );
            })}
          </div>

          {stuck && <div className="kt-stuck-banner">No valid moves — try Undo or restart.</div>}

          <div className="kt-actions">
            <button
              className="kt-undo-btn"
              disabled={undoStack.length === 0 || done}
              onClick={handleUndo}
            >
              ↩ Undo
            </button>
            {stuck && (
              <button className="kt-new-btn" onClick={resetGame}>New Game</button>
            )}
          </div>

          {currentPos === null && (
            <div className="kt-hint">Tap any square to place the knight and begin.</div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {sortedHistory.length === 0 ? (
            <div className="kt-empty">No completed tours yet.</div>
          ) : (
            <>
              {bestEntry && (
                <div className="kt-best">
                  Best: {ktFmtTime(bestEntry.timeSecs)} · {bestEntry.score} pts
                </div>
              )}
              <div className="kt-history-list">
                {sortedHistory.slice(0, KT_HISTORY_MAX).map((h, i) => (
                  <div key={h.id} className={'kt-history-row' + (h.id === lastWinId ? ' kt-row-new' : '')}>
                    <span className="kt-rank">#{i + 1}</span>
                    <span className="mono" style={{ flex: 1, fontWeight: 600 }}>{ktFmtTime(h.timeSecs)}</span>
                    <span style={{ color: C.gold, fontWeight: 600 }}>+{h.score}</span>
                    <span style={{ color: C.muted, fontSize: '0.75rem' }}>{ktFmtDate(h.date)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div style={{ padding: '0.25rem' }}>
          <ClassicLeaderboard gameId="knights-tour" valueFmt={(r) => `${r.bestScore} pts`} />
        </div>
      )}

      <div className="kt-bottom-nav">
        {['game', 'leaderboard', 'history'].map(tab => (
          <button
            key={tab}
            className={'kt-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab === 'history') setHistory(ktLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
