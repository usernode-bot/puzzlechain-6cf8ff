/* ============================================================
   Phase 6 — Shared card/tile engine + Lane A daily games
   ------------------------------------------------------------
   A small client-side engine every card/tile daily rides:
   seeded deck building + Fisher-Yates shuffling (mulberry32 via
   dailyRng, same PRNG family as lib/dapp.js's tile-match board
   generator), a shared <CeCard> renderer, and a layered-tile
   layout helper (free-tile rule + reverse-deal solvable dealing,
   the same layer/overlap model as lib/dapp.js's tileBoard).
   All phase-6 games are tier B server-side (snapshot + timing
   heuristics through settleDailySession); their onStepChange
   calls feed the shared daily run log automatically.
   ============================================================ */

// ---- Card primitives -------------------------------------------------------
const CE_SUIT_GLYPH = ['♠', '♥', '♦', '♣'];
const CE_RANK_LABEL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ceIsRed = (card) => card.s === 1 || card.s === 2;

// Fisher-Yates over a seeded rng — the engine's single shuffle primitive.
function ceShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build n standard decks as {id, s (suit 0-3), r (rank 0=A..12=K), up}.
// `suits` restricts the suit pool (Spider's 1-suit variant passes [0]).
function ceDeck(nDecks, suits, rng) {
  const cards = [];
  let id = 0;
  for (let d = 0; d < nDecks; d++) {
    for (const s of (suits || [0, 1, 2, 3])) {
      for (let r = 0; r < 13; r++) cards.push({ id: id++, s, r, up: false });
    }
  }
  return rng ? ceShuffle(cards, rng) : cards;
}

// Shared card renderer. Face-down cards show a patterned back; face-up cards
// show rank + suit in red/black. `sel` draws the selection ring.
function CeCard({ card, sel, dim, onClick, style, onDragStart, dropTarget }) {
  const cls = ['ce-card'];
  if (!card.up) cls.push('down');
  else cls.push(ceIsRed(card) ? 'red' : 'black');
  if (sel) cls.push('selected'); // Phase 2 — a visible "this one is selected".
  if (sel) cls.push('sel');
  if (dim) cls.push('dim');
  if (!card.up) cls.push('face-down');
  return (
    <div
      className={cls.join(' ')}
      style={style}
      data-drop={dropTarget}
      {...(onDragStart ? { onPointerDown: onDragStart } : {})}
      {...tapProps(onClick)}
    >
      {card.up && (
        <React.Fragment>
          <div className="ce-rank">{CE_RANK_LABEL[card.r]}</div>
          <div className="ce-suit">{CE_SUIT_GLYPH[card.s]}</div>
        </React.Fragment>
      )}
    </div>
  );
}

// An empty pile slot (foundation / empty column / stock base).
function CeSlot({ label, onClick, className, dropTarget }) {
  return (
    <div
      className={'ce-card ce-slot' + (className ? ' ' + className : '')}
      data-drop={dropTarget}
      {...tapProps(onClick)}
    >
      {label || ''}
    </div>
  );
}

/* PHASE 5 (#123) — finger drag for the solitaires.
   Tap-select/tap-destination was the only way to move a card, which is not how
   anyone expects to play patience. Modelled on Block Fit's existing
   .bb-drag-ghost rather than inventing a second drag idiom: a fixed-position
   ghost tracks the pointer 1:1, and the drop target is resolved from
   `data-drop` under the finger at release. If the pointer never travels past
   the tolerance it is NOT a drag — the existing tap path runs instead, so both
   input styles work and nothing regresses for mouse users. */
const CE_DRAG_TOLERANCE = 8;

function useCardDrag(onDrop) {
  const [ghost, setGhost] = useState(null); // { cards, x, y }
  const live = useRef(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  // Begin a potential drag. `payload` identifies the source; `cards` is what
  // the ghost renders (a run, for a tableau grab).
  const begin = (e, payload, cards) => {
    if (!cards || !cards.length) return;
    live.current = {
      payload, cards, startX: e.clientX, startY: e.clientY, moved: false,
      pointerId: e.pointerId,
    };
    // Deliberately NOT setPointerCapture on the card: capture would retarget
    // every later event to the card and break elementFromPoint's usefulness.
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = live.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < CE_DRAG_TOLERANCE) return;
      d.moved = true;
      d.lastX = e.clientX; d.lastY = e.clientY;
      setGhost({ cards: d.cards, x: e.clientX, y: e.clientY });
      if (e.cancelable) e.preventDefault();
    };
    const onUp = (e) => {
      const d = live.current;
      live.current = null;
      setGhost(null);
      if (!d || !d.moved) return; // a tap, not a drag — let tapProps handle it
      // Hide the ghost before hit-testing or it eats the point (it is
      // pointer-events: none, but elementFromPoint is cheaper to trust this way).
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el && el.closest ? el.closest('[data-drop]') : null;
      onDropRef.current && onDropRef.current(d.payload, target ? target.getAttribute('data-drop') : null);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // True while a real drag is in flight — callers suppress their tap handling.
  const dragging = !!ghost;
  const ghostEl = ghost ? (
    <div className="ce-drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
      {ghost.cards.map((c, i) => (
        <CeCard key={c.id || i} card={c} style={{ marginTop: i ? -34 : 0 }} />
      ))}
    </div>
  ) : null;

  return { begin, dragging, ghostEl };
}

/* ---- Klondike Solitaire (daily) -------------------------------------------
   Classic single-deck patience: 7 tableau columns, draw-1 stock with
   unlimited recycles, 4 foundations by suit. Tap a face-up card to select
   it (and the run below it), tap a destination to move; tapping the
   selected card again sends it to a foundation when legal. */

function klDeal(rng) {
  const deck = ceDeck(1, null, rng);
  const tab = [];
  let idx = 0;
  for (let p = 0; p < 7; p++) {
    const col = [];
    for (let i = 0; i <= p; i++) {
      const c = deck[idx++];
      col.push({ ...c, up: i === p });
    }
    tab.push(col);
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, up: false }));
  return { stock, waste: [], found: [[], [], [], []], tab, moves: 0 };
}

function klValidState(st) {
  return st && Array.isArray(st.stock) && Array.isArray(st.waste) &&
    Array.isArray(st.found) && st.found.length === 4 &&
    Array.isArray(st.tab) && st.tab.length === 7 && Number.isFinite(st.moves);
}

function KlondikeGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — story and arcade deal from a RATED seed: one that an offline solver
     confirmed is winnable, in the difficulty band that was asked for. The
     daily is untouched (it deals from today's server seed like every other
     daily), and if the corpus has not loaded the mode falls back to an
     ordinary seeded deal — you lose the guarantee, not the game. */
  const kdBand = playMode === 'story' ? Math.max(0, band || 0)
    : playMode === 'arcade'
      ? [0, 2, 4][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))]
      : null;
  const kdSeeded = useRef(null);
  if (kdSeeded.current === null && kdBand !== null) {
    const { rng } = modeSeed(playMode, 'klondike', kdBand, offset);
    const rated = corpusSeed('klondike', kdBand, rng);
    kdSeeded.current = rated != null ? mulberry32(rated >>> 0) : rng;
  }
  const freshDeal = useRef(null);
  if (!freshDeal.current) freshDeal.current = klDeal(kdSeeded.current || dailyRng(offset, 'klondike'));
  const resumed = savedProgress && savedProgress.dayNum === dayNum && klValidState(savedProgress.st)
    ? savedProgress.st : null;

  const [st, setSt] = useState(() => resumed || freshDeal.current);
  const [sel, setSel] = useState(null); // {z:'waste'} | {z:'tab',p,i} | {z:'found',p}
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { st, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, st: stateRef.current.st }, steps: stateRef.current.st.moves, secs: stateRef.current.secs }),
    !done
  );
  const commit = (next) => {
    setSt(next);
    setSel(null);
    onStepChange(next.moves);
    const won = next.found.every((f) => f.length === 13);
    // Don't autosave the winning move — the finish call is about to close the
    // attempt, and a progress write racing it 409s against the finished row.
    if (!won && onSaveProgress) onSaveProgress({ dayNum, st: next }, next.moves, secs);
    if (won) {
      setDone(true);
      const score = Math.max(1600 - next.moves * 3 - secs, 300);
      onWin(score, next.moves, secs, {
        share: `Game Corner Klondike Solitaire — solved today's deal in ${fmt} (${next.moves} moves) 🃏`,
      });
    }
  };

  const clone = () => ({
    stock: st.stock.slice(), waste: st.waste.slice(),
    found: st.found.map((f) => f.slice()), tab: st.tab.map((c) => c.slice()),
    moves: st.moves,
  });

  const tapStock = () => {
    if (done) return;
    const n = clone();
    if (n.stock.length) {
      const c = n.stock.pop();
      n.waste.push({ ...c, up: true });
    } else if (n.waste.length) {
      n.stock = n.waste.slice().reverse().map((c) => ({ ...c, up: false }));
      n.waste = [];
    } else return;
    n.moves++;
    commit(n);
  };

  /* #124 — the empty-column rule. `card.r === 12` means ONLY A KING may start
     an empty column, and nothing in the UI ever said so: an illegal drop just
     did nothing, which reads as a broken tap. The rule is now stated three
     ways — a ghost "K" in every empty column, a how-to-play card, and the
     inline note below when you actually try it. */
  const canTab = (card, destTop) =>
    destTop ? (ceIsRed(card) !== ceIsRed(destTop) && card.r === destTop.r - 1) : card.r === 12;
  const canFound = (card, f) =>
    f.length ? (card.s === f[f.length - 1].s && card.r === f[f.length - 1].r + 1) : card.r === 0;

  const [note, setNote] = useState('');
  const noteTimer = useRef(null);
  const say = (msg) => {
    setNote(msg);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 2200);
  };
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);

  // Why a specific move was refused — a silent no-op is indistinguishable from
  // an unresponsive tap, which is what #123 and #124 were both reporting.
  const explainTab = (card, destTop) => {
    if (!destTop) return card.r === 12 ? '' : 'Only a King can start an empty column.';
    if (ceIsRed(card) === ceIsRed(destTop)) return 'Build down in alternating colours.';
    if (card.r !== destTop.r - 1) return `That card must go on a ${CE_RANK_LABEL[card.r + 1] || '?'}.`;
    return '';
  };

  // The selected run (array of cards) plus a mutator that removes it.
  const takeSel = (n, s) => {
    if (s.z === 'waste') return [n.waste.pop()];
    if (s.z === 'found') return [n.found[s.p].pop()];
    const run = n.tab[s.p].splice(s.i);
    const col = n.tab[s.p];
    if (col.length && !col[col.length - 1].up) col[col.length - 1] = { ...col[col.length - 1], up: true };
    return run;
  };
  const selCards = (s) => {
    if (!s) return [];
    if (s.z === 'waste') return st.waste.slice(-1);
    if (s.z === 'found') return st.found[s.p].slice(-1);
    return st.tab[s.p].slice(s.i);
  };

  const tryFoundation = (s) => {
    const cards = selCards(s);
    if (cards.length !== 1) return false;
    const fi = st.found.findIndex((f) => canFound(cards[0], f));
    if (fi < 0) return false;
    const n = clone();
    n.found[fi].push({ ...takeSel(n, s)[0], up: true });
    n.moves++;
    commit(n);
    return true;
  };

  const moveSelToTab = (p, src) => {
    const s = src || sel;
    const cards = selCards(s);
    if (!cards.length) return false;
    const destTop = st.tab[p].length ? st.tab[p][st.tab[p].length - 1] : null;
    if (!canTab(cards[0], destTop)) {
      const why = explainTab(cards[0], destTop);
      if (why) say(why);
      return false;
    }
    const n = clone();
    n.tab[p] = n.tab[p].concat(takeSel(n, s));
    n.moves++;
    commit(n);
    return true;
  };
  const moveSelToFound = (fi) => {
    const cards = selCards(sel);
    if (cards.length !== 1 || !canFound(cards[0], st.found[fi])) return false;
    const n = clone();
    n.found[fi].push({ ...takeSel(n, sel)[0], up: true });
    n.moves++;
    commit(n);
    return true;
  };

  const isSel = (z, p, i) => sel && sel.z === z && sel.p === p && (z !== 'tab' || sel.i === i);

  const tapWaste = () => {
    if (done || !st.waste.length) return;
    if (isSel('waste')) { if (!tryFoundation(sel)) setSel(null); return; }
    if (sel) { setSel({ z: 'waste' }); return; }
    setSel({ z: 'waste' });
  };
  const tapFound = (fi) => {
    if (done) return;
    if (sel && !isSel('found', fi)) { if (moveSelToFound(fi)) return; }
    if (isSel('found', fi)) { setSel(null); return; }
    if (st.found[fi].length) setSel({ z: 'found', p: fi });
  };
  const tapTab = (p, i) => {
    if (done) return;
    const col = st.tab[p];
    // Tap on empty column or anywhere in a column while a selection exists →
    // try to move there first.
    if (sel && !isSel('tab', p, i)) {
      if (moveSelToTab(p)) return;
    }
    if (i == null || i < 0 || !col[i] || !col[i].up) { setSel(null); return; }
    if (isSel('tab', p, i)) {
      // Second tap on the same card: auto-send to a foundation (top card only).
      if (i === col.length - 1 && tryFoundation(sel)) return;
      setSel(null);
      return;
    }
    setSel({ z: 'tab', p, i });
  };

  /* #125 — a way out. Without this the only exit from a dead deal was to close
     the tab, which left a claimed-but-unfinished attempt hanging. onLose is the
     harness's existing loss path: score 0, day locks, streak NOT broken. */
  const giveUp = () => {
    if (done) return;
    setDone(true);
    const home = st.found.reduce((a, f) => a + f.length, 0);
    onLose && onLose(st.moves, secs, {
      share: `Game Corner Klondike Solitaire — gave up today's deal at ${home}/52 home 🃏`,
      answer: null,
    });
  };

  /* #123 — drag. Grabbing a run and dropping it is the natural gesture; the
     drop target comes from the data-drop attributes on the piles below. Tap
     still works untouched (useCardDrag only fires when the pointer travelled). */
  const drag = useCardDrag((payload, dropId) => {
    if (done || !dropId) return;
    const parse = (id) => {
      const [z, idx] = id.split(':');
      return { z, idx: idx == null ? null : Number(idx) };
    };
    const dest = parse(dropId);
    const cards = selCards(payload);
    if (!cards.length) return;
    if (dest.z === 'tab') {
      if (payload.z === 'tab' && payload.p === dest.idx) return; // dropped on itself
      moveSelToTab(dest.idx, payload);
      return;
    }
    if (dest.z === 'found') {
      if (cards.length !== 1 || !canFound(cards[0], st.found[dest.idx])) {
        say('Foundations build up by suit from the Ace.');
        return;
      }
      const n = clone();
      n.found[dest.idx].push({ ...takeSel(n, payload)[0], up: true });
      n.moves++;
      commit(n);
    }
  });

  const maxCol = Math.max(...st.tab.map((c) => c.length), 1);
  // #123 — the exposed strip of each buried card, raised from 14/20px so the
  // whole strip is an aimable target. Squeezes only when a column is deep.
  const step = maxCol > 13 ? 20 : maxCol > 10 ? 24 : 28;
  return (
    <div className="kl-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{st.moves}</div></div>
        <div className="pill"><div className="plabel">Home</div><div className="pvalue">{st.found.reduce((a, f) => a + f.length, 0)}/52</div></div>
      </div>
      <FitScale>
      <div className="kl-inner">
      <div className="kl-top">
        {st.stock.length
          ? <CeCard card={{ s: 0, r: 0, up: false }} onClick={tapStock} />
          : <CeSlot label="↻" onClick={tapStock} />}
        {st.waste.length
          ? <CeCard
              card={st.waste[st.waste.length - 1]}
              sel={isSel('waste')}
              onClick={tapWaste}
              onDragStart={(e) => drag.begin(e, { z: 'waste' }, st.waste.slice(-1))}
            />
          : <CeSlot />}
        <div className="kl-gap" />
        {st.found.map((f, fi) => (
          f.length
            ? <CeCard key={fi} card={f[f.length - 1]} sel={isSel('found', fi)} onClick={() => tapFound(fi)} dropTarget={'found:' + fi} />
            : <CeSlot key={fi} label={CE_SUIT_GLYPH[fi]} onClick={() => tapFound(fi)} dropTarget={'found:' + fi} />
        ))}
      </div>
      <div className="kl-tab">
        {st.tab.map((col, p) => (
          <div
            key={p}
            className="kl-col"
            data-drop={'tab:' + p}
            style={{ height: 62 + (maxCol - 1) * step }}
            onClick={(e) => { if (e.target === e.currentTarget) tapTab(p, col.length ? col.length - 1 : null); }}
          >
            {/* #124 — the rule, on the board. */}
            {col.length === 0 && <CeSlot onClick={() => tapTab(p, null)} dropTarget={'tab:' + p} />}
            {col.length === 0 && <div className="kl-empty-hint">K</div>}
            {col.map((c, i) => (
              <CeCard
                key={c.id}
                card={c}
                sel={sel && sel.z === 'tab' && sel.p === p && i >= sel.i}
                onClick={() => tapTab(p, i)}
                onDragStart={c.up ? (e) => drag.begin(e, { z: 'tab', p, i }, col.slice(i)) : undefined}
                dropTarget={'tab:' + p}
                style={{ position: 'absolute', top: i * step, left: 0, zIndex: i }}
              />
            ))}
          </div>
        ))}
      </div>
      </div>
      </FitScale>
      <div className="kl-note">{note}</div>
      <div className="p6-hint">Drag a card (or tap it, then its destination). Tap a selected card again to send it home. Only a King starts an empty column.</div>
      <div className="mj-controls">
        <button onClick={giveUp} disabled={done}>🏳️ Give up</button>
      </div>
      {drag.ghostEl}
    </div>
  );
}

/* ---- Spider Solitaire (daily, 1 suit) --------------------------------------
   104 spade cards over 10 columns. Move any descending run; complete
   K→A runs clear to the foundation; deal a row from the stock. */

function spDeal(rng) {
  const deck = ceDeck(8, [0], rng); // 8 × A..K of one suit = 104
  const cols = [];
  let idx = 0;
  for (let p = 0; p < 10; p++) {
    const size = p < 4 ? 6 : 5;
    const col = [];
    for (let i = 0; i < size; i++) {
      const c = deck[idx++];
      col.push({ ...c, up: i === size - 1 });
    }
    cols.push(col);
  }
  return { cols, stock: deck.slice(idx).map((c) => ({ ...c, up: false })), done8: 0, moves: 0 };
}

function spValidState(st) {
  return st && Array.isArray(st.cols) && st.cols.length === 10 &&
    Array.isArray(st.stock) && Number.isFinite(st.done8) && Number.isFinite(st.moves);
}

// Remove any completed K→A run from a column (mutates), returns count removed.
function spSweep(n) {
  let swept = 0;
  for (let p = 0; p < 10; p++) {
    const col = n.cols[p];
    if (col.length < 13) continue;
    const tail = col.slice(-13);
    let run = tail.every((c) => c.up) && tail[0].r === 12;
    if (run) for (let i = 1; i < 13; i++) if (tail[i].r !== tail[i - 1].r - 1) { run = false; break; }
    if (run) {
      n.cols[p] = col.slice(0, -13);
      const nc = n.cols[p];
      if (nc.length && !nc[nc.length - 1].up) nc[nc.length - 1] = { ...nc[nc.length - 1], up: true };
      swept++;
    }
  }
  return swept;
}

function SpiderGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* Spider's traditional ladder is SUIT COUNT (1 → 2 → 4), and its three story
     bands are exactly that — a real progression before any rating enters.
     Within a band, a rated seed picks a deal of known effort. */
  const spBand = playMode === 'story' ? Math.max(0, band || 0)
    : playMode === 'arcade'
      ? Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))
      : null;
  const spSeeded = useRef(null);
  if (spSeeded.current === null && spBand !== null) {
    const { rng } = modeSeed(playMode, 'spider', spBand, offset);
    const rated = corpusSeed('spider', spBand, rng);
    spSeeded.current = rated != null ? mulberry32(rated >>> 0) : rng;
  }
  const freshDeal = useRef(null);
  if (!freshDeal.current) freshDeal.current = spDeal(spSeeded.current || dailyRng(offset, 'spider'));
  const resumed = savedProgress && savedProgress.dayNum === dayNum && spValidState(savedProgress.st)
    ? savedProgress.st : null;

  const [st, setSt] = useState(() => resumed || freshDeal.current);
  const [sel, setSel] = useState(null); // {p, i}
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { st, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, st: stateRef.current.st }, steps: stateRef.current.st.moves, secs: stateRef.current.secs }),
    !done
  );

  const commit = (n) => {
    n.done8 += spSweep(n);
    setSt(n);
    setSel(null);
    onStepChange(n.moves);
    const won = n.done8 >= 8;
    if (!won && onSaveProgress) onSaveProgress({ dayNum, st: n }, n.moves, secs);
    if (won) {
      setDone(true);
      const score = Math.max(2000 - n.moves * 3 - secs, 300);
      onWin(score, n.moves, secs, {
        share: `Game Corner Spider Solitaire — cleared today's deal in ${fmt} (${n.moves} moves) 🕷️`,
      });
    }
  };
  const clone = () => ({ cols: st.cols.map((c) => c.slice()), stock: st.stock.slice(), done8: st.done8, moves: st.moves });

  // A selection is valid if cards i..end are all face-up and strictly descending.
  const runOk = (col, i) => {
    if (!col[i] || !col[i].up) return false;
    for (let k = i + 1; k < col.length; k++) if (!col[k].up || col[k].r !== col[k - 1].r - 1) return false;
    return true;
  };

  const dealRow = () => {
    if (done || !st.stock.length) return;
    const n = clone();
    for (let p = 0; p < 10 && n.stock.length; p++) {
      const c = n.stock.pop();
      n.cols[p] = n.cols[p].concat({ ...c, up: true });
    }
    n.moves++;
    commit(n);
  };

  const [note, setNote] = useState('');
  const noteTimer = useRef(null);
  const say = (msg) => {
    setNote(msg);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 2200);
  };
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);

  // Shared by tap and drag so both paths refuse a move for the same reason.
  const moveRun = (fromP, fromI, toP) => {
    if (fromP === toP) return false;
    const moving = st.cols[fromP].slice(fromI);
    if (!moving.length || !runOk(st.cols[fromP], fromI)) return false;
    const col = st.cols[toP];
    const destTop = col.length ? col[col.length - 1] : null;
    if (destTop && destTop.r !== moving[0].r + 1) {
      say(`That run must go on a ${CE_RANK_LABEL[moving[0].r + 1] || '?'}.`);
      return false;
    }
    const n = clone();
    const run = n.cols[fromP].splice(fromI);
    const src = n.cols[fromP];
    if (src.length && !src[src.length - 1].up) src[src.length - 1] = { ...src[src.length - 1], up: true };
    n.cols[toP] = n.cols[toP].concat(run);
    n.moves++;
    commit(n);
    return true;
  };

  const tapCol = (p, i) => {
    if (done) return;
    const col = st.cols[p];
    if (sel && sel.p !== p) {
      if (moveRun(sel.p, sel.i, p)) return;
    }
    if (i == null || !runOk(col, i)) { setSel(null); return; }
    if (sel && sel.p === p && sel.i === i) { setSel(null); return; }
    setSel({ p, i });
  };

  // #125 — same give-up path as Klondike.
  const giveUp = () => {
    if (done) return;
    setDone(true);
    onLose && onLose(st.moves, secs, {
      share: `Game Corner Spider Solitaire — gave up today's deal at ${st.done8}/8 runs 🕷️`,
      answer: null,
    });
  };

  // #123 — drag, shared primitive with Klondike.
  const drag = useCardDrag((payload, dropId) => {
    if (done || !dropId) return;
    const [z, idx] = dropId.split(':');
    if (z !== 'col') return;
    moveRun(payload.p, payload.i, Number(idx));
  });

  const maxCol = Math.max(...st.cols.map((c) => c.length), 1);
  // Raised from a fixed 13px so the exposed strip of a buried card is aimable.
  const step = maxCol > 16 ? 14 : maxCol > 12 ? 18 : 22;
  return (
    <div className="sp-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{st.moves}</div></div>
        <div className="pill"><div className="plabel">Runs</div><div className="pvalue">{st.done8}/8</div></div>
        <button className="p6-btn" onClick={dealRow} disabled={!st.stock.length}>
          Deal +10 ({Math.floor(st.stock.length / 10)})
        </button>
      </div>
      <FitScale>
      <div className="sp-tab">
        {st.cols.map((col, p) => (
          <div
            key={p}
            className="sp-col"
            data-drop={'col:' + p}
            style={{ height: 54 + (maxCol - 1) * step }}
            onClick={(e) => { if (e.target === e.currentTarget) tapCol(p, col.length ? col.length - 1 : null); }}
          >
            {col.length === 0 && <CeSlot className="sm" onClick={() => tapCol(p, null)} dropTarget={'col:' + p} />}
            {col.map((c, i) => (
              <CeCard
                key={c.id}
                card={c}
                sel={sel && sel.p === p && i >= sel.i}
                onClick={() => tapCol(p, i)}
                onDragStart={runOk(col, i) ? (e) => drag.begin(e, { p, i }, col.slice(i)) : undefined}
                dropTarget={'col:' + p}
                style={{ position: 'absolute', top: i * step, left: 0, zIndex: i }}
              />
            ))}
          </div>
        ))}
      </div>
      </FitScale>
      <div className="kl-note">{note}</div>
      <div className="p6-hint">One suit: drag (or tap) any descending run. Build K→A to clear a run — 8 clears win.</div>
      <div className="mj-controls">
        <button onClick={giveUp} disabled={done}>🏳️ Give up</button>
      </div>
      {drag.ghostEl}
    </div>
  );
}

/* ---- Mahjong Solitaire (daily) ----------------------------------------------
   60-tile stepped pyramid. A tile is free when nothing rests on it and its
   left or right side is open. The deal is generated by reverse-removal, so
   today's board is always solvable in at least one order. */

/* PHASE 8 (#121) — Mahjong needed something to think about.
   The single fixed silhouette meant the only variable was tapping speed. Six
   layouts now rotate by weekday, ordered gentlest-first by MEASURED solver win
   rate (see MJ_LAYOUTS below), exactly as TM_LAYOUTS/TM_WEEK do for Daily Tile
   Match. Every layout has EXACTLY 60 slots so the resume shape (faces/removed
   arrays of length 60) is unchanged across layouts.

   Difficulty here comes from STRUCTURE — how many tiles sit under other tiles
   and how deep the stacks go — not from the tile count. If you retune these,
   RE-MEASURE with the solver rather than eyeballing the shape; free-tile count
   alone predicts difficulty poorly (the lesson recorded for issue #116). */
function mjRect(z, x0, y0, cols, rows) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    out.push({ x: x0 + c * 2, y: y0 + r * 2, z });
  }
  return out;
}

/* Ordered GENTLEST-FIRST BY MEASUREMENT, not by how the shape looks. Win rates
   are from a boosterless greedy solver (no lookahead, no undo/hint/shuffle) over
   1200 seeded deals per layout — the "careless player" baseline:

     Courtyard 35.8%   Tower 35.7%   Fortress 31.7%
     Terrace   30.3%   Pyramid 30.2%   Bridge 27.3%

   Note how weakly the shape predicts the rate: Tower (5 layers) ties Courtyard
   (2 layers), and Fortress beats Pyramid. That is the same trap recorded for
   issue #116 — RE-MEASURE after any retune instead of trusting the silhouette.
   Real players do considerably better than these numbers: they get 3 undos, 3
   hints and a solvability-preserving shuffle.
   Every layout has EXACTLY 60 slots (asserted by the mahjong-layouts self-test)
   so the saved faces/removed arrays are layout-independent. */
const MJ_LAYOUTS = [
  // Broad and shallow — most tiles are open from the start.
  { name: 'Courtyard', pos: [].concat(mjRect(0, 0, 0, 8, 6), mjRect(1, 2, 1, 6, 2)) },
  { name: 'Tower',     pos: [].concat(mjRect(0, 0, 0, 7, 4), mjRect(1, 2, 1, 6, 3), mjRect(2, 4, 2, 4, 2), mjRect(3, 4, 3, 2, 2), [{ x: 8, y: 5, z: 4 }, { x: 6, y: 5, z: 4 }]) },
  { name: 'Fortress',  pos: [].concat(mjRect(0, 0, 0, 6, 4), mjRect(1, 0, 1, 5, 4), mjRect(2, 2, 2, 3, 3), mjRect(3, 4, 3, 2, 2), [{ x: 6, y: 5, z: 4 }, { x: 4, y: 5, z: 4 }, { x: 8, y: 5, z: 4 }]) },
  { name: 'Terrace',   pos: [].concat(mjRect(0, 0, 0, 8, 5), mjRect(1, 2, 1, 6, 3), [{ x: 6, y: 3, z: 2 }, { x: 8, y: 3, z: 2 }]) },
  // The original shipped silhouette.
  { name: 'Pyramid',   pos: [].concat(mjRect(0, 0, 0, 8, 4), mjRect(1, 2, 1, 6, 3), mjRect(2, 4, 2, 4, 2), [{ x: 6, y: 3, z: 3 }, { x: 8, y: 3, z: 3 }]) },
  // Hardest measured: a wide flat base with a narrow bridge over it.
  { name: 'Bridge',    pos: [].concat(mjRect(0, 0, 0, 9, 4), mjRect(1, 2, 1, 6, 3), mjRect(2, 6, 2, 2, 2), [{ x: 8, y: 3, z: 3 }, { x: 10, y: 3, z: 3 }]) },
];

// Weekday → window of the ladder. Monday gentlest, weekend hardest — the same
// shape of progression Daily Tile Match uses.
const MJ_WEEK = [
  [2, 4], // Sun
  [0, 2], // Mon
  [0, 3], // Tue
  [1, 3], // Wed
  [2, 4], // Thu
  [3, 5], // Fri
  [4, 5], // Sat
];

// Pick today's layout deterministically from the day number (so every player
// gets the same silhouette) within that weekday's difficulty window.
function mjLayoutForDay(dayNum) {
  // Day 0 (1970-01-01) was a Thursday; +4 aligns weekday 0 to Sunday.
  const weekday = (((dayNum + 4) % 7) + 7) % 7;
  const [lo, hi] = MJ_WEEK[weekday];
  const span = hi - lo + 1;
  const rng = mulberry32(hashStr('mj-layout:' + dayNum));
  return MJ_LAYOUTS[lo + Math.floor(rng() * span) % span];
}

// Back-compat default (the original 'Pyramid' silhouette) for any caller that
// hasn't been threaded a layout yet — every slot count is 60 either way.
const MJ_LAYOUT = MJ_LAYOUTS[4].pos;

/* Balance knobs (#121). All three are costs, so the score stays bounded and
   MONOTONE — mahjongsol is tier B, and settleDailySession's plausibility check
   marks a run `disputed` if a claimed score can exceed the recomputable ceiling.
   Ceiling = MJ_BASE + layer + chain bonuses at zero time with nothing spent. */
const MJ_UNDOS = 3;
const MJ_HINTS = 3;
const MJ_SHUFFLES = 1;
const MJ_BASE = 1500;
function mjScore(secs, shufflesLeft, undosLeft, layerPts, chainPts) {
  const spentShuffles = MJ_SHUFFLES - shufflesLeft;
  const spentUndos = MJ_UNDOS - undosLeft;
  return Math.max(
    MJ_BASE - secs * 2 - spentShuffles * 150 - spentUndos * 60 + layerPts + chainPts,
    300
  );
}
const MJ_FACES = ['🌸', '🎋', '🌊', '🔥', '⛰️', '🌙', '☀️', '⭐', '🐉', '🐢', '🦅', '🎐', '🍂', '❄️', '🌈', '🪷'];

function mjIsFree(i, removed, layout) {
  const L = layout || MJ_LAYOUT;
  const p = L[i];
  for (let j = 0; j < L.length; j++) {
    if (j === i || removed[j]) continue;
    const q = L[j];
    if (q.z === p.z + 1 && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2) return false;
  }
  let left = false, right = false;
  for (let j = 0; j < L.length; j++) {
    if (j === i || removed[j]) continue;
    const q = L[j];
    if (q.z !== p.z || Math.abs(q.y - p.y) >= 2) continue;
    if (q.x === p.x - 2) left = true;
    if (q.x === p.x + 2) right = true;
  }
  return !(left && right);
}

/* All currently-free indices in ONE pass instead of an O(n^2) mjIsFree per tile
   per render. On a 60-tile board the old pattern ran ~7200 comparisons every
   render (plus another pass for mjHasMove), which is the render-cost half of
   "tiles don't respond" in #120. */
function mjFreeSet(removed, layout) {
  const L = layout || MJ_LAYOUT;
  const free = new Set();
  for (let i = 0; i < L.length; i++) {
    if (!removed[i] && mjIsFree(i, removed, L)) free.add(i);
  }
  return free;
}

// Reverse-deal: repeatedly pick two currently-free slots and give them the
// same face, then remove them. Playing back in that order solves the board,
// so the deal is guaranteed winnable. Conceptual sibling of lib/dapp.js's
// tileBoard (same layered-board model, solvability added).
function mjDeal(rng, present, layout) {
  const L = layout || MJ_LAYOUT;
  const faces = new Array(L.length).fill(-1);
  const removed = L.map((_, i) => !present[i]);
  let remaining = present.filter(Boolean).length;
  let pairIdx = 0;
  while (remaining >= 2) {
    const free = [];
    for (let i = 0; i < L.length; i++) if (!removed[i] && mjIsFree(i, removed, L)) free.push(i);
    let a, b;
    if (free.length >= 2) {
      const ai = Math.floor(rng() * free.length);
      a = free.splice(ai, 1)[0];
      b = free[Math.floor(rng() * free.length)];
    } else {
      const rest = [];
      for (let i = 0; i < removed.length; i++) if (!removed[i]) rest.push(i);
      a = rest[0]; b = rest[1];
    }
    faces[a] = pairIdx % MJ_FACES.length;
    faces[b] = pairIdx % MJ_FACES.length;
    pairIdx++;
    removed[a] = true;
    removed[b] = true;
    remaining -= 2;
  }
  return faces;
}

// The first free matching pair, or null. Also serves as the "show me a pair"
// hint (#121) so the hint and the stuck-detection can never disagree.
function mjFindPair(faces, removed, layout, freeSet) {
  const L = layout || MJ_LAYOUT;
  const free = freeSet ? Array.from(freeSet) : Array.from(mjFreeSet(removed, L));
  for (let a = 0; a < free.length; a++) {
    for (let b = a + 1; b < free.length; b++) {
      if (faces[free[a]] === faces[free[b]]) return [free[a], free[b]];
    }
  }
  return null;
}

// Any free matching pair left on the board?
function mjHasMove(faces, removed, layout, freeSet) {
  return !!mjFindPair(faces, removed, layout, freeSet);
}

function MahjongSolitaireGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — the cheapest story ladder in the app: MJ_LAYOUTS is ALREADY
     ordered by a measured boosterless solver win rate (Courtyard 35.8% down
     to Bridge 27.3%), so "play them in order" is a real difficulty
     progression with no new content and no rating work. Band index is the
     layout index. Arcade maps its three difficulties onto the same ordering
     rather than inventing a second scale. */
  const bandIdx = playMode === 'story'
    ? Math.min(MJ_LAYOUTS.length - 1, Math.max(0, band || 0))
    : playMode === 'arcade'
      ? Math.round((Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band)) / 2) * (MJ_LAYOUTS.length - 1))
      : null;
  const seedBase = useRef(null);
  if (seedBase.current == null) {
    if (playMode === 'story' || playMode === 'arcade') {
      seedBase.current = modeSeed(playMode, 'mahjongsol', bandIdx, offset).seed >>> 0;
    } else {
      const srv = serverDailySeed('mahjongsol');
      seedBase.current = srv != null ? srv : ((utcDayNum(offset) + hashStr('mahjongsol')) >>> 0);
    }
  }
  // PHASE 8 — today's silhouette. Saved progress carries the layout name so a
  // resumed board is the one you left, even if the ladder is retuned later.
  const layout = useRef(null);
  if (!layout.current) {
    if (bandIdx != null) {
      layout.current = MJ_LAYOUTS[bandIdx];
    } else {
      const saved = savedProgress && savedProgress.dayNum === dayNum && savedProgress.layout
        ? MJ_LAYOUTS.find(l => l.name === savedProgress.layout) : null;
      layout.current = saved || mjLayoutForDay(dayNum);
    }
  }
  const L = layout.current.pos;

  const resumed = savedProgress && savedProgress.dayNum === dayNum &&
    Array.isArray(savedProgress.faces) && savedProgress.faces.length === L.length &&
    Array.isArray(savedProgress.removed)
    ? savedProgress : null;

  const [faces, setFaces] = useState(() =>
    resumed ? resumed.faces.slice() : mjDeal(mulberry32(seedBase.current), L.map(() => true), L)
  );
  const [removed, setRemoved] = useState(() =>
    resumed ? resumed.removed.map(Boolean) : L.map(() => false)
  );
  // #121 — 1 SAFE shuffle (re-dealt with reverse-removal, so it is guaranteed to
  // leave the board solvable) replaces 2 blind ones, plus 3 undos and a capped
  // hint. Old saves carrying shuffles: 2 clamp down.
  const [shuffles, setShuffles] = useState(
    resumed && Number.isFinite(resumed.shuffles) ? Math.min(resumed.shuffles, MJ_SHUFFLES) : MJ_SHUFFLES
  );
  const [undos, setUndos] = useState(
    resumed && Number.isFinite(resumed.undos) ? resumed.undos : MJ_UNDOS
  );
  const [sel, setSel] = useState(null);
  const [pairs, setPairs] = useState(resumed && Number.isFinite(resumed.pairs) ? resumed.pairs : 0);
  const [done, setDone] = useState(false);
  // Scoring inputs (#121): reward clearing buried/high tiles and hint-free
  // chains rather than raw tapping speed.
  const [layerPts, setLayerPts] = useState(resumed && Number.isFinite(resumed.layerPts) ? resumed.layerPts : 0);
  const [chainPts, setChainPts] = useState(resumed && Number.isFinite(resumed.chainPts) ? resumed.chainPts : 0);
  const [chain, setChain] = useState(0);
  const [hintPair, setHintPair] = useState(null);
  const [warn, setWarn] = useState('');
  const history = useRef([]); // undo stack: { sel, i, faces? }
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const hints = useDailyHints({ gameId: 'mahjongsol', maxHints: MJ_HINTS });

  const remaining = removed.filter((r) => !r).length;
  // #120 — ONE free-set computation per render, shared by the tile renderer, the
  // tap handler, the hint and the stuck check. This used to be an O(n^2) scan
  // per tile plus a second full scan for mjHasMove, every render.
  const freeSet = React.useMemo(() => mjFreeSet(removed, L), [removed, L]);
  const stuck = !done && remaining > 0 && !mjHasMove(faces, removed, L, freeSet);

  const stateRef = useRef({});
  stateRef.current = { faces, removed, shuffles, pairs, secs, undos, layerPts, chainPts };
  const buildProgress = () => ({
    dayNum,
    layout: layout.current.name,
    faces: stateRef.current.faces,
    removed: stateRef.current.removed.map((r) => (r ? 1 : 0)),
    shuffles: stateRef.current.shuffles,
    pairs: stateRef.current.pairs,
    undos: stateRef.current.undos,
    layerPts: stateRef.current.layerPts,
    chainPts: stateRef.current.chainPts,
  });
  useAutosave(
    onSaveProgress,
    () => ({ progress: buildProgress(), steps: stateRef.current.pairs, secs: stateRef.current.secs }),
    !done
  );
  const saveNow = (over) =>
    onSaveProgress && onSaveProgress(
      Object.assign(buildProgress(), over || {}),
      (over && over.pairs) != null ? over.pairs : pairs,
      secs
    );

  const tap = (i) => {
    if (done || removed[i] || !freeSet.has(i)) {
      // #120 — a blocked tile used to absorb the tap silently, which is
      // indistinguishable from an unresponsive board. Now it says so.
      if (!done && !removed[i]) {
        const el = document.querySelector(`[data-mj="${i}"]`);
        if (el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
        setWarn('That tile is covered or blocked on both sides.');
        setTimeout(() => setWarn(''), 1600);
      }
      return;
    }
    setHintPair(null);
    if (sel === i) { setSel(null); return; }
    if (sel != null && faces[sel] === faces[i]) {
      const rm = removed.slice();
      rm[sel] = true;
      rm[i] = true;
      const pr = pairs + 1;
      // Layer bonus: a pair pulled off the upper layers was harder to reach.
      const lp = layerPts + (L[sel].z + L[i].z) * 12;
      // Chain bonus: consecutive matches with no hint and no undo in between.
      const ch = chain + 1;
      const cp = chainPts + Math.min(ch, 6) * 8;
      history.current.push({ a: sel, b: i });
      setRemoved(rm); setSel(null); setPairs(pr);
      setLayerPts(lp); setChainPts(cp); setChain(ch);
      onStepChange(pr);
      const won = rm.every(Boolean);
      // Win-move autosave is deliberately skipped — the finish call closes the
      // attempt and a racing progress write 409s against the finished row.
      if (!won) {
        saveNow({ removed: rm.map(r => (r ? 1 : 0)), pairs: pr, layerPts: lp, chainPts: cp });
      }
      if (won) {
        setDone(true);
        onWin(mjScore(secs, shuffles, undos, lp, cp), pr, secs, {
          share: `Game Corner Mahjong Solitaire — cleared today's ${layout.current.name} in ${fmt} 🀄`,
        });
      }
      return;
    }
    setSel(i);
  };

  // #121 — undo. Puts the last cleared pair back; breaks the chain bonus and
  // costs points at the end, so it is a real decision rather than a free rewind.
  const doUndo = () => {
    if (done || undos <= 0 || !history.current.length) return;
    const last = history.current.pop();
    const rm = removed.slice();
    rm[last.a] = false;
    rm[last.b] = false;
    const pr = Math.max(0, pairs - 1);
    const u = undos - 1;
    setRemoved(rm); setPairs(pr); setUndos(u); setSel(null); setChain(0); setHintPair(null);
    onStepChange(pr);
    saveNow({ removed: rm.map(r => (r ? 1 : 0)), pairs: pr, undos: u });
  };

  // #121 — hint. Counted server-side through the shared daily_hints cap, like
  // Word Search's, so it can't be reset by reloading.
  const buyHint = async () => {
    if (done) return;
    const pair = mjFindPair(faces, removed, L, freeSet);
    if (!pair) { setWarn('No free pair right now — try a shuffle.'); setTimeout(() => setWarn(''), 1800); return; }
    const ok = await hints.buy();
    if (!ok) return;
    setHintPair(pair);
    setChain(0); // a hinted match doesn't extend the chain bonus
  };

  const doShuffle = () => {
    if (done || shuffles <= 0 || remaining === 0) return;
    // Reverse-removal re-deal of the REMAINING slots: the shuffle is guaranteed
    // to leave the board solvable from here, which a blind re-deal was not.
    const rng = mulberry32((seedBase.current + remaining * 7919 + shuffles * 104729) >>> 0);
    const nf = mjDeal(rng, removed.map((r) => !r), L);
    const merged = faces.map((f, i) => (removed[i] ? f : nf[i]));
    const sh = shuffles - 1;
    setFaces(merged);
    setShuffles(sh);
    setSel(null);
    setHintPair(null);
    setChain(0);
    history.current = []; // the pre-shuffle board no longer exists to undo into
    saveNow({ faces: merged, shuffles: sh });
  };

  // Out of moves and out of shuffles → the day is lost.
  useEffect(() => {
    if (stuck && shuffles <= 0 && !done) {
      setDone(true);
      onLose && onLose(pairs, secs, {
        share: `Game Corner Mahjong Solitaire — today's ${layout.current.name} got the better of me 🀄`,
        answer: `${remaining} tiles were left with no free pair.`,
      });
    }
  }, [stuck, shuffles, done]);

  const TW = 44, TH = 56; // Phase 2 — up from 36x46.
  const maxX = L.reduce((m, p) => Math.max(m, p.x), 0);
  const maxY = L.reduce((m, p) => Math.max(m, p.y), 0);
  const boardW = maxX * (TW / 2) + TW + 8;
  const boardH = maxY * (TH / 2) + TH + 16;
  return (
    <div className="mj-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Tiles</div><div className="pvalue">{remaining}/{L.length}</div></div>
        <div className="pill"><div className="plabel">Chain</div><div className="pvalue">×{Math.min(chain, 6)}</div></div>
        <div className="pill"><div className="plabel">Board</div><div className="pvalue">{layout.current.name}</div></div>
      </div>
      {stuck && shuffles > 0 && (
        <div className="p6-banner">No free pair left — use your shuffle to keep going.</div>
      )}
      {warn && <div className="mj-warn">{warn}</div>}
      <FitScale>
      <div className="mj-board" style={{ width: boardW, height: boardH }}>
        {L.map((p, i) => {
          if (removed[i]) return null;
          const free = freeSet.has(i);
          const hinted = hintPair && (hintPair[0] === i || hintPair[1] === i);
          return (
            <div
              key={i}
              data-mj={i}
              className={'mj-tile' + (free ? '' : ' blocked') + (sel === i ? ' sel' : '') + (hinted ? ' hinted' : '') + (p.z > 0 ? ' up' + p.z : '')}
              style={{
                left: p.x * (TW / 2),
                top: p.y * (TH / 2) - p.z * 5,
                zIndex: p.z * 100 + p.y,
              }}
              {...tapProps(() => tap(i))}
            >{MJ_FACES[faces[i]]}</div>
          );
        })}
      </div>
      </FitScale>
      <div className="mj-controls">
        <button onClick={doUndo} disabled={undos <= 0 || !history.current.length || done}>↶ Undo ({undos})</button>
        <button onClick={buyHint} disabled={done || hints.exhausted || hints.buying}>💡 Hint ({hints.hintsLeft})</button>
        <button onClick={doShuffle} disabled={shuffles <= 0 || done}>🔀 Shuffle ({shuffles})</button>
      </div>
      <div className="p6-hint">
        Tap two matching free tiles (uncovered, with an open side). Upper-layer clears and
        hint-free chains are worth more — undos and shuffles cost points.
      </div>
    </div>
  );
}

/* ---- Nonogram (daily) --------------------------------------------------------
   8×8 picture-logic puzzle. Fill cells so every row and column matches its
   run clues; any grid satisfying all clues wins. */

const NG_GAP = 2;

function ngClues(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

/* ============================================================
   Nonogram — line-solvability and structured pictures (#176)
   ============================================================
   Two problems, and the second is the one that matters.

   1. THE PICTURE. The generator filled cells at 55% at random, which produces
      static, not a picture. Real picross puzzles are recognisable shapes, and
      the request asked for silhouettes. ngGenerateShape draws with SYMMETRY
      and CONNECTIVITY instead of noise: a mirrored blob grown from a seed
      cluster reads as an object even when it is not a specific one.

   2. SOLVABILITY. A nonogram is only fair if it can be solved LINE BY LINE
      without ever guessing — which an arbitrary picture usually cannot be.
      ngLineSolve is the gate: it repeatedly intersects every legal placement
      of each row and column clue against what is already known, and a puzzle
      ships only if that alone completes it. This is the same shape of
      constraint as Mine Finder's no-guess check, and it was built alongside it
      for that reason.

   Difficulty is grid size crossed with how much work the line solver needs,
   which is the honest measure: a big sparse picture can be easier than a small
   dense one.
   ============================================================ */

/* Every arrangement of a clue in a line of length n, as bitmask pairs
   (filled, known) — memoised per (clue, length) because the solver asks for
   the same line shapes over and over. */
const NG_PLACEMENT_CACHE = new Map();
function ngPlacements(clue, n) {
  const key = n + ':' + clue.join(',');
  const hit = NG_PLACEMENT_CACHE.get(key);
  if (hit) return hit;
  const out = [];
  const blocks = clue.filter(v => v > 0);
  const build = (idx, pos, acc) => {
    if (out.length > 20000) return;                // pathological line: bail
    if (idx === blocks.length) {
      out.push(acc.concat(new Array(n - acc.length).fill(0)));
      return;
    }
    const remaining = blocks.slice(idx).reduce((a, b) => a + b, 0) + (blocks.length - idx - 1);
    for (let start = pos; start + remaining <= n; start++) {
      const next = acc.concat(
        new Array(start - acc.length).fill(0),
        new Array(blocks[idx]).fill(1)
      );
      build(idx + 1, start + blocks[idx] + 1, next);
    }
  };
  build(0, 0, []);
  NG_PLACEMENT_CACHE.set(key, out);
  return out;
}

/* Solve by line intersection alone. `grid` is -1 unknown / 0 empty / 1 filled.
   Returns { solved, passes } — `passes` is how many full sweeps it needed,
   which is the difficulty signal: a puzzle solved in two sweeps is gentle, one
   that takes eight is work. */
function ngLineSolve(rowClues, colClues, rows, cols) {
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let passes = 0;

  const solveLine = (cells, clue) => {
    const options = ngPlacements(clue, cells.length)
      .filter(opt => opt.every((v, i) => cells[i] === -1 || cells[i] === v));
    if (!options.length) return null;              // contradiction
    const out = cells.slice();
    for (let i = 0; i < cells.length; i++) {
      if (out[i] !== -1) continue;
      const first = options[0][i];
      if (options.every(o => o[i] === first)) out[i] = first;
    }
    return out;
  };

  for (;;) {
    let changed = false;
    passes += 1;
    if (passes > 40) return { solved: false, passes };
    for (let r = 0; r < rows; r++) {
      const next = solveLine(grid[r], rowClues[r]);
      if (!next) return { solved: false, passes };
      for (let c = 0; c < cols; c++) if (next[c] !== grid[r][c]) { grid[r][c] = next[c]; changed = true; }
    }
    for (let c = 0; c < cols; c++) {
      const col = grid.map(row => row[c]);
      const next = solveLine(col, colClues[c]);
      if (!next) return { solved: false, passes };
      for (let r = 0; r < rows; r++) if (next[r] !== grid[r][c]) { grid[r][c] = next[r]; changed = true; }
    }
    if (!changed) break;
  }
  const solved = grid.every(row => row.every(v => v !== -1));
  return { solved, passes };
}

/* Draw a silhouette rather than static: grow a connected blob from a few seed
   cells, then mirror it. Symmetry is what makes a low-resolution shape read as
   an object — it is why almost every hand-authored picross picture has it. */
function ngGenerateShape(rng, rows, cols, density) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const halfW = Math.ceil(cols / 2);
  const target = Math.round(rows * halfW * density);
  const seeds = Math.max(2, Math.round(halfW / 2));
  const stack = [];
  for (let i = 0; i < seeds; i++) {
    stack.push([Math.floor(rng() * rows), Math.floor(rng() * halfW)]);
  }
  let filled = 0;
  let guard = rows * cols * 40;
  while (filled < target && stack.length && guard-- > 0) {
    const [r, c] = stack[Math.floor(rng() * stack.length)];
    if (r < 0 || r >= rows || c < 0 || c >= halfW) continue;
    if (!g[r][c]) { g[r][c] = 1; filled += 1; }
    // Grow orthogonally so the shape stays connected and blocky.
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const [dr, dc] = dirs[Math.floor(rng() * 4)];
    stack.push([r + dr, c + dc]);
    if (stack.length > 400) stack.splice(0, 200);
  }
  // Mirror the left half onto the right.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < halfW; c++) g[r][cols - 1 - c] = g[r][c];
  }
  return g;
}

/* The ladder: grid size, with density rising a little alongside it. Each band
   is verified line-solvable before it ships. */
const NG_BANDS = [
  { rows: 5,  cols: 5,  density: 0.55 },
  { rows: 8,  cols: 8,  density: 0.55 },
  { rows: 10, cols: 10, density: 0.52 },
  { rows: 12, cols: 12, density: 0.50 },
  { rows: 15, cols: 15, density: 0.48 },
  { rows: 15, cols: 15, density: 0.44 },
];

function ngBuildForBand(rng, bandIdx) {
  const spec = NG_BANDS[Math.min(NG_BANDS.length - 1, Math.max(0, bandIdx))];
  const { rows, cols } = spec;
  let fallback = null;
  for (let attempt = 0; attempt < 150; attempt++) {
    const grid = ngGenerateShape(rng, rows, cols, spec.density);
    // Reject degenerate pictures: an empty row or column makes a boring clue
    // and a nearly-full grid is not a silhouette.
    const total = grid.flat().filter(Boolean).length;
    if (total < rows * cols * 0.2 || total > rows * cols * 0.75) continue;
    if (!grid.every(row => row.some(Boolean))) continue;
    if (!grid[0].every((_, c) => grid.some(row => row[c]))) continue;

    const rowClues = grid.map(ngClues);
    const colClues = grid[0].map((_, c) => ngClues(grid.map(row => row[c])));
    const check = ngLineSolve(rowClues, colClues, rows, cols);
    const out = { grid, rowClues, colClues, rows, cols, passes: check.passes };
    if (check.solved) return out;
    if (!fallback) fallback = out;
  }
  /* Nothing verified in 150 tries. Hand back the last shape rather than hang.
     This is the one place a nonogram could ship needing a guess; measured over
     20 boards per band it does not fire at all, and the sparse top band was
     retuned from 0.40 to 0.44 density precisely because at 0.40 it fired a
     quarter of the time. */
  return fallback;
}

function NonogramGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — every board is now a symmetric silhouette that has been PROVEN
     line-solvable, including the daily. Band 1 keeps the daily's 8×8 shape, so
     it does not change size; it stops being random static and starts being a
     picture you can always reason your way through. */
  const bandIdx = playMode === 'story' ? Math.max(0, band || 0)
    : playMode === 'arcade'
      ? [0, 2, 4][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))]
      : 1;
  const built = useRef(null);
  if (!built.current) {
    const { rng } = playMode === 'story' || playMode === 'arcade'
      ? modeSeed(playMode, 'nonogram', bandIdx, offset)
      : { rng: dailyRng(offset, 'nonogram') };
    built.current = ngBuildForBand(rng, bandIdx);
  }
  const NG_ROWS = built.current.rows, NG_COLS = built.current.cols;
  const target = useRef(built.current.grid);
  const rowClues = built.current.rowClues;
  const colClues = built.current.colClues;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress : null;
  // 0 = blank, 1 = filled, 2 = marked ✗
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map((row) => row.slice()) : Array.from({ length: NG_ROWS }, () => new Array(NG_COLS).fill(0))
  );
  const [mode, setMode] = useState('fill'); // 'fill' | 'mark'
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, grid: stateRef.current.grid }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  const solved = (g) => {
    for (let r = 0; r < NG_ROWS; r++) {
      const got = ngClues(g[r].map((v) => (v === 1 ? 1 : 0)));
      if (got.length !== rowClues[r].length || got.some((v, k) => v !== rowClues[r][k])) return false;
    }
    for (let c = 0; c < NG_COLS; c++) {
      const got = ngClues(g.map((row) => (row[c] === 1 ? 1 : 0)));
      if (got.length !== colClues[c].length || got.some((v, k) => v !== colClues[c][k])) return false;
    }
    return true;
  };

  // ---- Responsive canvas board (slice 5) ----------------------------------
  // Clue gutters live inside the canvas, so the whole thing scales as one unit
  // instead of the old auto-auto CSS grid with three fixed-34px tracks.
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  // The gutters are sized in cells (2 wide for row clues, 2 tall for column
  // clues), so the fit is over a 10×10 board and the clue text scales with it.
  const { cell } = useFitBox(boxRef, {
    cols: NG_COLS + 2, rows: NG_ROWS + 2, minCell: 13, maxCell: 42, gap: NG_GAP, padX: 4, padY: 4,
  });
  const cellStep = cell + NG_GAP;
  const gutter = cellStep * 2;
  const boardPx = gutter + cellStep * NG_COLS - NG_GAP;

  const liveRef = useRef({});
  liveRef.current = { grid, mode, done, steps, secs, cellStep, gutter };

  const cellAt = (p) => {
    const { cellStep: cs, gutter: gu } = liveRef.current;
    const c = Math.floor((p.x - gu) / cs), r = Math.floor((p.y - gu) / cs);
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    return { r, c };
  };

  // `paintMode` is applied rather than the live mode, so long-press can invert
  // the action exactly the way Mine Finder does.
  const apply = (r, c, paintMode) => {
    const cur = liveRef.current;
    if (cur.done) return;
    const g = cur.grid.map((row) => row.slice());
    const v = g[r][c];
    if (paintMode === 'fill') g[r][c] = v === 1 ? 0 : 1;
    else g[r][c] = v === 2 ? 0 : 2;
    const ns = cur.steps + 1;
    setGrid(g);
    setSteps(ns);
    onStepChange(ns);
    const won = solved(g);
    // Skip the save on the winning move — the finish closes the attempt and a
    // racing progress write would 409 against the closed row.
    if (!won && onSaveProgress) onSaveProgress({ dayNum, grid: g }, ns, cur.secs);
    if (won) {
      setDone(true);
      const score = Math.max(1400 - ns * 4 - cur.secs * 2, 250);
      onWin(score, ns, cur.secs, {
        share: `Game Corner Nonogram — solved today's ${NG_COLS}×${NG_ROWS} picture in ${fmt} 🖼️`,
      });
    }
  };

  usePointerCell(canvasRef, {
    onTap: (p) => { const t = cellAt(p); if (t) apply(t.r, t.c, liveRef.current.mode); },
    // Long-press = the opposite tool, same idiom as Mine Finder.
    onLongPress: (p) => {
      const t = cellAt(p);
      if (t) apply(t.r, t.c, liveRef.current.mode === 'fill' ? 'mark' : 'fill');
    },
    onContext: (p) => { const t = cellAt(p); if (t) apply(t.r, t.c, 'mark'); },
  });

  useCanvasBoard(canvasRef, {
    width: boardPx,
    height: boardPx,
    deps: [cell, grid, done],
    draw: (ctx) => {
      const radius = Math.max(2, Math.round(cell * 0.14));
      const clueFont = Math.max(9, Math.round(cell * 0.42));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Column clues, bottom-aligned in the top gutter.
      // PAL (not C) — canvas cannot resolve var() custom properties.
      ctx.fillStyle = PAL.muted;
      ctx.font = `${clueFont}px 'JetBrains Mono', monospace`;
      colClues.forEach((cl, c) => {
        const x = gutter + c * cellStep + cell / 2;
        cl.forEach((v, k) => {
          const y = gutter - 4 - (cl.length - 1 - k) * (clueFont + 2) - clueFont / 2;
          ctx.fillText(String(v), x, y);
        });
      });
      // Row clues, right-aligned in the left gutter.
      ctx.textAlign = 'right';
      rowClues.forEach((cl, r) => {
        const y = gutter + r * cellStep + cell / 2;
        ctx.fillText(cl.join(' '), gutter - 6, y);
      });
      ctx.textAlign = 'center';

      for (let r = 0; r < NG_ROWS; r++) for (let c = 0; c < NG_COLS; c++) {
        const v = grid[r][c];
        const x = gutter + c * cellStep, y = gutter + r * cellStep;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, cell, cell, radius);
        else ctx.rect(x, y, cell, cell);
        ctx.fillStyle = v === 1 ? PAL.accent : PAL.card;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = v === 1 ? PAL.accent : PAL.border;
        ctx.stroke();
        if (v === 2) {
          ctx.fillStyle = PAL.dim;
          ctx.font = `${Math.round(cell * 0.5)}px system-ui, sans-serif`;
          ctx.fillText('✗', x + cell / 2, y + cell / 2 + 1);
        }
      }
      // Major separators every 4 cells — replaces the old :nth-child CSS hack.
      ctx.strokeStyle = PAL.dim;
      ctx.lineWidth = 1.5;
      /* Major separators every 5 cells, plus the far edge — the old list was
         literally [0, 4, 8] for a fixed 8-wide board. */
      const seps = [];
      for (let k = 0; k <= Math.max(NG_ROWS, NG_COLS); k += 5) seps.push(k);
      for (const k of seps) {
        const off = gutter + k * cellStep - NG_GAP / 2;
        ctx.beginPath(); ctx.moveTo(off, gutter - NG_GAP); ctx.lineTo(off, boardPx); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gutter - NG_GAP, off); ctx.lineTo(boardPx, off); ctx.stroke();
      }
    },
  });

  const filled = grid.reduce((n, row) => n + row.filter((v) => v === 1).length, 0);

  return (
    <div className="ng-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Steps</div><div className="pvalue">{steps}</div></div>
        <div className="pill"><div className="plabel">Filled</div><div className="pvalue">{filled}</div></div>
      </div>
      <div className="ng-boardbox" ref={boxRef}>
        <canvas
          ref={canvasRef}
          className="ng-canvas board-canvas"
          role="grid"
          aria-label={`Nonogram, ${NG_COLS} by ${NG_ROWS} picture grid, ${filled} cells filled`}
        />
      </div>
      <div className="ng-modes">
        <button className={'ng-mode-btn' + (mode === 'fill' ? ' on' : '')} onClick={() => setMode('fill')}>⬛ Fill</button>
        <button className={'ng-mode-btn' + (mode === 'mark' ? ' on' : '')} onClick={() => setMode('mark')}>✗ Mark</button>
      </div>
      <div className="p6-hint">
        Numbers are runs of filled cells, in order. Long-press uses the other tool.
      </div>
    </div>
  );
}

/* ---- Mine Finder (daily) -----------------------------------------------------
   9×9 with 10 mines, same board for everyone. A safe opening area is
   revealed for you; one wrong tap ends the day. */

function mfFlood(startIdx, counts, cols = 9, rows = 9) {
  const out = new Set([startIdx]);
  const queue = [startIdx];
  while (queue.length) {
    const i = queue.pop();
    if (counts[i] !== 0) continue;
    const r = Math.floor(i / 9), c = i % 9;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= 9 || cc < 0 || cc >= 9) continue;
      const j = rr * 9 + cc;
      if (!out.has(j) && counts[j] >= 0) { out.add(j); queue.push(j); }
    }
  }
  return out;
}

// Adjacency-digit palette, matching the classic Minesweeper .ms-nN rules so
// both mine games read the same. Index = digit. These are palette TOKEN NAMES,
// resolved through PAL at draw time (the BOUNCE_ROW_COLORS pattern) — capturing
// C.* here would bake in unusable var() strings at module scope AND freeze the
// colours against a theme flip. The two hex entries have no palette token.
const MF_NUM_COLORS = [null, 'accent', 'emerald', 'rose', 'violet', 'gold', '#06b6d4', '#be123c', 'muted'];
const MF_GAP = 3;

/* ============================================================
   Mine Finder — no-guess generation (#176)
   ============================================================
   The difficulty ladder needed a solver, but the solver turned out to matter
   more than the ladder: WITHOUT it, a generated minefield can require a coin
   flip. A board you lose to a 50/50 is not "hard", it is unfair, and rating
   such a board is meaningless because the rating describes logic the player
   never got to use.

   So generation is now: place mines → try to solve by pure deduction → keep
   only boards that fall. The rules, in the order a person would reach for
   them, are also the difficulty ladder:

     0 count-complete   a number's mines are all flagged ⇒ the rest are safe
     1 count-forced     a number's unknowns equal its remaining mines ⇒ all mines
     2 subset           one number's unknowns are a subset of another's; the
                        difference resolves (this is the 1-2-1 pattern and
                        friends, and it is where the game gets interesting)

   Anything needing more than these is rejected rather than shipped as "very
   hard", the same rule Sudoku's grader uses.
   ============================================================ */
const MF_RULES = ['count-complete', 'count-forced', 'subset'];

// Board geometry is a parameter now (the ladder grows the grid), so neighbours
// are computed against a width rather than the old hardcoded 9.
function mfNeighborsN(i, cols, rows) {
  const r = Math.floor(i / cols), c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
  }
  return out;
}

/* Deduction-only solve from a given opening. Returns { solved, hardest }.
   `known` mirrors what a player would know: 0 unknown, 1 revealed safe,
   2 deduced mine. */
function mfSolveGraded(mines, counts, cols, rows, start) {
  const n = cols * rows;
  const known = new Array(n).fill(0);
  let hardest = -1;

  const reveal = (i) => {
    if (known[i]) return;
    known[i] = 1;
    if (counts[i] === 0) for (const j of mfNeighborsN(i, cols, rows)) reveal(j);
  };
  reveal(start);

  for (;;) {
    let acted = false;

    // 0 / 1 — the two counting rules, applied to every revealed number.
    for (let i = 0; i < n && !acted; i++) {
      if (known[i] !== 1 || counts[i] <= 0) continue;
      const nb = mfNeighborsN(i, cols, rows);
      const unknown = nb.filter(j => known[j] === 0);
      const flagged = nb.filter(j => known[j] === 2).length;
      if (!unknown.length) continue;
      if (flagged === counts[i]) {
        for (const j of unknown) reveal(j);
        hardest = Math.max(hardest, 0); acted = true;
      } else if (unknown.length === counts[i] - flagged) {
        for (const j of unknown) known[j] = 2;
        hardest = Math.max(hardest, 1); acted = true;
      }
    }
    if (acted) continue;

    /* 2 — subset. For two revealed numbers A and B whose unknown neighbours
       satisfy U(A) ⊂ U(B), the cells in U(B)\U(A) account for exactly
       remaining(B) − remaining(A) mines. When that difference is 0 they are all
       safe; when it equals the set size they are all mines. */
    const cells = [];
    for (let i = 0; i < n; i++) {
      if (known[i] !== 1 || counts[i] <= 0) continue;
      const nb = mfNeighborsN(i, cols, rows);
      const unknown = nb.filter(j => known[j] === 0);
      if (!unknown.length) continue;
      const flagged = nb.filter(j => known[j] === 2).length;
      cells.push({ set: unknown, need: counts[i] - flagged });
    }
    for (let a = 0; a < cells.length && !acted; a++) {
      for (let b = 0; b < cells.length; b++) {
        if (a === b) continue;
        const A = cells[a], B = cells[b];
        if (A.set.length >= B.set.length) continue;
        if (!A.set.every(x => B.set.indexOf(x) !== -1)) continue;
        const diff = B.set.filter(x => A.set.indexOf(x) === -1);
        const need = B.need - A.need;
        if (need === 0) {
          for (const j of diff) reveal(j);
          hardest = Math.max(hardest, 2); acted = true; break;
        }
        if (need === diff.length) {
          for (const j of diff) known[j] = 2;
          hardest = Math.max(hardest, 2); acted = true; break;
        }
      }
    }
    if (acted) continue;

    // Nothing fired. Solved iff every non-mine cell is revealed.
    for (let i = 0; i < n; i++) {
      if (!mines.has(i) && known[i] !== 1) return { solved: false, hardest: MF_RULES.length };
    }
    return { solved: true, hardest: Math.max(hardest, 0) };
  }
}

/* The ladder: grid size crossed with mine density. Both matter and they are
   not interchangeable — a dense small board is a different kind of hard from a
   sparse large one — so each band names both. */
const MF_BANDS = [
  { cols: 7,  rows: 7,  mines: 6 },
  { cols: 9,  rows: 9,  mines: 10 },
  { cols: 9,  rows: 9,  mines: 14 },
  { cols: 11, rows: 11, mines: 20 },
  { cols: 11, rows: 11, mines: 26 },
  { cols: 13, rows: 13, mines: 38 },
];

/* Build a no-guess board for a band. Retries until the deduction solver clears
   it; falls back to the last board tried rather than hanging, because a
   slightly-unfair board is better than a frozen mount — and with these
   densities the fallback effectively never fires. */
function mfBuildForBand(rng, bandIdx) {
  const spec = MF_BANDS[Math.min(MF_BANDS.length - 1, Math.max(0, bandIdx))];
  const { cols, rows } = spec;
  const n = cols * rows;
  let last = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const idxs = ceShuffle(Array.from({ length: n }, (_, i) => i), rng);
    const mines = new Set(idxs.slice(0, spec.mines));
    const counts = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (mines.has(i)) { counts[i] = -1; continue; }
      counts[i] = mfNeighborsN(i, cols, rows).filter(j => mines.has(j)).length;
    }
    // Open on the largest zero-region, which is both the friendliest start and
    // the one that gives deduction the most to work with.
    let start = -1, bestSize = -1;
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      if (counts[i] !== 0 || seen.has(i)) continue;
      const region = new Set(); const stack = [i];
      while (stack.length) {
        const cur = stack.pop();
        if (region.has(cur)) continue;
        region.add(cur); seen.add(cur);
        if (counts[cur] === 0) for (const j of mfNeighborsN(cur, cols, rows)) if (!region.has(j)) stack.push(j);
      }
      if (region.size > bestSize) { bestSize = region.size; start = i; }
    }
    if (start < 0) continue;               // no zero cell: nowhere safe to open
    last = { mines, counts, start, cols, rows, total: n - spec.mines };
    const { solved, hardest } = mfSolveGraded(mines, counts, cols, rows, start);
    if (solved) return { ...last, hardest };
  }
  return last ? { ...last, hardest: MF_RULES.length } : null;
}

function MineFinderGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — every board now comes from the no-guess generator, INCLUDING the
     daily. Band 1 is the same 9×9 / 10-mine shape the daily has always had, so
     nothing about it changes size — but it can no longer hand a player a 50/50
     they have to lose to, which it previously could. That is a fairness fix
     that happens to fall out of building the ladder. */
  const bandIdx = playMode === 'story' ? Math.max(0, band || 0)
    : playMode === 'arcade'
      ? [0, 2, 4][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))]
      : 1;
  const board = useRef(null);
  if (!board.current) {
    const { rng } = playMode === 'story' || playMode === 'arcade'
      ? modeSeed(playMode, 'minefinder', bandIdx, offset)
      : { rng: dailyRng(offset, 'minefinder') };
    board.current = mfBuildForBand(rng, bandIdx);
  }
  const { mines, counts, start, cols: MF_COLS, rows: MF_ROWS } = board.current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.revealed)
    ? savedProgress : null;
  const [revealed, setRevealed] = useState(() =>
    new Set(resumed ? resumed.revealed : [...mfFlood(start, counts, MF_COLS, MF_ROWS)])
  );
  const [flags, setFlags] = useState(() => new Set(resumed && Array.isArray(resumed.flags) ? resumed.flags : []));
  const [flagMode, setFlagMode] = useState(false);
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const [boom, setBoom] = useState(-1);
  // Transient feedback: a chord attempt whose flag count doesn't match pulses
  // the number instead of silently doing nothing.
  const [pulse, setPulse] = useState(-1);
  const [announce, setAnnounce] = useState('');
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { revealed, flags, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, revealed: [...stateRef.current.revealed], flags: [...stateRef.current.flags] },
      steps: stateRef.current.steps, secs: stateRef.current.secs,
    }),
    !done
  );
  const saveNow = (rv, fl, ns) =>
    onSaveProgress && onSaveProgress({ dayNum, revealed: [...rv], flags: [...fl] }, ns, secs);

  // ---- Responsive canvas geometry -----------------------------------------
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { cell } = useFitBox(boxRef, {
    cols: MF_COLS, rows: MF_ROWS, minCell: 16, maxCell: 46, gap: MF_GAP, padX: 4, padY: 4,
  });
  const cellStep = cell + MF_GAP;
  const boardPx = cellStep * MF_COLS - MF_GAP;

  // Mutable snapshot the pointer handlers read — usePointerCell binds its
  // listeners once, so it must not close over stale render state.
  const liveRef = useRef({});
  liveRef.current = { revealed, flags, flagMode, done, steps, secs, cellStep };

  const idxAt = (p) => {
    const { cellStep: cs } = liveRef.current;
    const c = Math.floor(p.x / cs), r = Math.floor(p.y / cs);
    if (c < 0 || c >= MF_COLS || r < 0 || r >= MF_ROWS) return -1;
    return r * MF_COLS + c;
  };

  // ---- Actions -------------------------------------------------------------
  // Every action funnels its outcome through here so the loss/win/save paths
  // exist exactly once regardless of how the cells got opened (single dig,
  // flood, or a chord).
  const applyReveal = (openIdxs, ns) => {
    const cur = liveRef.current;
    const rv = new Set(cur.revealed);
    let hitMine = -1;
    for (const i of openIdxs) {
      if (cur.flags.has(i) || rv.has(i)) continue;
      if (mines.has(i)) { hitMine = i; break; }
      if (counts[i] === 0) for (const j of mfFlood(i, counts, MF_COLS, MF_ROWS)) rv.add(j);
      else rv.add(i);
    }
    if (hitMine >= 0) {
      for (const m of mines) rv.add(m);
      setBoom(hitMine);
      setRevealed(rv);
      setDone(true);
      setAnnounce('Mine hit — the field is revealed.');
      onLose && onLose(ns, cur.secs, {
        share: `Game Corner Mine Finder — today's field got me 💥`,
        answer: 'You hit a mine — the field is revealed above.',
      });
      return;
    }
    setRevealed(rv);
    const won = rv.size >= board.current.total;
    // Deliberately skip the progress save on the winning move: the finish call
    // closes the attempt and a racing write would 409 against the closed row.
    if (!won) saveNow(rv, cur.flags, ns);
    if (won) {
      setDone(true);
      setAnnounce('Field swept — solved!');
      const score = Math.max(1000 - cur.secs * 3 - ns * 2, 200);
      onWin(score, ns, cur.secs, {
        share: `Game Corner Mine Finder — swept today's field in ${fmt} 🚩`,
      });
    } else {
      setAnnounce(`${rv.size} of ${board.current.total} safe cells uncovered.`);
    }
  };

  const bumpSteps = () => {
    const ns = liveRef.current.steps + 1;
    setSteps(ns);
    onStepChange(ns);
    return ns;
  };

  const doFlag = (i) => {
    const cur = liveRef.current;
    if (cur.done || cur.revealed.has(i)) return;
    const ns = bumpSteps();
    const fl = new Set(cur.flags);
    if (fl.has(i)) fl.delete(i); else fl.add(i);
    setFlags(fl);
    setAnnounce(fl.has(i) ? 'Flag placed.' : 'Flag removed.');
    saveNow(cur.revealed, fl, ns);
  };

  const doDig = (i) => {
    const cur = liveRef.current;
    if (cur.done || cur.revealed.has(i)) return;
    if (cur.flags.has(i)) return; // flagged cells don't reveal by accident
    // Step is counted only once every early return is past, so bumping a
    // flagged cell no longer inflates the leaderboard's steps tiebreak.
    const ns = bumpSteps();
    applyReveal([i], ns);
  };

  // Chording: tapping a revealed number whose adjacent flag count already
  // equals it opens every remaining neighbour. Wrong flags mean a mine — same
  // as any real minesweeper. One chord is ONE step, however many cells open.
  const doChord = (i) => {
    const cur = liveRef.current;
    if (cur.done || !cur.revealed.has(i) || counts[i] <= 0) return false;
    const nb = mfNeighborsN(i, MF_COLS, MF_ROWS);
    const flagged = nb.filter((j) => cur.flags.has(j)).length;
    const closed = nb.filter((j) => !cur.revealed.has(j) && !cur.flags.has(j));
    if (!closed.length) return false;
    if (flagged !== counts[i]) {
      setPulse(i);
      setTimeout(() => setPulse((p) => (p === i ? -1 : p)), 250);
      setAnnounce(`Needs ${counts[i]} flags, ${flagged} placed.`);
      return true;
    }
    const ns = bumpSteps();
    applyReveal(closed, ns);
    return true;
  };

  usePointerCell(canvasRef, {
    onTap: (p) => {
      const i = idxAt(p);
      if (i < 0 || liveRef.current.done) return;
      if (liveRef.current.revealed.has(i)) { doChord(i); return; }
      if (liveRef.current.flagMode) doFlag(i); else doDig(i);
    },
    // Long press ALWAYS does the opposite of the current mode.
    onLongPress: (p) => {
      const i = idxAt(p);
      if (i < 0 || liveRef.current.done || liveRef.current.revealed.has(i)) return;
      if (liveRef.current.flagMode) doDig(i); else doFlag(i);
    },
    // Right-click flags, matching the classic Minesweeper game.
    onContext: (p) => {
      const i = idxAt(p);
      if (i < 0 || liveRef.current.done || liveRef.current.revealed.has(i)) return;
      doFlag(i);
    },
  });

  // ---- Draw ----------------------------------------------------------------
  useCanvasBoard(canvasRef, {
    width: boardPx,
    height: boardPx,
    deps: [cell, revealed, flags, boom, pulse, done],
    draw: (ctx) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const radius = Math.max(3, Math.round(cell * 0.16));
      for (let i = 0; i < MF_COLS * MF_ROWS; i++) {
        const r = Math.floor(i / MF_COLS), c = i % MF_COLS;
        const x = c * cellStep, y = r * cellStep;
        const isRev = revealed.has(i);
        const isMine = mines.has(i);

        // PAL, not C — see the canvas-colour note on guardCanvasCtx.
        let fill = PAL.card, stroke = PAL.border;
        if (isRev) { fill = PAL.surface; stroke = PAL.border; }
        if (isRev && isMine) { fill = 'rgba(205,75,58,.20)'; stroke = PAL.rose; }
        if (i === boom) { fill = 'rgba(205,75,58,.55)'; stroke = PAL.rose; }
        if (i === pulse) { fill = 'rgba(201,162,39,.30)'; stroke = PAL.gold; }

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, cell, cell, radius);
        else ctx.rect(x, y, cell, cell);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = stroke;
        ctx.stroke();

        const cx = x + cell / 2, cy = y + cell / 2;
        if (isRev && isMine) {
          ctx.font = `${Math.round(cell * 0.6)}px system-ui, sans-serif`;
          ctx.fillText('💣', cx, cy + 1);
        } else if (isRev && counts[i] > 0) {
          ctx.font = `700 ${Math.round(cell * 0.52)}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = palOf(MF_NUM_COLORS[counts[i]], PAL.text);
          ctx.fillText(String(counts[i]), cx, cy + 1);
        } else if (!isRev && flags.has(i)) {
          ctx.font = `${Math.round(cell * 0.58)}px system-ui, sans-serif`;
          ctx.fillText('🚩', cx, cy + 1);
        }
      }
    },
  });

  const minesLeft = Math.max(mines.size - flags.size, 0);

  return (
    <div className="mf-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Mines</div><div className="pvalue">{minesLeft}</div></div>
        <div className="pill"><div className="plabel">Steps</div><div className="pvalue">{steps}</div></div>
      </div>
      <div className="mf-boardbox" ref={boxRef}>
        <canvas
          ref={canvasRef}
          className="mf-canvas board-canvas"
          role="grid"
          aria-label={`Mine Finder, ${MF_COLS} by ${MF_ROWS} field, ${minesLeft} mines unflagged, ${revealed.size} of ${board.current.total} safe cells uncovered`}
        />
      </div>
      <div className="sr-only" aria-live="polite">{announce}</div>
      <div className="mf-controls">
        <button
          className={'mf-mode-btn ' + (flagMode ? 'flag' : 'dig')}
          aria-pressed={flagMode}
          onClick={() => setFlagMode(m => !m)}
        >
          <span>{flagMode ? '🚩' : '⛏'}</span>
          <span>Mode: {flagMode ? 'Flag' : 'Dig'}</span>
          <span className="mf-mode-label">tap to switch</span>
        </button>
      </div>
      <div className="p6-hint">
        Numbers count adjacent mines. Long-press does the opposite of the current mode
        (right-click flags). Tap a number whose flags all match to clear around it.
      </div>
    </div>
  );
}

/* ---- Anagram Sprint (daily) --------------------------------------------------
   Unscramble five words back-to-back. Tap the shuffled letters to build
   your answer; wrong submissions cost steps, not the day. */

const AN_POOL_5 = ['APPLE', 'BEACH', 'CANDY', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HONEY', 'IVORY', 'JUICE', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN', 'PIANO', 'QUEEN', 'RIVER', 'STONE', 'TIGER', 'WHALE', 'ZEBRA', 'CLOUD', 'BRAVE', 'SPARK', 'TRAIL'];
const AN_POOL_6 = ['ANCHOR', 'BASKET', 'CAMERA', 'DRAGON', 'FOREST', 'GARDEN', 'HAMMER', 'ISLAND', 'JUNGLE', 'KERNEL', 'LEGEND', 'MARBLE', 'NECTAR', 'ORCHID', 'PLANET', 'RIDDLE', 'SILVER', 'TEMPLE', 'VELVET', 'WINTER', 'WIZARD', 'YELLOW', 'BREEZE', 'CASTLE', 'FALCON'];
const AN_POOL_7 = ['ANTIQUE', 'BALLOON', 'CAPTAIN', 'DOLPHIN', 'EMERALD', 'FORTUNE', 'GRANITE', 'HARVEST', 'IMAGINE', 'JOURNEY', 'KINGDOM', 'LIBRARY', 'MACHINE', 'NETWORK', 'OCTOPUS', 'PYRAMID', 'RAINBOW', 'SUNRISE', 'THUNDER', 'VILLAGE', 'WHISPER', 'CRYSTAL', 'LANTERN', 'PENGUIN', 'MONSOON'];

/* #176 — the three curated pools above are 75 words in total, i.e. about
   twelve days of non-overlapping play, which is why this game repeated itself
   so quickly. Word Sprint already ships a 3,477-word dictionary in the same
   bundle, so Anagram Sprint borrows it rather than growing a second list: one
   vocabulary, two games.

   The curated pools are KEPT as a preferred head. They are hand-picked to be
   pleasant to unscramble (no awkward letter runs), so drawing from them first
   and falling back to the dictionary gives breadth without losing the feel.

   Built lazily because WSPR_WORDS_RAW is declared in a later file: everything
   here runs at render time, long after every file has evaluated. */
const _anPoolCache = {};
function anPoolFor(len) {
  if (_anPoolCache[len]) return _anPoolCache[len];
  const curated = len === 5 ? AN_POOL_5 : len === 6 ? AN_POOL_6 : len === 7 ? AN_POOL_7 : [];
  let extra = [];
  try {
    extra = WSPR_WORDS_RAW.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, '').toUpperCase())
      .filter(w => w.length === len);
  } catch (e) { extra = []; }
  const seen = new Set(curated);
  _anPoolCache[len] = curated.concat(extra.filter(w => !seen.has(w) && (seen.add(w), true)));
  return _anPoolCache[len];
}

/* Word length mix per band — the ladder is length plus count, which is what
   actually makes an anagram harder. Band 0 is five short words; the top band
   is seven, weighted long. */
const AN_BANDS = [
  [4, 4, 5, 5, 5],
  [5, 5, 5, 6, 6],
  [5, 5, 6, 6, 7],
  [5, 6, 6, 7, 7],
  [6, 6, 7, 7, 7],
];

function anPickWords(rng, bandIdx) {
  const lens = AN_BANDS[Math.min(AN_BANDS.length - 1, Math.max(0, bandIdx == null ? 2 : bandIdx))];
  const words = [];
  const used = new Set();
  for (const len of lens) {
    const pool = anPoolFor(len);
    if (!pool.length) continue;
    let w = pool[Math.floor(rng() * pool.length)];
    for (let g = 0; g < 30 && used.has(w); g++) w = pool[Math.floor(rng() * pool.length)];
    used.add(w);
    words.push(w);
  }
  return words;
}

function anScramble(word, rng) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const idx = ceShuffle(Array.from({ length: word.length }, (_, i) => i), rng);
    const s = idx.map((i) => word[i]).join('');
    if (s !== word) return idx.map((i) => ({ ch: word[i], used: false }));
  }
  // Degenerate scramble (e.g. repeated letters): rotate by one.
  const rot = (word.slice(1) + word[0]).split('');
  return rot.map((ch) => ({ ch, used: false }));
}

function AnagramsGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const anBand = playMode === 'story' ? Math.max(0, band || 0)
    : playMode === 'arcade'
      ? [0, 2, 4][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))]
      : 2;
  const deal = useRef(null);
  if (!deal.current) {
    const { rng } = playMode === 'story' || playMode === 'arcade'
      ? modeSeed(playMode, 'anagrams', anBand, offset)
      : { rng: dailyRng(offset, 'anagrams') };
    const words = anPickWords(rng, anBand);
    deal.current = { words, tiles: words.map((w) => anScramble(w, rng)) };
  }
  const { words, tiles } = deal.current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Number.isFinite(savedProgress.solved)
    ? savedProgress : null;
  const [wordIdx, setWordIdx] = useState(() => Math.min(resumed ? resumed.solved : 0, words.length - 1));
  const [solvedCount, setSolvedCount] = useState(resumed ? resumed.solved : 0);
  const [picked, setPicked] = useState([]); // [{tileIdx, ch}]
  const [flash, setFlash] = useState(false);
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { solvedCount, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, solved: stateRef.current.solvedCount }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  const word = words[wordIdx];
  const rack = tiles[wordIdx];
  const usedSet = new Set(picked.map((p) => p.tileIdx));

  const tapTile = (i) => {
    if (done || usedSet.has(i) || picked.length >= word.length) return;
    setPicked(picked.concat({ tileIdx: i, ch: rack[i].ch }));
  };
  const backspace = () => setPicked(picked.slice(0, -1));
  const submit = () => {
    if (done || picked.length !== word.length) return;
    const ns = steps + 1;
    setSteps(ns);
    onStepChange(ns);
    const guess = picked.map((p) => p.ch).join('');
    if (guess === word) {
      const sc = solvedCount + 1;
      setSolvedCount(sc);
      setPicked([]);
      const won = sc >= words.length;
      if (!won && onSaveProgress) onSaveProgress({ dayNum, solved: sc }, ns, secs);
      if (won) {
        setDone(true);
        const score = Math.max(1300 - ns * 25 - secs * 2, 250);
        onWin(score, ns, secs, {
          share: `Game Corner Anagram Sprint — unscrambled all ${words.length} words in ${fmt} 🔀`,
        });
      } else {
        setWordIdx(sc);
      }
    } else {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      if (onSaveProgress) onSaveProgress({ dayNum, solved: solvedCount }, ns, secs);
    }
  };

  return (
    <div className="an-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Word</div><div className="pvalue">{Math.min(solvedCount + 1, words.length)}/{words.length}</div></div>
        <div className="pill"><div className="plabel">Tries</div><div className="pvalue">{steps}</div></div>
      </div>
      <div className="an-dots">
        {words.map((w, i) => (
          <span key={i} className={'an-dot' + (i < solvedCount ? ' solved' : i === wordIdx && !done ? ' cur' : '')}>
            {i < solvedCount ? w : w.length}
          </span>
        ))}
      </div>
      <div className={'an-slots' + (flash ? ' bad' : '')}>
        {Array.from({ length: word.length }, (_, i) => (
          <div key={i} className={'an-slot' + (picked[i] ? ' has' : '')} onClick={backspace}>
            {picked[i] ? picked[i].ch : ''}
          </div>
        ))}
      </div>
      <div className="an-rack">
        {rack.map((t, i) => (
          <button key={i} className={'an-tile' + (usedSet.has(i) ? ' used' : '')} onClick={() => tapTile(i)}>
            {t.ch}
          </button>
        ))}
      </div>
      <div className="an-actions">
        <button className="p6-btn" onClick={backspace} disabled={!picked.length}>⌫ Undo letter</button>
        <button className="p6-btn primary" onClick={submit} disabled={picked.length !== word.length}>Submit</button>
      </div>
      <div className="p6-hint">Tap letters to build the word, tap a slot to take one back. Wrong guesses cost tries, never the day.</div>
    </div>
  );
}

/* ---- Crate Push (daily + story) ------------------------------------------------
   Push every crate onto a goal pad. Moves are undoable and the room restartable.

   #176 — WHERE THE ROOMS COME FROM. Ten hand-built rooms could not carry a
   difficulty ladder, and Sokoban is the one game in the app whose content can
   never be rated at mount time: deciding whether a room is solvable is a
   PSPACE-complete search, not a deduction. So rooms are generated offline by
   scripts/gen-sokoban.js and shipped as public/corpus/cratepush.json — 200
   rooms across 8 bands, each one carrying the exact length of its shortest
   solution in pushes (3 at the bottom of the ladder, ~35 at the top).

   The ten hand-built rooms below stay as the FALLBACK. If the corpus has not
   arrived, the day still has a warehouse — you lose the difficulty guarantee,
   never the game, which is the same bargain Klondike and Spider strike. */

const CP_LEVELS = [
  ['#######',
   '#     #',
   '# .$@ #',
   '#     #',
   '#######'],
  ['#######',
   '#  .  #',
   '#  $  #',
   '#  @  #',
   '#     #',
   '#######'],
  ['########',
   '#      #',
   '# .$@$.#',
   '#      #',
   '########'],
  ['#######',
   '#. $  #',
   '#  @  #',
   '#  $ .#',
   '#######'],
  ['########',
   '#   #  #',
   '# @$  .#',
   '#   #  #',
   '########'],
  ['#######',
   '#  .  #',
   '# $$  #',
   '# .@  #',
   '#######'],
  ['########',
   '#  ..  #',
   '#  $$  #',
   '#      #',
   '#  @   #',
   '########'],
  ['#########',
   '#       #',
   '# @$  . #',
   '#       #',
   '# .  $  #',
   '#       #',
   '#########'],
  ['#######',
   '#     #',
   '# $.$ #',
   '# . . #',
   '#  $  #',
   '#  @  #',
   '#######'],
  ['########',
   '# @    #',
   '# $$$  #',
   '# ...  #',
   '#      #',
   '########'],
];

function cpParse(rows) {
  const walls = new Set(), goals = new Set();
  const crates = [];
  let player = null;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const key = x + ',' + y;
      if (ch === '#') walls.add(key);
      if (ch === '.' || ch === '*' || ch === '+') goals.add(key);
      if (ch === '$' || ch === '*') crates.push([x, y]);
      if (ch === '@' || ch === '+') player = [x, y];
    }
  }
  return { walls, goals, crates, player, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

/* Which corpus band today's daily draws from. The ladder is 8 rungs and the
   week is 7 days, so a straight weekday->band map would never show band 7 and
   would make Monday permanently trivial. Instead the weekday picks a WINDOW of
   the ladder and the daily seed picks inside it: gentle at the start of the
   week, hardest at the weekend, with real variation on any given weekday. This
   is the same shape TM_WEEK uses for Daily Tile Match. */
const CP_WEEK = [
  { from: 0, to: 3, label: 'Warm-up' },   // Sun
  { from: 0, to: 3, label: 'Warm-up' },   // Mon
  { from: 1, to: 4, label: 'Easy' },      // Tue
  { from: 2, to: 5, label: 'Steady' },    // Wed
  { from: 3, to: 6, label: 'Tricky' },    // Thu
  { from: 4, to: 7, label: 'Hard' },      // Fri
  { from: 5, to: 8, label: 'Weekend' },   // Sat
];

function CratePushGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const picked = useRef(null);
  if (picked.current == null) {
    const { rng } = modeSeed(playMode, 'cratepush', band, offset);
    /* Story plays exactly its rung. The daily draws from the weekday's window,
       so today's room is the same for everyone but is not the same rung every
       Tuesday. */
    let want = 0;
    if (playMode === 'story') want = Math.max(0, band || 0);
    else {
      const w = CP_WEEK[new Date(Date.now() + (offset || 0)).getUTCDay()];
      want = w.from + Math.floor(rng() * (w.to - w.from));
    }
    const lv = corpusLevel('cratepush', want, rng);
    if (lv && Array.isArray(lv.g)) {
      picked.current = { rows: lv.g, pushes: lv.p, band: want, rated: true };
    } else {
      // Fallback: the hand-built rooms, still deterministic for the day.
      const i = Math.floor(rng() * CP_LEVELS.length);
      picked.current = { rows: CP_LEVELS[i], pushes: null, band: null, rated: false, idx: i };
    }
  }
  const levelInfo = picked.current;
  const level = useRef(cpParse(levelInfo.rows)).current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum &&
    Array.isArray(savedProgress.player) && Array.isArray(savedProgress.crates)
    ? savedProgress : null;
  const [player, setPlayer] = useState(() => (resumed ? resumed.player.slice() : level.player.slice()));
  const [crates, setCrates] = useState(() =>
    (resumed ? resumed.crates : level.crates).map((c) => c.slice())
  );
  const [moves, setMoves] = useState(resumed && Number.isFinite(resumed.moves) ? resumed.moves : 0);
  const [hist, setHist] = useState([]);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { player, crates, moves, secs, done };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, player: stateRef.current.player, crates: stateRef.current.crates, moves: stateRef.current.moves },
      steps: stateRef.current.moves, secs: stateRef.current.secs,
    }),
    !done
  );
  const saveNow = (p, cr, m) =>
    onSaveProgress && onSaveProgress({ dayNum, player: p, crates: cr, moves: m }, m, secs);

  const crateAt = (cr, x, y) => cr.findIndex(([cx, cy]) => cx === x && cy === y);

  const move = (dx, dy) => {
    const cur = stateRef.current;
    if (cur.done) return;
    const [px, py] = cur.player;
    const nx = px + dx, ny = py + dy;
    if (level.walls.has(nx + ',' + ny)) return;
    const cr = cur.crates.map((c) => c.slice());
    const ci = crateAt(cr, nx, ny);
    if (ci >= 0) {
      const cx = nx + dx, cy = ny + dy;
      if (level.walls.has(cx + ',' + cy) || crateAt(cr, cx, cy) >= 0) return;
      cr[ci] = [cx, cy];
    }
    const m = cur.moves + 1;
    setHist((h) => h.concat([{ player: cur.player, crates: cur.crates, moves: cur.moves }]).slice(-200));
    setPlayer([nx, ny]);
    setCrates(cr);
    setMoves(m);
    onStepChange(m);
    const won = cr.every(([cx, cy]) => level.goals.has(cx + ',' + cy));
    if (!won) saveNow([nx, ny], cr, m);
    if (won) {
      setDone(true);
      /* A rated room knows its own par, so the ladder can pay for difficulty
         instead of only for speed — clearing a 35-push warehouse should not
         score like a 3-push one. Unrated fallback rooms keep the old curve. */
      const base = levelInfo.rated ? 600 + levelInfo.pushes * 40 : 1200;
      const score = Math.max(base - m * 6 - secs * 2, 250);
      onWin(score, m, secs, {
        share: levelInfo.rated
          ? `Game Corner Crate Push — cleared a ${levelInfo.pushes}-push warehouse in ${m} moves (${fmt}) 📦`
          : `Game Corner Crate Push — shifted today's warehouse in ${m} moves (${fmt}) 📦`,
      });
    }
  };

  const undo = () => {
    if (done || !hist.length) return;
    const prev = hist[hist.length - 1];
    setHist(hist.slice(0, -1));
    setPlayer(prev.player.slice());
    setCrates(prev.crates.map((c) => c.slice()));
    setMoves(prev.moves);
    onStepChange(prev.moves);
    saveNow(prev.player, prev.crates, prev.moves);
  };
  const restart = () => {
    if (done) return;
    setHist([]);
    setPlayer(level.player.slice());
    setCrates(level.crates.map((c) => c.slice()));
    setMoves(0);
    onStepChange(0);
    saveNow(level.player, level.crates, 0);
  };

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cells = [];
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const key = x + ',' + y;
      const wall = level.walls.has(key);
      const goal = level.goals.has(key);
      const crate = crateAt(crates, x, y) >= 0;
      const isP = player[0] === x && player[1] === y;
      cells.push(
        <div key={key} className={'cp-cell' + (wall ? ' wall' : '') + (goal ? ' goal' : '')}>
          {crate ? <span className={'cp-crate' + (goal ? ' ongoal' : '')}>📦</span> : isP ? '🧍' : ''}
        </div>
      );
    }
  }

  return (
    <div className="cp-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill">
          <div className="plabel">{levelInfo.rated ? 'Par' : 'Room'}</div>
          <div className="pvalue">{levelInfo.rated ? `${levelInfo.pushes} pushes` : `#${levelInfo.idx + 1}`}</div>
        </div>
      </div>
      <FitScale>
        <div className="cp-grid" style={{ gridTemplateColumns: `repeat(${level.w}, 34px)` }}>{cells}</div>
      </FitScale>
      <div className="cp-pad">
        <div />
        <button className="p6-btn" onClick={() => move(0, -1)}>▲</button>
        <div />
        <button className="p6-btn" onClick={() => move(-1, 0)}>◀</button>
        <button className="p6-btn" onClick={() => move(0, 1)}>▼</button>
        <button className="p6-btn" onClick={() => move(1, 0)}>▶</button>
      </div>
      <div className="an-actions">
        <button className="p6-btn" onClick={undo} disabled={!hist.length}>↶ Undo</button>
        <button className="p6-btn" onClick={restart}>⟲ Restart</button>
      </div>
      <div className="p6-hint">
        Push every crate onto a green pad. You can push one crate at a time — never pull.
        {levelInfo.rated ? ` This room can be solved in ${levelInfo.pushes} pushes.` : ''}
      </div>
    </div>
  );
}

/* ---- Drop Stack (daily) ---------------------------------------------------------
   Real-time falling blocks on today's fixed 200-piece bag — same order for
   everyone. Gravity runs on a rAF loop whose interval is set by the level
   (one level per 10 lines). Drag to slide, tap to rotate, swipe down to hard
   drop; a hold slot lets you bank one piece per lock. Survive the bag to win,
   top out and the day is lost. */

const DS_W = 9, DS_H = 16, DS_PIECES = 200;
/* Arcade's bag is long enough that no real run reaches the end — "endless" in
   practice, without an unbounded array or a refill seam mid-run. */
const DS_ARCADE_PIECES = 20000;
const DS_SHAPES = [
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#38BDF8' },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#FBBF24' },
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: '#A78BFA' },
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#34D399' },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#FB7185' },
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#818CF8' },
  { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#F59E0B'  },
];
const DS_LINES_PER_LEVEL = 10;
const DS_GAP = 2;

// Deterministic 7-bag: every consecutive window of 7 is a permutation of the
// seven shapes, so the day's sequence is fair AND identical for every player.
function dsSequence(rng, n = DS_PIECES) {
  const seq = [];
  while (seq.length < n) {
    seq.push(...ceShuffle([0, 1, 2, 3, 4, 5, 6], rng));
  }
  return seq.slice(0, n);
}

// Rotate a shape's cells 90° clockwise `rot` times, normalized to (0,0).
function dsCells(shapeIdx, rot) {
  let cells = DS_SHAPES[shapeIdx].cells;
  for (let k = 0; k < (rot % 4 + 4) % 4; k++) {
    const maxY = Math.max(...cells.map(([, y]) => y));
    cells = cells.map(([x, y]) => [maxY - y, x]);
  }
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function dsLevelFor(lines) { return 1 + Math.floor(lines / DS_LINES_PER_LEVEL); }
// Level 1 drops a row about once a second; each level is 15% quicker, floored
// so the top levels stay playable rather than impossible.
function dsGravityMs(level) { return Math.max(80, Math.round(1000 * Math.pow(0.85, level - 1))); }

function DropStackGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, playMode, band }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  /* #176 — the daily is a FIXED 200-piece bag you either clear or top out of;
     arcade is the same game with an endless one. That is the whole difference,
     which is why this was one of the cheapest modes in the plan: the piece
     generator never cared how long the sequence was. */
  const isArcade = playMode === 'arcade';
  const seedRef = useRef(null);
  const seq = useRef(null);
  if (!seq.current) {
    if (isArcade) {
      const { rng, seed } = modeSeed('arcade', 'dropstack', 0, offset);
      seedRef.current = seed;
      seq.current = dsSequence(rng, DS_ARCADE_PIECES);
    } else {
      seq.current = dsSequence(dailyRng(offset, 'dropstack'));
    }
  }

  // Resume tolerates the pre-rebuild progress shape: rows saved by the old
  // turn-based version carry no level/hold, so derive level from lines and
  // start with an empty hold rather than refusing to resume mid-day.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress : null;
  const resumedGrid = resumed
    // An old 14-row well is padded at the TOP to today's 16 rows, so the stack
    // keeps its footing on the floor instead of floating.
    ? (() => {
      const g = resumed.grid.map((row) => row.slice(0, DS_W));
      while (g.length < DS_H) g.unshift(new Array(DS_W).fill(0));
      return g.slice(g.length - DS_H);
    })()
    : null;

  const [grid, setGrid] = useState(() =>
    resumedGrid || Array.from({ length: DS_H }, () => new Array(DS_W).fill(0)));
  const [pieceIdx, setPieceIdx] = useState(resumed && Number.isFinite(resumed.pieceIdx) ? resumed.pieceIdx : 0);
  const [lines, setLines] = useState(resumed && Number.isFinite(resumed.lines) ? resumed.lines : 0);
  const [points, setPoints] = useState(resumed && Number.isFinite(resumed.points) ? resumed.points : 0);
  const [hold, setHold] = useState(resumed && Number.isFinite(resumed.hold) ? resumed.hold : null);
  const [holdUsed, setHoldUsed] = useState(false);
  const [col, setCol] = useState(3);
  const [rot, setRot] = useState(0);
  // Fractional row the active piece has fallen to; gravity advances it and the
  // integer part is the collision row.
  const [fallY, setFallY] = useState(0);
  const [done, setDone] = useState(false);
  const [levelFlash, setLevelFlash] = useState(0);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const level = dsLevelFor(lines);

  const stateRef = useRef({});
  stateRef.current = { grid, pieceIdx, lines, points, hold, secs };
  const buildProgress = () => ({
    progress: {
      dayNum, grid: stateRef.current.grid, pieceIdx: stateRef.current.pieceIdx,
      lines: stateRef.current.lines, points: stateRef.current.points,
      level: dsLevelFor(stateRef.current.lines), hold: stateRef.current.hold,
    },
    steps: stateRef.current.pieceIdx, secs: stateRef.current.secs,
  });
  useAutosave(onSaveProgress, buildProgress, !done);

  const bagLen = seq.current.length;
  const shapeIdx = pieceIdx < bagLen ? seq.current[pieceIdx] : 0;
  const cells = dsCells(shapeIdx, rot);
  const shapeW = Math.max(...cells.map(([x]) => x)) + 1;
  const clampedCol = Math.min(Math.max(col, 0), DS_W - shapeW);

  const canPlace = (g, atCol, yOff, cs = cells) =>
    cs.every(([dx, dy]) => {
      const x = atCol + dx, y = yOff + dy;
      return x >= 0 && x < DS_W && y < DS_H && y >= 0 && g[y][x] === 0;
    });

  const landingY = (g, atCol, cs = cells) => {
    let y = Math.floor(fallYRef.current);
    if (!canPlace(g, atCol, y, cs)) return -1;
    while (canPlace(g, atCol, y + 1, cs)) y++;
    return y;
  };

  // Mutable mirrors the rAF loop and pointer handlers read — both are bound
  // once and must never close over a stale render's state.
  const fallYRef = useRef(0);
  fallYRef.current = fallY;
  const liveRef = useRef({});
  liveRef.current = { grid, pieceIdx, lines, points, hold, holdUsed, clampedCol, rot, cells, shapeIdx, done, secs, fallY, shapeW };

  // Lock the active piece into the well, clear lines, and advance the bag.
  const lockPiece = (atY) => {
    const cur = liveRef.current;
    const g = cur.grid.map((row) => row.slice());
    for (const [dx, dy] of cur.cells) g[atY + dy][cur.clampedCol + dx] = cur.shapeIdx + 1;
    let cleared = 0;
    for (let r = DS_H - 1; r >= 0; r--) {
      if (g[r].every((v) => v !== 0)) {
        g.splice(r, 1);
        g.unshift(new Array(DS_W).fill(0));
        cleared++;
        r++;
      }
    }
    const lvl = dsLevelFor(cur.lines);
    const gained = ([0, 100, 250, 450, 700][cleared] || 0) * lvl;
    const np = cur.pieceIdx + 1, nl = cur.lines + cleared, npts = cur.points + gained;
    setGrid(g);
    setPieceIdx(np);
    setLines(nl);
    setPoints(npts);
    setRot(0);
    setCol(3);
    setFallY(0);
    fallYRef.current = 0;
    setHoldUsed(false);
    onStepChange(np);
    if (dsLevelFor(nl) > lvl) {
      setLevelFlash(dsLevelFor(nl));
      setTimeout(() => setLevelFlash(0), 900);
    }
    const won = np >= seq.current.length;
    if (!won && onSaveProgress) {
      onSaveProgress(
        { dayNum, grid: g, pieceIdx: np, lines: nl, points: npts, level: dsLevelFor(nl), hold: cur.hold },
        np, cur.secs
      );
    }
    if (won) {
      setDone(true);
      const score = npts + nl * 10 + dsLevelFor(nl) * 50 + 500;
      onWin(score, np, cur.secs, {
        share: `Game Corner Drop Stack — cleared the full ${seq.current.length}-piece bag, ${nl} lines, level ${dsLevelFor(nl)} 🧱`,
      });
    }
  };

  const topOut = () => {
    const cur = liveRef.current;
    setDone(true);
    onLose && onLose(cur.pieceIdx, cur.secs, {
      share: `Game Corner Drop Stack — topped out on piece ${cur.pieceIdx} at level ${dsLevelFor(cur.lines)} 🧱`,
      answer: `You reached level ${dsLevelFor(cur.lines)} with ${cur.lines} lines and ${cur.points} points.`,
    });
  };

  // Gravity. One rAF loop for the whole run: accumulate real elapsed time and
  // step the piece down whenever it exceeds the level's interval. Pausing on
  // a hidden tab means backgrounding the game never silently tops you out.
  useEffect(() => {
    if (done) return;
    let raf = 0, last = 0, acc = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (!last) { last = t; return; }
      const dt = t - last;
      last = t;
      if (document.visibilityState === 'hidden') return;
      const cur = liveRef.current;
      if (cur.done || cur.pieceIdx >= bagLen) return;
      acc += dt;
      const interval = dsGravityMs(dsLevelFor(cur.lines));
      while (acc >= interval) {
        acc -= interval;
        const y = Math.floor(fallYRef.current);
        if (canPlace(cur.grid, cur.clampedCol, y + 1, cur.cells)) {
          fallYRef.current = y + 1;
          setFallY(y + 1);
        } else if (!canPlace(cur.grid, cur.clampedCol, y, cur.cells)) {
          // Spawn row already blocked — the well is full.
          topOut();
          return;
        } else {
          lockPiece(y);
          return;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const hardDrop = () => {
    const cur = liveRef.current;
    if (cur.done || cur.pieceIdx >= bagLen) return;
    const y = landingY(cur.grid, cur.clampedCol, cur.cells);
    if (y < 0) { topOut(); return; }
    lockPiece(y);
  };

  const rotate = () => {
    const cur = liveRef.current;
    if (cur.done) return;
    const next = dsCells(cur.shapeIdx, cur.rot + 1);
    const w = Math.max(...next.map(([x]) => x)) + 1;
    const atCol = Math.min(cur.clampedCol, DS_W - w);
    // Refuse a rotation that would clip the stack rather than letting it
    // overlap locked cells.
    if (!canPlace(cur.grid, atCol, Math.floor(fallYRef.current), next)) return;
    setRot((r) => r + 1);
    setCol(atCol);
  };

  const nudge = (d) => {
    const cur = liveRef.current;
    if (cur.done) return;
    const target = Math.min(Math.max(cur.clampedCol + d, 0), DS_W - cur.shapeW);
    if (canPlace(cur.grid, target, Math.floor(fallYRef.current), cur.cells)) setCol(target);
  };

  // Bank the active piece (or swap with the banked one). Once per lock, so it
  // can't be used to stall gravity indefinitely.
  const doHold = () => {
    const cur = liveRef.current;
    if (cur.done || holdUsed || cur.pieceIdx >= bagLen) return;
    const incoming = cur.hold;
    setHold(cur.shapeIdx);
    setHoldUsed(true);
    setRot(0);
    setCol(3);
    setFallY(0);
    fallYRef.current = 0;
    if (incoming == null) {
      // Nothing banked yet: consume the current piece from the bag.
      const np = cur.pieceIdx + 1;
      if (np >= seq.current.length) { setPieceIdx(np); return; }
      setPieceIdx(np);
      onStepChange(np);
    } else {
      // Swap: splice the banked shape into the bag at the current position so
      // the rest of the day's order is untouched.
      seq.current[cur.pieceIdx] = incoming;
    }
  };

  // Desktop keys. Registered ONCE (the old version had no dep array and
  // re-bound the listener on every render); the handlers all read liveRef.
  useEffect(() => {
    const onKey = (e) => {
      if (liveRef.current.done) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
      else if (e.key === 'ArrowUp' || e.key === 'x') { e.preventDefault(); rotate(); }
      else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); hardDrop(); }
      else if (e.key === 'c' || e.key === 'Shift') { e.preventDefault(); doHold(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Responsive canvas well ---------------------------------------------
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { cell } = useFitBox(boxRef, {
    cols: DS_W, rows: DS_H, minCell: 12, maxCell: 34, gap: DS_GAP, padX: 4, padY: 4,
  });
  const cellStep = cell + DS_GAP;
  const wellW = cellStep * DS_W - DS_GAP;
  const wellH = cellStep * DS_H - DS_GAP;

  // Drag maps finger travel to columns; a fast downward flick hard-drops; a
  // tap that never became a drag rotates.
  const dragRef = useRef({ startCol: 0, moved: false });
  usePointerCell(canvasRef, {
    onDown: () => { dragRef.current = { startCol: liveRef.current.clampedCol, moved: false }; },
    onDrag: (_p, info) => {
      const cur = liveRef.current;
      if (cur.done) return;
      const steps = Math.round(info.dx / Math.max(cellStep, 1));
      const target = Math.min(Math.max(dragRef.current.startCol + steps, 0), DS_W - cur.shapeW);
      if (target !== cur.clampedCol && canPlace(cur.grid, target, Math.floor(fallYRef.current), cur.cells)) {
        dragRef.current.moved = true;
        setCol(target);
      }
      // A decisive downward flick counts as intent, not a stray wobble —
      // marking it here stops the release from also firing a rotate.
      if (Math.abs(info.dy) > cellStep * 2 && Math.abs(info.dy) > Math.abs(info.dx) * 1.5) {
        dragRef.current.moved = true;
        dragRef.current.swipeDown = info.dy > 0;
      }
    },
    onUp: () => {
      if (liveRef.current.done) return;
      if (dragRef.current.swipeDown) { dragRef.current.swipeDown = false; hardDrop(); }
    },
    // A press that never moved is a rotate. No long-press action on the well,
    // so the timer is effectively disabled.
    onTap: () => { if (!dragRef.current.moved) rotate(); },
  }, { moveTolerance: 6 });

  const ghostY = landingY(grid, clampedCol);

  useCanvasBoard(canvasRef, {
    width: wellW,
    height: wellH,
    deps: [cell, grid, clampedCol, rot, fallY, pieceIdx, done],
    draw: (ctx) => {
      const radius = Math.max(2, Math.round(cell * 0.18));
      const box = (x, y, fill, stroke, alpha) => {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, cell, cell, radius);
        else ctx.rect(x, y, cell, cell);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
        ctx.globalAlpha = 1;
      };
      for (let r = 0; r < DS_H; r++) for (let c = 0; c < DS_W; c++) {
        const v = grid[r][c];
        // Empty-cell chrome comes from PAL; the tetromino palette is intrinsic
        // art and stays hardcoded. Passing C.card here was what made the whole
        // well repaint in the previous frame's piece colour.
        box(c * cellStep, r * cellStep, v ? DS_SHAPES[v - 1].color : PAL.card, v ? null : PAL.border);
      }
      if (!done && pieceIdx < bagLen) {
        const color = DS_SHAPES[shapeIdx].color;
        if (ghostY >= 0) {
          for (const [dx, dy] of cells) {
            box((clampedCol + dx) * cellStep, (ghostY + dy) * cellStep, null, color, 0.45);
          }
        }
        const y0 = Math.floor(fallY);
        for (const [dx, dy] of cells) {
          if (y0 + dy < 0) continue;
          box((clampedCol + dx) * cellStep, (y0 + dy) * cellStep, color, null);
        }
      }
    },
  });

  const miniPiece = (idx, key) => {
    if (idx == null) return <span key={key} className="ds-mini-empty">—</span>;
    const cs = dsCells(idx, 0);
    const w = Math.max(...cs.map(([x]) => x)) + 1;
    const h = Math.max(...cs.map(([, y]) => y)) + 1;
    return (
      <span key={key} className="ds-mini-piece" style={{ width: w * 9, height: h * 9 }}>
        {cs.map(([x, y], k) => (
          <span key={k} className="ds-mini-cell"
            style={{ background: DS_SHAPES[idx].color, left: x * 9, top: y * 9 }} />
        ))}
      </span>
    );
  };
  const nextThree = [1, 2, 3]
    .map((n) => (pieceIdx + n < bagLen ? seq.current[pieceIdx + n] : null));

  return (
    <div className="ds-game fit-col">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Level</div><div className="pvalue">{level}</div></div>
        <div className="pill"><div className="plabel">Lines</div><div className="pvalue">{lines}</div></div>
        <div className="pill"><div className="plabel">Points</div><div className="pvalue">{points}</div></div>
        <div className="pill"><div className="plabel">Piece</div><div className="pvalue">
          {/* Arcade's bag is effectively endless, so counting toward its
              length would read as a target that does not exist. */}
          {isArcade ? Math.min(pieceIdx + 1, bagLen) : `${Math.min(pieceIdx + 1, bagLen)}/${bagLen}`}
        </div></div>
      </div>

      <div className="ds-main">
        <div className="ds-boardbox" ref={boxRef}>
          <canvas
            ref={canvasRef}
            className="ds-canvas board-canvas"
            role="grid"
            aria-label={`Drop Stack well, level ${level}, ${lines} lines cleared, piece ${Math.min(pieceIdx + 1, DS_PIECES)} of ${DS_PIECES}`}
          />
          {levelFlash > 0 && <div className="ds-level-flash">Level {levelFlash}</div>}
        </div>
        <div className="ds-side">
          <div className="ds-panel">
            <div className="ds-panel-label">Next</div>
            <div className="ds-queue">{nextThree.map((n, k) => miniPiece(n, k))}</div>
          </div>
          <button
            className={'ds-panel ds-hold' + (holdUsed ? ' used' : '')}
            onClick={doHold}
            disabled={holdUsed || done}
            title="Bank this piece (once per piece)"
          >
            <div className="ds-panel-label">Hold</div>
            <div className="ds-queue">{miniPiece(hold, 'h')}</div>
          </button>
        </div>
      </div>

      <div className="ds-pad">
        <button className="p6-btn" onClick={() => nudge(-1)}>◀</button>
        <button className="p6-btn" onClick={rotate}>⟳</button>
        <button className="p6-btn" onClick={() => nudge(1)}>▶</button>
        <button className="p6-btn primary" onClick={hardDrop}>⬇ Drop</button>
      </div>
      <div className="p6-hint">
        Drag to slide, tap to rotate, swipe down to drop. Speed rises every {DS_LINES_PER_LEVEL} lines.
      </div>
    </div>
  );
}

// Each entry also carries the Game Corner harness `manifest` (phase 2),
// mirrored by id in server.js's GAME_REGISTRY — machine-relevant fields
// (scoreDirection / tieBreak / sessionLength / input / undo) must match the
// server; `howToPlay` card copy lives ONLY here (display strings are the
// client's). Phase 3's shell-owned pre-game chrome renders these cards; until
// then they're declarative metadata.