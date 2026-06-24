/* ============================================================
   Mancala helpers
   ============================================================ */
const MNC_HISTORY_KEY = 'puzzlechain_mancala_history';

// Stone rendering helpers
const MNC_STONE_COLORS = ['#C8A87A', '#A07845', '#D4B896', '#8B5E3C', '#BF9E5A'];

// Deterministic float in [0,1) from two integer seeds — sin hash (stable, well-distributed).
function mncRandVal(pitSeed, i) {
  const x = Math.sin(pitSeed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Stone diameter as a fraction of the pit/store element's smaller dimension.
function mncStoneSizeFactor(count, isStore) {
  if (isStore) {
    if (count <= 3)  return 0.20;
    if (count <= 6)  return 0.17;
    if (count <= 12) return 0.14;
    if (count <= 18) return 0.11;
    return 0.09;
  }
  if (count <= 4)  return 0.26;
  if (count <= 8)  return 0.21;
  if (count <= 16) return 0.17;
  return 0.13;
}

// Renders count pebble divs absolutely-positioned inside the pit/store container.
// pitSeed: pit array index (stable random layout per pit).
// entering: true → newest stone (index count-1) plays pop-in animation.
// capturing: true → whole stone layer plays scatter-out animation.
// isStore: adjusts stone sizing for the taller pill-shaped store.
function MncPitStones({ count, pitSeed, entering, capturing, isStore }) {
  const stones = [];
  const sf = mncStoneSizeFactor(count, isStore);
  // Max center offset as fraction of element size; sqrt ensures uniform-disk distribution.
  const maxR = (0.5 - sf / 2) * 0.82;

  for (let i = 0; i < count; i++) {
    const r     = Math.sqrt(mncRandVal(pitSeed, i * 3))        * maxR;
    const theta = mncRandVal(pitSeed, i * 3 + 1) * 2 * Math.PI;
    const sVar  = 0.85 + mncRandVal(pitSeed, i * 3 + 2) * 0.30; // ±15% size variance

    const cx   = 0.5 + r * Math.cos(theta);
    const cy   = 0.5 + r * Math.sin(theta);
    const sz   = sf * sVar * 100;
    const left = (cx - (sf * sVar) / 2) * 100;
    const top  = (cy - (sf * sVar) / 2) * 100;

    stones.push(
      React.createElement('div', {
        key: i,
        className: 'mnc-stone' + (entering && i === count - 1 ? ' mnc-stone-entering' : ''),
        style: {
          left:       `${left}%`,
          top:        `${top}%`,
          width:      `${sz}%`,
          height:     `${sz}%`,
          background: MNC_STONE_COLORS[i % MNC_STONE_COLORS.length],
        },
      })
    );
  }

  return React.createElement(
    'div',
    { className: 'mnc-pit-stones' + (capturing ? ' mnc-stones-capturing' : '') },
    ...stones
  );
}
const MNC_HISTORY_MAX = 50;
const MNC_SOUND_KEY = 'puzzlechain_mancala_sound';

function mncLoadHistory() {
  try { return JSON.parse(localStorage.getItem(MNC_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function mncSaveEntry(entry) {
  const h = mncLoadHistory();
  h.unshift(entry);
  if (h.length > MNC_HISTORY_MAX) h.length = MNC_HISTORY_MAX;
  try { localStorage.setItem(MNC_HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function mncInitBoard() {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

// Pit directly across the board from pit i. Formula: 12 - i works for both sides:
// P1 pit 0 ↔ P2 pit 12, P1 pit 5 ↔ P2 pit 7, etc.
function mncOpposite(i) { return 12 - i; }

// Shared AudioContext for stone-click sounds (lazy, satisfies browser autoplay policy).
let _mncAudioCtx = null;
function mncPlayClick() {
  try {
    if (!_mncAudioCtx) _mncAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _mncAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 360 + Math.floor(Math.random() * 120);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// Pure distribution function: picks up stones from pitIdx for player and sows them.
// Returns { sequence, pits, lastIdx, extraTurn, captureFrom, captureAmount }.
// sequence = ordered list of pit indices that received a stone (for animation).
function mncDistribute(pits, pitIdx, player) {
  const p = pits.slice();
  const stones = p[pitIdx];
  p[pitIdx] = 0;
  const skipStore = player === 1 ? 13 : 6; // never place in opponent's store
  const ownStore  = player === 1 ? 6  : 13;
  const ownMin    = player === 1 ? 0  : 7;
  const ownMax    = player === 1 ? 5  : 12;
  const sequence  = [];
  let cur = pitIdx;

  for (let i = 0; i < stones; i++) {
    do { cur = (cur + 1) % 14; } while (cur === skipStore);
    p[cur]++;
    sequence.push(cur);
  }

  const lastIdx  = sequence[sequence.length - 1];
  const extraTurn = lastIdx === ownStore;

  // Capture: last stone lands in player's own previously-empty pit and opposite has stones.
  let captureFrom = -1, captureAmount = 0;
  if (!extraTurn && lastIdx >= ownMin && lastIdx <= ownMax && p[lastIdx] === 1) {
    const opp = mncOpposite(lastIdx);
    if (p[opp] > 0) {
      captureAmount = p[opp] + 1; // opposite stones + landing stone
      captureFrom   = opp;
      p[ownStore] += captureAmount;
      p[lastIdx]   = 0;
      p[opp]       = 0;
    }
  }

  return { sequence, pits: p, lastIdx, extraTurn, captureFrom, captureAmount };
}

/* ============================================================
   Mancala — AI Engine (pure functions, no side effects)
   ============================================================ */
const MNC_AI_DIFF_KEY = 'puzzlechain_mancala_ai_difficulty';

function mncGetValidMoves(pits, player) {
  const min = player === 1 ? 0 : 7;
  const max = player === 1 ? 5 : 12;
  const moves = [];
  for (let i = min; i <= max; i++) if (pits[i] > 0) moves.push(i);
  return moves;
}

function mncEval(pits) { return pits[6] - pits[13]; }

// Minimax with alpha-beta pruning. player = whose turn it currently is.
function mncMinimax(pits, player, depth, alpha, beta) {
  const p1Empty = pits.slice(0, 6).every(v => v === 0);
  const p2Empty = pits.slice(7, 13).every(v => v === 0);
  if (p1Empty || p2Empty) {
    const p = pits.slice();
    for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    return mncEval(p);
  }
  if (depth === 0) return mncEval(pits);
  const moves = mncGetValidMoves(pits, player);
  if (moves.length === 0) return mncEval(pits);
  if (player === 1) {
    let best = -Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = mncDistribute(pits, idx, 1);
      const score = mncMinimax(np, extraTurn ? 1 : 2, depth - 1, alpha, beta);
      if (score > best) best = score;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = mncDistribute(pits, idx, 2);
      const score = mncMinimax(np, extraTurn ? 2 : 1, depth - 1, alpha, beta);
      if (score < best) best = score;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Return the best pit index for P2 at the given difficulty, or -1 if no moves.
function mncAIMove(pits, difficulty) {
  const moves = mncGetValidMoves(pits, 2);
  if (moves.length === 0) return -1;
  if (difficulty === 'easy') return shuffle(moves)[0];
  // Medium: greedy single-ply
  if (difficulty === 'medium') {
    let bestIdx = moves[0], bestScore = Infinity;
    for (const idx of moves) {
      const { pits: np } = mncDistribute(pits, idx, 2);
      const s = mncEval(np);
      if (s < bestScore) { bestScore = s; bestIdx = idx; }
    }
    return bestIdx;
  }
  // Hard: minimax depth 7 (AI's own move is at depth 0; 6 additional plies)
  let bestIdx = moves[0], bestScore = Infinity;
  for (const idx of moves) {
    const { pits: np, extraTurn } = mncDistribute(pits, idx, 2);
    const s = mncMinimax(np, extraTurn ? 2 : 1, 6, -Infinity, Infinity);
    if (s < bestScore) { bestScore = s; bestIdx = idx; }
  }
  return bestIdx;
}

/* ============================================================
   Mancala — Networking (polling hook for online multiplayer)
   ============================================================ */
const MNC_ONLINE_SESSION_KEY = 'puzzlechain_mancala_online_session';

function useMancalaRoom(roomId) {
  const [room, setRoom]                         = useState(null);
  const [pollingError, setPollingError]         = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const consecutiveErrors = useRef(0);
  const intervalRef       = useRef(null);

  const fetchRoom = async () => {
    if (!roomId) return;
    try {
      const { ok, status, body } = await api('/api/mancala/rooms/' + roomId);
      if (ok && body) {
        setRoom(body);
        setPollingError(null);
        consecutiveErrors.current = 0;
        setOpponentDisconnected(false);
      } else if (status === 404) {
        setPollingError('room_not_found');
        consecutiveErrors.current++;
      } else {
        consecutiveErrors.current++;
        if (consecutiveErrors.current >= 3) {
          setOpponentDisconnected(true);
          setPollingError('connection_error');
        }
      }
    } catch {
      consecutiveErrors.current++;
      if (consecutiveErrors.current >= 3) {
        setOpponentDisconnected(true);
        setPollingError('connection_error');
      }
    }
  };

  useEffect(() => {
    if (!roomId) { setRoom(null); setPollingError(null); return; }
    consecutiveErrors.current = 0;
    fetchRoom();
    intervalRef.current = setInterval(() => {
      setRoom(r => {
        if (r && r.status === 'finished') {
          clearInterval(intervalRef.current);
          return r;
        }
        return r;
      });
      fetchRoom();
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [roomId]);

  const submitMove = async (pitIdx) => {
    if (!room || room.status !== 'active') return;
    const player = pitIdx <= 5 ? 1 : 2;
    const moveSeq = room.moveSeq + 1;
    // Optimistic update
    try {
      const { pits: afterPits, extraTurn } = mncDistribute(room.pits, pitIdx, player);
      const p1Empty = afterPits.slice(0, 6).every(v => v === 0);
      const p2Empty = afterPits.slice(7, 13).every(v => v === 0);
      let finalPits = afterPits.slice();
      let gameOver = false, winner = null;
      if (p1Empty || p2Empty) {
        for (let i = 0; i < 6;  i++) { finalPits[6]  += finalPits[i]; finalPits[i] = 0; }
        for (let i = 7; i < 13; i++) { finalPits[13] += finalPits[i]; finalPits[i] = 0; }
        winner = finalPits[6] > finalPits[13] ? '1' : finalPits[13] > finalPits[6] ? '2' : 'draw';
        gameOver = true;
      }
      const nextPlayer = gameOver ? null : (extraTurn ? player : (player === 1 ? 2 : 1));
      setRoom(r => ({ ...r, pits: finalPits, currentPlayer: nextPlayer, status: gameOver ? 'finished' : 'active', winner, moveSeq }));
    } catch {}
    // Confirm with server
    try {
      const { ok, body } = await api('/api/mancala/rooms/' + roomId + '/move', {
        method: 'POST',
        body: JSON.stringify({ pitIdx, moveSeq }),
      });
      if (ok && body) { setRoom(body); }
      else { fetchRoom(); }
    } catch { fetchRoom(); }
  };

  return { room, pollingError, opponentDisconnected, submitMove };
}

/* ============================================================
   Game 5 — Mancala (Kalah variant, pass-and-play)
   ============================================================ */
function MancalaLocalGame({ onWin, onStepChange, resetKey }) {
  const [pits, setPits]           = useState(mncInitBoard);
  const [player, setPlayer]       = useState(1);
  const [done, setDone]           = useState(false);
  const [winner, setWinner]       = useState(null);
  const [moves, setMoves]         = useState(0);
  const [flashPits, setFlashPits] = useState(() => new Set());
  const [captureFlash, setCaptureFlash] = useState(() => new Set());
  const [bannerMsg, setBannerMsg] = useState('');
  const [moveStack, setMoveStack] = useState([]);
  const [activeTab, setActiveTab] = useState('game');
  const [history, setHistory]     = useState(() => mncLoadHistory());
  const [isMock, setIsMock]       = useState(false);
  const [soundOn, setSoundOn]     = useState(() => localStorage.getItem(MNC_SOUND_KEY) !== '0');

  const animatingRef  = useRef(false);
  const soundOnRef    = useRef(soundOn);
  const winTimerRef   = useRef(null);
  soundOnRef.current  = soundOn;

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  const resetGame = () => {
    // Cancel any in-flight win callback and animation
    animatingRef.current = false;
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
    setPits(mncInitBoard());
    setPlayer(1);
    setDone(false);
    setWinner(null);
    setMoves(0);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
    setMoveStack([]);
  };

  // Reset when parent increments resetKey (Play Again)
  useEffect(() => { resetGame(); }, [resetKey]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    try { localStorage.setItem(MNC_SOUND_KEY, next ? '1' : '0'); } catch {}
  };

  const handleUndo = () => {
    if (moveStack.length === 0 || done || animatingRef.current) return;
    const prev = moveStack[moveStack.length - 1];
    setMoveStack(ms => ms.slice(0, -1));
    setPits(prev.pits.slice());
    setPlayer(prev.player);
    setMoves(prev.moves);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
  };

  const finishMove = (newPits, currentPlayer, extraTurn, captureFrom, newMoves) => {
    const p = newPits.slice();

    // Sweep any remaining stones when one side is emptied
    const p1Empty = p.slice(0, 6).every(v => v === 0);
    const p2Empty = p.slice(7, 13).every(v => v === 0);
    const isGameOver = p1Empty || p2Empty;

    if (isGameOver) {
      for (let i = 0; i < 6; i++) { p[6] += p[i]; p[i] = 0; }
      for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    }

    setPits(p);
    setMoves(newMoves);
    onStepChange(newMoves);

    if (isGameOver) {
      const w = p[6] > p[13] ? 1 : p[13] > p[6] ? 2 : 'draw';
      setWinner(w);
      setDone(true);
      const wLabel = w === 1 ? 'Player 1 wins! 🎉' : w === 2 ? 'Player 2 wins! 🎉' : "It's a draw! 🤝";
      setBannerMsg(wLabel);

      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        winner: w,
        p1Score: p[6],
        p2Score: p[13],
        moves: newMoves,
        secs: secsRef.current,
      };
      mncSaveEntry(entry);
      setHistory(mncLoadHistory());

      winTimerRef.current = setTimeout(() => {
        winTimerRef.current = null;
        setBannerMsg('');
        const score = Math.max(Math.abs(p[6] - p[13]) * 15 - secsRef.current, 50);
        const share = `Mancala ${entry.date} — 🫘 P1 ${p[6]} · P2 ${p[13]} · ${newMoves} moves · ${secsRef.current}s`;
        onWin(score, newMoves, secsRef.current, { winner: w, share, winnerLabel: wLabel });
      }, 1500);

    } else if (extraTurn) {
      setBannerMsg('Extra turn! 🔄');
      setTimeout(() => setBannerMsg(msg => msg === 'Extra turn! 🔄' ? '' : msg), 1200);
    } else {
      setPlayer(currentPlayer === 1 ? 2 : 1);
      setBannerMsg('');
    }
  };

  const handlePitClick = (idx) => {
    if (animatingRef.current || done) return;
    const ownMin = player === 1 ? 0 : 7;
    const ownMax = player === 1 ? 5 : 12;
    if (idx < ownMin || idx > ownMax || pits[idx] === 0) return;

    // Snapshot for undo
    setMoveStack(ms => [...ms, { pits: pits.slice(), player, moves }]);

    const { sequence, pits: newPits, extraTurn, captureFrom } = mncDistribute(pits, idx, player);
    const newMoves = moves + 1;

    animatingRef.current = true;
    const working = pits.slice();
    working[idx] = 0;
    setPits(working.slice());
    setFlashPits(new Set());

    let step = 0;
    const animate = () => {
      if (!animatingRef.current) { setFlashPits(new Set()); return; }
      if (step >= sequence.length) {
        // All stones placed — show capture flash if any, then finish
        setFlashPits(new Set());
        if (captureFrom >= 0) {
          setCaptureFlash(new Set([captureFrom]));
          setTimeout(() => {
            if (!animatingRef.current) return;
            setCaptureFlash(new Set());
            animatingRef.current = false;
            finishMove(newPits, player, extraTurn, captureFrom, newMoves);
          }, 350);
        } else {
          animatingRef.current = false;
          finishMove(newPits, player, extraTurn, captureFrom, newMoves);
        }
        return;
      }
      const pitIdx = sequence[step];
      working[pitIdx]++;
      setPits(working.slice());
      setFlashPits(new Set([pitIdx]));
      if (soundOnRef.current) mncPlayClick();
      step++;
      setTimeout(animate, 80);
    };
    setTimeout(animate, 0);
  };

  // Board display order: P2 pits shown right-to-left (pit 12 at left, pit 7 at right)
  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];

  const pitClass = (idx) => {
    const ownMin = player === 1 ? 0 : 7;
    const ownMax = player === 1 ? 5 : 12;
    const isOwn = idx >= ownMin && idx <= ownMax;
    const canClick = !done && !animatingRef.current && isOwn && pits[idx] > 0;
    const cls = ['mnc-pit'];
    if (canClick) cls.push('mnc-clickable');
    else cls.push('mnc-dim');
    if (flashPits.has(idx)) cls.push('mnc-flash');
    if (captureFlash.has(idx)) cls.push('mnc-capture-flash');
    return cls.join(' ');
  };

  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = player === 1 ? p1Color : p2Color;

  // Aggregate stats
  const stats = history.reduce((acc, h) => {
    acc.total++;
    if (h.winner === 1) acc.p1++;
    else if (h.winner === 2) acc.p2++;
    else acc.draws++;
    if (h.moves > acc.longest) acc.longest = h.moves;
    return acc;
  }, { total: 0, p1: 0, p2: 0, draws: 0, longest: 0 });

  const fmtDate = (d) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y.slice(2)}`;
  };

  return (
    <div>
      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmt}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue">{moves}</div>
            </div>
            <div className="pill">
              <div className="plabel">Turn</div>
              <div className="pvalue" style={{ color: done ? C.muted : activeColor, fontSize: '0.9rem' }}>
                {done ? (winner === 'draw' ? 'Draw' : `P${winner}`) : `P${player}`}
              </div>
            </div>
          </div>

          {/* Active-player indicator */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: done ? C.muted : activeColor,
            background: (done ? C.dim : activeColor) + '22',
            border: `1px solid ${(done ? C.dim : activeColor)}44`,
            borderRadius: '999px',
            padding: '0.32rem 0.8rem',
            maxWidth: 480,
            margin: '0 auto 0.65rem',
            display: 'block',
          }}>
            {done
              ? (winner === 'draw' ? "Game over — It's a draw! 🤝" : `Game over — Player ${winner} wins! 🎉`)
              : `Player ${player}'s turn`}
          </div>

          {/* Board */}
          <div className="mnc-board">
            {/* P2 Store — col 1, spans both rows */}
            <div className="mnc-store" style={{
              gridColumn: 1, gridRow: '1 / 3',
              borderColor: !done && player === 2 ? p2Color + '99' : '#3A1206',
            }}>
              <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={flashPits.has(13)} capturing={false} />
              <div className="mnc-store-label">P2</div>
              <div className="mnc-store-score" style={{ color: !done && player === 2 ? p2Color : '#C8A87A' }}>
                {pits[13]}
              </div>
              <div className="mnc-store-label">store</div>
            </div>

            {/* P2 pits — row 1, cols 2–7 */}
            {p2Display.map((idx, i) => (
              <div
                key={idx}
                className={pitClass(idx)}
                style={{ gridRow: 1, gridColumn: i + 2 }}
                onClick={() => handlePitClick(idx)}
                aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}
              >
                <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
              </div>
            ))}

            {/* P1 Store — col 8, spans both rows */}
            <div className="mnc-store" style={{
              gridColumn: 8, gridRow: '1 / 3',
              borderColor: !done && player === 1 ? p1Color + '99' : '#3A1206',
            }}>
              <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={flashPits.has(6)} capturing={false} />
              <div className="mnc-store-label">P1</div>
              <div className="mnc-store-score" style={{ color: !done && player === 1 ? p1Color : '#C8A87A' }}>
                {pits[6]}
              </div>
              <div className="mnc-store-label">store</div>
            </div>

            {/* P1 pits — row 2, cols 2–7 */}
            {p1Display.map((idx, i) => (
              <div
                key={idx}
                className={pitClass(idx)}
                style={{ gridRow: 2, gridColumn: i + 2 }}
                onClick={() => handlePitClick(idx)}
                aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}
              >
                <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
              </div>
            ))}
          </div>

          {bannerMsg && <div className="mnc-banner">{bannerMsg}</div>}

          <div className="mnc-controls">
            <button onClick={resetGame}>↺ New Game</button>
            <button onClick={resetGame}>⟳ Restart</button>
            {isMock && (
              <button onClick={handleUndo} disabled={moveStack.length === 0 || done}>
                ↩ Undo
              </button>
            )}
            <button onClick={toggleSound} title={soundOn ? 'Sound on' : 'Sound off'}>
              {soundOn ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="mnc-history-list">
            {history.length === 0
              ? <div className="mnc-empty-state">No games recorded yet</div>
              : history.map(h => (
                <div key={h.id} className="mnc-history-row">
                  <span className={`mnc-outcome-chip ${h.winner === 1 ? 'p1win' : h.winner === 2 ? 'p2win' : 'draw'}`}>
                    {h.winner === 1 ? 'P1 Win' : h.winner === 2 ? 'P2 Win' : 'Draw'}
                  </span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>{h.p1Score}–{h.p2Score}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.moves} moves</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          {history.length === 0
            ? <div className="mnc-empty-state">No games recorded yet</div>
            : (
              <div className="mnc-stats-grid">
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val">{stats.total}</div>
                  <div className="mnc-stat-lbl">Games Played</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: p1Color }}>{stats.p1}</div>
                  <div className="mnc-stat-lbl">P1 Wins</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: p2Color }}>{stats.p2}</div>
                  <div className="mnc-stat-lbl">P2 Wins</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: C.muted }}>{stats.draws}</div>
                  <div className="mnc-stat-lbl">Draws</div>
                </div>
                <div className="mnc-stat-card" style={{ gridColumn: '1 / 3' }}>
                  <div className="mnc-stat-val">{stats.longest || '—'}</div>
                  <div className="mnc-stat-lbl">Longest Game (moves)</div>
                </div>
              </div>
            )}
        </div>
      )}

      <div className="mnc-bottom-nav">
        {['game', 'history', 'stats'].map(tab => (
          <button
            key={tab}
            className={'mnc-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setHistory(mncLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Mancala ZK helpers (commit-reveal proof, browser-side)
   ============================================================ */
async function mncStartSession(difficulty) {
  try {
    const nonceBytes = new Uint8Array(16);
    window.crypto.getRandomValues(nonceBytes);
    const nonceHex = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const initBoard = [4,4,4,4,4,4,0,4,4,4,4,4,4,0];
    const msgBuf = new TextEncoder().encode(nonceHex + '||' + JSON.stringify(initBoard));
    const hashBuf = await window.crypto.subtle.digest('SHA-256', msgBuf);
    const commitment = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const { ok, body } = await api('/api/mancala/score/start', {
      method: 'POST',
      body: JSON.stringify({ commitment, difficulty }),
    });
    if (ok && body && body.sessionId) {
      return { sessionId: body.sessionId, nonce: nonceHex };
    }
    return null;
  } catch { return null; }
}

async function mncVerifySession(sessionId, nonce, moveLog, finalPits, timeSecs) {
  try {
    const { ok, body } = await api('/api/mancala/score/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, nonce, moveLog, finalPits, timeSecs }),
    });
    if (ok && body) return body;
    return { verified: false, reason: 'network_error' };
  } catch { return { verified: false, reason: 'network_error' }; }
}

/* ============================================================
   Mancala Leaderboard component (used inside AI game tab)
   ============================================================ */
function MncLeaderboard() {
  const [diff, setDiff]       = useState('hard');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api('/api/mancala/leaderboard?difficulty=' + diff)
      .then(({ ok, body }) => {
        if (ok && body) setData(body);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [diff]);

  const fmtSecs = s => {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const tabs = ['easy', 'medium', 'hard'];
  const meInTop = data && data.me && data.top && data.top.some(r => r.rank === data.me.rank);

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {tabs.map(t => (
          <button
            key={t}
            className={'mnc-difficulty-pill' + (diff === t ? ' active' : '')}
            onClick={() => setDiff(t)}
            style={{ textTransform: 'capitalize' }}
          >{t}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign: 'center', color: C.muted, padding: '1rem', fontSize: '0.85rem' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', color: C.rose, padding: '1rem', fontSize: '0.85rem' }}>Could not load leaderboard.</div>}
      {!loading && !error && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem', fontSize: '0.75rem', color: C.muted, padding: '0 0.25rem 0.3rem', borderBottom: `1px solid ${C.border}` }}>
            <span>#</span><span>Player</span><span>Score</span><span>Time</span>
          </div>
          {data.top.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, padding: '1.25rem', fontSize: '0.85rem' }}>No scores yet — be the first!</div>
          )}
          {data.top.map((row, i) => {
            const isMe = data.me && row.rank === data.me.rank;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem',
                padding: '0.4rem 0.25rem', fontSize: '0.82rem',
                borderBottom: `1px solid ${C.border}22`,
                background: isMe ? C.accent + '18' : 'transparent',
                borderRadius: isMe ? '6px' : '0',
              }}>
                <span style={{ color: row.rank <= 3 ? C.gold : C.muted, fontWeight: row.rank <= 3 ? 700 : 400 }}>{row.rank}</span>
                <span style={{ color: isMe ? C.accent : C.text, fontWeight: isMe ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.username || '—'}</span>
                <span style={{ color: C.gold, fontFamily: 'monospace' }}>{row.bestScore}</span>
                <span style={{ color: C.muted }}>{fmtSecs(row.bestTimeSecs)}</span>
              </div>
            );
          })}
          {data.me && !meInTop && (
            <div>
              <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.7rem', padding: '0.2rem 0' }}>…</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem',
                padding: '0.4rem 0.25rem', fontSize: '0.82rem',
                background: C.accent + '18', borderRadius: '6px',
              }}>
                <span style={{ color: C.accent, fontWeight: 600 }}>{data.me.rank}</span>
                <span style={{ color: C.accent, fontWeight: 600 }}>{data.me.username || 'You'}</span>
                <span style={{ color: C.gold, fontFamily: 'monospace' }}>{data.me.bestScore}</span>
                <span style={{ color: C.muted }}>{fmtSecs(data.me.bestTimeSecs)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Game 5b — Mancala AI variant (human P1 vs AI P2)
   ============================================================ */
function MancalaAIGame({ onWin, onStepChange, resetKey, difficulty }) {
  const [pits, setPits]                 = useState(mncInitBoard);
  const [player, setPlayer]             = useState(1);
  const [done, setDone]                 = useState(false);
  const [winner, setWinner]             = useState(null);
  const [moves, setMoves]               = useState(0);
  const [flashPits, setFlashPits]       = useState(() => new Set());
  const [captureFlash, setCaptureFlash] = useState(() => new Set());
  const [bannerMsg, setBannerMsg]       = useState('');
  const [aiThinking, setAiThinking]     = useState(false);
  const [history, setHistory]           = useState(() => mncLoadHistory());
  const [soundOn, setSoundOn]           = useState(() => localStorage.getItem(MNC_SOUND_KEY) !== '0');
  const [activeTab, setActiveTab]       = useState('game');
  // ZK session state
  const [verifying, setVerifying]       = useState(false);
  const [verified, setVerified]         = useState(null); // null | true | false

  const animatingRef  = useRef(false);
  const soundOnRef    = useRef(soundOn);
  const winTimerRef   = useRef(null);
  const applyMoveRef  = useRef(null);
  const pitsRef       = useRef(pits);
  const movesRef      = useRef(moves);
  // ZK proof refs
  const sessionIdRef  = useRef(null);
  const nonceRef      = useRef(null);
  const moveLogRef    = useRef([]);
  soundOnRef.current  = soundOn;
  pitsRef.current     = pits;
  movesRef.current    = moves;

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;

  const startSession = async () => {
    sessionIdRef.current = null;
    nonceRef.current = null;
    moveLogRef.current = [];
    const result = await mncStartSession(difficulty);
    if (result) {
      sessionIdRef.current = result.sessionId;
      nonceRef.current = result.nonce;
    }
  };

  useEffect(() => { resetGame(); }, [resetKey]);

  const resetGame = () => {
    animatingRef.current = false;
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
    setPits(mncInitBoard());
    setPlayer(1);
    setDone(false);
    setWinner(null);
    setMoves(0);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
    setAiThinking(false);
    setVerifying(false);
    setVerified(null);
    startSession();
  };

  useEffect(() => { startSession(); }, []);

  const finishMove = (newPits, currentPlayer, extraTurn, captureFrom, newMoves) => {
    const p = newPits.slice();
    const p1Empty = p.slice(0, 6).every(v => v === 0);
    const p2Empty = p.slice(7, 13).every(v => v === 0);
    const isGameOver = p1Empty || p2Empty;
    if (isGameOver) {
      for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i]  = 0; }
      for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i]  = 0; }
    }
    setPits(p);
    setMoves(newMoves);
    onStepChange(newMoves);
    if (isGameOver) {
      const w = p[6] > p[13] ? 1 : p[13] > p[6] ? 2 : 'draw';
      setWinner(w);
      setDone(true);
      setAiThinking(false);
      const wLabel = w === 1 ? 'You win! 🎉' : w === 2 ? 'AI wins! 🤖' : "It's a draw! 🤝";
      setBannerMsg(wLabel);
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        winner: w,
        p1Score: p[6],
        p2Score: p[13],
        moves: newMoves,
        secs: secsRef.current,
        mode: 'ai',
        difficulty,
      };
      mncSaveEntry(entry);
      setHistory(mncLoadHistory());

      // ZK verify on player win, then fire onWin
      const finalSecs = secsRef.current;
      const base = Math.max(Math.abs(p[6] - p[13]) * 15 - finalSecs, 50);
      const share = `Mancala vs AI (${difficulty}) — 🫘 You ${p[6]} · AI ${p[13]} · ${newMoves} moves · ${finalSecs}s`;

      if (w === 1 && sessionIdRef.current && nonceRef.current) {
        setVerifying(true);
        const sid = sessionIdRef.current;
        const nonce = nonceRef.current;
        const log = moveLogRef.current.slice();
        const fp = p.slice();
        // Race: verify within 3s max, then proceed regardless
        const verifyTimeout = setTimeout(() => {
          setVerifying(false);
          setVerified(false);
          winTimerRef.current = setTimeout(() => {
            winTimerRef.current = null;
            setBannerMsg('');
            onWin(base, newMoves, finalSecs, { winner: w, share, verified: false });
          }, 500);
        }, 3000);
        mncVerifySession(sid, nonce, log, fp, finalSecs).then(result => {
          clearTimeout(verifyTimeout);
          setVerifying(false);
          const ok = result && result.verified;
          setVerified(ok);
          winTimerRef.current = setTimeout(() => {
            winTimerRef.current = null;
            setBannerMsg('');
            onWin(ok ? (result.score || base) : base, newMoves, finalSecs, { winner: w, share, verified: ok });
          }, 600);
        });
      } else {
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          setBannerMsg('');
          onWin(w === 1 ? base : w === 'draw' ? 50 : 0, newMoves, finalSecs, { winner: w, share, verified: false });
        }, 1500);
      }
    } else if (extraTurn) {
      setBannerMsg(currentPlayer === 2 ? 'AI gets another turn! 🔄' : 'Extra turn! 🔄');
      setTimeout(() => setBannerMsg(m => (m === 'Extra turn! 🔄' || m === 'AI gets another turn! 🔄') ? '' : m), 1200);
    } else {
      setPlayer(currentPlayer === 1 ? 2 : 1);
      setBannerMsg('');
    }
  };

  const applyMove = (idx, currentPlayer) => {
    if (animatingRef.current) return;
    const curPits = pitsRef.current;
    if (curPits[idx] === 0) return;
    const { sequence, pits: newPits, extraTurn, captureFrom } = mncDistribute(curPits, idx, currentPlayer);
    const newMoves = movesRef.current + 1;
    moveLogRef.current.push(idx);
    animatingRef.current = true;
    const working = curPits.slice();
    working[idx] = 0;
    setPits(working.slice());
    setFlashPits(new Set());
    let step = 0;
    const animate = () => {
      if (!animatingRef.current) { setFlashPits(new Set()); return; }
      if (step >= sequence.length) {
        setFlashPits(new Set());
        if (captureFrom >= 0) {
          setCaptureFlash(new Set([captureFrom]));
          setTimeout(() => {
            if (!animatingRef.current) return;
            setCaptureFlash(new Set());
            animatingRef.current = false;
            finishMove(newPits, currentPlayer, extraTurn, captureFrom, newMoves);
          }, 350);
        } else {
          animatingRef.current = false;
          finishMove(newPits, currentPlayer, extraTurn, captureFrom, newMoves);
        }
        return;
      }
      working[sequence[step]]++;
      setPits(working.slice());
      setFlashPits(new Set([sequence[step]]));
      if (soundOnRef.current) mncPlayClick();
      step++;
      setTimeout(animate, 80);
    };
    setTimeout(animate, 0);
  };
  applyMoveRef.current = applyMove;

  // Trigger AI when it's P2's turn
  useEffect(() => {
    if (player !== 2 || done) return;
    setAiThinking(true);
    const delay = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 700 : 1100;
    const t = setTimeout(() => {
      setAiThinking(false);
      const idx = mncAIMove(pitsRef.current, difficulty);
      if (idx >= 0) applyMoveRef.current(idx, 2);
    }, delay);
    return () => clearTimeout(t);
  }, [player, done]);

  const handlePitClick = (idx) => {
    if (player !== 1 || done || animatingRef.current) return;
    if (idx < 0 || idx > 5 || pits[idx] === 0) return;
    applyMove(idx, 1);
  };

  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];
  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = player === 1 ? p1Color : p2Color;

  const pitClass = (idx) => {
    const isP1Pit = idx <= 5;
    const canClick = !done && player === 1 && isP1Pit && pits[idx] > 0 && !animatingRef.current;
    const cls = ['mnc-pit'];
    cls.push(canClick ? 'mnc-clickable' : 'mnc-dim');
    if (flashPits.has(idx)) cls.push('mnc-flash');
    if (captureFlash.has(idx)) cls.push('mnc-capture-flash');
    return cls.join(' ');
  };

  const aiHistory = history.filter(h => h.mode === 'ai');
  const stats = aiHistory.reduce(
    (acc, h) => { acc.total++; if (h.winner === 1) acc.wins++; else if (h.winner === 2) acc.losses++; else acc.draws++; return acc; },
    { total: 0, wins: 0, losses: 0, draws: 0 },
  );
  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill">
          <div className="plabel">Diff</div>
          <div className="pvalue" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{difficulty}</div>
        </div>
        <div className="pill">
          <div className="plabel">ZK</div>
          <div className="pvalue" style={{ fontSize: '0.75rem', color: verifying ? C.gold : verified === true ? '#4ade80' : verified === false ? C.rose : sessionIdRef.current ? C.accent : C.muted }}>
            {verifying ? '…' : verified === true ? '✓' : verified === false ? '✗' : sessionIdRef.current ? '⚡' : '—'}
          </div>
        </div>
      </div>

      <div style={{
        textAlign: 'center', fontSize: '0.82rem', fontWeight: 600,
        color: done ? C.muted : activeColor,
        background: (done ? C.dim : activeColor) + '22',
        border: `1px solid ${(done ? C.dim : activeColor)}44`,
        borderRadius: '999px', padding: '0.32rem 0.8rem',
        maxWidth: 480, margin: '0 auto 0.65rem',
      }}>
        {done
          ? (winner === 'draw' ? "Game over — It's a draw! 🤝" : winner === 1 ? 'Game over — You win! 🎉' : 'Game over — AI wins! 🤖')
          : player === 2 ? 'AI is thinking… 🤖' : 'Your turn'}
      </div>

      <div className="mnc-board">
        <div className="mnc-store" style={{ gridColumn: 1, gridRow: '1 / 3', borderColor: !done && player === 2 ? p2Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={flashPits.has(13)} capturing={false} />
          <div className="mnc-store-label">AI</div>
          <div className="mnc-store-score" style={{ color: !done && player === 2 ? p2Color : '#C8A87A' }}>{pits[13]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p2Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 1, gridColumn: i + 2 }}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
          </div>
        ))}
        <div className="mnc-store" style={{ gridColumn: 8, gridRow: '1 / 3', borderColor: !done && player === 1 ? p1Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={flashPits.has(6)} capturing={false} />
          <div className="mnc-store-label">You</div>
          <div className="mnc-store-score" style={{ color: !done && player === 1 ? p1Color : '#C8A87A' }}>{pits[6]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p1Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 2, gridColumn: i + 2 }} onClick={() => handlePitClick(idx)}
            aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
          </div>
        ))}
      </div>

      {bannerMsg && <div className="mnc-banner">{bannerMsg}</div>}

      <div className="mnc-controls">
        <button onClick={resetGame}>↺ New Game</button>
        <button onClick={() => { const next = !soundOn; setSoundOn(next); soundOnRef.current = next; try { localStorage.setItem(MNC_SOUND_KEY, next ? '1' : '0'); } catch {} }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0', marginTop: '1.25rem', borderBottom: `1px solid ${C.border}` }}>
        {['game', 'leaderboard'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.45rem', fontSize: '0.82rem', fontWeight: activeTab === tab ? 700 : 400,
              background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${C.accent}` : '2px solid transparent',
              color: activeTab === tab ? C.accent : C.muted, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{tab === 'game' ? '📊 Stats' : '🏆 Leaderboard'}</button>
        ))}
      </div>

      {activeTab === 'game' && aiHistory.length > 0 && (
        <div className="mnc-stats-grid" style={{ marginTop: '0.75rem' }}>
          <div className="mnc-stat-card"><div className="mnc-stat-val">{stats.total}</div><div className="mnc-stat-lbl">Games</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p1Color }}>{stats.wins}</div><div className="mnc-stat-lbl">Wins</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p2Color }}>{stats.losses}</div><div className="mnc-stat-lbl">Losses</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: C.muted }}>{stats.draws}</div><div className="mnc-stat-lbl">Draws</div></div>
        </div>
      )}
      {activeTab === 'game' && aiHistory.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.82rem', padding: '1rem 0' }}>No games yet — play one!</div>
      )}
      {activeTab === 'leaderboard' && <MncLeaderboard />}
    </div>
  );
}

/* ============================================================
   Game 5c — Mancala Online variant (polling multiplayer)
   ============================================================ */
function MancalaOnlineGame({ onWin, onStepChange, roomId, myPlayerNum }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useMancalaRoom(roomId);
  const [myMoves, setMyMoves] = useState(0);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0);
  secsRef.current = secs;

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const p = room.pits;
    const w = room.winner;
    const youWin = (w === String(myPlayerNum));
    const isDraw  = (w === 'draw');
    const base = Math.max(Math.abs(p[6] - p[13]) * 15 - secsRef.current, 50);
    const date = new Date().toISOString().slice(0, 10);
    const share = `Mancala Online ${date} — 🫘 P1 ${p[6]} · P2 ${p[13]} · ${secsRef.current}s`;
    onWin(youWin ? base : isDraw ? 50 : 0, myMoves, secsRef.current, { winner: w, share });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div>
      </div>
    );
  }

  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }

  const pits = room ? room.pits : Array(14).fill(0);
  const status = room ? room.status : 'waiting';
  const currentPlayer = room ? room.currentPlayer : null;
  const isMyTurn = status === 'active' && currentPlayer === myPlayerNum;
  const p1Color = C.accent;
  const p2Color = C.rose;
  const myColor = myPlayerNum === 1 ? p1Color : p2Color;

  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ color: C.muted, marginBottom: '0.6rem', fontSize: '0.85rem' }}>Waiting for opponent to join…</div>
        <div className="mnc-room-code">{roomId}</div>
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.4rem' }}>Share this room code</div>
        <div className="mnc-spinner" style={{ margin: '1rem auto 0' }} />
      </div>
    );
  }

  const handleClick = (idx) => {
    if (!isMyTurn) return;
    const ownMin = myPlayerNum === 1 ? 0 : 7;
    const ownMax = myPlayerNum === 1 ? 5 : 12;
    if (idx < ownMin || idx > ownMax || pits[idx] === 0) return;
    const next = myMoves + 1;
    setMyMoves(next);
    onStepChange(next);
    submitMove(idx);
  };

  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];

  const pitClass = (idx) => {
    const isP1Pit = idx <= 5;
    const isMyPit = myPlayerNum === 1 ? isP1Pit : !isP1Pit;
    const canClick = isMyTurn && isMyPit && pits[idx] > 0;
    const cls = ['mnc-pit'];
    cls.push(canClick ? 'mnc-clickable' : 'mnc-dim');
    return cls.join(' ');
  };

  const p1Name = room && room.player1Name ? room.player1Name : 'P1';
  const p2Name = room && room.player2Name ? room.player2Name : 'P2';
  const myName  = myPlayerNum === 1 ? p1Name : p2Name;
  const oppName = myPlayerNum === 1 ? p2Name : p1Name;

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : room.winner === 'draw' ? "Draw! 🤝" : `${oppName} wins!`)
    : isMyTurn ? 'Your turn' : `${oppName}'s turn`;

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} />
          <div className="plabel">Online</div>
        </div>
      </div>

      {opponentDisconnected && (
        <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          Opponent connection lost — waiting for reconnect…
        </div>
      )}

      <div className="mnc-board">
        <div className="mnc-store" style={{ gridColumn: 1, gridRow: '1 / 3', borderColor: currentPlayer === 2 && status === 'active' ? p2Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={false} capturing={false} />
          <div className="mnc-store-label">{myPlayerNum === 2 ? 'You' : oppName}</div>
          <div className="mnc-store-score" style={{ color: currentPlayer === 2 && status === 'active' ? p2Color : '#C8A87A' }}>{pits[13]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p2Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 1, gridColumn: i + 2 }} onClick={() => handleClick(idx)}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={false} capturing={false} />
          </div>
        ))}
        <div className="mnc-store" style={{ gridColumn: 8, gridRow: '1 / 3', borderColor: currentPlayer === 1 && status === 'active' ? p1Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={false} capturing={false} />
          <div className="mnc-store-label">{myPlayerNum === 1 ? 'You' : oppName}</div>
          <div className="mnc-store-score" style={{ color: currentPlayer === 1 && status === 'active' ? p1Color : '#C8A87A' }}>{pits[6]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p1Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 2, gridColumn: i + 2 }} onClick={() => handleClick(idx)}
            aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={false} capturing={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 5d — Mancala Mode Selector
   ============================================================ */
function MancalaModeSelect({ onSelectLocal, onSelectAI, onSelectOnline }) {
  const [mode, setMode]             = useState(null);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem(MNC_AI_DIFF_KEY) || 'medium');
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode]     = useState('');
  const [joinError, setJoinError]   = useState('');
  const [busy, setBusy]             = useState(false);

  const handleStart = async () => {
    if (!mode) return;
    if (mode === 'local') { onSelectLocal(); return; }
    if (mode === 'ai') {
      try { localStorage.setItem(MNC_AI_DIFF_KEY, difficulty); } catch {}
      onSelectAI(difficulty);
      return;
    }
    if (mode === 'online') {
      if (onlineAction === 'create') {
        setBusy(true);
        const { ok, body } = await api('/api/mancala/rooms', { method: 'POST' });
        setBusy(false);
        if (ok && body) { onSelectOnline(1, body.roomId); }
        else { setJoinError('Could not create room. Try again.'); }
      } else if (onlineAction === 'join') {
        const code = joinCode.trim().toUpperCase();
        if (code.length < 4) { setJoinError('Enter a valid room code.'); return; }
        setBusy(true);
        const { ok, status, body } = await api('/api/mancala/rooms/' + code + '/join', { method: 'POST' });
        setBusy(false);
        if (ok && body)        { onSelectOnline(2, code); }
        else if (status === 404) { setJoinError('Room not found. Check the code.'); }
        else if (status === 409) { setJoinError('Room is full or you created it.'); }
        else                     { setJoinError('Could not join. Try again.'); }
      }
    }
  };

  const modes = [
    { id: 'local',  icon: '👥', name: 'Local 2-Player', desc: 'Pass and play on this device' },
    { id: 'ai',     icon: '🤖', name: 'vs AI Bot',       desc: 'Challenge the computer', ranked: true },
    { id: 'online', icon: '🌐', name: 'Online',          desc: 'Play with a friend via room code' },
  ];

  const canStart = mode && (
    mode !== 'online' ||
    (onlineAction === 'create') ||
    (onlineAction === 'join' && joinCode.trim().length >= 4)
  );

  return (
    <div className="mnc-mode-select">
      {modes.map(m => (
        <button key={m.id} className={'mnc-mode-btn' + (mode === m.id ? ' active' : '')} onClick={() => { setMode(m.id); setJoinError(''); }}>
          <span className="mnc-mode-icon">{m.icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">
              {m.name}
              {m.ranked && <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', background: C.gold + '33', color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: '999px', padding: '0.1rem 0.4rem', verticalAlign: 'middle', fontWeight: 700 }}>🏆 Ranked</span>}
            </span>
            <span className="mnc-mode-desc">{m.desc}{m.ranked ? ' — wins post to leaderboard' : ''}</span>
          </span>
        </button>
      ))}

      {mode === 'ai' && (
        <div className="mnc-difficulty-row">
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} className={'mnc-difficulty-pill' + (difficulty === d ? ' active' : '')} onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      )}

      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')}
              onClick={() => { setOnlineAction('create'); setJoinError(''); }}>
              Create Room
            </button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')}
              onClick={() => { setOnlineAction('join'); setJoinError(''); }}>
              Join Room
            </button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input
                className="mnc-join-input"
                placeholder="Room code (e.g. AB3K7P)"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                maxLength={8}
              />
            </div>
          )}
          {joinError && <div className="mnc-join-error">{joinError}</div>}
        </div>
      )}

      {mode && (
        <button className="mnc-mode-start-btn" onClick={handleStart} disabled={!canStart || busy}>
          {busy ? 'Please wait…' : 'Play'}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Game 5 — Mancala wrapper (delegates to mode sub-components)
   ============================================================ */
function MancalaGame({ onWin, onStepChange, resetKey }) {
  const [mode, setMode]               = useState(null);
  const [difficulty, setDifficulty]   = useState(null);
  const [roomId, setRoomId]           = useState(null);
  const [myPlayerNum, setMyPlayerNum] = useState(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // When "Play Again" fires, keep mode for local/ai but reset online (needs new room).
  useEffect(() => {
    if (modeRef.current === 'online') {
      setMode(null);
      setRoomId(null);
      setMyPlayerNum(null);
    }
  }, [resetKey]);

  if (!mode) {
    return (
      <MancalaModeSelect
        onSelectLocal={() => setMode('local')}
        onSelectAI={(diff) => { setDifficulty(diff); setMode('ai'); }}
        onSelectOnline={(playerNum, rId) => { setMyPlayerNum(playerNum); setRoomId(rId); setMode('online'); }}
      />
    );
  }

  if (mode === 'local') return React.createElement(MancalaLocalGame, { onWin, onStepChange, resetKey });
  if (mode === 'ai')    return React.createElement(MancalaAIGame,    { onWin, onStepChange, resetKey, difficulty });
  if (mode === 'online') return React.createElement(MancalaOnlineGame, { onWin, onStepChange, roomId, myPlayerNum });
  return null;
}
