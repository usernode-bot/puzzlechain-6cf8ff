function Match3Game({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, resetKey }) {
  const [phase, setPhase] = useState('campaign'); // 'campaign' | 'playing' | 'won' | 'lost'
  const [selectedPuzzle, setSelectedPuzzle] = useState(1);
  const [puzzleConfig, setPuzzleConfig] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [boardSeed, setBoardSeed] = useState(0);

  const secs = useElapsed(resetKey, !done && phase === 'playing');
  const secsRef = useRef(0);
  secsRef.current = secs;

  // Match-3 puzzle definitions (same as server)
  const MATCH3_PUZZLES = [
    { id: 1, name: 'Getting Started', target: 800, timeLimit: 120, moveLimit: 30, layers: 2, difficulty: 'Easy' },
    { id: 2, name: 'Gather Gems', target: 1200, timeLimit: 120, moveLimit: 28, layers: 3, difficulty: 'Easy' },
    { id: 3, name: 'Color Cascade', target: 1500, timeLimit: 120, moveLimit: 26, layers: 2, difficulty: 'Easy' },
    { id: 4, name: 'Tile Practice', target: 2000, timeLimit: 120, moveLimit: 35, layers: 3, difficulty: 'Easy' },
    { id: 5, name: 'Gem Master', target: 2500, timeLimit: 120, moveLimit: 32, layers: 2, difficulty: 'Easy' },
    { id: 6, name: 'Combo Chain', target: 1800, timeLimit: 120, moveLimit: 40, layers: 2, difficulty: 'Easy' },
    { id: 7, name: 'Rainbow Tiles', target: 2200, timeLimit: 120, moveLimit: 30, layers: 3, difficulty: 'Easy' },
    { id: 8, name: 'Momentum', target: 2700, timeLimit: 120, moveLimit: 28, layers: 2, difficulty: 'Easy' },
    { id: 9, name: 'Precision Match', target: 2000, timeLimit: 120, moveLimit: 25, layers: 3, difficulty: 'Easy' },
    { id: 10, name: 'Power Play', target: 2800, timeLimit: 120, moveLimit: 32, layers: 3, difficulty: 'Easy' },
    { id: 11, name: 'Rising Challenge', target: 3000, timeLimit: 110, moveLimit: 28, layers: 3, difficulty: 'Medium' },
    { id: 12, name: 'Locked Tiles', target: 3200, timeLimit: 110, moveLimit: 26, layers: 4, difficulty: 'Medium' },
    { id: 13, name: 'Strategic Moves', target: 3500, timeLimit: 110, moveLimit: 30, layers: 3, difficulty: 'Medium' },
    { id: 14, name: 'Gem Rush', target: 3800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 15, name: 'Pressure Cooker', target: 3200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 16, name: 'Ice Breaker', target: 4000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 17, name: 'Cascade Master', target: 3600, timeLimit: 110, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 18, name: 'Deep Focus', target: 4200, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 19, name: 'Tile Tactics', target: 3900, timeLimit: 100, moveLimit: 25, layers: 3, difficulty: 'Medium' },
    { id: 20, name: 'Gem Sculptor', target: 4400, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 21, name: 'Locked & Loaded', target: 4100, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 22, name: 'Precision Strike', target: 3800, timeLimit: 100, moveLimit: 23, layers: 3, difficulty: 'Medium' },
    { id: 23, name: 'Color Theory', target: 4300, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 24, name: 'Momentum Shift', target: 4600, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 25, name: 'Maze Solver', target: 4000, timeLimit: 100, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 26, name: 'Time Pressure', target: 3900, timeLimit: 90, moveLimit: 22, layers: 4, difficulty: 'Medium' },
    { id: 27, name: 'Champion\'s Path', target: 4500, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 28, name: 'Final Stand', target: 4800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 29, name: 'Gem Dynasty', target: 4200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 30, name: 'Gateway Challenge', target: 5000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 31, name: 'Expert Territory', target: 5200, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 32, name: 'Ice Fortress', target: 5400, timeLimit: 100, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 33, name: 'Avalanche', target: 5800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 34, name: 'Locked Labyrinth', target: 5600, timeLimit: 100, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 35, name: 'Inferno', target: 6000, timeLimit: 90, moveLimit: 22, layers: 5, difficulty: 'Hard' },
    { id: 36, name: 'Master Puzzle', target: 5900, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 37, name: 'Complexity', target: 6200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 38, name: 'Precision Required', target: 5800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 39, name: 'Final Test', target: 6400, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 40, name: 'Legendary Tier', target: 6600, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 41, name: 'Peak Performance', target: 6000, timeLimit: 90, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 42, name: 'Unrelenting', target: 6300, timeLimit: 100, moveLimit: 27, layers: 5, difficulty: 'Hard' },
    { id: 43, name: 'Titan\'s Trial', target: 6800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 44, name: 'Endgame', target: 6500, timeLimit: 90, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 45, name: 'Perfection Quest', target: 6900, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 46, name: 'Unstoppable', target: 6700, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 47, name: 'Ultra Challenge', target: 7000, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 48, name: 'Reality Bender', target: 6800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 49, name: 'Pandora\'s Box', target: 7100, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 50, name: 'Master Challenge', target: 7200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  ];

  // Load user progress
  useEffect(() => {
    (async () => {
      const { ok, body } = await api('/api/match3/progress');
      if (ok && body) {
        setUserProgress(body);
        setSelectedPuzzle(body.lastPlayedPuzzle || 1);
      }
    })();
  }, []);

  // Start a puzzle
  const startPuzzle = async (puzzleId) => {
    const { ok, body } = await api(`/api/match3/start/${puzzleId}`);
    if (ok && body) {
      setPuzzleConfig(body);
      setBoardSeed(body.boardSeed);
      setSelectedPuzzle(puzzleId);

      if (body.savedSession) {
        setTiles(body.savedSession.tiles || []);
        setBar(body.savedSession.bar || []);
        setScore(body.savedSession.score || 0);
        setMoves(body.savedSession.moves || 0);
      } else {
        // Generate fresh board (simple: 5 random tiles per layer)
        const config = body;
        const newTiles = [];
        let id = 1;
        for (let i = 0; i < config.layers * 5; i++) {
          newTiles.push({
            id: id++,
            type: i % 5,
            pos: i,
            locked: false,
            inBar: false,
            removed: false,
          });
        }
        setTiles(newTiles);
        setBar([]);
        setScore(0);
        setMoves(0);
      }

      setDone(false);
      setPhase('playing');
    }
  };

  // Handle tile click
  const selectTile = (tileId) => {
    if (phase !== 'playing' || done) return;
    if (bar.length >= 7) {
      onLose(moves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle} • ${moves} moves` });
      setDone(true);
      setPhase('lost');
      return;
    }

    const newBar = [...bar, tileId];
    const newMoves = moves + 1;

    // Check for match-3
    let matched = false;
    if (newBar.length >= 3) {
      for (let i = 0; i <= newBar.length - 3; i++) {
        const t1 = tiles.find(t => t.id === newBar[i]);
        const t2 = tiles.find(t => t.id === newBar[i + 1]);
        const t3 = tiles.find(t => t.id === newBar[i + 2]);
        if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type) {
          matched = true;
          // Remove matched tiles
          const toRemove = new Set([newBar[i], newBar[i + 1], newBar[i + 2]]);
          setTiles(tiles.map(t => toRemove.has(t.id) ? { ...t, removed: true } : t));
          setBar(newBar.filter(id => !toRemove.has(id)));
          const newScore = score + 300;
          setScore(newScore);
          setMoves(newMoves);
          onStepChange && onStepChange(newMoves);

          if (newScore >= puzzleConfig.target) {
            onWin(newScore, newMoves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle}: ${newScore}pts` });
            setDone(true);
            setPhase('won');
            api(`/api/match3/finish/${selectedPuzzle}`, {
              method: 'POST',
              body: JSON.stringify({ score: newScore, timeSecs: secsRef.current, moves: newMoves })
            }).then(({ ok }) => {
              if (ok) {
                api('/api/match3/abandon/' + selectedPuzzle, { method: 'POST' });
              }
            });
          }
          return;
        }
      }
    }

    if (!matched) {
      setBar(newBar);
      setMoves(newMoves);
      onStepChange && onStepChange(newMoves);
    }
  };

  // Autosave
  useAutosave(
    onSaveProgress,
    () => ({
      puzzleId: selectedPuzzle,
      tiles,
      bar,
      score,
      moves,
    }),
    !done && phase === 'playing'
  );

  if (phase === 'campaign' && userProgress) {
    // Campaign selection screen
    const easyPuzzles = MATCH3_PUZZLES.slice(0, 10);
    const mediumPuzzles = MATCH3_PUZZLES.slice(10, 30);
    const hardPuzzles = MATCH3_PUZZLES.slice(30, 50);

    return React.createElement(
      'div',
      { style: { padding: '1.5rem', maxWidth: '900px', margin: '0 auto' } },
      React.createElement('h2', { style: { marginBottom: '1.5rem', color: C.text } }, '🟩 Match-3 Campaign'),
      React.createElement('div', { style: { marginBottom: '2rem', padding: '1rem', background: C.card, borderRadius: '0.5rem', border: `1px solid ${C.border}` } },
        React.createElement('div', { style: { display: 'flex', gap: '2rem', marginBottom: '1rem' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Highest Puzzle'),
            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 700, color: C.gold } }, `${userProgress.highestPuzzle}/50`)
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Best Score'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.emerald } }, userProgress.bestScore.toLocaleString())
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Completed'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.accent } }, userProgress.totalCompleted)
          )
        ),
        userProgress.highestPuzzle > 0 && React.createElement(
          'button',
          {
            onClick: () => startPuzzle(Math.min(userProgress.lastPlayedPuzzle, 50)),
            style: {
              padding: '0.5rem 1rem',
              background: C.accent,
              color: C.bg,
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }
          },
          '▶ Resume Puzzle ' + Math.min(userProgress.lastPlayedPuzzle, 50)
        )
      ),
      ['Easy (1-10)', 'Medium (11-30)', 'Hard (31-50)'].map((tier, tierIdx) => {
        const puzzles = tierIdx === 0 ? easyPuzzles : tierIdx === 1 ? mediumPuzzles : hardPuzzles;
        const tierColor = tierIdx === 0 ? C.emerald : tierIdx === 1 ? C.gold : C.rose;
        return React.createElement(
          'div',
          { key: tier, style: { marginBottom: '2rem' } },
          React.createElement('h3', { style: { color: tierColor, marginBottom: '1rem', fontSize: '1.1rem' } }, tier),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' } },
            puzzles.map(p => {
              const isSolved = p.id <= userProgress.highestPuzzle;
              return React.createElement(
                'button',
                {
                  key: p.id,
                  onClick: () => isSolved && startPuzzle(p.id),
                  disabled: !isSolved,
                  style: {
                    padding: '1rem',
                    background: isSolved ? C.card : C.surface,
                    color: isSolved ? C.text : C.muted,
                    border: `1px solid ${isSolved ? C.accent : C.border}`,
                    borderRadius: '0.375rem',
                    cursor: isSolved ? 'pointer' : 'not-allowed',
                    opacity: isSolved ? 1 : 0.5,
                    transition: 'all 0.2s',
                  },
                  onMouseEnter: (e) => { if (isSolved) e.target.style.background = C.border; },
                  onMouseLeave: (e) => { e.target.style.background = C.card; }
                },
                React.createElement('div', { style: { fontWeight: 700 } }, isSolved ? '✓' : p.id),
                React.createElement('div', { style: { fontSize: '0.75rem', marginTop: '0.25rem' } }, p.name)
              );
            })
          )
        );
      })
    );
  }

  if (phase === 'playing' && puzzleConfig) {
    return React.createElement(
      'div',
      { style: { padding: '1rem', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
      React.createElement(
        'div',
        { className: 'status-bar', style: { marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' } },
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Score'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${score} / ${puzzleConfig.targetScore}`)
        ),
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Moves'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${moves} / ${puzzleConfig.moveLimit}`)
        ),
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Time'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${secs}s`)
        )
      ),
      React.createElement(
        'div',
        { style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' } },
        tiles.map(t => {
          const colors = [C.rose, C.amber, C.emerald, C.accent, C.violet];
          return React.createElement(
            'button',
            {
              key: t.id,
              onClick: () => selectTile(t.id),
              disabled: t.removed || done,
              style: {
                padding: '2rem',
                background: t.removed ? C.surface : colors[t.type % 5],
                border: 'none',
                borderRadius: '0.375rem',
                cursor: t.removed ? 'default' : 'pointer',
                opacity: t.removed ? 0.2 : 1,
                fontSize: '2rem',
                transition: 'all 0.2s',
              }
            },
            t.removed ? '✓' : '●'
          );
        })
      ),
      React.createElement(
        'div',
        { style: { marginTop: '1.5rem', padding: '1rem', background: C.card, borderRadius: '0.5rem', minHeight: '60px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted, marginRight: '0.5rem' } }, 'Bar:'),
        bar.length > 0 ? bar.map(id => {
          const t = tiles.find(tile => tile.id === id);
          const colors = [C.rose, C.amber, C.emerald, C.accent, C.violet];
          return React.createElement('div', {
            key: id,
            style: {
              width: '40px',
              height: '40px',
              background: colors[t.type % 5],
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: C.bg,
            }
          }, t.type);
        }) : React.createElement('span', { style: { color: C.muted } }, '(empty)')
      )
    );
  }

  return React.createElement('div', { style: { padding: '1rem', color: C.text } }, 'Loading...');
}
