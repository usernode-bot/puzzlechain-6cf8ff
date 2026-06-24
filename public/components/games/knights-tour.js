/* ============================================================
   Game — Knight's Tour (8×8, visit every square exactly once)
   ============================================================ */
const KT_HISTORY_KEY = 'puzzlechain_knights_history';
const KT_HISTORY_MAX = 50;
const KT_MOVES = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function ktLoadHistory() {
  try { return JSON.parse(localStorage.getItem(KT_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function ktSaveEntry(entry) {
  const h = ktLoadHistory();
  h.unshift(entry);
  if (h.length > KT_HISTORY_MAX) h.length = KT_HISTORY_MAX;
  try { localStorage.setItem(KT_HISTORY_KEY, JSON.stringify(h)); } catch {}
}
function ktValidMoves(pos, visited) {
  if (pos === null) return [];
  const r = Math.floor(pos / 8), c = pos % 8;
  const out = [];
  for (const [dr, dc] of KT_MOVES) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const idx = nr * 8 + nc;
      if (!visited[idx]) out.push(idx);
    }
  }
  return out;
}
function ktFmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function ktFmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function KnightsTourGame({ onWin, onStepChange, resetKey }) {
  const [visited, setVisited]       = useState(() => new Array(64).fill(0));
  const [currentPos, setCurrentPos] = useState(null);
  const [moves, setMoves]           = useState(0);
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
    setVisited(new Array(64).fill(0));
    setCurrentPos(null);
    setMoves(0);
    setUndoStack([]);
    setDone(false);
    setElapsed(0);
    startTimeRef.current = null;
    setActiveTab('game');
  };

  useEffect(() => { resetGame(); }, [resetKey]);
  useEffect(() => () => stopTimer(), []);

  const validMvs  = ktValidMoves(currentPos, visited);
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

    if (m === 64) {
      stopTimer();
      const finalSecs = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : elapsed;
      const score = Math.max(100, Math.round(6400 - finalSecs * 8));
      const today = new Date().toISOString().slice(0, 10);
      const entryId = Date.now();
      ktSaveEntry({ id: entryId, timeSecs: finalSecs, score, date: today });
      setHistory(ktLoadHistory());
      setLastWinId(entryId);
      setVisited(v); setCurrentPos(idx); setMoves(m); setUndoStack(newUndoStack); setDone(true);
      onStepChange(m);
      onWin(score, 64, finalSecs);
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
              <div className="pvalue" style={stuck ? { color: C.rose } : {}}>{moves}/64</div>
            </div>
            <div className="pill">
              <div className="plabel">Left</div>
              <div className="pvalue">{64 - moves}</div>
            </div>
          </div>

          <div className="kt-board">
            {Array.from({ length: 64 }, (_, idx) => {
              const r = Math.floor(idx / 8), c = idx % 8;
              const isLight    = (r + c) % 2 === 0;
              const isCurrent  = idx === currentPos;
              const isVisited  = visited[idx] > 0;
              const isValid    = !done && !isCurrent && validMvs.includes(idx);
              const canPlace   = currentPos === null && !isVisited;

              let cls = 'kt-cell ' + (isLight ? 'kt-light' : 'kt-dark');
              if (isCurrent)      cls += ' kt-current';
              else if (isVisited) cls += ' kt-visited';
              else if (isValid)   cls += ' kt-valid';

              return (
                <div
                  key={idx}
                  className={cls}
                  style={(canPlace || isValid) ? { cursor: 'pointer' } : {}}
                  onClick={() => (canPlace || isValid) && handleCellClick(idx)}
                >
                  {isCurrent  ? <span className="kt-knight">♞</span>
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

      <div className="kt-bottom-nav">
        {['game', 'history'].map(tab => (
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
