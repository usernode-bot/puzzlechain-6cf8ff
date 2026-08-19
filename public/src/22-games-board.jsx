/* ============================================================
   Phase 5 board games — Checkers, Reversi, Four in a Row, Gomoku,
   Ludo. Online head-to-head only: the SERVER is the referee (rules
   modules in lib/board-rules.js over classic_rooms), so these
   components only render polled state and submit move intents —
   there are no client-side rules to drift out of sync.
   ============================================================ */

// Create/Join setup for the online-only board games (reuses the Mancala
// mode-select styling).
function OnlineRoomSetup({ gameId, onReady }) {
  const [action, setAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Ludo seats 2–4 players (change-list item 10); every other board game is
  // strictly head-to-head.
  const multiSeat = gameId === 'ludo';
  const [players, setPlayers] = useState(2);

  /* #145 — "Your rooms".
     A room you hosted and then left (backgrounded the app, phone slept) used to
     be unreachable: it wasn't listed anywhere, and typing your own code came
     back "Room is full or you created it" with no way forward. /api/rooms/mine
     now returns WAITING rooms as well as active ones, and Rejoin goes through
     the same onReady pre-seating the home in-progress row already uses. */
  const [myRooms, setMyRooms] = useState(null); // null = still loading
  const [closing, setClosing] = useState(null);

  const loadMine = async () => {
    const { ok, body } = await api('/api/rooms/mine');
    setMyRooms(ok && body && Array.isArray(body.rooms)
      ? body.rooms.filter(r => r.gameId === gameId) : []);
  };
  useEffect(() => { loadMine(); }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close a room nobody ever joined. Same guarded forfeit endpoint as an
  // in-match concede — with no opponent it can't touch the ladder (the server
  // only rates on an active→finished transition WITH a player 2).
  const closeRoom = async (room) => {
    setClosing(room.id);
    await api(`/api/classic/${gameId}/rooms/${room.id}/finish`, {
      method: 'POST', body: JSON.stringify({}),
    });
    setClosing(null);
    loadMine();
  };

  const start = async () => {
    if (action === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${gameId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(multiSeat ? { players } : {}),
      });
      setBusy(false);
      if (ok && body) onReady(body.id, 1);
      else setError('Could not create room. Try again.');
    } else if (action === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status, body } = await api(`/api/classic/${gameId}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) { onReady(code, (body && body.yourPlayerNum) || 2); return; }
      if (status === 404) setError('Room not found. Check the code.');
      // #145 — your own code is no longer a dead end: rejoin it.
      else if (status === 409 && body && body.ownRoom) {
        onReady(code, body.yourPlayerNum || 1);
      }
      else if (status === 409) setError('That room is already full or finished.');
      else setError('Could not join. Try again.');
    }
  };

  return (
    <div className="mnc-mode-select">
      {myRooms && myRooms.length > 0 && (
        <div className="brd-myrooms">
          <div className="brd-myrooms-label">Your rooms</div>
          {myRooms.map(r => (
            <div key={r.id} className="brd-myroom">
              <div className="brd-myroom-meta">
                <span className="brd-myroom-code mono">{r.id}</span>
                <span className={'brd-myroom-sub' + (r.myTurn ? ' yourturn' : '')}>
                  {r.waiting
                    ? `Waiting for ${r.maxPlayers > 2 ? `${r.maxPlayers - r.seatsFilled} more player(s)` : 'an opponent'}`
                    : r.myTurn ? 'Your turn' : `${r.opponentName}'s turn`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {r.waiting && (
                  <button
                    className="ghost"
                    onClick={() => closeRoom(r)}
                    disabled={closing === r.id}
                  >{closing === r.id ? '…' : 'Close'}</button>
                )}
                <button onClick={() => onReady(r.id, r.myPlayerNum)}>Rejoin</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="brg-intro">
        {multiSeat
          ? <>🌐 Online Ludo — 2, 3, or 4 players via room code. 2-player wins count on the <strong>Ladder</strong>.</>
          : <>🌐 Online head-to-head — play a friend via room code. Wins count on the <strong>Ladder</strong>.</>}
      </div>
      <div className="mnc-online-actions">
        <div className="mnc-mode-sub">
          <button className={'mnc-difficulty-pill' + (action === 'create' ? ' active' : '')} onClick={() => { setAction('create'); setError(''); }}>Create Room</button>
          <button className={'mnc-difficulty-pill' + (action === 'join' ? ' active' : '')} onClick={() => { setAction('join'); setError(''); }}>Join Room</button>
        </div>
        {multiSeat && action !== 'join' && (
          <div className="mnc-mode-sub" style={{ marginTop: '0.5rem' }}>
            <span style={{ alignSelf: 'center', color: C.muted, fontSize: '0.78rem', marginRight: '0.3rem' }}>Players:</span>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={'mnc-difficulty-pill' + (players === n ? ' active' : '')}
                onClick={() => setPlayers(n)}
              >{n} players</button>
            ))}
          </div>
        )}
        {action === 'join' && (
          <div className="mnc-join-form">
            <input
              className="mnc-join-input"
              placeholder="Room code (e.g. AB3K7P)"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={8}
            />
          </div>
        )}
      </div>
      {error && <div className="mnc-join-error">{error}</div>}
      {action && (
        <button
          className="mnc-mode-start-btn"
          onClick={start}
          disabled={busy || (action === 'join' && joinCode.trim().length < 4)}
        >{busy ? 'Please wait…' : action === 'create' ? 'Create & share code' : 'Join game'}</button>
      )}
    </div>
  );
}

// ---- Per-game board views ----------------------------------------------
// Each gets { st, myPlayerNum, isMyTurn, submit } — pure render + intent.

function ckOwnerOf(v) { return v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0; }

function CheckersBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const [sel, setSel] = useState(null);
  const board = st.board || [];
  const click = (i) => {
    if (!isMyTurn) return;
    const owner = ckOwnerOf(board[i]);
    if (owner === myPlayerNum) { setSel(i === sel ? null : i); return; }
    if (sel != null && board[i] === 0) { submit({ from: sel, to: i }); setSel(null); }
  };
  return (
    <div>
      {st.mustJumpFrom != null && isMyTurn && (
        <div className="brg-note">Chain jump! Continue with the same piece.</div>
      )}
      <div className="ck-board">
        {board.map((v, i) => {
          const r = Math.floor(i / 8), c = i % 8;
          const dark = (r + c) % 2 === 1;
          const owner = ckOwnerOf(v);
          return (
            <div key={i} className={'ck-cell' + (dark ? ' dark' : '') + (sel === i ? ' sel' : '')} {...tapProps(() => dark && click(i))}>
              {owner !== 0 && (
                <div className={'ck-piece p' + owner + (v > 2 ? ' king' : '')}>{v > 2 ? '♛' : ''}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="brg-legend">
        <span><span className="ck-piece-mini p1" /> Player 1 (moves down)</span>
        <span><span className="ck-piece-mini p2" /> Player 2 (moves up)</span>
      </div>
    </div>
  );
}

function ReversiBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  const p1 = board.filter(x => x === 1).length;
  const p2 = board.filter(x => x === 2).length;
  return (
    <div>
      <div className="brg-note">
        <span className="rv-count"><span className="rv-disc-mini d1" /> {p1}</span>
        <span className="rv-count"><span className="rv-disc-mini d2" /> {p2}</span>
        {st.passed && <span style={{ marginLeft: '0.6rem' }}>Opponent had no move — you go again.</span>}
      </div>
      <div className="rv-board">
        {board.map((v, i) => (
          <div key={i} className="rv-cell" {...tapProps(() => isMyTurn && v === 0 && submit({ cell: i }))}>
            {v !== 0 && <div className={'rv-disc d' + v} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FourInARowView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  return (
    <div>
      <div className="fir-board">
        {board.map((v, i) => (
          <div
            key={i}
            className={'fir-cell' + (st.lastMove === i ? ' last' : '')}
            {...tapProps(() => isMyTurn && submit({ col: i % 7 }))}
          >
            {v !== 0 && <div className={'fir-disc d' + v} />}
          </div>
        ))}
      </div>
      <div className="brg-legend">
        <span><span className="fir-disc-mini d1" /> Player 1</span>
        <span><span className="fir-disc-mini d2" /> Player 2</span>
        <span style={{ color: C.muted }}>Tap a column to drop</span>
      </div>
    </div>
  );
}

/* PHASE 2 — Gomoku ghost-confirm.
   15x15 inside min(92vw, 380px) is ~24px per intersection — about a quarter of a
   fingertip — and the old single onClick committed a PERMANENT stone on the first
   tap. Now the first tap only places a ghost; you can slide it around and then
   confirm. The move payload and the server's applyMove contract are unchanged
   (only WHEN submit fires), so online, pass-and-play and bot modes all behave
   identically and lib/board-rules.js needed no change. */
function GomokuBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  const [pending, setPending] = useState(null);

  // Never leave a ghost hanging over the opponent's turn or a filled cell.
  useEffect(() => {
    if (!isMyTurn || (pending != null && board[pending] !== 0)) setPending(null);
  }, [isMyTurn, st.lastMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = () => {
    if (pending == null || !isMyTurn) return;
    submit({ cell: pending });
    setPending(null);
  };
  const pick = (i) => {
    if (!isMyTurn || board[i] !== 0) return;
    // Tapping the same intersection twice is a shortcut for Place.
    if (pending === i) { place(); return; }
    setPending(i);
  };

  const rc = pending == null ? null : [Math.floor(pending / 15) + 1, (pending % 15) + 1];
  return (
    <div className="gmk-scroll">
      <div className="gmk-board">
        {board.map((v, i) => (
          <div
            key={i}
            className={'gmk-cell' + (st.lastMove === i ? ' last' : '')}
            {...tapProps(() => pick(i))}
          >
            {v !== 0 && <div className={'gmk-stone s' + v} />}
            {v === 0 && pending === i && <div className="gmk-ghost" />}
          </div>
        ))}
      </div>
      {isMyTurn && (
        <div className="brd-confirm-bar">
          <button onClick={() => setPending(null)} disabled={pending == null}>Cancel</button>
          <button className="go" onClick={place} disabled={pending == null}>
            {pending == null ? 'Tap a point' : `Place stone (row ${rc[0]}, col ${rc[1]})`}
          </button>
        </div>
      )}
    </div>
  );
}

// Ludo board geometry — 15×15 grid mirror of the server module's relative
// track (lib/board-rules.js): 52-cell ring, per-player 6-cell home column,
// center home. [col,row] pairs; ring index 0 = P1 start, 26 = P2 start.
const LUDO_RING_XY = [
  [1,6],[2,6],[3,6],[4,6],[5,6], [6,5],[6,4],[6,3],[6,2],[6,1],[6,0], [7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5], [9,6],[10,6],[11,6],[12,6],[13,6],[14,6], [14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8], [8,9],[8,10],[8,11],[8,12],[8,13],[8,14], [7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9], [5,8],[4,8],[3,8],[2,8],[1,8],[0,8], [0,7],[0,6],
];
const LUDO_HOME_XY = {
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  2: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  3: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  4: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
};
const LUDO_BASE_XY = {
  1: [[2,2],[4,2],[2,4],[4,4]],
  2: [[10,10],[12,10],[10,12],[12,12]],
  3: [[10,2],[12,2],[10,4],[12,4]],
  4: [[2,10],[4,10],[2,12],[4,12]],
};
// Ring entry offsets — mirrors LUDO_START in lib/board-rules.js.
const LUDO_START_ABS = { 1: 0, 2: 26, 3: 13, 4: 39 };
const LUDO_SEAT_COLORS = { 1: C.accent, 2: C.rose, 3: C.gold, 4: GA.teal };

function ludoTokenXY(player, pos, tokenIdx) {
  if (pos === -1) return LUDO_BASE_XY[player][tokenIdx];
  if (pos >= 51 && pos <= 56) return LUDO_HOME_XY[player][pos - 51];
  if (pos >= 57) return [7, 7];
  return LUDO_RING_XY[(LUDO_START_ABS[player] + pos) % 52];
}

// Seats map with legacy fallback: pre-multi-seat states carry only p1/p2.
function ludoSeatsOf(st) {
  if (st.seats) return { n: st.nPlayers || 2, seats: st.seats, forfeited: st.forfeited || [] };
  return { n: 2, seats: { 1: st.p1 || [], 2: st.p2 || [] }, forfeited: [] };
}

function LudoBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const phase = st.phase || 'roll';
  const { n: nPlayers, seats, forfeited } = ludoSeatsOf(st);
  const seatList = Array.from({ length: nPlayers }, (_, i) => i + 1);
  const canMoveToken = (pos) => {
    if (phase !== 'move' || !isMyTurn || st.die == null) return false;
    if (pos >= 57) return false;
    if (pos === -1) return st.die === 6;
    return pos + st.die <= 57;
  };
  const cells = [];
  // Ring — a start cell is safe (and tinted) only for seats actually playing.
  LUDO_RING_XY.forEach(([x, y], i) => {
    const startOwner = seatList.find(p => LUDO_START_ABS[p] === i) || 0;
    const safe = i === 0 || i === 13 || i === 26 || i === 39;
    cells.push(
      <div key={'r' + i} className={'ludo-cell ring' + (safe ? ' safe' : '') + (startOwner ? ' start' + startOwner : '')}
           style={{ gridColumn: x + 1, gridRow: y + 1 }}>{safe ? '★' : ''}</div>
    );
  });
  // Home columns + center + bases (only for seats in this match)
  for (const p of seatList) {
    LUDO_HOME_XY[p].forEach(([x, y], i) => {
      cells.push(<div key={'h' + p + i} className={'ludo-cell home' + p} style={{ gridColumn: x + 1, gridRow: y + 1 }} />);
    });
    LUDO_BASE_XY[p].forEach(([x, y], i) => {
      cells.push(<div key={'b' + p + i} className={'ludo-cell base' + p} style={{ gridColumn: x + 1, gridRow: y + 1 }} />);
    });
  }
  cells.push(<div key="center" className="ludo-cell center" style={{ gridColumn: 8, gridRow: 8 }}>🏁</div>);
  // Tokens (offset stacked tokens slightly so pile-ups stay visible)
  const tokens = [];
  for (const p of seatList) {
    const toks = seats[p] || [];
    const out = forfeited.includes(p);
    toks.forEach((pos, i) => {
      const [x, y] = ludoTokenXY(p, pos, i);
      const mine = p === myPlayerNum;
      const movable = mine && !out && canMoveToken(pos);
      tokens.push(
        <div
          key={'t' + p + i}
          className={'ludo-token p' + p + (movable ? ' movable' : '') + (out ? ' forfeited' : '')}
          style={{
            gridColumn: x + 1, gridRow: y + 1,
            transform: `translate(${(i % 2) * 5 - 2}px, ${Math.floor(i / 2) * 5 - 2}px)`,
          }}
          {...tapProps(() => movable && submit({ type: 'move', token: i }))}
        >{i + 1}</div>
      );
    });
  }

  /* PHASE 2 — the movable-token pad.
     The board tap targets a token INSIDE a ~25px cell, and tokens sharing a
     square are offset by only 5px, so two of them overlap almost entirely —
     there was no reliable way to pick the one you meant (and no accessible way
     at all). This list is the unambiguous, full-size path; the board tap stays
     as a shortcut. Same { type: 'move', token } payload either way. */
  const myTokens = (seats[myPlayerNum] || []);
  const movableList = phase === 'move' && isMyTurn && st.die != null
    ? myTokens.map((pos, i) => ({ i, pos })).filter(t => canMoveToken(t.pos))
    : [];
  const describe = (pos) => {
    if (pos === -1) return 'in base — a 6 brings it out';
    if (pos >= 51) return `home column, ${57 - pos} to finish`;
    const dest = pos + st.die;
    return `step ${pos} → ${dest >= 51 ? 'home column' : dest}`;
  };

  return (
    <div>
      <div className="ludo-board">{cells}{tokens}</div>
      {movableList.length > 0 && (
        <div className="brd-movelist">
          <div className="brd-movelist-label">Your moves · rolled {st.die}</div>
          {movableList.map(t => (
            <button
              key={t.i}
              className="brd-move-btn"
              {...tapProps(() => submit({ type: 'move', token: t.i }))}
            >
              <span>Token {t.i + 1}</span>
              <span className="brd-move-sub">{describe(t.pos)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="cnl-die"><div className="cnl-die-face">{st.die == null ? '·' : st.die}</div></div>
      {st.lastEvent === 'no-move' && <div className="brg-note">No legal move for that roll — turn passed.</div>}
      {st.lastEvent === 'capture' && <div className="brg-note">💥 Capture! Token sent back to base.</div>}
      {forfeited.length > 0 && (
        <div className="brg-note">{forfeited.map(p => `P${p}`).join(', ')} forfeited — the match continues.</div>
      )}
      {nPlayers > 2 && !isMyTurn && (
        <div className="brg-note">Waiting on P{st.currentPlayer || 1}…</div>
      )}
      <div className="cnl-roll-buttons">
        <button
          className="cnl-roll-btn"
          style={{ background: LUDO_SEAT_COLORS[myPlayerNum] || C.accent }}
          onClick={() => submit({ type: 'roll' })}
          disabled={!isMyTurn || phase !== 'roll'}
        >
          {!isMyTurn ? 'Waiting…' : phase === 'roll' ? 'Roll' : 'Pick a highlighted token'}
        </button>
      </div>
      <div className="brg-legend">
        <span>🎲 6 leaves base & rolls again</span>
        <span>★ safe cells</span>
        <span>Exact roll to finish</span>
      </div>
    </div>
  );
}

const BOARD_VIEWS = {
  checkers: CheckersBoardView,
  reversi: ReversiBoardView,
  fourinarow: FourInARowView,
  gomoku: GomokuBoardView,
  ludo: LudoBoardView,
};

// Polling room shell shared by all five board games (mirrors the Chutes &
// Ladders online flow: waiting screen → status bar → board → finish → onWin).
function BoardOnlineRoom({ gameId, roomId, myPlayerNum, onWin, onStepChange }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom(gameId, roomId);
  const winCalledRef = useRef(false);
  // #145 — concede / close. Declared up here so both the waiting-room branch and
  // the live-match branch below can reach it (they return early).
  const [ending, setEnding] = useState(false);
  const endGame = async (isWaitingRoom) => {
    const other = myPlayerNum === 1 ? 2 : 1;
    const msg = isWaitingRoom
      ? 'Close this room? Nobody has joined yet, so nothing is rated.'
      : 'End this game? Your opponent wins and it counts on the Ladder.';
    if (window.unNative && window.unNative.alert) {
      const r = await window.unNative.alert({
        title: isWaitingRoom ? 'Close room' : 'End game',
        message: msg,
        buttons: [
          { label: 'Cancel', style: 'cancel' },
          { label: isWaitingRoom ? 'Close' : 'End game', style: 'destructive' },
        ],
      });
      if (!r || !r.button || r.button.style !== 'destructive') return;
    } else if (!window.confirm(msg)) {
      return;
    }
    setEnding(true);
    // A waiting room has no winner to declare; a concede hands it to the other
    // seat. The server ignores `winner` unless it makes the transition.
    await api(`/api/classic/${gameId}/rooms/${roomId}/finish`, {
      method: 'POST',
      body: JSON.stringify(isWaitingRoom ? {} : { winner: String(other) }),
    });
    setEnding(false);
  };
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const name = (GAMES.find(g => g.id === gameId) || {}).name || gameId;
    const draw = room.winner === 'draw';
    const youWin = room.winner === String(myPlayerNum);
    const multi = (room.maxPlayers || 2) > 2;
    onWin(youWin ? 200 : 0, movesRef.current, secsRef.current, {
      winnerLabel: draw ? "It's a draw 🤝" : youWin ? 'You win! 🎉' : (multi ? `Player ${room.winner} wins` : 'Opponent wins'),
      share: `♟️ ${name} online — ${draw ? 'we drew!' : youWin ? 'I won!' : 'good game!'}`,
    });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} /><div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div></div>;
  }
  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }
  if (room && room.status === 'waiting') {
    const maxP = room.maxPlayers || 2;
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ color: C.muted, marginBottom: '0.6rem', fontSize: '0.85rem' }}>
          {maxP > 2
            ? `Waiting for players — ${room.seatsFilled || 1}/${maxP} joined…`
            : 'Waiting for opponent to join…'}
        </div>
        <div className="mnc-room-code">{roomId}</div>
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.4rem' }}>Share this room code</div>
        <div className="mnc-spinner" style={{ margin: '1rem auto 0' }} />
      </div>
    );
  }

  const st = room.state || {};
  const isMyTurn = room.status === 'active' && (st.currentPlayer || 1) === myPlayerNum;
  const seatColors = { 1: C.accent, 2: C.rose, 3: C.gold, 4: GA.teal };
  const myColor = seatColors[myPlayerNum] || C.accent;
  const multiSeat = (room.maxPlayers || 2) > 2;
  const turnLabel = room.status === 'finished'
    ? (room.winner === 'draw' ? 'Draw' : room.winner === String(myPlayerNum) ? 'You win! 🎉' : (multiSeat ? `P${room.winner} wins` : 'Opponent wins'))
    : isMyTurn ? 'Your turn' : (multiSeat ? `P${st.currentPlayer || 1}'s turn` : "Opponent's turn");
  const View = BOARD_VIEWS[gameId];
  const submit = (move) => {
    movesRef.current += 1;
    onStepChange && onStepChange(movesRef.current);
    submitMove({ move });
  };

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill"><div className="plabel">You</div><div className="pvalue" style={{ color: myColor, fontSize: '0.82rem' }}>P{myPlayerNum}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} /><div className="plabel">Online</div></div>
      </div>
      {opponentDisconnected && <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Opponent connection lost — waiting for reconnect…</div>}
      {room.status === 'active' && (() => {
        // Correspondence turn timer: the server auto-forfeits the side to move
        // after turnTimeoutHours without a move — surface the remaining window.
        const expH = roomExpiresInHours(room);
        return expH != null ? (
          <div style={{ textAlign: 'center', color: expH <= 6 ? C.rose : C.muted, fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            ⏱ {isMyTurn ? 'Your move' : 'Their move'} · expires in {expH}h
          </div>
        ) : null;
      })()}
      <View st={st} myPlayerNum={myPlayerNum} isMyTurn={isMyTurn} submit={submit} />
      {/* #145 — there was NO way to end a match once it started; the only exit
          was to abandon it and let the 48h turn timer settle it. Concedes
          through the existing guarded forfeit endpoint, which rates the match
          exactly once on the active→finished transition and is idempotent. */}
      {room.status === 'active' && (
        <button className="brd-endgame" onClick={() => endGame(false)} disabled={ending}>
          {ending ? 'Ending…' : '🏳️ End game'}
        </button>
      )}
    </div>
  );
}

// Top-level component per board game: create/join setup, then the room.
/* ============================================================
   PHASE 7 (#144) — local pass-and-play + Versus Bot for the five board games.

   These were online-only, so if nobody joined you couldn't play at all. The
   rules come from window.boardRules — the SAME pure module server.js referees
   with (served at /board-rules.js, see its footer) — so an offline game and an
   online game can never disagree about a legal move.

   Unrated by construction: applyMatchRating only ever runs in the four server
   finish paths, and these modes never call the server. We also skip
   submitClassicScore so the all-time board stays comparable.
   ============================================================ */

// A bot is a pure function (state, player) -> move | null. One strength per
// game; difficulty tiers are deferred. Each is deliberately beatable.
/* #176 — bot difficulty tiers.
   Search DEPTH was always a plain argument to boardNegamax, so wiring a
   selector to it is trivial. What is NOT trivial, and is the actual work here:
   SHALLOW IS NOT EASY. A depth-1 Four in a Row bot still blocks every
   immediate threat and still wins the centre — to a beginner it is
   indistinguishable from the depth-4 one. A believable easy tier needs a
   deliberate BLUNDER RATE: some fraction of the time it plays a legal move
   that is not the best one it found.

   Mancala already shipped Easy/Medium/Hard (it is the only bot in the app that
   did), so its selector is the UI pattern the five others copy. */
const BOARD_BOT_LEVELS = [
  { id: 'easy',   label: 'Easy',   depthDelta: -2, blunder: 0.45 },
  { id: 'medium', label: 'Medium', depthDelta: -1, blunder: 0.15 },
  { id: 'hard',   label: 'Hard',   depthDelta: 0,  blunder: 0 },
];
const boardBotLevel = (id) => BOARD_BOT_LEVELS.find(l => l.id === id) || BOARD_BOT_LEVELS[2];

/* Wrap a bot so it sometimes plays a legal-but-not-best move.
   Candidates come from the SAME move generators the search uses, and each one
   is then validated against the real rules module by calling applyMove and
   catching its throw — so a blundering bot can only ever play badly, never
   illegally. A game with no generator here (Reversi's weighted bot, Ludo's
   dice) simply keeps its pick and gets its difficulty from depth alone. */
const BOARD_BOT_MOVES = {
  fourinarow: (state) => firMoves(state),
  gomoku: (state) => gmkMoves(state),
  checkers: (state, me) => ckMoves(state, me),
  reversi: (state) => (state.board || []).map((_, i) => ({ cell: i })),
};
function boardBlunder(gameId, rules, state, me, best, rate) {
  if (!rate || Math.random() >= rate) return best;
  const gen = BOARD_BOT_MOVES[gameId];
  if (!gen) return best;
  let candidates = [];
  try { candidates = gen(state, me) || []; } catch (e) { return best; }
  const legal = candidates.filter((mv) => {
    try { rules.applyMove(state, me, mv); return true; } catch (e) { return false; }
  });
  if (legal.length < 2) return best;   // no alternative to blunder into
  return legal[Math.floor(Math.random() * legal.length)];
}

const BOARD_BOTS = {
  // Reversi: positional weights (corners high, X-squares poisonous) with a
  // 1-ply lookahead over the flip count.
  reversi: (rules, state, me) => {
    const W = [
      120, -20, 20, 5, 5, 20, -20, 120,
      -20, -40, -5, -5, -5, -5, -40, -20,
      20, -5, 15, 3, 3, 15, -5, 20,
      5, -5, 3, 3, 3, 3, -5, 5,
      5, -5, 3, 3, 3, 3, -5, 5,
      20, -5, 15, 3, 3, 15, -5, 20,
      -20, -40, -5, -5, -5, -5, -40, -20,
      120, -20, 20, 5, 5, 20, -20, 120,
    ];
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 64; i++) {
      if ((state.board || [])[i] !== 0) continue;
      let r;
      try { r = rules.applyMove(state, me, { cell: i }); } catch { continue; }
      const mine = (r.state.board || []).filter(x => x === me).length;
      const sc = W[i] + mine * 2;
      if (sc > bestScore) { bestScore = sc; best = { cell: i }; }
    }
    return best;
  },

  // Four in a Row: shallow negamax over a threat heuristic.
  fourinarow: (rules, state, me, lvl) => boardNegamax(rules, state, me, Math.max(1, 4 + boardBotLevel(lvl).depthDelta), firScore, firMoves),

  // Gomoku: the same search, shallower (15x15 branching is 225 wide) with a
  // candidate filter to cells near existing stones.
  gomoku: (rules, state, me, lvl) => boardNegamax(rules, state, me, Math.max(1, 2 + boardBotLevel(lvl).depthDelta), gmkScore, gmkMoves),

  // Checkers: negamax over material + kings + advancement.
  checkers: (rules, state, me, lvl) => boardNegamax(rules, state, me, Math.max(1, 3 + boardBotLevel(lvl).depthDelta), ckScore, ckMoves),

  // Ludo: pure move ordering — capture > finish > leave base > advance leader.
  // (No search: the dice make deep lookahead worthless.)
  ludo: (rules, state, me) => {
    if ((state.phase || 'roll') === 'roll') return { type: 'roll' };
    const toks = (state['p' + me] || (state.seats && state.seats[me]) || []);
    const die = state.die;
    if (die == null) return { type: 'roll' };
    const cand = [];
    for (let i = 0; i < toks.length; i++) {
      const pos = toks[i];
      if (pos >= 57) continue;
      if (pos === -1) { if (die === 6) cand.push({ i, rank: 3 }); continue; }
      if (pos + die > 57) continue;
      const dest = pos + die;
      let rank = 1 + dest / 100;             // advance the leader, gently
      if (dest === 57) rank = 5;             // finish a token
      else if (dest >= 51) rank = 4;         // reach the home column
      cand.push({ i, rank });
    }
    if (!cand.length) return null;
    cand.sort((a, b) => b.rank - a.rank);
    return { type: 'move', token: cand[0].i };
  },
};

// ---- Bot search plumbing (pure; no DOM, no rules duplication) --------------
// Every candidate move is validated by calling the REAL applyMove and catching
// its throw, so a bot can never make a move the referee would reject.
function boardNegamax(rules, state, me, depth, evalFn, movesFn) {
  const other = me === 1 ? 2 : 1;
  let best = null, bestScore = -Infinity;
  for (const mv of movesFn(state, me)) {
    let r;
    try { r = rules.applyMove(state, me, mv); } catch { continue; }
    let sc;
    if (r.gameOver) sc = r.winner === String(me) ? 1e6 : r.winner === 'draw' ? 0 : -1e6;
    else if (depth <= 1) sc = evalFn(r.state, me);
    else sc = -negaValue(rules, r.state, other, me, depth - 1, -Infinity, Infinity, evalFn, movesFn);
    if (sc > bestScore) { bestScore = sc; best = mv; }
  }
  return best;
}

function negaValue(rules, state, turn, me, depth, alpha, beta, evalFn, movesFn) {
  if (depth <= 0) return turn === me ? evalFn(state, me) : -evalFn(state, me);
  const other = turn === 1 ? 2 : 1;
  let best = -Infinity, any = false;
  for (const mv of movesFn(state, turn)) {
    let r;
    try { r = rules.applyMove(state, turn, mv); } catch { continue; }
    any = true;
    let sc;
    if (r.gameOver) sc = r.winner === String(turn) ? 1e6 : r.winner === 'draw' ? 0 : -1e6;
    else sc = -negaValue(rules, r.state, other, me, depth - 1, -beta, -alpha, evalFn, movesFn);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  if (!any) return turn === me ? evalFn(state, me) : -evalFn(state, me);
  return best;
}

const firMoves = (state) => {
  const out = [];
  for (let c = 0; c < 7; c++) if ((state.board || [])[c] === 0) out.push({ col: c });
  return out;
};
// Count open 2s/3s for both sides; prefer the centre column.
function firScore(state, me) {
  const b = state.board || [];
  const other = me === 1 ? 2 : 1;
  let s = 0;
  const lines = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    for (const [dr, dc] of lines) {
      let mine = 0, theirs = 0, ok = true;
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7) { ok = false; break; }
        const v = b[rr * 7 + cc];
        if (v === me) mine++; else if (v === other) theirs++;
      }
      if (!ok) continue;
      if (mine && !theirs) s += mine * mine;
      if (theirs && !mine) s -= theirs * theirs * 1.2; // slightly defensive
    }
    if (c === 3 && b[r * 7 + 3] === me) s += 3;
  }
  return s;
}

// Only intersections adjacent to an existing stone — 225-wide branching is
// otherwise hopeless, and an isolated stone is never the best Gomoku move.
const gmkMoves = (state) => {
  const b = state.board || [];
  const out = [];
  const has = b.some(v => v !== 0);
  if (!has) return [{ cell: 7 * 15 + 7 }]; // centre opening
  for (let i = 0; i < 225; i++) {
    if (b[i] !== 0) continue;
    const r = Math.floor(i / 15), c = i % 15;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= 15 || cc < 0 || cc >= 15) continue;
      if (b[rr * 15 + cc] !== 0) { near = true; break; }
    }
    if (near) out.push({ cell: i });
  }
  return out.slice(0, 40);
};
function gmkScore(state, me) {
  const b = state.board || [];
  const other = me === 1 ? 2 : 1;
  let s = 0;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
    for (const [dr, dc] of dirs) {
      let mine = 0, theirs = 0, ok = true;
      for (let k = 0; k < 5; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= 15 || cc < 0 || cc >= 15) { ok = false; break; }
        const v = b[rr * 15 + cc];
        if (v === me) mine++; else if (v === other) theirs++;
      }
      if (!ok) continue;
      if (mine && !theirs) s += Math.pow(mine, 3);
      if (theirs && !mine) s -= Math.pow(theirs, 3) * 1.3;
    }
  }
  return s;
}

const ckMoves = (state, player) => {
  const b = state.board || [];
  const out = [];
  // Enumerate from-squares owned by `player`; applyMove validates the rest, so
  // this only has to be a superset of the legal moves.
  const from = state.mustJumpFrom != null ? [state.mustJumpFrom] : b.map((_, i) => i);
  for (const f of from) {
    const v = b[f];
    if (v === 0) continue;
    const owner = v === 1 || v === 3 ? 1 : 2;
    if (owner !== player) continue;
    const r = Math.floor(f / 8), c = f % 8;
    for (const dr of [-2, -1, 1, 2]) for (const dc of [-2, -1, 1, 2]) {
      if (Math.abs(dr) !== Math.abs(dc)) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue;
      const t = rr * 8 + cc;
      if (b[t] !== 0) continue;
      out.push({ from: f, to: t });
    }
  }
  return out;
};
function ckScore(state, me) {
  const b = state.board || [];
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const v = b[i];
    if (!v) continue;
    const owner = v === 1 || v === 3 ? 1 : 2;
    const king = v > 2;
    const row = Math.floor(i / 8);
    // Advancement: player 1 moves down the board, player 2 up.
    const adv = owner === 1 ? row : 7 - row;
    const val = (king ? 20 : 10) + adv * 0.6;
    s += owner === me ? val : -val;
  }
  return s;
}

function BoardLocalGame({ gameId, vsBot, onWin, onStepChange, resetKey, seats, botLevel }) {
  const rules = (window.boardRules && window.boardRules.getRules)
    ? window.boardRules.getRules(gameId) : null;
  /* #176 — local play was 2-seat ONLY because this called initialState() with
     no argument. The ludo rules module has always been seat-generic
     (`initialState(nPlayers = 2)`, `maxPlayers: 4`) and online has always
     offered 2–4, so local was the odd one out for no reason but a missing
     parameter. Games whose rules take no argument ignore it. */
  const nSeats = Math.min(rules && rules.maxPlayers ? rules.maxPlayers : 2,
                          Math.max(2, Number(seats) || 2));
  const [state, setState] = useState(() => (rules ? rules.initialState(nSeats) : null));
  const [over, setOver] = useState(null); // { winner }
  const [err, setErr] = useState('');
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState(0);
  const submittedRef = useRef(false);
  const onWinRef = useRef(onWin); onWinRef.current = onWin;

  useEffect(() => {
    if (!rules) return;
    setState(rules.initialState(nSeats));
    setOver(null); setErr(''); setMoves(0); setThinking(false);
    submittedRef.current = false;
  }, [resetKey, gameId, nSeats]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rules) {
    return (
      <div className="brg-intro">
        Offline play needs the rules module, which didn't load. Try reloading, or
        use <strong>Online</strong> mode.
      </div>
    );
  }

  const finish = (winner) => {
    setOver({ winner });
    if (submittedRef.current) return;
    submittedRef.current = true;
    const label = winner === 'draw' ? 'Draw'
      : vsBot ? (String(winner) === '1' ? 'You win! 🎉' : 'Bot wins')
      : `Player ${winner} wins! 🎉`;
    // Unrated and unscored on purpose — a local result must not sit on the same
    // board as online matches (and the ladder is server-side only anyway).
    onWinRef.current && onWinRef.current(0, moves, 0, { winnerLabel: label, localOnly: true });
  };

  const apply = (player, move) => {
    let r;
    try {
      r = rules.applyMove(state, player, move);
    } catch (e) {
      // The referee's own message — never a second copy of the rules.
      setErr(e && e.message ? e.message : 'Illegal move');
      setTimeout(() => setErr(''), 2200);
      return null;
    }
    setErr('');
    setState(r.state);
    setMoves(m => { const n = m + 1; onStepChange && onStepChange(n); return n; });
    if (r.gameOver) finish(r.winner);
    return r;
  };

  // Bot turn. Sliced through setTimeout so a deep search never blocks paint,
  // and re-checked against the CURRENT state so a fast human tap can't race it.
  const botPlayer = 2;
  useEffect(() => {
    if (!vsBot || over || !state) return;
    if (Number(state.currentPlayer) !== botPlayer) return;
    let alive = true;
    setThinking(true);
    const t = setTimeout(() => {
      if (!alive) return;
      setThinking(false);
      const pick = BOARD_BOTS[gameId];
      const lvl = botLevel || 'hard';
      const raw = pick ? pick(rules, state, botPlayer, lvl) : null;
      const mv = raw ? boardBlunder(gameId, rules, state, botPlayer, raw, boardBotLevel(lvl).blunder) : null;
      if (!mv) {
        // No legal move the bot can find — Ludo rolls again, others concede.
        if (gameId === 'ludo') apply(botPlayer, { type: 'roll' });
        return;
      }
      apply(botPlayer, mv);
    }, 350);
    return () => { alive = false; clearTimeout(t); setThinking(false); };
  }, [state, vsBot, over, botLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const View = BOARD_VIEWS[gameId];
  const cur = Number(state.currentPlayer) || 1;
  const myTurn = !over && (!vsBot || cur !== botPlayer);
  const label = (p) => (vsBot ? (p === 1 ? 'You' : 'Bot') : `Player ${p}`);

  return (
    <div>
      <div className="brg-intro">
        {over
          ? (over.winner === 'draw' ? "It's a draw." : `${label(Number(over.winner))} ${vsBot && over.winner === '1' ? 'win' : 'wins'}! 🎉`)
          : thinking ? 'Bot is thinking…'
          : `${label(cur)} to move`}
      </div>
      {err && <div className="mnc-join-error">{err}</div>}
      <View
        st={state}
        myPlayerNum={cur}
        isMyTurn={myTurn}
        submit={(move) => { if (myTurn) apply(cur, move); }}
      />
    </div>
  );
}

function BoardRoomGame({ gameId, onWin, onStepChange, resetKey, gameMode, gameModeOpts }) {
  // A pre-seated room (phase 7 in-progress row) skips the create/join setup:
  // the home your-turn card passes { roomId, myPlayerNum } through the classic
  // game-mode opts to land straight back in the live match.
  const [roomInfo, setRoomInfo] = useState(() =>
    gameModeOpts && gameModeOpts.roomId && gameModeOpts.myPlayerNum
      ? { roomId: gameModeOpts.roomId, myPlayerNum: gameModeOpts.myPlayerNum }
      : null
  );
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) setRoomInfo(null);
    else mounted.current = true;
  }, [resetKey]);

  // #144 — mode dispatch. 'bot' and '2p' use the shared rules module locally;
  // 'online' (and the legacy null default) keep the existing room flow.
  if (gameMode === 'bot' || gameMode === '2p') {
    return (
      <BoardLocalGame
        gameId={gameId}
        vsBot={gameMode === 'bot'}
        onWin={onWin}
        onStepChange={onStepChange}
        resetKey={resetKey}
        botLevel={(gameModeOpts && gameModeOpts.botLevel) || 'medium'}
        seats={(gameModeOpts && gameModeOpts.seats) || 2}
      />
    );
  }
  if (!roomInfo) {
    return <OnlineRoomSetup gameId={gameId} onReady={(roomId, myPlayerNum) => setRoomInfo({ roomId, myPlayerNum })} />;
  }
  return <BoardOnlineRoom gameId={gameId} roomId={roomInfo.roomId} myPlayerNum={roomInfo.myPlayerNum} onWin={onWin} onStepChange={onStepChange} />;
}

function CheckersGame(props)   { return <BoardRoomGame gameId="checkers" {...props} />; }
function ReversiGame(props)    { return <BoardRoomGame gameId="reversi" {...props} />; }
function FourInARowGame(props) { return <BoardRoomGame gameId="fourinarow" {...props} />; }
function GomokuGame(props)     { return <BoardRoomGame gameId="gomoku" {...props} />; }
function LudoGame(props)       { return <BoardRoomGame gameId="ludo" {...props} />; }

function ChutesLaddersGame({ onWin, onStepChange, resetKey, gameMode, gameModeOpts, onModeChange }) {
  const [mode, setMode] = useState(gameMode || null);
  // Board style for LOCAL play. Online rooms carry their own variant on the
  // room state (the creator chose it), so the online view reads it from there.
  const [variant, setVariant] = useState(
    (gameModeOpts && gameModeOpts.variant) || 'classic');
  const [glossary, setGlossary] = useState(false);
  const [roomId, setRoomId] = useState((gameModeOpts && gameModeOpts.roomId) || null);
  const [myPlayerNum, setMyPlayerNum] = useState(
    gameModeOpts && gameModeOpts.myPlayerNum
      ? gameModeOpts.myPlayerNum
      : gameModeOpts && gameModeOpts.roomAction === 'join' ? 2 : 1
  );
  const [resumeState, setResumeState] = useState(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const { loadState, clearState } = useClassicSave('chutes-ladders');

  // Intercept onWin to track win streak in localStorage and submit to the server.
  // playerWon: meta.winner===1 for local/bot (player 1 = the human); score>0 for online.
  const handleWin = (score, steps, secs, meta) => {
    const playerWon = meta && meta.winner !== undefined ? meta.winner === 1 : score > 0;
    const prevStreak = parseInt(localStorage.getItem(CNL_STREAK_KEY) || '0', 10);
    const newStreak = playerWon ? prevStreak + 1 : 0;
    try { localStorage.setItem(CNL_STREAK_KEY, String(newStreak)); } catch (e) {}
    submitClassicScore('chutes-ladders', newStreak, { mode: mode || 'bot' });
    onWin(score, steps, secs, meta);
  };

  // Sync mode from the Game Menu's New Game selection.
  useEffect(() => {
    setMode(gameMode || null);
    if (gameModeOpts && gameModeOpts.roomId) {
      setRoomId(gameModeOpts.roomId);
      setMyPlayerNum(gameModeOpts.roomAction === 'join' ? 2 : 1);
    }
  }, [gameMode, gameModeOpts, resetKey]);

  // Report active mode upward for the top-bar pill + Save visibility.
  useEffect(() => { onModeChange && onModeChange(mode); }, [mode]);

  // Check for a saved bot game when entering bot mode.
  useEffect(() => {
    let cancelled = false;
    if (mode === 'bot' && !resumeChecked) {
      loadState().then(s => { if (!cancelled) { setResumeState(s); setResumeChecked(true); } });
    } else if (mode !== 'bot') {
      setResumeChecked(false); setResumeState(null);
    }
    return () => { cancelled = true; };
  }, [mode]);

  const glossaryModal = glossary
    ? <MokshaGlossaryModal onClose={() => setGlossary(false)} />
    : null;

  if (!mode) {
    return (
      <React.Fragment>
        <ChutesLaddersModeSelect
          game={{ id: 'chutes-ladders' }}
          onGlossary={() => setGlossary(true)}
          onPick={(m, opts) => {
            if (opts && opts.variant) setVariant(opts.variant);
            if (m === 'online') { setRoomId(opts.roomId); setMyPlayerNum(opts.roomAction === 'join' ? 2 : 1); }
            setMode(m);
          }}
        />
        {glossaryModal}
      </React.Fragment>
    );
  }
  if (mode === 'online') {
    return (
      <React.Fragment>
        <ChutesLaddersOnlineGame
          onWin={handleWin} onStepChange={onStepChange}
          roomId={roomId} myPlayerNum={myPlayerNum}
          onGlossary={() => setGlossary(true)}
        />
        {glossaryModal}
      </React.Fragment>
    );
  }
  if (mode === 'bot' && !resumeChecked) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>Loading…</div>;
  }
  return (
    <React.Fragment>
      <ChutesLaddersLocalGame
        onWin={handleWin}
        onStepChange={onStepChange}
        resetKey={resetKey}
        vsBot={mode === 'bot'}
        variant={variant}
        onGlossary={() => setGlossary(true)}
        initialState={mode === 'bot' ? resumeState : null}
        onClearSave={mode === 'bot' ? clearState : null}
      />
      {glossaryModal}
    </React.Fragment>
  );
}

// Declarative client game registry — the single source of truth for how each
// game is launched, wrapped, and scored on the client (mirrors the server's
// authoritative GAME_REGISTRY in server.js). Every entry MUST carry an `id`.
//
// Capability fields read by the App dispatch:
//   shell — how App renders the game body:
//     'daily'   → back-header game-wrap; receives savedProgress/onSaveProgress
//     'classic' → wrapped in ClassicShell + .cg-stage.cg-scroll (in-frame)
//     'self'    → game renders its own ClassicShell (full-screen, gesture-first)
//     'custom'  → App renders a bespoke screen (e.g. PvP Arena), not `component`
//   daily — true only for category 'daily' games: the single gate for the
//           per-day start/lock/finish/streak/resume machinery.
//   category — lobby tab grouping (maps 1:1 to the tabs).
