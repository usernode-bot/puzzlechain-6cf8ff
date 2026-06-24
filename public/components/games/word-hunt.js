/* ============================================================
   Game 2 — Word Hunt (8×8 word search)
   ============================================================ */
const WS_SIZE = 8;

// 8 directions: horizontal, vertical, and both diagonals (forwards + backwards).
const WS_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// Themed word sets. Words are <= 6 letters so they always place on an 8×8 grid.
const WORD_SETS = [
  { theme: 'Space',   words: ['COMET', 'ORBIT', 'PLANET', 'GALAXY', 'NEBULA', 'ROCKET', 'STAR', 'MARS'] },
  { theme: 'Ocean',   words: ['CORAL', 'WHALE', 'SHARK', 'TIDE', 'PEARL', 'SQUID', 'WAVE', 'REEF'] },
  { theme: 'Kitchen', words: ['SPOON', 'WHISK', 'KNIFE', 'PLATE', 'KETTLE', 'GRATER', 'OVEN', 'BOWL'] },
  { theme: 'Forest',  words: ['CEDAR', 'MAPLE', 'BIRCH', 'WILLOW', 'ACORN', 'FERN', 'MOSS', 'PINE'] },
  { theme: 'Music',   words: ['TEMPO', 'CHORD', 'PIANO', 'VIOLIN', 'MELODY', 'FLUTE', 'DRUM', 'BANJO'] },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const wsRandLetter = (rng = Math.random) => ALPHABET[Math.floor(rng() * 26)];

// Try to place every word into a fresh grid. Returns the filled letter grid,
// or null if any word couldn't be placed (caller retries with a new grid).
function placeWords(words, rng = Math.random) {
  const grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 250 && !placed; attempt++) {
      const [dr, dc] = WS_DIRS[Math.floor(rng() * WS_DIRS.length)];
      const r0 = Math.floor(rng() * WS_SIZE);
      const c0 = Math.floor(rng() * WS_SIZE);
      const rEnd = r0 + dr * (word.length - 1);
      const cEnd = c0 + dc * (word.length - 1);
      if (rEnd < 0 || rEnd >= WS_SIZE || cEnd < 0 || cEnd >= WS_SIZE) continue;
      // Overlap is allowed only where the existing letter already matches.
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const ch = grid[r0 + dr * i][c0 + dc * i];
        if (ch !== null && ch !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) grid[r0 + dr * i][c0 + dc * i] = word[i];
      placed = true;
    }
    if (!placed) return null;
  }
  return grid;
}

function generateWordSearch(rng = Math.random) {
  const set = WORD_SETS[Math.floor(rng() * WORD_SETS.length)];
  const words = set.words.slice();
  let grid = null;
  for (let attempt = 0; attempt < 60 && !grid; attempt++) grid = placeWords(words, rng);
  if (!grid) grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  // Fill the empty cells with seeded filler letters.
  const letters = grid.map(row => row.map(ch => ch || wsRandLetter(rng)));
  return { theme: set.theme, words, letters };
}

// Locate `word` on the letter grid (any of the 8 directions, forwards or
// reversed) and return its cell indices, or null. Used to restore highlighted
// cells for words a resumed player had already found.
function locateWord(letters, word) {
  const idx = (r, c) => r * WS_SIZE + c;
  for (let r = 0; r < WS_SIZE; r++) {
    for (let c = 0; c < WS_SIZE; c++) {
      for (const [dr, dc] of WS_DIRS) {
        const cells = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || rr >= WS_SIZE || cc < 0 || cc >= WS_SIZE || letters[rr][cc] !== word[i]) { ok = false; break; }
          cells.push(idx(rr, cc));
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

function WordHuntGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const board = useRef(generateWordSearch(dailyRng(offset, 'wordhunt'))).current;
  const { theme, words, letters } = board;
  const total = words.length;
  const dayNum = useRef(utcDayNum(offset)).current;

  // Hydrate from a resumed attempt for today's board.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.found)
    ? savedProgress
    : null;
  const initFound = () => new Set((resumed ? resumed.found : []).filter(w => words.includes(w)));
  const initCells = () => {
    const set = new Set();
    if (resumed) for (const w of resumed.found) {
      const cells = locateWord(letters, w);
      if (cells) cells.forEach(i => set.add(i));
    }
    return set;
  };

  const [found, setFound] = useState(initFound);            // found word strings
  const [foundCells, setFoundCells] = useState(initCells);  // locked cell indices
  const [anchor, setAnchor] = useState(null);                // [r, c] drag start
  const [sel, setSel] = useState([]);                        // cell indices in current drag
  const [steps, setSteps] = useState(() => (resumed && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [score, setScore] = useState(() => {
    // Reconstruct score from already-found words so a resumed win scores right.
    let s = 0;
    if (resumed) for (const w of resumed.found) if (words.includes(w)) s += w.length * w.length * 10;
    return s;
  });
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  // Keep the latest elapsed seconds reachable inside event-handler closures.
  const secsRef = useRef(initialSecs);
  secsRef.current = secs;

  const idx = (r, c) => r * WS_SIZE + c;

  // Idle/leave autosave; per-find saves happen in endSel().
  const stateRef = useRef({});
  stateRef.current = { found, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, found: [...stateRef.current.found] }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  // Straight-line path of cell indices from the anchor to (r, c), or null if
  // the target isn't on a horizontal / vertical / 45° diagonal from the anchor.
  const linePath = (a, r, c) => {
    const dr0 = r - a[0], dc0 = c - a[1];
    if (dr0 === 0 && dc0 === 0) return [idx(a[0], a[1])];
    const adr = Math.abs(dr0), adc = Math.abs(dc0);
    if (!(dr0 === 0 || dc0 === 0 || adr === adc)) return null;
    const len = Math.max(adr, adc);
    const sr = Math.sign(dr0), sc = Math.sign(dc0);
    const path = [];
    for (let i = 0; i <= len; i++) path.push(idx(a[0] + sr * i, a[1] + sc * i));
    return path;
  };

  const startSel = (r, c) => {
    if (done) return;
    setAnchor([r, c]);
    setSel([idx(r, c)]);
  };

  const moveSel = (r, c) => {
    if (done || !anchor) return;
    const path = linePath(anchor, r, c);
    if (path) setSel(path);
  };

  const endSel = () => {
    if (done || !anchor || sel.length === 0) { setAnchor(null); setSel([]); return; }

    const word = sel.map(i => letters[Math.floor(i / WS_SIZE)][i % WS_SIZE]).join('');
    const rev = word.split('').reverse().join('');
    const match = words.find(w => (w === word || w === rev) && !found.has(w));

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    if (match) {
      const nf = new Set(found); nf.add(match);
      const nc = new Set(foundCells); sel.forEach(i => nc.add(i));
      setFound(nf);
      setFoundCells(nc);

      const newScore = score + match.length * match.length * 10;
      setScore(newScore);

      // persist this find immediately
      onSaveProgress && onSaveProgress({ dayNum, found: [...nf] }, newSteps, secsRef.current);

      if (nf.size === total) {
        setDone(true);
        const finalScore = Math.max(newScore - secsRef.current * 2, 100);
        onWin(finalScore, newSteps, secsRef.current);
      }
    }

    setAnchor(null);
    setSel([]);
  };

  const selSet = new Set(sel);

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Found</div>
          <div className="pvalue">{found.size}/{total}</div>
        </div>
        <div className="pill">
          <div className="plabel">Steps</div>
          <div className="pvalue">{steps}</div>
        </div>
      </div>

      <div className="word-theme">Theme: <b>{theme}</b> · drag across letters to find each word</div>

      <div className="wordsearch" onPointerUp={endSel} onPointerLeave={endSel}>
        {letters.map((row, r) =>
          row.map((ch, c) => {
            const i = idx(r, c);
            const cls = ['wcell'];
            if (foundCells.has(i)) cls.push('found');
            if (selSet.has(i)) cls.push('sel');
            return (
              <div
                key={i}
                className={cls.join(' ')}
                onPointerDown={(e) => {
                  e.preventDefault();
                  // Release implicit touch pointer-capture so pointerenter
                  // fires on sibling cells as the finger drags across them.
                  if (e.target.releasePointerCapture && e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
                    e.target.releasePointerCapture(e.pointerId);
                  }
                  startSel(r, c);
                }}
                onPointerEnter={() => moveSel(r, c)}
              >
                {ch}
              </div>
            );
          })
        )}
      </div>

      <div className="word-list">
        {words.map(w => (
          <span key={w} className={`word-chip${found.has(w) ? ' found' : ''}`}>{w}</span>
        ))}
      </div>
    </div>
  );
}
