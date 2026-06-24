/* ============================================================
   Game 7 — Tile Match (3-Tiles style)
   ============================================================ */

// Seeded PRNG (mulberry32) — deterministic layouts per level number.
function tmMulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TM_TILE_TYPES = [
  { icon: '🌸', color: '#f43f5e' },
  { icon: '🔥', color: '#f97316' },
  { icon: '💎', color: '#3b82f6' },
  { icon: '🌊', color: '#06b6d4' },
  { icon: '⚡', color: '#f59e0b' },
  { icon: '🌿', color: '#10b981' },
  { icon: '🍄', color: '#e11d48' },
  { icon: '🎵', color: '#8b5cf6' },
  { icon: '🌙', color: '#7c3aed' },
  { icon: '⭐', color: '#eab308' },
  { icon: '🎮', color: '#0891b2' },
  { icon: '🦋', color: '#c026d3' },
];

// 1000-level config computed from a smooth difficulty curve.
function tmGetLevelConfig(level) {
  const t = (level - 1) / 999;
  const tileTypes   = Math.min(12, 3 + Math.floor(t * 9));
  const setsPerType = 2 + Math.floor(t * 3);
  const boardCols   = Math.min(10, 5 + Math.floor(t * 5));
  const boardRows   = Math.min(8,  3 + Math.floor(t * 5));
  const maxLayer    = Math.min(6,  2 + Math.floor(t * 4));
  const undo        = t < 0.333 ? 3 : t < 0.667 ? 2 : 1;
  const shuffle     = t < 0.667 ? 2 : 1;
  return { tileTypes, setsPerType, boardCols, boardRows, maxLayer,
           boosters: { undo, shuffle, clear: 1 } };
}

// Time limit scales with board size and difficulty.
function tmLevelTimeLimit(level, cfg) {
  const totalTiles  = cfg.tileTypes * cfg.setsPerType * 3;
  const t           = (level - 1) / 999;
  const secsPerTile = 3.5 - 2.0 * t;
  return Math.round(totalTiles * secsPerTile);
}

// MM:SS formatter for tile countdown (named to avoid collision with fmtCountdown(ms) at lobby).
function tmFmtSecs(secs) {
  const s = Math.max(0, Math.floor(secs));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

const TM_TIER_LABELS = [
  { label: 'Starter',  start: 0,   end: 99  },
  { label: 'Beginner', start: 100, end: 199 },
  { label: 'Easy',     start: 200, end: 299 },
  { label: 'Normal',   start: 300, end: 399 },
  { label: 'Medium',   start: 400, end: 499 },
  { label: 'Hard',     start: 500, end: 599 },
  { label: 'Harder',   start: 600, end: 699 },
  { label: 'Expert',   start: 700, end: 799 },
  { label: 'Master',   start: 800, end: 899 },
  { label: 'Legend',   start: 900, end: 999 },
];

const TM_TILE_STEP = 50; // px per grid unit (48px tile + 2px gap)

function tmGenerateLevel(cfg, seed) {
  const rng = tmMulberry32(seed);
  const { tileTypes, setsPerType, boardCols, boardRows, maxLayer } = cfg;
  // Build tile list: tileTypes × setsPerType copies of each type (3 tiles per copy)
  const typeList = [];
  for (let t = 0; t < tileTypes; t++) {
    for (let s = 0; s < setsPerType; s++) {
      typeList.push(t, t, t);
    }
  }
  // Fisher-Yates shuffle
  for (let i = typeList.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [typeList[i], typeList[j]] = [typeList[j], typeList[i]];
  }

  const tiles = [];
  let idx = 0;
  let tileId = 0;

  for (let layer = 0; layer <= maxLayer && idx < typeList.length; layer++) {
    const offset = layer * 0.5;
    const cols = boardCols - layer;
    const rows = boardRows - layer;
    if (cols <= 0 || rows <= 0) break;
    for (let r = 0; r < rows && idx < typeList.length; r++) {
      for (let c = 0; c < cols && idx < typeList.length; c++) {
        tiles.push({
          id: tileId++,
          type: typeList[idx++],
          col: c + offset,
          row: r + offset,
          layer,
          removed: false,
          inBar: false,
        });
      }
    }
  }
  return tiles;
}

function tmIsLocked(tile, allTiles) {
  for (let i = 0; i < allTiles.length; i++) {
    const a = allTiles[i];
    if (a.removed || a.inBar) continue;
    if (a.layer <= tile.layer) continue;
    if (Math.abs(a.col - tile.col) < 1.0 && Math.abs(a.row - tile.row) < 1.0) return true;
  }
  return false;
}

function tmSortBar(bar, tilesMap) {
  return bar.slice().sort((a, b) => tilesMap[a].type - tilesMap[b].type);
}

/* ============================================================
   Tile Match Puzzle — competitive sub-components
   ============================================================ */

function TileMatchWalletChip({ balance }) {
  return (
    <div className="tm-wallet-chip">
      🪙 {balance != null ? balance : '—'} MATCH
    </div>
  );
}

function TileMatchLeaderboard({ user }) {
  const [sub, setSub] = useState('global');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tilematch/leaderboard', { headers: { 'x-usernode-token': USERNODE_TOKEN } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading) return <div className="tm-lb-empty">Loading…</div>;
  if (!data) return <div className="tm-lb-empty">Failed to load leaderboard.</div>;

  const rows = sub === 'global' ? data.global : data.daily;
  const me = sub === 'global' ? data.me?.global : data.me?.daily;

  return (
    <div>
      <div className="tm-lb-tabs">
        <button className={'tm-lb-sub-tab' + (sub === 'global' ? ' active' : '')} onClick={() => setSub('global')}>Global</button>
        <button className={'tm-lb-sub-tab' + (sub === 'daily' ? ' active' : '')} onClick={() => setSub('daily')}>Daily</button>
      </div>
      {sub === 'daily' && !me && (
        <div className="tm-lb-empty">Complete today's Daily Tile Match to appear here.</div>
      )}
      {rows.length === 0 && sub === 'global' && (
        <div className="tm-lb-empty">No scores yet — be the first!</div>
      )}
      {rows.map(r => (
        <div key={r.rank} className="tm-lb-row">
          <span className="tm-lb-rank">#{r.rank}</span>
          <span className="tm-lb-name">{r.username || '—'}</span>
          <span className="tm-lb-stat">
            {sub === 'global' ? `L${r.highestLevel}` : fmtTime(r.timeSecs)}
          </span>
        </div>
      ))}
      {me && !rows.find(r => r.rank === me.rank) && (
        <div className="tm-lb-row me">
          <span className="tm-lb-rank">#{me.rank}</span>
          <span className="tm-lb-name">{me.username || 'You'} (you)</span>
          <span className="tm-lb-stat">
            {sub === 'global' ? `L${me.highestLevel}` : fmtTime(me.timeSecs)}
          </span>
        </div>
      )}
      {!me && sub === 'global' && user && (
        <div className="tm-lb-row me" style={{ color: 'var(--c-muted,#888)' }}>
          <span className="tm-lb-rank">—</span>
          <span className="tm-lb-name">{user.username} (you)</span>
          <span className="tm-lb-stat">not ranked yet</span>
        </div>
      )}
    </div>
  );
}

function TileMatchDuelArena({ user, balance, onBalanceChange }) {
  const [duelPhase, setDuelPhase] = useState('lobby'); // lobby|matchmaking|game|result
  const [duelId, setDuelId] = useState(null);
  const [duelData, setDuelData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [mmCountdown, setMmCountdown] = useState(120);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const mmRef = useRef(null);

  const authHeader = { 'Content-Type': 'application/json', 'x-usernode-token': USERNODE_TOKEN };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (mmRef.current) { clearInterval(mmRef.current); mmRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const startMatchmaking = async (stakeTokens) => {
    setError(null);
    setJoining(true);
    try {
      const r = await fetch('/api/tilematch/duel/join', {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ stakeTokens }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to join'); setJoining(false); return; }
      if (d.status === 'active') {
        setDuelId(d.duelId); setDuelData(d.duel); setDuelPhase('game');
        if (onBalanceChange) onBalanceChange(b => b - stakeTokens);
      } else {
        setDuelId(d.duelId); setDuelPhase('matchmaking');
        setMmCountdown(120);
        if (onBalanceChange) onBalanceChange(b => b - stakeTokens);
        let c = 120;
        mmRef.current = setInterval(() => { c--; setMmCountdown(c); }, 1000);
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`/api/tilematch/duel/${d.duelId}`, { headers: { 'x-usernode-token': USERNODE_TOKEN } });
            const pd = await pr.json();
            if (pd.duel && pd.duel.status === 'active') {
              stopPolling();
              setDuelData(pd.duel); setDuelPhase('game');
            } else if (pd.timedOut || (pd.duel && pd.duel.status === 'cancelled')) {
              stopPolling();
              setError('No opponent found — your tokens have been returned.');
              if (onBalanceChange) onBalanceChange(b => b + stakeTokens);
              setDuelPhase('lobby');
            }
          } catch {}
        }, 2000);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    }
    setJoining(false);
  };

  const handleForfeit = async () => {
    if (!duelId) return;
    await fetch(`/api/tilematch/duel/${duelId}/forfeit`, {
      method: 'POST', headers: authHeader, body: '{}',
    }).catch(() => {});
    stopPolling();
    setResultData({ isWinner: false, forfeited: true });
    setDuelPhase('result');
  };

  const handleDuelWin = async (score, steps, timeSecs) => {
    if (!duelId || !duelData) return;
    stopPolling();
    try {
      const r = await fetch(`/api/tilematch/duel/${duelId}/finish`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ score, steps, timeSecs, remainingTiles: 0, telemetry: [] }),
      });
      const d = await r.json();
      if (d.waiting) {
        // Poll for opponent
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`/api/tilematch/duel/${duelId}`, { headers: { 'x-usernode-token': USERNODE_TOKEN } });
            const pd = await pr.json();
            if (pd.duel && pd.duel.status === 'finished') {
              stopPolling();
              const won = pd.duel.winner_id === user.id;
              const prize = pd.duel ? Math.floor(pd.duel.stakeTokens * 2 * 0.9) : 0;
              setResultData({ isWinner: won, prize: { winnerPayout: prize, stakeTokens: pd.duel?.stakeTokens } });
              if (won && onBalanceChange) onBalanceChange(b => b + prize);
              setDuelPhase('result');
            }
          } catch {}
        }, 2000);
      } else {
        if (d.isWinner && onBalanceChange && d.newBalance != null) onBalanceChange(() => d.newBalance);
        setResultData(d);
        setDuelPhase('result');
      }
    } catch {}
  };

  const handleDuelLose = async (steps, timeSecs) => {
    await handleDuelWin(0, steps, timeSecs);
  };

  const TIERS = [10, 50, 100];

  if (duelPhase === 'lobby') return (
    <div>
      {error && <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.84rem', color: '#ef4444' }}>{error}</div>}
      <p style={{ fontSize: '0.84rem', color: 'var(--c-muted,#888)', marginBottom: '0.75rem' }}>
        Stake MATCH tokens and race the same board as your opponent. Winner takes 90% of the pot.
      </p>
      <div className="tm-duel-tiers">
        {TIERS.map(stake => {
          const payout = Math.floor(stake * 2 * 0.9);
          const canAfford = (balance || 0) >= stake;
          return (
            <div key={stake} className="tm-duel-tier-card">
              <div className="tm-duel-stake">🪙 {stake}</div>
              <div className="tm-duel-payout">Stake {stake} MATCH → win <strong>{payout} MATCH</strong></div>
              <button className="tm-duel-find-btn" disabled={!canAfford || joining} onClick={() => startMatchmaking(stake)}>
                {joining ? '…' : 'Find Match'}
              </button>
            </div>
          );
        })}
      </div>
      {(balance || 0) < 10 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--c-muted,#888)', textAlign: 'center', marginTop: '0.5rem' }}>
          Complete daily tasks to earn MATCH tokens.
        </p>
      )}
    </div>
  );

  if (duelPhase === 'matchmaking') return (
    <div className="tm-duel-matchmaking">
      <div className="tm-duel-pulse" />
      <div style={{ fontSize: '0.9rem', color: 'var(--c-text,#e4e4e7)', fontWeight: 600 }}>Finding opponent…</div>
      <div className="tm-duel-timer">{String(Math.floor(mmCountdown / 60)).padStart(2,'0')}:{String(mmCountdown % 60).padStart(2,'0')}</div>
      <button className="tm-duel-back-btn" onClick={handleForfeit}>Cancel</button>
    </div>
  );

  if (duelPhase === 'game' && duelData) return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
        <button className="tm-duel-back-btn" onClick={handleForfeit}>Forfeit</button>
      </div>
      <TileMatchingDailyGame
        onWin={(score, steps, secs) => handleDuelWin(score, steps, secs)}
        onLose={(steps, secs) => handleDuelLose(steps, secs)}
        onStepChange={() => {}}
        resetKey={duelId}
        boardSeedOverride={duelData.boardSeed}
      />
    </div>
  );

  if (duelPhase === 'result') return (
    <div className="tm-duel-result">
      <div className="tm-duel-outcome">{resultData?.isWinner ? '🏆' : resultData?.forfeited ? '🏳' : '😤'}</div>
      <h3>{resultData?.isWinner ? 'You won!' : resultData?.forfeited ? 'You forfeited' : 'Better luck next time!'}</h3>
      {resultData?.prize && <div className="tm-duel-balance">Prize: 🪙 {resultData.prize.winnerPayout} MATCH</div>}
      {resultData?.newBalance != null && <div className="tm-duel-balance">Balance: 🪙 {resultData.newBalance} MATCH</div>}
      <button className="tm-duel-back-btn" onClick={() => { setDuelPhase('lobby'); setResultData(null); setDuelId(null); setError(null); }}>
        Back to Duel Lobby
      </button>
    </div>
  );

  return null;
}

function TileMatchDailyTasks({ tasks, onClaim }) {
  const allDone = tasks.length > 0 && tasks.every(t => t.claimed);
  if (allDone) return (
    <div className="tm-tasks-all-done">
      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🎉</div>
      All tasks done — come back tomorrow!
    </div>
  );
  return (
    <div>
      {tasks.map(task => {
        const pct = Math.min(100, Math.round((task.progress / task.target) * 100));
        return (
          <div key={task.id} className="tm-task-card">
            <div className="tm-task-header">
              <span className="tm-task-label">{task.label}</span>
              <span className="tm-task-reward">+{task.rewardTokens} 🪙</span>
            </div>
            <div className="tm-task-desc">{task.description}</div>
            <div className="tm-task-bar-wrap">
              <div className="tm-task-bar-fill" style={{ width: pct + '%' }} />
            </div>
            <div className="tm-task-footer">
              <span className="tm-task-progress-lbl">{task.progress} / {task.target}</span>
              {task.claimed ? (
                <span className="tm-task-claimed">Claimed ✓</span>
              ) : (
                <button
                  className="tm-task-claim-btn"
                  disabled={!task.completable}
                  onClick={() => onClaim(task.id)}
                >
                  Claim
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TileMatchingGame({ onWin, onLose, onStepChange, resetKey }) {
  const [phase, setPhase] = useState('select'); // 'select' | 'playing' | 'levelWon'
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [tierPage, setTierPage] = useState(null); // null = overview, 0-9 = tier index
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [done, setDone] = useState(false);
  const [boosters, setBoosters] = useState({ undo: 3, shuffle: 2, clear: 1 });
  const [lastBarEntry, setLastBarEntry] = useState(null);
  const [clearSlotMode, setClearSlotMode] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  const [levelScore, setLevelScore] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  // Competitive menu state
  const [tmMenuTab, setTmMenuTab] = useState('play');
  const [tmBalance, setTmBalance] = useState(null);
  const [tmTasks, setTmTasks] = useState([]);
  const { secs } = useTimer(!done && phase === 'playing');
  const secsRef = useRef(0);
  const totalSecsRef = useRef(0);
  const levelStartSecsRef = useRef(0);

  useEffect(() => { secsRef.current = secs; }, [secs]);

  // Derived countdown values
  const levelElapsed = secs - levelStartSecsRef.current;
  const timeRemaining = timeLimit > 0 ? timeLimit - levelElapsed : Infinity;
  const timeUp = phase === 'playing' && !done && timeLimit > 0 && timeRemaining <= 0;
  const timeLow = phase === 'playing' && !done && timeLimit > 0 && timeRemaining > 0 && timeRemaining <= 30;

  // Timeout triggers loss
  useEffect(() => {
    if (!timeUp) return;
    setDone(true);
    const totalS = totalSecsRef.current + secsRef.current;
    const newTotalMoves = totalMoves + moves;
    onLose(newTotalMoves, totalS, { share: `Tile Match ⏱ Level ${selectedLevel} | time's up` });
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset everything when Play Again is triggered from App overlay
  useEffect(() => {
    setPhase('select');
    setTierPage(null);
    setTiles([]);
    setBar([]);
    setMoves(0);
    setTotalMoves(0);
    setSessionScore(0);
    setDone(false);
    setBoosters({ undo: 3, shuffle: 2, clear: 1 });
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    setLevelScore(0);
    setTimeLimit(0);
    setCompletedLevels(new Set());
    totalSecsRef.current = 0;
    levelStartSecsRef.current = 0;
  }, [resetKey]);

  const startLevel = (lvl) => {
    const cfg = tmGetLevelConfig(lvl);
    const newTiles = tmGenerateLevel(cfg, lvl * 17 + 3);
    const ls = Math.min(50 + Math.floor((lvl - 1) / 10) * 2, 200);
    const limit = tmLevelTimeLimit(lvl, cfg);
    setSelectedLevel(lvl);
    setTiles(newTiles);
    setBar([]);
    setMoves(0);
    setDone(false);
    setBoosters({ ...cfg.boosters });
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    setLevelScore(ls);
    setTimeLimit(limit);
    levelStartSecsRef.current = secsRef.current;
    setPhase('playing');
  };

  const selectTile = (tileId) => {
    if (clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[tileId];
    if (!tile || tile.removed || tile.inBar) return;
    if (tmIsLocked(tile, tilesCopy)) return;

    // Game over: bar is already full with no match
    if (bar.length >= 7) {
      setDone(true);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      const totalS = totalSecsRef.current + secsRef.current;
      const newTotal = totalMoves + moves + 1;
      onLose(newTotal, totalS, { share: `Tile Match 💥 Level ${selectedLevel} | ${newTotal} moves` });
      return;
    }

    tile.inBar = true;
    const newBar = [...bar, tileId];
    const newMoves = moves + 1;

    // Sort bar
    const sortedBar = tmSortBar(newBar, tilesMap);

    // Check for match-3
    let matchedIds = null;
    for (let i = 0; i <= sortedBar.length - 3; i++) {
      const a = tilesMap[sortedBar[i]];
      const b = tilesMap[sortedBar[i + 1]];
      const cc = tilesMap[sortedBar[i + 2]];
      if (a && b && cc && a.type === b.type && b.type === cc.type) {
        matchedIds = [sortedBar[i], sortedBar[i + 1], sortedBar[i + 2]];
        break;
      }
    }

    let finalBar = sortedBar;
    if (matchedIds) {
      // Flash animation then remove
      const matchSet = new Set(matchedIds);
      setFlashIds(matchSet);
      matchedIds.forEach(id => {
        tilesMap[id].removed = true;
        tilesMap[id].inBar = false;
      });
      finalBar = sortedBar.filter(id => !matchSet.has(id));
      setTimeout(() => setFlashIds(new Set()), 400);
    }

    const updatedTiles = tilesCopy;
    const newTotalMoves = totalMoves + newMoves;

    // Check game-over: bar full after placement, no match
    if (!matchedIds && finalBar.length >= 7) {
      setTiles(updatedTiles);
      setBar(finalBar);
      setMoves(newMoves);
      setDone(true);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      const totalS = totalSecsRef.current + secsRef.current;
      onLose(newTotalMoves, totalS, { share: `Tile Match 💥 Level ${selectedLevel} | ${newTotalMoves} moves` });
      return;
    }

    setTiles(updatedTiles);
    setBar(finalBar);
    setMoves(newMoves);
    setLastBarEntry(tileId);
    onStepChange(newTotalMoves);

    // Check win: no active board tiles
    const remaining = updatedTiles.filter(t => !t.removed && !t.inBar);
    const inBarNow = finalBar.length;
    if (remaining.length === 0 && inBarNow === 0) {
      setDone(true);
      const s = secsRef.current;
      setPhase('levelWon');
      totalSecsRef.current += s;
    }
  };

  const doUndo = () => {
    if (boosters.undo <= 0 || !lastBarEntry) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[lastBarEntry];
    if (!tile || !tile.inBar) return;
    tile.inBar = false;
    const newBar = bar.filter(id => id !== lastBarEntry);
    setTiles(tilesCopy);
    setBar(newBar);
    setLastBarEntry(null);
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
    setBarFull(false);
  };

  const doShuffle = () => {
    if (boosters.shuffle <= 0) return;
    const active = tiles.filter(t => !t.removed && !t.inBar);
    if (active.length < 2) return;
    const positions = active.map(t => ({ col: t.col, row: t.row, layer: t.layer }));
    // Fisher-Yates with time-based seed (non-deterministic for shuffle)
    const rng = tmMulberry32((Date.now() & 0xFFFF) + 1);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const tilesCopy = tiles.map(t => ({ ...t }));
    active.forEach((t, i) => {
      const tc = tilesCopy.find(x => x.id === t.id);
      if (tc) { tc.col = positions[i].col; tc.row = positions[i].row; tc.layer = positions[i].layer; }
    });
    setTiles(tilesCopy);
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const doClearMode = () => {
    if (boosters.clear <= 0 || bar.length === 0) return;
    setClearSlotMode(true);
  };

  const clearSlotTile = (tileId) => {
    if (!clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[tileId];
    if (!tile || !tile.inBar) return;
    tile.removed = true;
    tile.inBar = false;
    const newBar = bar.filter(id => id !== tileId);
    setTiles(tilesCopy);
    setBar(newBar);
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
    setClearSlotMode(false);
    setBarFull(false);
  };

  // Load wallet + tasks when the select screen is shown for the first time
  useEffect(() => {
    const token = USERNODE_TOKEN;
    const headers = { 'x-usernode-token': token };
    Promise.all([
      fetch('/api/tilematch/wallet', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/tilematch/tasks', { headers }).then(r => r.json()).catch(() => null),
    ]).then(([walletData, tasksData]) => {
      if (walletData && walletData.balance != null) setTmBalance(walletData.balance);
      if (tasksData && tasksData.tasks) setTmTasks(tasksData.tasks);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reportProgress = (lvlCleared, tileTaps) => {
    fetch('/api/tilematch/tasks/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': USERNODE_TOKEN },
      body: JSON.stringify({ levelsCleared: lvlCleared || 0, tileTaps: tileTaps || 0 }),
    }).then(r => r.json()).then(d => { if (d.tasks) setTmTasks(d.tasks); }).catch(() => {});
  };

  const submitScore = (highestLevel, totalCleared, sessionScore) => {
    fetch('/api/tilematch/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': USERNODE_TOKEN },
      body: JSON.stringify({ highestLevel, totalCleared, sessionScore }),
    }).catch(() => {});
  };

  const handleNextLevel = () => {
    const ns = sessionScore + levelScore;
    setSessionScore(ns);
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    // Fire-and-forget: report task progress + submit score
    reportProgress(1, moves);
    submitScore(selectedLevel, completedLevels.size + 1, ns);
    const nextLvl = selectedLevel < 1000 ? selectedLevel + 1 : null;
    if (nextLvl) {
      startLevel(nextLvl);
    }
  };

  const handleEndSession = () => {
    const ns = sessionScore + levelScore;
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    const totalS = totalSecsRef.current;
    const newTotalMoves = totalMoves + moves;
    const share = `Tile Match ⬢ L${completedLevels.size + 1} cleared | ${ns} pts 🀄✨`;
    // Fire-and-forget: report task progress + submit score
    reportProgress(1, moves);
    submitScore(selectedLevel, completedLevels.size + 1, ns);
    onWin(ns, newTotalMoves, totalS, { share });
  };

  const handleTaskClaim = (taskId) => {
    fetch(`/api/tilematch/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': USERNODE_TOKEN },
      body: '{}',
    }).then(r => r.json()).then(d => {
      if (d.newBalance != null) setTmBalance(d.newBalance);
      if (d.task) setTmTasks(prev => prev.map(t => t.id === taskId ? { ...t, claimed: true, completable: false } : t));
    }).catch(() => {});
  };

  // ---- Level selector screen ----
  if (phase === 'select') {
    const menuContent = () => {
      if (tmMenuTab === 'leaderboard') return <TileMatchLeaderboard />;
      if (tmMenuTab === 'duel') return (
        <TileMatchDuelArena
          balance={tmBalance}
          onBalanceChange={(fn) => setTmBalance(b => typeof fn === 'function' ? fn(b || 0) : fn)}
        />
      );
      if (tmMenuTab === 'tasks') return <TileMatchDailyTasks tasks={tmTasks} onClaim={handleTaskClaim} />;
      // 'play' tab — existing level selector
      if (tierPage === null) return (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-muted,#888)', marginBottom: '1rem' }}>Click tiles off the layered board into your 7-slot bar — match three to clear them.</p>
          <div className="tm-tier-overview">
            {TM_TIER_LABELS.map((tier, idx) => {
              const doneCount = Array.from(completedLevels).filter(l => l >= tier.start + 1 && l <= tier.end + 1).length;
              return (
                <div key={tier.label} className="tm-tier-card" onClick={() => { setTierPage(idx); setSelectedLevel(tier.start + 1); }}>
                  <div className="tm-tier-card-name">{tier.label}</div>
                  <div className="tm-tier-card-range">L{tier.start + 1}–{tier.end + 1}</div>
                  {doneCount > 0 && <div className="tm-tier-card-progress">{doneCount}/100 cleared</div>}
                </div>
              );
            })}
          </div>
        </div>
      );
      // Per-tier grid
      const tier = TM_TIER_LABELS[tierPage];
      return (
        <div>
          <button className="tm-tier-back-btn" onClick={() => setTierPage(null)}>← Tiers</button>
          <div className="tm-tier-page-title">{tier.label} <span style={{color:'var(--c-muted,#888)',fontWeight:400,fontSize:'0.85rem'}}>L{tier.start+1}–{tier.end+1}</span></div>
          <div className="tm-level-grid">
            {Array.from({ length: 100 }, (_, i) => {
              const lvl = tier.start + i + 1;
              const isDone = completedLevels.has(lvl);
              const isSel = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  className={`tm-level-btn${isSel ? ' selected' : ''}${isDone ? ' done' : ''}`}
                  onClick={() => setSelectedLevel(lvl)}
                >
                  {lvl}
                  {isDone && <span className="tm-check">✓</span>}
                </button>
              );
            })}
          </div>
          <button className="tm-play-btn" onClick={() => startLevel(selectedLevel)}>
            Play Level {selectedLevel}
          </button>
        </div>
      );
    };

    return (
      <div className="tm-menu">
        <div className="tm-menu-header">
          <h2>Tile Match Puzzle</h2>
          <TileMatchWalletChip balance={tmBalance} />
        </div>
        <div className="tm-menu-tabs">
          {['play', 'leaderboard', 'duel', 'tasks'].map(tab => (
            <button key={tab} className={'tm-menu-tab' + (tmMenuTab === tab ? ' active' : '')} onClick={() => setTmMenuTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {menuContent()}
      </div>
    );
  }

  // ---- Level selector (old path kept for tierPage within play tab — now dead code guarded above) ----
  // ---- Level won screen ----
  if (phase === 'levelWon') {
    const isLast = selectedLevel >= 1000;
    return (
      <div className="tm-level-won">
        <div className="trophy">🏆</div>
        <h3>Level {selectedLevel} Cleared!</h3>
        <div className="sub">Board cleared — well played</div>
        <div className="tm-level-stats">
          <div className="tm-level-stat-row"><span className="k">Moves</span><span className="v">{moves}</span></div>
          <div className="tm-level-stat-row"><span className="k">Level score</span><span className="v">+{levelScore}</span></div>
          <div className="tm-level-stat-row"><span className="k">Session total</span><span className="v">{sessionScore + levelScore}</span></div>
        </div>
        <div className="tm-level-won-btns">
          {!isLast && (
            <button className="tm-next-btn" onClick={handleNextLevel}>Next Level →</button>
          )}
          <button className="tm-end-btn" onClick={handleEndSession}>End Session</button>
        </div>
      </div>
    );
  }

  // ---- Playing screen ----
  const cfg = tmGetLevelConfig(selectedLevel);
  const tilesMap = {};
  tiles.forEach(t => { tilesMap[t.id] = t; });

  const boardW = (cfg.boardCols) * TM_TILE_STEP;
  const boardH = (cfg.boardRows + cfg.maxLayer * 0.5) * TM_TILE_STEP + 48;

  const activeTiles = tiles.filter(t => !t.removed);
  const boardTiles = activeTiles.filter(t => !t.inBar);
  const tilesLeft = boardTiles.length;

  return (
    <div className="tm-wrap">
      <div className="status-bar">
        <div className={`pill tm-timer-pill${timeLow ? ' warning' : ''}`}>
          <div className="plabel">Time</div>
          <div className="pvalue">{tmFmtSecs(timeRemaining === Infinity ? 0 : timeRemaining)}</div>
        </div>
        <div className="pill">
          <div className="plabel">Moves</div>
          <div className="pvalue">{moves}</div>
        </div>
        <div className="pill">
          <div className="plabel">Tiles Left</div>
          <div className="pvalue">{tilesLeft}</div>
        </div>
      </div>

      <div
        className="tm-board-container"
        style={{ width: boardW, height: boardH, maxWidth: '100%' }}
      >
        {boardTiles.map(tile => {
          const locked = tmIsLocked(tile, tiles);
          const isFlash = flashIds.has(tile.id);
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}`}
              style={{
                left: tile.col * TM_TILE_STEP,
                top: tile.row * TM_TILE_STEP,
                zIndex: tile.layer * 10 + 1,
                background: tt.color,
              }}
              onClick={() => selectTile(tile.id)}
            >
              {tt.icon}
            </div>
          );
        })}
      </div>

      <div className={`tm-bar${barFull ? ' bar-full' : ''}`}>
        {Array.from({ length: 7 }, (_, i) => {
          const tid = bar[i];
          const t = tid != null ? tilesMap[tid] : null;
          const tt = t ? TM_TILE_TYPES[t.type % TM_TILE_TYPES.length] : null;
          const isClear = clearSlotMode && t != null;
          return (
            <div
              key={i}
              className={`tm-slot${t ? ' filled' : ''}${isClear ? ' clear-target' : ''}`}
              onClick={isClear ? () => clearSlotTile(tid) : undefined}
            >
              {tt ? tt.icon : ''}
            </div>
          );
        })}
      </div>
      <div className={`tm-bar-label${barFull ? ' full' : ''}`}>
        {barFull ? '⚠ Bar Full! Use a booster.' : `${bar.length}/7 slots used`}
      </div>

      <div className="tm-boosters">
        <button
          className="tm-booster-btn"
          disabled={boosters.undo <= 0 || !lastBarEntry}
          onClick={doUndo}
          title="Return last tile to board"
        >
          <span className="tm-booster-icon">↩</span>
          <span>Undo</span>
          <span className="tm-booster-count">{boosters.undo} left</span>
        </button>
        <button
          className="tm-booster-btn"
          disabled={boosters.shuffle <= 0}
          onClick={doShuffle}
          title="Shuffle board tiles"
        >
          <span className="tm-booster-icon">🔀</span>
          <span>Shuffle</span>
          <span className="tm-booster-count">{boosters.shuffle} left</span>
        </button>
        <button
          className={`tm-booster-btn${clearSlotMode ? ' active' : ''}`}
          disabled={boosters.clear <= 0 || bar.length === 0}
          onClick={clearSlotMode ? () => setClearSlotMode(false) : doClearMode}
          title="Remove a tile from bar"
        >
          <span className="tm-booster-icon">✕</span>
          <span>{clearSlotMode ? 'Cancel' : 'Clear'}</span>
          <span className="tm-booster-count">{boosters.clear} left</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Daily Tile Match
   ============================================================ */
const TM_DAILY_CONFIG = {
  tileTypes: 8, setsPerType: 3, boardCols: 8, boardRows: 5, maxLayer: 3,
  boosters: { undo: 3, shuffle: 2, clear: 1 },
};
const TM_DAILY_TIME_LIMIT = 180; // 3 minutes fixed

function TileMatchingDailyGame({ onWin, onLose, onStepChange, resetKey, offset, savedProgress, onSaveProgress, boardSeedOverride, onMoveTile }) {
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [boosters, setBoosters] = useState({ ...TM_DAILY_CONFIG.boosters });
  const [lastBarEntry, setLastBarEntry] = useState(null);
  const [clearSlotMode, setClearSlotMode] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const [flashIds, setFlashIds] = useState(new Set());
  const [secs, setSecs] = useState(0);
  const secsRef = useRef(0);
  const movesRef = useRef(0);

  // Server-anchored UTC day; the board is re-derived deterministically from it,
  // so persisted progress only carries the mutable player state.
  const dayNum = cwDayNum(offset || 0);
  // `hydrated` guards the autosave effects from firing before the board exists.
  const hydratedRef = useRef(false);

  useEffect(() => { secsRef.current = secs; }, [secs]);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  // Self-managed timer so setSecs(0) on reset works correctly
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [done]);

  const remaining = TM_DAILY_TIME_LIMIT - secs;
  const timeUp = !done && remaining <= 0;
  const timeLow = !done && remaining > 0 && remaining <= 30;

  useEffect(() => {
    if (!timeUp) return;
    setDone(true);
    const remaining = tiles.filter(t => !t.removed).length;
    onLose(movesRef.current, secsRef.current, { share: 'Daily Tile Match ⏱ time\'s up', remainingTiles: remaining, isTimeUp: true });
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise board from the day seed, hydrating today's saved progress when
  // present so a resumed attempt restores the exact tiles/bar/moves/boosters
  // and continues the timer from where it stopped.
  useEffect(() => {
    const seed = boardSeedOverride != null ? boardSeedOverride : (dayNum * 31 + 7);
    const freshTiles = tmGenerateLevel(TM_DAILY_CONFIG, seed);
    const resume = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.tiles)
      ? savedProgress
      : null;
    if (resume) {
      setTiles(resume.tiles.map(t => ({ ...t })));
      setBar(Array.isArray(resume.bar) ? resume.bar.slice() : []);
      setMoves(Number.isFinite(resume.moves) ? resume.moves : 0);
      setSecs(Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0);
      setBoosters(resume.boosters ? { ...resume.boosters } : { ...TM_DAILY_CONFIG.boosters });
    } else {
      setTiles(freshTiles);
      setBar([]);
      setMoves(0);
      setSecs(0);
      setBoosters({ ...TM_DAILY_CONFIG.boosters });
    }
    setDone(false);
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    hydratedRef.current = true;
  }, [resetKey, offset, boardSeedOverride]);

  // Autosave the mutable board state. The per-change effect captures every move
  // (tile placed, undo, shuffle, clear); useAutosave covers idle timer advance
  // and the tab-close case. Both are no-ops once finished.
  const tmStateRef = useRef({});
  tmStateRef.current = { tiles, bar, moves, boosters, secs };
  const buildTmProgress = () => ({
    progress: {
      dayNum,
      tiles: tmStateRef.current.tiles,
      bar: tmStateRef.current.bar,
      moves: tmStateRef.current.moves,
      boosters: tmStateRef.current.boosters,
    },
    steps: tmStateRef.current.moves,
    secs: tmStateRef.current.secs,
  });
  useAutosave(onSaveProgress, buildTmProgress, !done);
  useEffect(() => {
    if (done || !hydratedRef.current || tiles.length === 0 || !onSaveProgress) return;
    const s = buildTmProgress();
    onSaveProgress(s.progress, s.steps, s.secs);
  }, [tiles, bar, moves, boosters, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const tilesMap = {};
  tiles.forEach(t => { tilesMap[t.id] = t; });

  const selectTile = (tileId) => {
    if (clearSlotMode || done) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[tileId];
    if (!tile || tile.removed || tile.inBar) return;
    if (tmIsLocked(tile, tilesCopy)) return;

    if (bar.length >= 7) {
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      setDone(true);
      onLose(movesRef.current + 1, secsRef.current, { share: `Daily Tile Match 💥 ${movesRef.current + 1} moves` });
      return;
    }

    tile.inBar = true;
    const newBar = [...bar, tileId];
    const newMoves = moves + 1;
    const sortedBar = tmSortBar(newBar, tm);

    let matchedIds = null;
    for (let i = 0; i <= sortedBar.length - 3; i++) {
      const a = tm[sortedBar[i]], b = tm[sortedBar[i+1]], c = tm[sortedBar[i+2]];
      if (a && b && c && a.type === b.type && b.type === c.type) {
        matchedIds = [sortedBar[i], sortedBar[i+1], sortedBar[i+2]];
        break;
      }
    }

    let finalBar = sortedBar;
    if (matchedIds) {
      const matchSet = new Set(matchedIds);
      setFlashIds(matchSet);
      matchedIds.forEach(id => { tm[id].removed = true; tm[id].inBar = false; });
      finalBar = sortedBar.filter(id => !matchSet.has(id));
      setTimeout(() => setFlashIds(new Set()), 400);
    }

    if (!matchedIds && finalBar.length >= 7) {
      setTiles(tilesCopy);
      setBar(finalBar);
      setMoves(newMoves);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      setDone(true);
      onLose(newMoves, secsRef.current, { share: `Daily Tile Match 💥 ${newMoves} moves` });
      return;
    }

    setTiles(tilesCopy);
    setBar(finalBar);
    setMoves(newMoves);
    setLastBarEntry(tileId);
    onStepChange(newMoves);
    if (onMoveTile) onMoveTile({ tileType: tile.type, moveSeq: newMoves - 1, tsClient: Date.now() });

    const boardRemaining = tilesCopy.filter(t => !t.removed && !t.inBar);
    if (boardRemaining.length === 0 && finalBar.length === 0) {
      setDone(true);
      onWin(150, newMoves, secsRef.current, { share: `Daily Tile Match ⬢ cleared in ${newMoves} moves! 🀄✨` });
    }
  };

  const doUndo = () => {
    if (boosters.undo <= 0 || !lastBarEntry) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[lastBarEntry];
    if (!tile || !tile.inBar) return;
    tile.inBar = false;
    setTiles(tilesCopy);
    setBar(bar.filter(id => id !== lastBarEntry));
    setLastBarEntry(null);
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
    setBarFull(false);
  };

  const doShuffle = () => {
    if (boosters.shuffle <= 0) return;
    const active = tiles.filter(t => !t.removed && !t.inBar);
    if (active.length < 2) return;
    const positions = active.map(t => ({ col: t.col, row: t.row, layer: t.layer }));
    const rng = tmMulberry32((secs * 1000 & 0xFFFF) + 1);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const tilesCopy = tiles.map(t => ({ ...t }));
    active.forEach((t, i) => {
      const tc = tilesCopy.find(x => x.id === t.id);
      if (tc) { tc.col = positions[i].col; tc.row = positions[i].row; tc.layer = positions[i].layer; }
    });
    setTiles(tilesCopy);
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const doClearMode = () => {
    if (boosters.clear <= 0 || bar.length === 0) return;
    setClearSlotMode(true);
  };

  const clearSlotTile = (tileId) => {
    if (!clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[tileId];
    if (!tile || !tile.inBar) return;
    tile.removed = true;
    tile.inBar = false;
    setTiles(tilesCopy);
    setBar(bar.filter(id => id !== tileId));
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
    setClearSlotMode(false);
    setBarFull(false);
  };

  const cfg = TM_DAILY_CONFIG;
  const boardW = cfg.boardCols * TM_TILE_STEP;
  const boardH = (cfg.boardRows + cfg.maxLayer * 0.5) * TM_TILE_STEP + 48;
  const activeTiles = tiles.filter(t => !t.removed);
  const boardTiles = activeTiles.filter(t => !t.inBar);

  return (
    <div className="tm-wrap">
      <div className="status-bar">
        <div className={`pill tm-timer-pill${timeLow ? ' warning' : ''}`}>
          <div className="plabel">Time</div>
          <div className="pvalue">{tmFmtSecs(remaining)}</div>
        </div>
        <div className="pill">
          <div className="plabel">Moves</div>
          <div className="pvalue">{moves}</div>
        </div>
        <div className="pill">
          <div className="plabel">Tiles Left</div>
          <div className="pvalue">{boardTiles.length}</div>
        </div>
      </div>

      <div className="tm-board-container" style={{ width: boardW, height: boardH, maxWidth: '100%' }}>
        {boardTiles.map(tile => {
          const locked = tmIsLocked(tile, tiles);
          const isFlash = flashIds.has(tile.id);
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}`}
              style={{ left: tile.col * TM_TILE_STEP, top: tile.row * TM_TILE_STEP, zIndex: tile.layer * 10 + 1, background: tt.color }}
              onClick={() => selectTile(tile.id)}
            >
              {tt.icon}
            </div>
          );
        })}
      </div>

      <div className={`tm-bar${barFull ? ' bar-full' : ''}`}>
        {Array.from({ length: 7 }, (_, i) => {
          const tid = bar[i];
          const t = tid != null ? tilesMap[tid] : null;
          const tt = t ? TM_TILE_TYPES[t.type % TM_TILE_TYPES.length] : null;
          const isClear = clearSlotMode && t != null;
          return (
            <div
              key={i}
              className={`tm-slot${t ? ' filled' : ''}${isClear ? ' clear-target' : ''}`}
              onClick={isClear ? () => clearSlotTile(tid) : undefined}
            >
              {tt ? tt.icon : ''}
            </div>
          );
        })}
      </div>
      <div className={`tm-bar-label${barFull ? ' full' : ''}`}>
        {barFull ? '⚠ Bar Full! Use a booster.' : `${bar.length}/7 slots used`}
      </div>

      <div className="tm-boosters">
        <button className="tm-booster-btn" disabled={boosters.undo <= 0 || !lastBarEntry} onClick={doUndo} title="Return last tile to board">
          <span className="tm-booster-icon">↩</span>
          <span>Undo</span>
          <span className="tm-booster-count">{boosters.undo} left</span>
        </button>
        <button className="tm-booster-btn" disabled={boosters.shuffle <= 0} onClick={doShuffle} title="Shuffle board tiles">
          <span className="tm-booster-icon">🔀</span>
          <span>Shuffle</span>
          <span className="tm-booster-count">{boosters.shuffle} left</span>
        </button>
        <button className={`tm-booster-btn${clearSlotMode ? ' active' : ''}`} disabled={boosters.clear <= 0 || bar.length === 0} onClick={clearSlotMode ? () => setClearSlotMode(false) : doClearMode} title="Remove a tile from bar">
          <span className="tm-booster-icon">✕</span>
          <span>{clearSlotMode ? 'Cancel' : 'Clear'}</span>
          <span className="tm-booster-count">{boosters.clear} left</span>
        </button>
      </div>
    </div>
  );
}

