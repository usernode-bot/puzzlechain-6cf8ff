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

const boxAt = (r, c) => Math.floor(r / 2) * 2 + Math.floor(c / 3);

// Real-Sudoku conflict marking: a filled cell is in error if its value repeats
// elsewhere in its row, column, or 2×3 box. Returns the set of "r,c" keys in
// conflict — no hidden "correct answer" comparison.
function sudokuConflicts(grid) {
  const errs = new Set();
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const v = grid[r][c];
      if (!v) continue;
      for (let k = 0; k < 6; k++) {
        if (k !== c && grid[r][k] === v) errs.add(`${r},${c}`);
        if (k !== r && grid[k][c] === v) errs.add(`${r},${c}`);
      }
      for (let rr = 0; rr < 6; rr++) {
        for (let cc = 0; cc < 6; cc++) {
          if ((rr !== r || cc !== c) && boxAt(rr, cc) === boxAt(r, c) && grid[rr][cc] === v) {
            errs.add(`${r},${c}`);
          }
        }
      }
    }
  }
  return errs;
}

// Win = fully filled with zero conflicts (every row/col/box a permutation of
// 1–6). The true Sudoku rule, decoupled from any single generated solution.
function sudokuSolved(grid) {
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (!grid[r][c]) return false;
  return sudokuConflicts(grid).size === 0;
}

function SudokuGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const init = useRef(generateSudoku6(dailyRng(offset, 'sudoku'))).current;
  const { puzzle } = init;
  const dayNum = useRef(utcDayNum(offset)).current;

  // Hydrate from a resumed attempt when the saved board is for today's puzzle.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress
    : null;
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map(row => row.slice()) : puzzle.map(row => row.slice())
  );
  const [selected, setSelected] = useState(null); // [r, c]
  const [errors, setErrors] = useState(() => sudokuConflicts(grid));
  // Steps is a free counter (not encoded in the grid), so restore it whenever
  // the attempt carries one — even if the board itself couldn't be rehydrated.
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const isGiven = (r, c) => puzzle[r][c] !== 0;

  // Idle/leave autosave (timer advance + tab close). Per-move saves happen in place().
  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, grid: stateRef.current.grid }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  const place = (val) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (isGiven(r, c)) return;

    const ng = grid.map(row => row.slice());
    ng[r][c] = val;
    setGrid(ng);

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    // recompute conflict highlighting from the full grid
    setErrors(sudokuConflicts(ng));

    // persist this move immediately
    onSaveProgress && onSaveProgress({ dayNum, grid: ng }, newSteps, secs);

    // win check — fully filled and no conflicts
    if (sudokuSolved(ng)) {
      setDone(true);
      const score = Math.max(1200 - newSteps * 15 - secs * 2, 200);
      onWin(score, newSteps, secs);
    }
  };

  const selKey = selected ? `${selected[0]},${selected[1]}` : null;
  const selBox = selected ? boxAt(selected[0], selected[1]) : -1;

  return (
    <div>
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
            {grid.flat().filter(v => v !== 0).length}/36
          </div>
        </div>
      </div>

      <div className="sudoku">
        {grid.map((row, r) =>
          row.map((v, c) => {
            const key = `${r},${c}`;
            const given = isGiven(r, c);
            const isSel = selKey === key;
            const isHl = !isSel && selected &&
              (selected[0] === r || selected[1] === c || boxAt(r, c) === selBox);
            const isErr = errors.has(key);
            const cls = ['scell'];
            if (given) cls.push('given'); else if (v !== 0) cls.push('user');
            if (isSel) cls.push('sel'); else if (isHl) cls.push('hl');
            if (isErr) cls.push('err');
            return (
              <div
                key={key}
                className={cls.join(' ')}
                style={{
                  borderRight: c === 2 ? `2px solid ${C.border}` : undefined,
                  borderBottom: (r === 1 || r === 3) ? `2px solid ${C.border}` : undefined,
                }}
                onClick={() => !given && !done && setSelected([r, c])}
              >
                {v !== 0 ? v : ''}
              </div>
            );
          })
        )}
      </div>

      <div className="numpad">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button key={n} className="numkey" onClick={() => place(n)}>{n}</button>
        ))}
      </div>
      <div className="numpad" style={{ gridTemplateColumns: '1fr', marginTop: '0.5rem' }}>
        <button className="numkey erase" onClick={() => place(0)}>Erase</button>
      </div>
    </div>
  );
}
