/* ============================================================
   Game 3 — Crypto Wordle (daily 5-letter Web3 term)
   ============================================================ */
const CW_LEN = 5;
const CW_MAX = 6;

// Curated, well-known 5-letter Web3 / crypto terms. The daily answer is
// chosen deterministically from this list, so everyone gets the same word
// on the same UTC day (shareable, comparable). No dictionary validates the
// guesses — any 5 letters are accepted — but the answer is always from here.
const CW_ANSWERS = [
  'TOKEN', 'BLOCK', 'CHAIN', 'MINER', 'NONCE', 'STAKE', 'VAULT', 'TRADE',
  'WHALE', 'PROOF', 'AUDIT', 'ETHER', 'YIELD', 'LAYER', 'NODES', 'MOONS',
  'DEGEN', 'ALPHA', 'FLOOR', 'MINTS', 'ASSET', 'BYTES', 'PEERS', 'SHARD',
  'BASED', 'VYPER', 'BLOBS', 'WAGMI', 'PUMPS', 'DUMPS',
];

const CW_EMOJI = { green: '🟩', yellow: '🟨', gray: '⬛' };
const CW_KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// UTC day number, anchored to server time (offset = serverNow − clientNow),
// so the daily word can't desync from the lock countdown on a skewed clock.
function cwDayNum(offset) {
  const d = new Date(Date.now() + (offset || 0));
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000
  );
}

// Standard two-pass Wordle coloring (handles duplicate letters): greens
// first, consuming a tally of the answer's letters; then yellows only while
// an unconsumed copy of the letter remains, else gray.
function cwScoreGuess(guess, answer) {
  const res = Array(CW_LEN).fill('gray');
  const counts = {};
  for (let i = 0; i < CW_LEN; i++) counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  for (let i = 0; i < CW_LEN; i++) {
    if (guess[i] === answer[i]) { res[i] = 'green'; counts[guess[i]]--; }
  }
  for (let i = 0; i < CW_LEN; i++) {
    if (res[i] === 'green') continue;
    if (counts[guess[i]] > 0) { res[i] = 'yellow'; counts[guess[i]]--; }
  }
  return res;
}

function CryptoWordleGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(cwDayNum(offset)).current;
  const answer = useRef(
    CW_ANSWERS[((dayNum % CW_ANSWERS.length) + CW_ANSWERS.length) % CW_ANSWERS.length]
  ).current;

  // Hydrate from a resumed attempt: recompute each guess's colors from the
  // saved guess words (the answer is deterministic for the day).
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.words)
    ? savedProgress
    : null;
  const initGuesses = () => (resumed ? resumed.words : [])
    .filter(w => typeof w === 'string' && w.length === CW_LEN)
    .slice(0, CW_MAX)
    .map(w => ({ word: w, result: cwScoreGuess(w, answer) }));

  const [guesses, setGuesses] = useState(initGuesses); // [{ word, result: ['green'|'yellow'|'gray', …] }]
  const [cur, setCur] = useState('');          // in-progress letters for the active row
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  // Idle/leave autosave; per-guess saves happen in submit().
  const stateRef = useRef({});
  stateRef.current = { guesses, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, words: stateRef.current.guesses.map(g => g.word) },
      steps: stateRef.current.guesses.length,
      secs: stateRef.current.secs,
    }),
    !done
  );

  // Best color seen per letter, for the on-screen keyboard tinting.
  const keyState = {};
  const rank = { gray: 0, yellow: 1, green: 2 };
  for (const g of guesses) {
    for (let i = 0; i < CW_LEN; i++) {
      const ch = g.word[i], c = g.result[i];
      if (!(ch in keyState) || rank[c] > rank[keyState[ch]]) keyState[ch] = c;
    }
  }

  const buildShare = (rows, solved) =>
    `Crypto Wordle #${dayNum} ${solved ? rows.length : 'X'}/${CW_MAX}\n` +
    rows.map(r => r.result.map(c => CW_EMOJI[c]).join('')).join('\n');

  const submit = () => {
    if (done) return;
    if (cur.length !== CW_LEN) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const result = cwScoreGuess(cur, answer);
    const rows = [...guesses, { word: cur, result }];
    setGuesses(rows);
    setCur('');
    onStepChange(rows.length);

    // persist this guess immediately (before any terminal finish)
    onSaveProgress && onSaveProgress({ dayNum, words: rows.map(g => g.word) }, rows.length, secs);

    if (cur === answer) {
      setDone(true);
      const score = Math.max((7 - rows.length) * 180 - secs * 2, 100);
      onWin(score, rows.length, secs, { share: buildShare(rows, true) });
    } else if (rows.length >= CW_MAX) {
      setDone(true);
      onLose(rows.length, secs, { share: buildShare(rows, false), answer });
    }
  };

  const typeLetter = (ch) => { if (!done && cur.length < CW_LEN) setCur(cur + ch); };
  const backspace = () => { if (!done) setCur(cur.slice(0, -1)); };

  // Physical keyboard. The window listener is registered once; it dispatches
  // through a ref so each keypress runs the latest closure (fresh cur/secs).
  const apiRef = useRef({});
  apiRef.current = { submit, typeLetter, backspace };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apiRef.current.submit(); return; }
      if (e.key === 'Backspace') { apiRef.current.backspace(); return; }
      const ch = (e.key || '').toUpperCase();
      if (ch.length === 1 && ch >= 'A' && ch <= 'Z') apiRef.current.typeLetter(ch);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rowsLeft = Math.max(CW_MAX - guesses.length, 0);

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Guesses</div>
          <div className="pvalue">{Math.min(guesses.length, CW_MAX)}/{CW_MAX}</div>
        </div>
        <div className="pill">
          <div className="plabel">Left</div>
          <div className="pvalue">{rowsLeft}</div>
        </div>
      </div>

      <div className="cw-board">
        {Array.from({ length: CW_MAX }).map((_, r) => {
          const g = guesses[r];
          const isCurrent = !g && r === guesses.length && !done;
          const letters = g ? g.word : (isCurrent ? cur : '');
          return (
            <div key={r} className={`cw-row${isCurrent && shake ? ' shake' : ''}`}>
              {Array.from({ length: CW_LEN }).map((__, c) => {
                const ch = letters[c] || '';
                const cls = ['cw-tile'];
                if (g) cls.push(g.result[c]);
                else if (ch) cls.push('filled');
                return <div key={c} className={cls.join(' ')}>{ch}</div>;
              })}
            </div>
          );
        })}
      </div>

      <div className="cw-kbd">
        {CW_KEYS.map((row, ri) => (
          <div key={ri} className="cw-kbd-row">
            {ri === 2 && <button className="cw-key wide" onClick={submit}>Enter</button>}
            {row.split('').map(ch => (
              <button
                key={ch}
                className={`cw-key${keyState[ch] ? ' ' + keyState[ch] : ''}`}
                onClick={() => typeLetter(ch)}
              >
                {ch}
              </button>
            ))}
            {ri === 2 && <button className="cw-key wide" onClick={backspace}>⌫</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
