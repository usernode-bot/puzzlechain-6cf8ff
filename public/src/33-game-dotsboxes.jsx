// Dots and Boxes — local two-player pass-and-play.
//
// A grid of dots; players take turns claiming edges. Complete a box and it
// fills with your colour and you go again. Most boxes when the board fills
// wins. Client-side only by design: the state lives in this module, nothing
// touches the server, and the result goes through the shared, unrated local
// path (onWin with localOnly) exactly like the other local board games.
//
// The board is a DOM CSS grid, not a canvas, on purpose: the spec asks for a
// ≥24px tap target on EVERY empty edge and keyboard traversal between edges,
// and a real <button> per edge gives both for free. Grid tracks are uniform
// minmax(24px, 1fr) so every edge cell clears the target at all three sizes
// (6×6 needs 13 × 24px = 312px, inside the 361px phone column).
//
// Pure rules live in the functions below and are the only copies of them —
// the component, the demo presets and the dotsboxes-rules self-test all go
// through dbApplyClaim, the same pair-of-pure-functions shape as
// ngGeometry/ngCellAt and hrPickAt/hrApplyStrike.

function dbEdgeKey(kind, r, c) { return kind + ':' + r + ',' + c; }

// The boxes an edge borders. An h edge (r, c) is the top of box (r, c) and
// the bottom of box (r-1, c); a v edge (r, c) is the left of box (r, c) and
// the right of box (r, c-1). Out-of-range boxes simply don't exist.
function dbBoxesForEdge(kind, r, c, n) {
  const out = [];
  if (kind === 'h') {
    if (r > 0) out.push([r - 1, c]);
    if (r < n) out.push([r, c]);
  } else {
    if (c > 0) out.push([r, c - 1]);
    if (c < n) out.push([r, c]);
  }
  return out;
}

function dbBoxComplete(state, br, bc) {
  const n = state.n;
  return !!(state.edges[dbEdgeKey('h', br, bc)] !== undefined
    && state.edges[dbEdgeKey('h', br + 1, bc)] !== undefined
    && state.edges[dbEdgeKey('v', br, bc)] !== undefined
    && state.edges[dbEdgeKey('v', br, bc + 1)] !== undefined);
}

// Claim one edge for `player`. Returns { state, illegal, completed, extraTurn }.
// An already-claimed edge is ILLEGAL and the caller treats that as a silent
// no-op — that, on top of tapProps' module-scope double-tap guard, is the
// "rapid double taps on the same edge are ignored" rule. Completing a box
// awards the point AND the extra turn: the turn only flips when nothing was
// completed, so a chain of completions keeps the same player claiming (and
// the turn banner in sync) for as long as the chain lasts.
function dbApplyClaim(state, player, kind, r, c) {
  const key = dbEdgeKey(kind, r, c);
  if (state.edges[key] !== undefined) {
    return { state, illegal: true, completed: [], extraTurn: false };
  }
  const edges = Object.assign({}, state.edges);
  edges[key] = player;
  // owners maps 'br,bc' -> the player who COMPLETED the box. It has to be
  // recorded here, at completion time: the four edges of a box can be split
  // between the players, so reading any one edge back (the top edge, say)
  // can name the player who never finished it.
  const owners = Object.assign({}, state.owners);
  const next = { n: state.n, edges, owners, scores: state.scores.slice(), turn: player };
  const completed = [];
  const boxes = dbBoxesForEdge(kind, r, c, state.n);
  for (let i = 0; i < boxes.length; i++) {
    if (dbBoxComplete(next, boxes[i][0], boxes[i][1])) {
      completed.push(boxes[i]);
      owners[boxes[i][0] + ',' + boxes[i][1]] = player;
    }
  }
  if (completed.length) {
    next.scores[player - 1] += completed.length;
    next.turn = player;              // extra turn
  } else {
    next.turn = player === 1 ? 2 : 1;
  }
  return { state: next, illegal: false, completed, extraTurn: completed.length > 0 };
}

function dbEdgeCount(n) { return 2 * n * (n + 1); }
function dbIsFull(state) { return Object.keys(state.edges).length >= dbEdgeCount(state.n); }

// Only meaningful once the board is full.
function dbWinner(state) {
  if (!dbIsFull(state)) return null;
  if (state.scores[0] > state.scores[1]) return 1;
  if (state.scores[1] > state.scores[0]) return 2;
  return 'draw';
}

function dbNewState(n) {
  return { n, edges: {}, owners: {}, scores: [0, 0], turn: 1 };
}

// Keyboard traversal: arrows slide along the SAME line (an h edge's left/right
// are its h neighbours, its up/down the h edges of the adjacent dot rows; a v
// edge mirrors that vertically), skipping claimed edges; Tab walks the whole
// board in DOM order, and disabled (claimed) buttons are skipped natively.
function dbNeighbor(state, kind, r, c, dir) {
  const n = state.n;
  const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  let rr = r, cc = c;
  for (let step = 0; step < n; step++) {
    rr += dr; cc += dc;
    if (rr < 0 || rr > (kind === 'h' ? n : n - 1)) return null;
    if (cc < 0 || cc > (kind === 'h' ? n - 1 : n)) return null;
    if (state.edges[dbEdgeKey(kind, rr, cc)] === undefined) {
      return { kind, r: rr, c: cc };
    }
  }
  return null;
}

// DOM order of every edge: grid rows top to bottom, left to right — the
// natural Tab walk, and the order focus advances in after a keyboard claim.
function dbEdgeOrder(n) {
  const out = [];
  for (let gr = 0; gr <= 2 * n; gr++) {
    for (let gc = 0; gc <= 2 * n; gc++) {
      if (gr % 2 === 0 && gc % 2 === 1) out.push({ kind: 'h', r: gr / 2, c: (gc - 1) / 2 });
      else if (gr % 2 === 1 && gc % 2 === 0) out.push({ kind: 'v', r: (gr - 1) / 2, c: gc / 2 });
    }
  }
  return out;
}

/* Deterministic mid-game states for the deep links that have to reach a board
   without playing (a check can navigate but cannot tap). Each preset records
   the score/turn its move list MUST produce, and dbDemoState refuses to build
   a state that disagrees with its own record — a fixture has to be able to
   say what it means, and a hand-edited move list that silently drifted would
   render a board the tests then assert against believing it was the fixture.
   All verified by replaying the pure rules:
     mid   — 6 claims in, one box taken, Player 2 to move.
     chain — the shared-edge setup where Player 1's NEXT claim (h,1,0)
             completes TWO boxes at once, starting a chain of extra turns.
     final — all vertical edges then all horizontal: Player 1 chains every
             completing edge and wins 16-0 on a 4×4 (a completing claim never
             flips the turn, so P1 takes all 16 in a row).
     draw  — all horizontal edges then all vertical: 8-8, board full. */
const DB_DEMOS = {
  mid: { n: 4, s1: 1, s2: 0, turn: 2, moves: ['h,0,0', 'v,0,1', 'v,0,2', 'h,0,1', 'h,1,1', 'h,4,3'] },
  chain: { n: 4, s1: 0, s2: 0, turn: 1, moves: ['h,0,0', 'v,0,0', 'v,0,1', 'h,2,0', 'v,1,0', 'v,1,1'] },
  final: { n: 4, s1: 16, s2: 0, turn: 1, moves: (function () {
    const mv = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c <= 4; c++) mv.push('v,' + r + ',' + c);
    for (let r = 0; r <= 4; r++) for (let c = 0; c < 4; c++) mv.push('h,' + r + ',' + c);
    return mv;
  })() },
  draw: { n: 4, s1: 8, s2: 8, turn: 1, moves: (function () {
    const mv = [];
    for (let r = 0; r <= 4; r++) for (let c = 0; c < 4; c++) mv.push('h,' + r + ',' + c);
    for (let r = 0; r < 4; r++) for (let c = 0; c <= 4; c++) mv.push('v,' + r + ',' + c);
    return mv;
  })() },
};

function dbDemoState(which) {
  const p = DB_DEMOS[which];
  if (!p) return null;
  let st = dbNewState(p.n);
  for (let i = 0; i < p.moves.length; i++) {
    const parts = p.moves[i].split(',');
    const res = dbApplyClaim(st, st.turn, parts[0], Number(parts[1]), Number(parts[2]));
    if (res.illegal) return null;
    st = res.state;
  }
  if (st.scores[0] !== p.s1 || st.scores[1] !== p.s2 || st.turn !== p.turn) return null;
  // Carried beside the state, not in it: dbApplyClaim builds fresh state
  // objects of a fixed shape, so a move count inside `st` would be dropped on
  // the very next claim.
  return { state: st, moves: p.moves.length };
}

const DB_VARIANTS = { '4x4': 4, '5x5': 5, '6x6': 6 };

function DotsBoxesLocalGame({ onWin, onStepChange, resetKey, variant }) {
  // A seeded position from ?db=, consumed once on mount — the same pattern as
  // BoardLocalGame's ludo demo. The mount pass would otherwise clobber it.
  const demoRef = useRef(dbDemoState(
    new URLSearchParams(window.location.search).get('db')));
  const [state, setState] = useState(() => (demoRef.current ? demoRef.current.state : dbNewState(5)));
  const [over, setOver] = useState(null); // { winner }
  const [moves, setMoves] = useState(demoRef.current ? demoRef.current.moves : 0);
  // Extra-turn flash: keyed by a sequence number so back-to-back chains
  // re-trigger it for the same player.
  const [flash, setFlash] = useState(null); // { player, seq }
  const flashSeqRef = useRef(0);
  const flashTimerRef = useRef(null);
  const submittedRef = useRef(false);
  // Set by a keydown on an edge, read (and cleared) by the click that key
  // produces: keyboard Enter/Space claims advance focus to the next edge,
  // pointer claims do not move focus at all.
  const kbdClaimRef = useRef(false);
  const edgeRefs = useRef({});
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const { secs } = useTimer(!over);

  // The board size comes from the STATE, never the variant prop — a ?db=
  // preset carries its own n, and the demo and the size picker must never
  // disagree about what is on screen.
  const n = state.n;

  useEffect(() => {
    if (demoRef.current) {
      const demo = demoRef.current; demoRef.current = null;
      if (dbIsFull(demo.state)) {
        // A finished preset lands straight on the shared result card.
        setOver({ winner: dbWinner(demo.state) });
        if (!submittedRef.current) {
          submittedRef.current = true;
          emitResult(demo.state, demo.moves, 0);
        }
      }
      return;
    }
    setState(dbNewState(DB_VARIANTS[variant] || 5));
    setOver(null); setMoves(0); setFlash(null);
    submittedRef.current = false;
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear a pending flash timer on unmount so it can't fire into a dead state.
  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);

  const showFlash = (player) => {
    flashSeqRef.current += 1;
    setFlash({ player, seq: flashSeqRef.current });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), 1400);
  };

  // Build the shared result-card payload once, from a final state.
  const emitResult = (finalState, moveCount, secs_) => {
    const winner = dbWinner(finalState);
    const label = winner === 'draw' ? 'Draw' : 'Player ' + winner + ' wins! 🎉';
    const share = 'Game Corner Dots and Boxes (' + finalState.n + ' × ' + finalState.n + '): '
      + 'Player 1 ' + finalState.scores[0] + ', Player 2 ' + finalState.scores[1] + '. '
      + (winner === 'draw' ? 'A draw!' : 'Player ' + winner + ' wins!');
    onWinRef.current && onWinRef.current(0, moveCount, secs_, {
      winnerLabel: label,
      localOnly: true,
      extraRows: [
        { k: 'Player 1', v: finalState.scores[0] + ' boxes' },
        { k: 'Player 2', v: finalState.scores[1] + ' boxes' },
      ],
      share,
    });
  };

  const finish = (finalState, moveCount) => {
    setOver({ winner: dbWinner(finalState) });
    setFlash(null);
    if (submittedRef.current) return;
    submittedRef.current = true;
    emitResult(finalState, moveCount, secs);
  };

  const claim = (kind, r, c) => {
    if (over) return;
    const res = dbApplyClaim(state, state.turn, kind, r, c);
    if (res.illegal) return; // double tap on a claimed edge: silent no-op
    const fromKeyboard = kbdClaimRef.current;
    kbdClaimRef.current = false;
    const moveCount = moves + 1;
    setState(res.state);
    setMoves(moveCount);
    onStepChange && onStepChange(moveCount);
    if (res.completed.length) {
      showFlash(state.turn);
    } else {
      // The turn actually moved on: retire any pending extra-turn flash so
      // the banner never announces a turn that has already passed.
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
      setFlash(null);
    }
    if (dbIsFull(res.state)) {
      finish(res.state, moveCount);
    } else if (fromKeyboard) {
      // Keyboard claim: advance focus to the next unclaimed edge in DOM order
      // (the claimed one is about to become disabled and drop focus).
      const order = dbEdgeOrder(res.state.n);
      const from = order.findIndex(e => e.kind === kind && e.r === r && e.c === c);
      for (let i = 1; i <= order.length; i++) {
        const e = order[(from + i) % order.length];
        if (res.state.edges[dbEdgeKey(e.kind, e.r, e.c)] === undefined) {
          const el = edgeRefs.current[dbEdgeKey(e.kind, e.r, e.c)];
          if (el) el.focus();
          break;
        }
      }
    }
  };

  const onKeyDownEdge = (e, kind, r, c) => {
    if (e.key === 'Enter' || e.key === ' ') { kbdClaimRef.current = true; return; }
    const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const dir = dirs[e.key];
    if (!dir) return;
    const nb = dbNeighbor(state, kind, r, c, dir);
    if (nb) {
      e.preventDefault();
      const el = edgeRefs.current[dbEdgeKey(nb.kind, nb.r, nb.c)];
      if (el) el.focus();
    }
  };

  const s1 = state.scores[0], s2 = state.scores[1];
  const turn = over ? over.winner : state.turn;
  const turnLabel = over
    ? (over.winner === 'draw' ? 'Draw' : 'Player ' + over.winner + ' wins!')
    : (flash ? 'Extra turn: Player ' + flash.player
             : 'Player ' + state.turn + "'s turn");

  // Uniform tracks: dots, edges and boxes all get the same cell, so every
  // edge target clears 24px in both dimensions at every board size.
  const track = 'repeat(' + (2 * n + 1) + ', minmax(24px, 1fr))';

  const cells = [];
  for (let gr = 0; gr <= 2 * n; gr++) {
    for (let gc = 0; gc <= 2 * n; gc++) {
      const cellKey = gr + ',' + gc;
      if (gr % 2 === 0 && gc % 2 === 0) {
        cells.push(<div key={'dot' + cellKey} className="db-dotcell"><span className="db-dot" /></div>);
      } else if (gr % 2 === 0 && gc % 2 === 1) {
        const r = gr / 2, c = (gc - 1) / 2;
        const key = dbEdgeKey('h', r, c);
        const owner = state.edges[key];
        cells.push(
          <button
            key={key}
            ref={el => { edgeRefs.current[key] = el; }}
            className={'db-edge db-h' + (owner !== undefined ? ' claimed db-p' + owner : '')}
            disabled={owner !== undefined}
            aria-label={(owner !== undefined
              ? 'Edge claimed by Player ' + owner
              : 'Empty horizontal edge, row ' + (r + 1) + ' between columns ' + (c + 1) + ' and ' + (c + 2))}
            {...(owner !== undefined ? {} : tapProps(() => claim('h', r, c)))}
            onKeyDown={(e) => onKeyDownEdge(e, 'h', r, c)}
          />
        );
      } else if (gr % 2 === 1 && gc % 2 === 0) {
        const r = (gr - 1) / 2, c = gc / 2;
        const key = dbEdgeKey('v', r, c);
        const owner = state.edges[key];
        cells.push(
          <button
            key={key}
            ref={el => { edgeRefs.current[key] = el; }}
            className={'db-edge db-v' + (owner !== undefined ? ' claimed db-p' + owner : '')}
            disabled={owner !== undefined}
            aria-label={(owner !== undefined
              ? 'Edge claimed by Player ' + owner
              : 'Empty vertical edge, column ' + (c + 1) + ' between rows ' + (r + 1) + ' and ' + (r + 2))}
            {...(owner !== undefined ? {} : tapProps(() => claim('v', r, c)))}
            onKeyDown={(e) => onKeyDownEdge(e, 'v', r, c)}
          />
        );
      } else {
        const br = (gr - 1) / 2, bc = (gc - 1) / 2;
        // Ownership comes from the owners map dbApplyClaim fills at completion
        // time — the completer, not whoever happened to claim one of the edges.
        const owner = state.owners[br + ',' + bc];
        const done_ = dbBoxComplete(state, br, bc);
        cells.push(
          <div
            key={'box' + cellKey}
            className={'db-box' + (done_ ? ' done db-p' + owner : '')}
            aria-label={done_ ? 'Box owned by Player ' + owner : 'Empty box'}
          />
        );
      }
    }
  }

  return (
    <div className="db-wrap">
      <div className="db-hud">
        <div className={'db-chip db-p1' + (turn === 1 ? ' active' : '')}>
          <span className="db-chip-dot" />
          <span className="db-chip-name">Player 1</span>
          <span className="db-chip-score mono" data-db-score="1">{s1}</span>
        </div>
        <div
          className={'db-turn-banner' + (flash ? ' db-flash' : '')}
          data-db-turn={turn}
          data-db-flash={flash ? String(flash.player) : null}
        >
          {turnLabel}
        </div>
        <div className={'db-chip db-p2' + (turn === 2 ? ' active' : '')}>
          <span className="db-chip-dot" />
          <span className="db-chip-name">Player 2</span>
          <span className="db-chip-score mono" data-db-score="2">{s2}</span>
        </div>
      </div>
      <div className="db-board-box">
        <div className="db-board" data-turn={String(over ? 0 : state.turn)} data-db-over={over ? '1' : '0'}
             style={{ gridTemplateColumns: track, gridTemplateRows: track }}>
          {cells}
        </div>
      </div>
      <p className="db-hint">Tap an edge between two dots. Complete a box to score it and go again.</p>
    </div>
  );
}

function DotsBoxesGame({ onWin, onStepChange, resetKey, gameMode, gameModeOpts, onModeChange }) {
  const [mode, setMode] = useState(gameMode || null);
  const [variant, setVariant] = useState(() => {
    // A ?db= preset carries its own board size; learn it so Play Again
    // restarts on the SAME size the preset played, not the default.
    const db = new URLSearchParams(window.location.search).get('db');
    const demo = db && DB_DEMOS[db];
    if (demo) {
      const key = Object.keys(DB_VARIANTS).find(k => DB_VARIANTS[k] === demo.n);
      if (key) return key;
    }
    return (gameModeOpts && gameModeOpts.variant) || '5x5';
  });

  // Sync from the shell (deep links, ☰ New Game) — the ChutesLaddersGame shape.
  useEffect(() => {
    setMode(gameMode || null);
    if (gameModeOpts && gameModeOpts.variant) setVariant(gameModeOpts.variant);
  }, [gameMode, gameModeOpts, resetKey]);

  // Report the active mode upward for the top-bar pill.
  useEffect(() => { onModeChange && onModeChange(mode); }, [mode]);

  // No mode means the board was reached without passing the opponent screen
  // (a bare deep link): fall back to the SAME picker that screen renders.
  if (!mode) {
    return (
      <ClassicModePicker
        game={GAMES.find(g => g.id === 'dotsboxes')}
        onPlay={(m, opts) => {
          if (opts && opts.variant) setVariant(opts.variant);
          setMode(m);
        }}
      />
    );
  }
  // Keyed by variant: changing the board size rebuilds the game. resetKey
  // alone restarts on the SAME size (one-tap restart via ☰ New Game / Play
  // Again), which is exactly the spec's restart semantics.
  return (
    <DotsBoxesLocalGame
      key={variant}
      onWin={onWin}
      onStepChange={onStepChange}
      resetKey={resetKey}
      variant={variant}
    />
  );
}