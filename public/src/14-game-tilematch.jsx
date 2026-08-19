/* ============================================================
   Game 7 — Tile Match (3-Tiles style)
   ============================================================ */

// Seeded PRNG (mulberry32) — deterministic layouts per level number.
// mulberry32 is defined once in the shared SDK section above; the Tile Match
// generator (tmGenerateLevel) uses that single definition. The duplicate copy
// that previously lived here produced an identical PRNG sequence and has been
// removed.

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
  const rng = mulberry32(seed);
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

function TileMatchLeaderboard({ user }) {
  const [sub, setSub] = useState('global');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tilematch/leaderboard', { headers: { 'x-usernode-token': window._unToken || '' } })
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
        <div className="tm-lb-row me" style={{ color: 'var(--c-muted)' }}>
          <span className="tm-lb-rank">—</span>
          <span className="tm-lb-name">{user.username} (you)</span>
          <span className="tm-lb-stat">not ranked yet</span>
        </div>
      )}
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
  // Menu state ('play' | 'leaderboard')
  const [tmMenuTab, setTmMenuTab] = useState('play');
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
    const rng = mulberry32((Date.now() & 0xFFFF) + 1);
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

  const submitScore = (highestLevel, totalCleared, sessionScore) => {
    fetch('/api/tilematch/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': window._unToken || '' },
      body: JSON.stringify({ highestLevel, totalCleared, sessionScore }),
    }).catch(() => {});
  };

  const handleNextLevel = () => {
    const ns = sessionScore + levelScore;
    setSessionScore(ns);
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    // Fire-and-forget: submit score
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
    // Fire-and-forget: submit score
    submitScore(selectedLevel, completedLevels.size + 1, ns);
    onWin(ns, newTotalMoves, totalS, { share });
  };

  // ---- Level selector screen ----
  if (phase === 'select') {
    const menuContent = () => {
      if (tmMenuTab === 'leaderboard') return <TileMatchLeaderboard />;
      // 'play' tab — existing level selector
      if (tierPage === null) return (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)', marginBottom: '1rem' }}>Click tiles off the layered board into your 7-slot bar — match three to clear them.</p>
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
          <div className="tm-tier-page-title">{tier.label} <span style={{color:'var(--c-muted)',fontWeight:400,fontSize:'0.85rem'}}>L{tier.start+1}–{tier.end+1}</span></div>
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
        </div>
        <div className="tm-menu-tabs">
          {['play', 'leaderboard'].map(tab => (
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
/* ---- Daily Tile Match difficulty (slice 8) --------------------------------
   What was wrong: the old daily dealt 72 tiles as 8 icons × 3 triples into a
   FIXED stack (40 bottom / 28 middle / 4 top) — the same silhouette every day,
   only the icons moved. ~22 tiles were tappable at once across just 8 types, so
   a matching triple was nearly always available, and with 7 tray slots against
   8 types you essentially could not be trapped. No dead end, no ordering
   decision, no reason to spend a booster: the only variable was tap speed.

   What makes a good tile-match daily, in order of importance:
     1. Solvable but not TRIVIALLY solvable — there must exist an order that
        loses, or nothing you do is a decision.
     2. Few enough tiles free at any moment that choosing between them matters
        (target 8–14, not 22).
     3. Triples split across layers, so greedy "take whatever matches" play
        eventually strands the third tile under something.

   How this build gets there: eight hand-authored layouts rotate on the daily
   seed (§TM_LAYOUTS); 12 types × 2 triples means the 7-slot tray genuinely
   fills; and tmDealSolvable deals by reverse-removal so at least one winning
   order always exists — mandatory once the board is tight enough to lose on. */

const TM_DAILY_TYPES = 12;   // mirrored by TM_CONFIG.tileTypes in lib/dapp.js
const TM_DAILY_SETS = 2;     // mirrored by TM_CONFIG.setsPerType in lib/dapp.js
const TM_DAILY_TILES = TM_DAILY_TYPES * TM_DAILY_SETS * 3; // 72
const TM_DAILY_BOOSTERS = { undo: 3, shuffle: 2, clear: 1 };

/* Eight layouts, each exactly TM_DAILY_TILES slots, authored the way CP_LEVELS
   authors Crate Push rooms. Slots are { col, row, layer } on the same
   half-step overlap model tmIsLocked uses, so a higher layer sitting within
   1.0 in both axes covers the tile below. `depth` drives the weekly curve. */
function tmSlots(spec) {
  // spec: [{ layer, cols, rows, x, y }] — a rectangular block per layer.
  const out = [];
  for (const b of spec) {
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        out.push({ col: b.x + c, row: b.y + r, layer: b.layer });
      }
    }
  }
  return out;
}
// Normalize a hand-authored slot list to EXACTLY n slots. Authoring blocks by
// hand never lands on 72 first try, and a layout that is short or long breaks
// the tile budget the engine mirrors — so this is deterministic and total:
//   too many → drop from the highest layers first (never strand a tile with
//              nothing under it),
//   too few  → fill from a deterministic layer-0 sweep of unused cells.
function tmFitSlots(slots, n) {
  const key = (s) => `${s.layer}:${s.col}:${s.row}`;
  const seen = new Set();
  const uniq = [];
  for (const s of slots) { if (!seen.has(key(s))) { seen.add(key(s)); uniq.push(s); } }
  // Bottom-up so slice() keeps the base and drops the peak.
  uniq.sort((a, b) => a.layer - b.layer || a.row - b.row || a.col - b.col);
  if (uniq.length >= n) return uniq.slice(0, n);
  // Sweep layer 0's integer grid first, then the half-step grids of the layers
  // above — a dense base layout can exhaust layer 0 on its own (Spiral does).
  for (let layer = 0; layer <= 2 && uniq.length < n; layer++) {
    const off = layer * 0.5;
    for (let row = 0; row < 6 - layer && uniq.length < n; row++) {
      for (let col = 0; col < 8 - layer && uniq.length < n; col++) {
        const cand = { col: col + off, row: row + off, layer };
        if (seen.has(key(cand))) continue;
        seen.add(key(cand));
        uniq.push(cand);
      }
    }
  }
  uniq.sort((a, b) => a.layer - b.layer || a.row - b.row || a.col - b.col);
  return uniq.slice(0, n);
}

/* The eight daily layouts, ordered by MEASURED difficulty (rank 1 = gentlest).
   Each was evaluated over 80 seeded deals with a competent-but-boosterless
   solver; the win rates in the comments are that solver's, so a real player
   with 3 undos / 2 shuffles / 1 clear does better than the number suggests.

   Balance note: the original plan wanted 8–14 free tiles at any moment. With
   12 types against a 7-slot tray that proved near-unwinnable (measured ~3%),
   because you cannot steer when you have no choice of tile. The binding
   constraint on difficulty turned out to be the TYPE COUNT, not the free-tile
   count — 12 types is what makes the tray genuinely jam. So free-tile counts
   land in the 30s here and the ladder is set by layout shape instead. */
const TM_LAYOUTS = [
  // rank 1 — solver ~55%
  { name: 'Courtyard', rank: 1, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0,   y: 0 },
    { layer: 1, cols: 7, rows: 1, x: 0.5, y: 0.5 },
    { layer: 1, cols: 7, rows: 1, x: 0.5, y: 3.5 },
    { layer: 2, cols: 5, rows: 2, x: 1.5, y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 2 — solver ~44%
  { name: 'Gate', rank: 2, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0,   y: 0 },
    { layer: 1, cols: 2, rows: 4, x: 0.5, y: 0.5 },
    { layer: 1, cols: 2, rows: 4, x: 5.5, y: 0.5 },
    { layer: 2, cols: 2, rows: 2, x: 3,   y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 3 — solver ~35%
  { name: 'Lagoon', rank: 3, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0, y: 0 },
    { layer: 1, cols: 2, rows: 2, x: 1, y: 1 },
    { layer: 1, cols: 2, rows: 2, x: 5, y: 1 },
    { layer: 1, cols: 2, rows: 2, x: 3, y: 2.5 },
    { layer: 2, cols: 2, rows: 1, x: 3, y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 4 — solver ~34%
  { name: 'Pyramid', rank: 4, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0, y: 0 },
    { layer: 1, cols: 6, rows: 3, x: 1, y: 1 },
    { layer: 2, cols: 4, rows: 2, x: 2, y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 5 — solver ~31%
  { name: 'Crown', rank: 5, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0, y: 0 },
    { layer: 1, cols: 6, rows: 2, x: 1, y: 0.5 },
    { layer: 1, cols: 6, rows: 1, x: 1, y: 3.5 },
    { layer: 2, cols: 4, rows: 1, x: 2, y: 2 },
  ]), TM_DAILY_TILES) },
  // rank 6 — solver ~23%
  { name: 'Fortress', rank: 6, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0,   y: 0 },
    { layer: 1, cols: 7, rows: 3, x: 0.5, y: 0.5 },
    { layer: 2, cols: 3, rows: 2, x: 2.5, y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 7 — solver ~21%
  { name: 'Turtle', rank: 7, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0,   y: 0 },
    { layer: 1, cols: 5, rows: 4, x: 1.5, y: 0.5 },
    { layer: 2, cols: 3, rows: 2, x: 2.5, y: 1.5 },
  ]), TM_DAILY_TILES) },
  // rank 8 — solver ~18%
  { name: 'Bridge', rank: 8, slots: tmFitSlots(tmSlots([
    { layer: 0, cols: 8, rows: 5, x: 0,   y: 0 },
    { layer: 1, cols: 3, rows: 3, x: 0.5, y: 1 },
    { layer: 1, cols: 3, rows: 3, x: 4.5, y: 1 },
    { layer: 2, cols: 2, rows: 2, x: 3,   y: 1.5 },
  ]), TM_DAILY_TILES) },
];

// Every layout MUST carry exactly the daily tile budget — the engine in
// lib/dapp.js mirrors that total, and a short layout would deal a board that
// can never reach isTerminal. Fail loudly at load rather than at play time.
TM_LAYOUTS.forEach((l) => {
  if (l.slots.length !== TM_DAILY_TILES) {
    console.error(`[tilematch] layout "${l.name}" has ${l.slots.length} slots, expected ${TM_DAILY_TILES}`);
  }
});

// Weekday → the difficulty band, and which slice of the rank-ordered layout
// ladder that band draws from. Monday is the gentlest, the weekend the hardest.
const TM_WEEK = [
  { label: 'Gentle', from: 0, to: 2 },  // Monday
  { label: 'Gentle', from: 0, to: 3 },  // Tuesday
  { label: 'Easy',   from: 1, to: 4 },  // Wednesday
  { label: 'Medium', from: 2, to: 5 },  // Thursday
  { label: 'Medium', from: 3, to: 6 },  // Friday
  { label: 'Hard',   from: 4, to: 8 },  // Saturday
  { label: 'Hard',   from: 5, to: 8 },  // Sunday
];

// Weekly curve. TM_LAYOUTS is ordered gentlest-first by measured difficulty, so
// the weekday picks a WINDOW of that ladder and the day number rotates within
// it — the shape changes daily while the difficulty tracks the week.
// Day 0 of the UTC epoch was a Thursday, hence the +4 to land Monday on 0.
function tmDailyConfig(dayNum) {
  const weekday = (((dayNum + 4) % 7) + 7) % 7; // 0 = Monday … 6 = Sunday
  const band = TM_WEEK[weekday];
  const window = TM_LAYOUTS.slice(band.from, band.to);
  const pool = window.length ? window : TM_LAYOUTS;
  const idx = Math.abs(Math.floor(dayNum / 7)) % pool.length;
  const layout = pool[idx];
  return {
    layout,
    layoutIdx: TM_LAYOUTS.indexOf(layout),
    tileTypes: TM_DAILY_TYPES,
    setsPerType: TM_DAILY_SETS,
    difficulty: band.label,
    weekday,
    boosters: { ...TM_DAILY_BOOSTERS },
  };
}

// Is `slot` covered by any HIGHER-layer slot that is still present? Same
// overlap model as tmIsLocked, but evaluated over a partially dealt board.
function tmSlotCovered(slot, placed) {
  for (const p of placed) {
    if (p.layer <= slot.layer) continue;
    if (Math.abs(p.col - slot.col) < 1.0 && Math.abs(p.row - slot.row) < 1.0) return true;
  }
  return false;
}

/* Reverse-removal dealing — the same technique mjDeal uses for Mahjong
   Solitaire, and mandatory here now that the board is tight enough to lose on.

   Why it works: fill the slots in some order f1..fn and define the REMOVAL
   order as the exact reverse. When fi is removed, the tiles still on the board
   are f1..f(i-1) — precisely the set that was already placed when fi was
   filled. So if every slot is uncovered BY THE ALREADY-PLACED SET at fill
   time, every tile is free at removal time, and reversing the fill order is a
   guaranteed winning line.

   Coverage runs upward (only a HIGHER layer covers a lower one), so filling
   low layers first is always safe; picking a high slot early can strand the
   slots beneath it, which is what the retry loop and the low-layer bias are
   for. Within that constraint the picker still spreads a triple across
   distinct layers where it can — that's what punishes greedy top-first play,
   because the third tile of a set ends up buried. */
function tmDealSolvable(layout, tileTypes, setsPerType, rng) {
  const slots = layout.slots;
  const total = slots.length;
  const triples = Math.floor(total / 3);
  for (let attempt = 0; attempt < 40; attempt++) {
    const remaining = slots.map((s, i) => ({ ...s, idx: i }));
    const placed = [];
    const assign = new Array(total).fill(-1);
    let ok = true;
    // Each type gets `setsPerType` triples; shuffled so the board isn't
    // type-ordered by layer.
    const typeBag = [];
    for (let t = 0; t < tileTypes; t++) for (let k = 0; k < setsPerType; k++) typeBag.push(t);
    while (typeBag.length < triples) typeBag.push(typeBag.length % tileTypes);
    ceShuffle(typeBag, rng);

    // The fill order must be a linear extension of the coverage order: a slot
    // may only be filled once every slot BENEATH it is filled. (If a covering
    // tile were placed first, the tile under it would be pinned forever, since
    // `placed` only grows.) Kahn's algorithm with a random choice among ready
    // slots gives a different valid order every seed.
    const under = new Map(); // slot idx → count of unfilled slots beneath it
    const above = new Map(); // slot idx → slots directly on top of it
    for (const s of remaining) { under.set(s.idx, 0); above.set(s.idx, []); }
    for (const hi of remaining) {
      for (const lo of remaining) {
        if (lo.layer >= hi.layer) continue;
        if (Math.abs(hi.col - lo.col) < 1.0 && Math.abs(hi.row - lo.row) < 1.0) {
          under.set(hi.idx, under.get(hi.idx) + 1);
          above.get(lo.idx).push(hi.idx);
        }
      }
    }
    const byIdx = new Map(remaining.map((s) => [s.idx, s]));
    let ready = remaining.filter((s) => under.get(s.idx) === 0);
    const order = [];
    while (ready.length) {
      const pick = ready.splice(Math.floor(rng() * ready.length), 1)[0];
      order.push(pick);
      for (const hiIdx of above.get(pick.idx)) {
        under.set(hiIdx, under.get(hiIdx) - 1);
        if (under.get(hiIdx) === 0) ready.push(byIdx.get(hiIdx));
      }
    }
    if (order.length !== total) { ok = false; }

    // Chunk the fill order into consecutive triples and give each one a type.
    // Chunk boundaries fall wherever the order happens to cross layers, which
    // is what leaves a set's third tile buried under later ones.
    if (ok) {
      for (let t = 0; t < triples; t++) {
        for (let k = 0; k < 3; k++) {
          const s = order[t * 3 + k];
          if (!s) { ok = false; break; }
          assign[s.idx] = typeBag[t];
          placed.push(s);
        }
        if (!ok) break;
      }
    }
    if (!ok || assign.some((v) => v < 0)) continue;
    const out = slots.map((s, i) => ({
      id: i, type: assign[i], col: s.col, row: s.row, layer: s.layer,
      removed: false, inBar: false,
    }));
    // The guaranteed winning line: fill order reversed. Carried as a property
    // on the array (not on the tiles), so it never reaches persisted progress —
    // it exists so the deal's solvability is testable rather than asserted.
    out.solveOrder = placed.map((s) => s.idx).reverse();
    return out;
  }
  // Fall back to the plain shuffle if a layout ever refuses to deal. Logged
  // once so a bad layout is visible rather than silently easier.
  console.warn('[tilematch] reverse-removal deal failed; falling back to shuffle');
  const typeList = [];
  for (let t = 0; t < tileTypes; t++) for (let k = 0; k < setsPerType; k++) typeList.push(t, t, t);
  ceShuffle(typeList, rng);
  return slots.map((s, i) => ({
    id: i, type: typeList[i % typeList.length], col: s.col, row: s.row, layer: s.layer,
    removed: false, inBar: false,
  }));
}

/* Score. Mirrors tmDailyCeiling in lib/dapp.js: the engine returns the ceiling
   (zero elapsed time, every booster unspent) and this only ever subtracts, so
   validateSession's `claimed > recomputed` check can never fire on an honest
   run. Any change here MUST be mirrored there in the same commit. */
const TM_SCORE = {
  base: 600, parBonus: 300, boosterBonus: 40, boostersTotal: 6, movePenalty: 4, min: 100,
};
function tmDailyScore({ secs, moves, boostersLeft, timeLimit }) {
  const par = timeLimit * 0.6; // under 60% of the clock earns the full bonus
  const timeBonus = Math.round(TM_SCORE.parBonus * Math.max(0, Math.min(1, (timeLimit - secs) / Math.max(timeLimit - par, 1))));
  const boosterBonus = TM_SCORE.boosterBonus * Math.max(0, Math.min(TM_SCORE.boostersTotal, boostersLeft));
  const penalty = TM_SCORE.movePenalty * Math.max(0, moves - TM_DAILY_TILES);
  return Math.max(TM_SCORE.min, TM_SCORE.base + timeBonus + boosterBonus - penalty);
}

const TM_DAILY_CONFIG = {
  tileTypes: TM_DAILY_TYPES, setsPerType: TM_DAILY_SETS, boardCols: 8, boardRows: 5, maxLayer: 4,
  boosters: { ...TM_DAILY_BOOSTERS },
};
const TM_DAILY_TIME_LIMIT = 300; // 5 minutes — the boards are bigger now

const TM_DAILY_HINT_CAP = 5; // paid hints per day for the Daily Tile Match

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
  const [hintsApplied, setHintsApplied] = useState(0); // count, persisted
  const [hintTileId, setHintTileId] = useState(null);  // transient highlight
  const secsRef = useRef(0);
  const movesRef = useRef(0);

  // Server-anchored UTC day; the board is re-derived deterministically from it,
  // so persisted progress only carries the mutable player state.
  const dayNum = cwDayNum(offset || 0);
  // Today's layout + difficulty band (slice 8). Recomputed per render from the
  // server-anchored day number, so it can't drift from the seed.
  const dayCfg = tmDailyConfig(dayNum);
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
    // Server-issued seed first (phase 2); legacy dayNum derivation as fallback.
    const srvSeed = serverDailySeed('tilematchingdaily');
    const seed = boardSeedOverride != null ? boardSeedOverride
      : (srvSeed != null ? srvSeed : (dayNum * 31 + 7));
    // Reverse-removal deal on today's layout (slice 8) — always solvable.
    const freshTiles = tmDealSolvable(dayCfg.layout, dayCfg.tileTypes, dayCfg.setsPerType, mulberry32(seed));
    const saved = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.tiles)
      ? savedProgress
      : null;
    // Reject a row saved under the OLD config (72 tiles over 8 types, or a
    // different layout's slot count) — hydrating it would render a board that
    // can't be completed. Falls back to a fresh deal for today only.
    const shapeOk = saved && saved.tiles.length === freshTiles.length
      && saved.tiles.every(t => Number.isFinite(t.type) && t.type < dayCfg.tileTypes);
    const resume = shapeOk ? saved : null;
    if (saved && !shapeOk) {
      console.warn('[tilematch] saved progress predates the current board config — dealing fresh');
    }
    if (resume) {
      setTiles(resume.tiles.map(t => ({ ...t })));
      setBar(Array.isArray(resume.bar) ? resume.bar.slice() : []);
      setMoves(Number.isFinite(resume.moves) ? resume.moves : 0);
      setSecs(Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0);
      setBoosters(resume.boosters ? { ...resume.boosters } : { ...TM_DAILY_CONFIG.boosters });
      setHintsApplied(Number.isFinite(resume.hintsApplied) ? resume.hintsApplied : 0);
      // A resumed run's earlier taps predate this mount — the move log is
      // incomplete, so the finish can't be replay-validated (tier B instead).
      if (onMoveTile) onMoveTile({ replayBreak: 'resume', tsClient: Date.now() });
    } else {
      setTiles(freshTiles);
      setBar([]);
      setMoves(0);
      setSecs(0);
      setBoosters({ ...TM_DAILY_CONFIG.boosters });
      setHintsApplied(0);
    }
    setHintTileId(null);
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
  tmStateRef.current = { tiles, bar, moves, boosters, secs, hintsApplied };
  const buildTmProgress = () => ({
    progress: {
      dayNum,
      tiles: tmStateRef.current.tiles,
      bar: tmStateRef.current.bar,
      moves: tmStateRef.current.moves,
      boosters: tmStateRef.current.boosters,
      hintsApplied: tmStateRef.current.hintsApplied,
    },
    steps: tmStateRef.current.moves,
    secs: tmStateRef.current.secs,
  });
  useAutosave(onSaveProgress, buildTmProgress, !done);
  useEffect(() => {
    if (done || !hydratedRef.current || tiles.length === 0 || !onSaveProgress) return;
    const s = buildTmProgress();
    onSaveProgress(s.progress, s.steps, s.secs);
  }, [tiles, bar, moves, boosters, hintsApplied, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paid hint: highlight a recommended next tile. Prefer a free tile whose type
  // already has ≥2 copies in the bar (completes a triple), else any free tile
  // whose type has another free copy on the board, else any free tile.
  const tmHints = useDailyHints({ gameId: 'tilematchingdaily', maxHints: TM_DAILY_HINT_CAP });
  const recommendTile = () => {
    const free = tiles.filter(t => !t.removed && !t.inBar && !tmIsLocked(t, tiles));
    if (!free.length) return null;
    const byId = {};
    tiles.forEach(t => { byId[t.id] = t; });
    const barCounts = {};
    bar.forEach(id => { const t = byId[id]; if (t) barCounts[t.type] = (barCounts[t.type] || 0) + 1; });
    // 1) completes a triple already started in the bar
    let pick = free.find(t => (barCounts[t.type] || 0) >= 2);
    if (pick) return pick;
    // 2) a type that has at least two free copies (progress toward a triple)
    const freeCounts = {};
    free.forEach(t => { freeCounts[t.type] = (freeCounts[t.type] || 0) + 1; });
    pick = free.find(t => freeCounts[t.type] >= 2);
    return pick || free[0];
  };
  const buyTmHint = () => {
    if (done) return;
    tmHints.buy(() => {
      const pick = recommendTile();
      if (!pick) return true; // nothing to suggest (server already charged)
      setHintTileId(pick.id);
      setHintsApplied(n => n + 1);
      setTimeout(() => setHintTileId(cur => (cur === pick.id ? null : cur)), 2500);
      return true;
    });
  };

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
      // Score now reflects HOW you cleared it — pace, efficiency and boosters
      // saved — instead of a flat 150. Sits under lib/dapp.js's ceiling by
      // construction, so tier-A verification still passes.
      const boostersLeft = boosters.undo + boosters.shuffle + boosters.clear;
      const score = tmDailyScore({
        secs: secsRef.current, moves: newMoves, boostersLeft, timeLimit: TM_DAILY_TIME_LIMIT,
      });
      onWin(score, newMoves, secsRef.current, {
        share: `Daily Tile Match ⬢ cleared the ${dayCfg.layout.name} board in ${newMoves} moves for ${score} pts 🀄✨`,
      });
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
    // Boosters aren't modeled by the server replay engine — mark the run
    // replay-ineligible (finish falls back to tier-B heuristics).
    if (onMoveTile) onMoveTile({ replayBreak: 'undo', tsClient: Date.now() });
  };

  const doShuffle = () => {
    if (boosters.shuffle <= 0) return;
    const active = tiles.filter(t => !t.removed && !t.inBar);
    if (active.length < 2) return;
    const positions = active.map(t => ({ col: t.col, row: t.row, layer: t.layer }));
    const rng = mulberry32((secs * 1000 & 0xFFFF) + 1);
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
    if (onMoveTile) onMoveTile({ replayBreak: 'shuffle', tsClient: Date.now() });
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
    if (onMoveTile) onMoveTile({ replayBreak: 'clear-slot', tsClient: Date.now() });
  };

  // The board box is sized from the LAYOUT's actual extent, not a fixed
  // 8x5 assumption — layouts differ in footprint, and FitScale then shrinks
  // the whole thing to whatever the viewport allows.
  const slots = dayCfg.layout.slots;
  const boardW = (Math.max(...slots.map(s => s.col)) + 1) * TM_TILE_STEP;
  const boardH = (Math.max(...slots.map(s => s.row)) + 1) * TM_TILE_STEP + 24;
  const activeTiles = tiles.filter(t => !t.removed);
  const boardTiles = activeTiles.filter(t => !t.inBar);
  const freeCount = boardTiles.filter(t => !tmIsLocked(t, tiles)).length;

  return (
    <div className="tm-wrap fit-col">
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
        <div className="pill">
          <div className="plabel">Free</div>
          <div className="pvalue">{freeCount}</div>
        </div>
      </div>
      <div className="tm-daylabel">
        {dayCfg.layout.name} · {dayCfg.difficulty}
      </div>

      <FitScale>
      <div className="tm-board-container" style={{ width: boardW, height: boardH }}>
        {boardTiles.map(tile => {
          const locked = tmIsLocked(tile, tiles);
          const isFlash = flashIds.has(tile.id);
          const isHint = hintTileId === tile.id;
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}${isHint ? ' hint-target' : ''}`}
              style={{ left: tile.col * TM_TILE_STEP, top: tile.row * TM_TILE_STEP, zIndex: tile.layer * 10 + 1, background: tt.color }}
              onClick={() => selectTile(tile.id)}
            >
              {tt.icon}
            </div>
          );
        })}
      </div>
      </FitScale>

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

      {!done && (
        <HintBar
          hintsLeft={tmHints.hintsLeft}
          exhausted={tmHints.exhausted || boardTiles.length === 0}
          buying={tmHints.buying}
          onBuy={buyTmHint}
          msg={tmHints.msg}
          label="No more hints"
        />
      )}
    </div>
  );
}

