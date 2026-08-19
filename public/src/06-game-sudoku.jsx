/* ============================================================
   Game 1 — Mini Sudoku (6×6)
   ============================================================ */
const SUDOKU6_SOLUTION = [
  [1, 2, 3, 4, 5, 6],
  [4, 5, 6, 1, 2, 3],
  [2, 3, 1, 5, 6, 4],
  [5, 6, 4, 2, 3, 1],
  [3, 1, 2, 6, 4, 5],
  [6, 4, 5, 3, 1, 2],
];

// Fisher–Yates using a supplied rng() (defaults to Math.random for any
// non-daily callers). A seeded rng makes the result deterministic.
const shuffle = (arr, rng = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function generateSudoku6(rng = Math.random) {
  // 1. start from the hardcoded valid solution
  let sol = SUDOKU6_SOLUTION.map(row => row.slice());

  // 2. seeded digit permutation (remap 1..6)
  const perm = shuffle([1, 2, 3, 4, 5, 6], rng);
  const map = {};
  for (let i = 0; i < 6; i++) map[i + 1] = perm[i];
  sol = sol.map(row => row.map(v => map[v]));

  // 3. swap rows within each horizontal band (rows 0-1, 2-3, 4-5)
  for (let band = 0; band < 3; band++) {
    if (rng() < 0.5) {
      const r0 = band * 2, r1 = band * 2 + 1;
      [sol[r0], sol[r1]] = [sol[r1], sol[r0]];
    }
  }

  // 4. blank out 14 cells (seeded)
  const puzzle = sol.map(row => row.slice());
  const positions = shuffle(Array.from({ length: 36 }, (_, i) => i), rng).slice(0, 14);
  positions.forEach(p => { puzzle[Math.floor(p / 6)][p % 6] = 0; });

  return { solution: sol, puzzle };
}

// Box index for either board size: 6×6 uses 2×3 boxes, 9×9 uses 3×3.
const boxAt = (r, c, size = 6) => size === 9
  ? Math.floor(r / 3) * 3 + Math.floor(c / 3)
  : Math.floor(r / 2) * 2 + Math.floor(c / 3);

// ---- 9×9 generator (difficulty 'classic' — spec change-list item 7) --------
// Full seeded backtracking fill, then dig cells in seeded order keeping the
// solution UNIQUE (solution-count solver capped at 2, MRV + bitmasks so the
// whole generation stays well under ~100ms).
function sdk9CountSolutions(g, cap = 2) {
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  const empties = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const v = g[r][c];
    const b = boxAt(r, c, 9);
    if (v) { const bit = 1 << v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit; }
    else empties.push(r * 9 + c);
  }
  let count = 0;
  const rec = () => {
    if (count >= cap) return;
    let bestI = -1, bestOpts = 10;
    for (let i = 0; i < empties.length; i++) {
      const e = empties[i];
      if (e < 0) continue;
      const r = (e / 9) | 0, c = e % 9;
      const used = rows[r] | cols[c] | boxes[boxAt(r, c, 9)];
      let opts = 0;
      for (let v = 1; v <= 9; v++) if (!(used & (1 << v))) opts++;
      if (opts === 0) return;
      if (opts < bestOpts) { bestOpts = opts; bestI = i; if (opts === 1) break; }
    }
    if (bestI === -1) { count++; return; }
    const e = empties[bestI];
    empties[bestI] = -1;
    const r = (e / 9) | 0, c = e % 9, b = boxAt(r, c, 9);
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << v;
      if ((rows[r] | cols[c] | boxes[b]) & bit) continue;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      rec();
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= cap) break;
    }
    empties[bestI] = e;
  };
  rec();
  return count;
}

function generateSudoku9(rng) {
  const g = Array.from({ length: 9 }, () => new Array(9).fill(0));
  const okay = (r, c, v) => {
    for (let k = 0; k < 9; k++) if (g[r][k] === v || g[k][c] === v) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) if (g[rr][cc] === v) return false;
    return true;
  };
  const fill = (pos) => {
    if (pos === 81) return true;
    const r = (pos / 9) | 0, c = pos % 9;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (okay(r, c, v)) {
        g[r][c] = v;
        if (fill(pos + 1)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  };
  fill(0);
  const solution = g.map(row => row.slice());
  const puzzle = solution.map(row => row.slice());
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  let removed = 0;
  for (const idx of order) {
    if (removed >= 41) break; // 40 givens left — a fair mid-weight daily
    const r = (idx / 9) | 0, c = idx % 9;
    const keep = puzzle[r][c];
    puzzle[r][c] = 0;
    if (sdk9CountSolutions(puzzle) !== 1) puzzle[r][c] = keep;
    else removed++;
  }
  return { solution, puzzle };
}

// Real-Sudoku conflict marking: a filled cell is in error if its value repeats
// elsewhere in its row, column, or box. Size-aware (6×6 and 9×9). Returns the
// set of "r,c" keys in conflict — no hidden "correct answer" comparison.
function sudokuConflicts(grid) {
  const size = grid.length;
  const errs = new Set();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (!v) continue;
      for (let k = 0; k < size; k++) {
        if (k !== c && grid[r][k] === v) errs.add(`${r},${c}`);
        if (k !== r && grid[k][c] === v) errs.add(`${r},${c}`);
      }
      for (let rr = 0; rr < size; rr++) {
        for (let cc = 0; cc < size; cc++) {
          if ((rr !== r || cc !== c) && boxAt(rr, cc, size) === boxAt(r, c, size) && grid[rr][cc] === v) {
            errs.add(`${r},${c}`);
          }
        }
      }
    }
  }
  return errs;
}

// Win = fully filled with zero conflicts (every row/col/box a permutation of
// 1–N). The true Sudoku rule, decoupled from any single generated solution.
function sudokuSolved(grid) {
  const size = grid.length;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) return false;
  return sudokuConflicts(grid).size === 0;
}

// One Sudoku entry, two board sizes (spec §8: "one entry, not two"). 'mini'
// is the original 6×6, byte-identical to the pre-change daily; 'classic' is
// the new 9×9 at ×2 points. The chooser renders BEFORE the board mounts, so
// the timer never ticks while the player decides; the pick is persisted into
// progress so a resumed attempt reopens the same board.
const SUDOKU_MULT = { mini: 1, classic: 2 };

/* ?sdk=9 → the 9×9 Classic board, ?sdk=6 → the 6×6 Mini board. Anything else
   (including no param) means "show the chooser", the normal flow. */
function sdkDeepLinkDifficulty() {
  try {
    const v = new URLSearchParams(window.location.search).get('sdk');
    if (v === '9' || v === 'classic') return 'classic';
    if (v === '6' || v === 'mini') return 'mini';
  } catch {}
  return null;
}

function SudokuGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress, gameId, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — the registry entry decides the board size now. Sudoku is the 9×9
     card and Sudoku Mini the 6×6 one, so the in-game chooser is gone: a player
     who wanted the small board picked it on the home screen. The two entries
     also seed from their OWN game id, so they are genuinely separate dailies
     rather than two views of one board. */
  const fixedDifficulty = gameId === 'sudokumini' ? 'mini'
    : gameId === 'sudoku' ? 'classic' : null;
  const seedKey = gameId || 'sudoku';
  const resumedDiff = savedProgress && savedProgress.dayNum === dayNum &&
    (savedProgress.difficulty === 'classic' || savedProgress.difficulty === 'mini')
    ? savedProgress.difficulty
    : (savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid) && savedProgress.grid.length === 6
      ? 'mini' // pre-difficulty saves were always the 6×6 board
      : null);
  /* ?sdk=9 / ?sdk=6 preselects a board so the grid itself is URL-reachable
     (#149 regression coverage). The chooser renders BEFORE the board, so
     without this no deep link lands on a Sudoku grid at all and dapp.json
     tests — which cannot click — could never assert on it. A resumed
     difficulty still wins, and this deliberately does NOT write progress:
     it only seeds the initial view. */
  const [difficulty, setDifficulty] = useState(() => {
    if (fixedDifficulty) return fixedDifficulty;
    if (resumedDiff) return resumedDiff;
    return sdkDeepLinkDifficulty();
  });
  const boardsRef = useRef({});
  const getBoard = (diff) => {
    if (!boardsRef.current[diff]) {
      if (diff === 'mini') {
        boardsRef.current[diff] = generateSudoku6(dailyRng(offset, seedKey));
      } else {
        /* The 9×9 used to derive a SECOND stream from the 6×6's seed, because
           one registry entry served both boards and they could not share one.
           Sudoku is 9×9-only now (Sudoku Mini is its own entry with its own
           seed row), so it reads its own daily seed directly. Nothing mirrors
           this generator server-side, so the simplification is free. */
        boardsRef.current[diff] = generateSudoku9(dailyRng(offset, seedKey));
      }
    }
    return boardsRef.current[diff];
  };

  const pick = (diff) => {
    const b = getBoard(diff);
    setDifficulty(diff);
    // Persist the pick immediately so a resumed attempt reopens this board.
    onSaveProgress && onSaveProgress(
      { dayNum, grid: b.puzzle.map(row => row.slice()), hintedCells: [], difficulty: diff },
      savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0,
      savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0
    );
  };

  if (!difficulty) {
    // .fit-col even on the chooser: the game is fitShell:true, and fitShell
    // WITHOUT .fit-col clips instead of fitting. Asserted by registry-fitshell.
    return (
      <div className="fit-col">
      <div className="sdk-choose">
        <div className="sdk-choose-title">Choose your board</div>
        <div className="sdk-choose-sub">One daily attempt either way — the clock starts after you pick.</div>
        <button className="sdk-choice" onClick={() => pick('classic')}>
          <span className="sdk-choice-name">9×9 Classic</span>
          <span className="sdk-choice-note">The full-size grid · ×2 points</span>
        </button>
        <button className="sdk-choice" onClick={() => pick('mini')}>
          <span className="sdk-choice-name">6×6 Mini</span>
          <span className="sdk-choice-note">Quick board · standard points</span>
        </button>
      </div>
      </div>
    );
  }

  return (
    <SudokuBoard
      key={difficulty}
      difficulty={difficulty}
      board={getBoard(difficulty)}
      dayNum={dayNum}
      savedProgress={savedProgress}
      onWin={onWin}
      onStepChange={onStepChange}
      onSaveProgress={onSaveProgress}
    />
  );
}

function SudokuBoard({ difficulty, board, dayNum, onWin, onStepChange, savedProgress, onSaveProgress }) {
  const { puzzle, solution } = board;
  const size = puzzle.length;
  const mult = SUDOKU_MULT[difficulty] || 1;

  // Hydrate from a resumed attempt when the saved board is for today's puzzle
  // AND the same board size (a mismatched save is ignored, not corrupted).
  const resumed = savedProgress && savedProgress.dayNum === dayNum &&
    Array.isArray(savedProgress.grid) && savedProgress.grid.length === size
    ? savedProgress
    : null;
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map(row => row.slice()) : puzzle.map(row => row.slice())
  );
  // Cells revealed by a hint — locked like givens, persisted across resume.
  const [hintedCells, setHintedCells] = useState(() =>
    new Set(resumed && Array.isArray(resumed.hintedCells) ? resumed.hintedCells : [])
  );
  const [selected, setSelected] = useState(null); // [r, c]
  const [errors, setErrors] = useState(() => sudokuConflicts(grid));
  // Steps is a free counter (not encoded in the grid), so restore it whenever
  // the attempt carries one — even if the board itself couldn't be rehydrated.
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const cellKey = (r, c) => r * size + c;
  const isGiven = (r, c) => puzzle[r][c] !== 0;
  const isLocked = (r, c) => isGiven(r, c) || hintedCells.has(cellKey(r, c));
  const finalScore = (ns, sc) => {
    const base = size === 9
      ? Math.max(1600 - ns * 10 - sc * 2, 300)
      : Math.max(1200 - ns * 15 - sc * 2, 200);
    return Math.round(base * mult);
  };

  // Free hints: total empty cells in the puzzle is the per-day cap.
  const totalEmpty = useRef(puzzle.flat().filter(v => v === 0).length).current;
  const hints = useDailyHints({ gameId: 'sudoku', maxHints: totalEmpty });
  const emptyCells = () => {
    const out = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 0) out.push([r, c]);
    return out;
  };
  const noEmpty = grid.flat().every(v => v !== 0);

  // Idle/leave autosave (timer advance + tab close). Per-move saves happen in place().
  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs, hintedCells };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, grid: stateRef.current.grid, hintedCells: [...stateRef.current.hintedCells], difficulty },
      steps: stateRef.current.steps, secs: stateRef.current.secs,
    }),
    !done
  );

  const saveNow = (ng, ns, hc) =>
    onSaveProgress && onSaveProgress({ dayNum, grid: ng, hintedCells: [...hc], difficulty }, ns, secs);

  // Reveal one correct cell — the selected empty cell if any, else a random one.
  const buyHint = () => {
    if (done || noEmpty) return;
    hints.buy(() => {
      let target = null;
      if (selected && grid[selected[0]][selected[1]] === 0 && !isGiven(selected[0], selected[1])) {
        target = selected;
      } else {
        const empties = emptyCells();
        if (!empties.length) return true; // nothing to reveal (server already charged)
        target = empties[Math.floor(Math.random() * empties.length)];
      }
      const [r, c] = target;
      const ng = grid.map(row => row.slice());
      ng[r][c] = solution[r][c];
      const hc = new Set(hintedCells); hc.add(cellKey(r, c));
      setGrid(ng);
      setHintedCells(hc);
      setErrors(sudokuConflicts(ng));
      saveNow(ng, steps, hc);
      if (sudokuSolved(ng)) {
        setDone(true);
        onWin(finalScore(steps, secs), steps, secs);
      }
      return true;
    });
  };

  const place = (val) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (isLocked(r, c)) return;

    const ng = grid.map(row => row.slice());
    ng[r][c] = val;
    setGrid(ng);

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    // recompute conflict highlighting from the full grid
    setErrors(sudokuConflicts(ng));

    // persist this move immediately
    saveNow(ng, newSteps, hintedCells);

    // win check — fully filled and no conflicts
    if (sudokuSolved(ng)) {
      setDone(true);
      onWin(finalScore(newSteps, secs), newSteps, secs);
    }
  };

  const selKey = selected ? `${selected[0]},${selected[1]}` : null;
  const selBox = selected ? boxAt(selected[0], selected[1], size) : -1;
  const boldRight = (c) => size === 9 ? (c === 2 || c === 5) : c === 2;
  const boldBottom = (r) => size === 9 ? (r === 2 || r === 5) : (r === 1 || r === 3);

  return (
    <div className="fit-col">
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Steps</div>
          <div className="pvalue">{steps}</div>
        </div>
        <div className="pill">
          <div className="plabel">Filled</div>
          <div className="pvalue">
            {grid.flat().filter(v => v !== 0).length}/{size * size}
          </div>
        </div>
        <div className="pill">
          <div className="plabel">Board</div>
          <div className="pvalue" style={{ fontSize: '0.82rem' }}>{size === 9 ? '9×9 ×2' : '6×6'}</div>
        </div>
      </div>

      <div
        className={'sudoku' + (size === 9 ? ' s9' : '')}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, maxWidth: size === 9 ? 420 : 360 }}
      >
        {grid.map((row, r) =>
          row.map((v, c) => {
            const key = `${r},${c}`;
            const given = isGiven(r, c);
            const hinted = hintedCells.has(cellKey(r, c));
            const locked = given || hinted;
            const isSel = selKey === key;
            const isHl = !isSel && selected &&
              (selected[0] === r || selected[1] === c || boxAt(r, c, size) === selBox);
            const isErr = errors.has(key);
            const cls = ['scell'];
            if (given) cls.push('given'); else if (hinted) cls.push('hinted'); else if (v !== 0) cls.push('user');
            if (isSel) cls.push('sel'); else if (isHl) cls.push('hl');
            if (isErr) cls.push('err');
            return (
              <div
                key={key}
                className={cls.join(' ')}
                /* Box separators must out-read the 1px cell gridlines the grid's
                   own gap now draws (#149) — in C.border, the same colour, the
                   3×3 structure was invisible on the 9×9 board. C.muted is the
                   next step up the palette's contrast ladder and re-themes. */
                style={{
                  borderRight: boldRight(c) ? `2px solid ${C.muted}` : undefined,
                  borderBottom: boldBottom(r) ? `2px solid ${C.muted}` : undefined,
                }}
                {...tapProps(() => !locked && !done && setSelected([r, c]))}
              >
                {v !== 0 ? v : ''}
              </div>
            );
          })
        )}
      </div>

      {!done && (
        <HintBar
          hintsLeft={hints.hintsLeft}
          exhausted={hints.exhausted || noEmpty}
          buying={hints.buying}
          onBuy={buyHint}
          msg={hints.msg}
          label={noEmpty ? 'Board full' : 'No more hints'}
        />
      )}

      <div className="numpad" style={size === 9 ? { gridTemplateColumns: 'repeat(9, 1fr)' } : undefined}>
        {Array.from({ length: size }, (_, i) => i + 1).map(n => (
          <button key={n} className="numkey" {...tapProps(() => place(n))}>{n}</button>
        ))}
      </div>
      <div className="numpad" style={{ gridTemplateColumns: '1fr', marginTop: '0.5rem' }}>
        <button className="numkey erase" {...tapProps(() => place(0))}>Erase</button>
      </div>
    </div>
  );
}
