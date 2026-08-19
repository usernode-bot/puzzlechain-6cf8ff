/* ============================================================
   Chutes & Ladders — 2-player local (pass-and-play) classic game
   ============================================================ */
// Standard Milton-Bradley layout. Ladders climb (bottom -> top),
// chutes slide (top -> bottom). One flat map keyed by landing square.
const CNL_LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const CNL_CHUTES  = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const CNL_JUMPS   = Object.assign({}, CNL_LADDERS, CNL_CHUTES);

/* ---- Moksha Patam — the original Indian board (slice 7) --------------------
   Ladders sit on VIRTUES, snakes on VICES, and vices outnumber virtues 11 to 5.
   That imbalance is the moral point the original was making, and it makes the
   climb genuinely slower than the Milton-Bradley board — which is why Classic
   stays the default and this is opt-in per game.

   These tables MUST stay byte-identical to CNL_MOKSHA_* in lib/board-rules.js:
   the server referees online rooms off its copy and the client renders off
   this one. Square numbers follow the commonly published Moksha Patam
   virtue/vice list; the DESTINATIONS are this app's balance choice, not
   historical record (surviving boards disagree with each other). */
const CNL_MOKSHA_LADDERS = { 12: 38, 51: 67, 57: 74, 76: 91, 78: 97 };
const CNL_MOKSHA_CHUTES  = {
  41: 20, 44: 22, 49: 9, 52: 35, 58: 40, 62: 19, 69: 33, 84: 63, 92: 73, 95: 24, 98: 78,
};
const CNL_MOKSHA_JUMPS = Object.assign({}, CNL_MOKSHA_LADDERS, CNL_MOKSHA_CHUTES);

// Square → { name, sanskrit, blurb }. Drives the on-board labels, the landing
// banner and the glossary modal.
const CNL_MOKSHA_MEANINGS = {
  12: { name: 'Faith',        sanskrit: 'Shraddha',  blurb: 'Trust in the path — the first step that makes any climb possible.' },
  51: { name: 'Reliability',  sanskrit: 'Vishwas',   blurb: 'Being someone others can depend on, steadily and without fuss.' },
  57: { name: 'Generosity',   sanskrit: 'Dāna',      blurb: 'Giving freely, without keeping score of what was given.' },
  76: { name: 'Knowledge',    sanskrit: 'Jñāna',     blurb: 'Understanding that changes how you act, not just what you know.' },
  78: { name: 'Asceticism',   sanskrit: 'Tapas',     blurb: 'Disciplined restraint — the last stretch before liberation.' },
  41: { name: 'Disobedience', sanskrit: 'Avajña',    blurb: 'Disregarding good counsel, and sliding back for it.' },
  44: { name: 'Arrogance',    sanskrit: 'Ahankara',  blurb: 'The ego that mistakes itself for the whole self.' },
  49: { name: 'Vulgarity',    sanskrit: 'Ashlilata', blurb: 'Coarseness of speech and conduct that drags others down too.' },
  52: { name: 'Theft',        sanskrit: 'Chaurya',   blurb: 'Taking what was never offered.' },
  58: { name: 'Lying',        sanskrit: 'Asatya',    blurb: 'Untruth — the vice that quietly undoes every other virtue.' },
  62: { name: 'Drunkenness',  sanskrit: 'Madya',     blurb: 'Intoxication that clouds judgement and loosens restraint.' },
  69: { name: 'Debt',         sanskrit: 'Rina',      blurb: 'Obligation left unsettled, weighing on every step after.' },
  84: { name: 'Anger',        sanskrit: 'Krodha',    blurb: 'Rage that burns away progress made patiently.' },
  92: { name: 'Greed',        sanskrit: 'Lobha',     blurb: 'Wanting more precisely when you already have enough.' },
  95: { name: 'Pride',        sanskrit: 'Mada',      blurb: 'Conceit near the summit — the longest fall on the board.' },
  98: { name: 'Lust',         sanskrit: 'Kama',      blurb: 'Craving two squares from liberation, back to where discipline begins.' },
};

const CNL_VARIANTS = {
  classic: { label: 'Classic', ladders: CNL_LADDERS, chutes: CNL_CHUTES, jumps: CNL_JUMPS },
  moksha:  { label: 'Moksha Patam', ladders: CNL_MOKSHA_LADDERS, chutes: CNL_MOKSHA_CHUTES, jumps: CNL_MOKSHA_JUMPS },
};
function cnlVariant(v) { return CNL_VARIANTS[v] ? v : 'classic'; }

// The glossary — reachable from the mode picker and the in-game header, so a
// player can read what a square means before or during a game.
function MokshaGlossaryModal({ onClose }) {
  const row = (sq, kind) => {
    const m = CNL_MOKSHA_MEANINGS[sq];
    const dest = CNL_MOKSHA_JUMPS[sq];
    return (
      <div key={sq} className="mok-row">
        <span className={'mok-sq ' + kind}>{sq}</span>
        <span className="mok-body">
          <span className="mok-name">
            {m.name} <em>({m.sanskrit})</em>
            <span className="mok-dest">{kind === 'up' ? '↑' : '↓'} {dest}</span>
          </span>
          <span className="mok-blurb">{m.blurb}</span>
        </span>
      </div>
    );
  };
  return (
    <div className="howto-overlay" onClick={onClose}>
      <div className="howto-card" onClick={(e) => e.stopPropagation()}>
        <h3>📖 Moksha Patam — what the squares mean</h3>
        <p className="mok-intro">
          Long before it was a children's board game, this was a teaching tool from
          India. Every ladder sits on a virtue and every snake on a vice, and the
          vices deliberately outnumber the virtues — progress up the board was meant
          to feel hard-won. Square 100 is <b>Moksha</b>: liberation.
        </p>
        <div className="mok-section">Virtues — ladders up</div>
        {Object.keys(CNL_MOKSHA_LADDERS).map(Number).sort((a, b) => a - b).map((s) => row(s, 'up'))}
        <div className="mok-section">Vices — snakes down</div>
        {Object.keys(CNL_MOKSHA_CHUTES).map(Number).sort((a, b) => a - b).map((s) => row(s, 'down'))}
        <button className="primary-btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

// Map a square number (1..100) to {row, col} on the boustrophedon board.
// row 0 is the BOTTOM row (squares 1..10), row 9 is the TOP (91..100).
// Even rows (0-indexed from bottom) run left->right; odd rows right->left.
function cnlRowCol(n) {
  const idx = n - 1;            // 0-based
  const row = Math.floor(idx / 10);
  const within = idx % 10;
  const col = (row % 2 === 0) ? within : (9 - within);
  return { row, col };
}

// Center of a square as a percentage of the board box (for SVG + pawns).
// Visual row 0 sits at the BOTTOM, so flip for top-origin coordinates.
function cnlCenterPct(n) {
  if (n <= 0) return { x: 50, y: 104 }; // off-board: just below the board
  const { row, col } = cnlRowCol(n);
  const visualRow = 9 - row;
  return { x: (col + 0.5) * 10, y: (visualRow + 0.5) * 10 };
}

// Local Chutes & Ladders board: hotseat 2-player, or vs Bot (P2 auto-rolls).
// `initialState` (a saved bot snapshot) offers an in-stage Resume banner.
function ChutesLaddersLocalGame({ onWin, onStepChange, resetKey, vsBot, initialState, onClearSave, variant, onGlossary }) {
  // Board tables for the chosen style. `variant` is 'classic' | 'moksha'.
  const vkey = cnlVariant(variant);
  const V = CNL_VARIANTS[vkey];
  const isMoksha = vkey === 'moksha';
  const [p1Pos, setP1Pos]   = useState(0);
  const [p2Pos, setP2Pos]   = useState(0);
  const [player, setPlayer] = useState(1);
  const [die, setDie]       = useState(null);
  const [rolls, setRolls]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [rolling, setRolling]     = useState(false);
  const [done, setDone]     = useState(false);
  const [winner, setWinner] = useState(null);
  const [banner, setBanner] = useState('');
  // Resume offer for a saved bot game; null once dismissed/applied.
  const [resumeOffer, setResumeOffer] = useState(initialState || null);

  const animatingRef = useRef(false);
  const winTimerRef  = useRef(null);
  const timersRef    = useRef([]);

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;
  const rollsRef = useRef(0);
  rollsRef.current = rolls;

  const pLabel = (who) => vsBot ? (who === 1 ? 'You' : 'Bot') : `Player ${who}`;

  // Expose a save snapshot to the Game Menu while this is an active bot game.
  useClassicSaveSource(vsBot && !done, () => ({
    p1Pos, p2Pos, currentPlayer: player, rolls, secs: secsRef.current,
  }));

  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    setP1Pos(s.p1Pos || 0); setP2Pos(s.p2Pos || 0);
    setPlayer(s.currentPlayer || 1); setRolls(s.rolls || 0);
    rollsRef.current = s.rolls || 0;
    setResumeOffer(null);
  };
  const dismissResume = () => { setResumeOffer(null); if (onClearSave) onClearSave(); };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
  };

  const resetGame = () => {
    animatingRef.current = false;
    clearTimers();
    setP1Pos(0); setP2Pos(0);
    setPlayer(1); setDie(null); setRolls(0);
    setAnimating(false); setRolling(false);
    setDone(false); setWinner(null); setBanner('');
  };

  useEffect(() => { resetGame(); }, [resetKey]);
  useEffect(() => () => clearTimers(), []);

  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = done ? C.muted : (player === 1 ? p1Color : p2Color);

  const setPos = (who, val) => { who === 1 ? setP1Pos(val) : setP2Pos(val); };

  const finishTurn = (who, landed) => {
    const jump = V.jumps[landed];
    const settle = () => {
      // Win check: must land exactly on 100 (no chute sits on 100).
      if (landed === 100) {
        setDone(true);
        setWinner(who);
        if (onClearSave) onClearSave();
        const label = `${pLabel(who)} win${vsBot && who === 1 ? '' : (vsBot ? 's' : 's')}! 🎉`;
        setBanner(label);
        const finalRolls = rollsRef.current;
        const finalSecs = secsRef.current;
        const score = Math.max(50, 300 - finalRolls * 5);
        const share = `🪜 Snakes & Ladders — ${pLabel(who)} won in ${finalRolls} rolls!`;
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          onWin(score, finalRolls, finalSecs, { winner: who, winnerLabel: label, share });
        }, 1300);
        return;
      }
      // Pass turn to the other player.
      animatingRef.current = false;
      setAnimating(false);
      setPlayer(who === 1 ? 2 : 1);
    };

    if (jump !== undefined) {
      // Brief pause so players see the landing, then climb/slide. On the
      // Moksha board the banner names the virtue or vice you landed on, so the
      // teaching content lands in the moment it applies.
      const isLadder = V.ladders[landed] !== undefined;
      const m = isMoksha ? CNL_MOKSHA_MEANINGS[landed] : null;
      setBanner(m
        ? `${m.name} (${m.sanskrit}) — ${isLadder ? 'climb up 🪜' : 'down you go 🐍'}`
        : (isLadder ? 'Ladder up! 🪜' : 'Down the chute! 🛝'));
      const t = setTimeout(() => {
        setPos(who, jump);
        const t2 = setTimeout(() => { setBanner(''); settle(); }, 320);
        timersRef.current.push(t2);
      }, 380);
      timersRef.current.push(t);
    } else {
      settle();
    }
  };

  const roll = (clickedWho) => {
    if (animatingRef.current || done || rolling) return;
    // Buttons pass which player tapped; ignore a tap that isn't the active player.
    if (clickedWho !== undefined && clickedWho !== player) return;
    const who = player;
    const value = Math.floor(Math.random() * 6) + 1;
    const from = who === 1 ? p1Pos : p2Pos;
    const newRolls = rolls + 1;

    setRolling(true);
    setDie(value);
    setBanner('');
    setRolls(newRolls);
    rollsRef.current = newRolls;
    onStepChange(newRolls);

    const rollT = setTimeout(() => {
      setRolling(false);

      // Overshoot 100 => stay put, pass turn.
      if (from + value > 100) {
        setBanner('Overshoot — stay put');
        const passT = setTimeout(() => {
          setBanner('');
          setPlayer(who === 1 ? 2 : 1);
        }, 700);
        timersRef.current.push(passT);
        return;
      }

      // Hop square-by-square to the landing square.
      animatingRef.current = true;
      setAnimating(true);
      const target = from + value;
      let cur = from;
      const hop = () => {
        if (!animatingRef.current) return;
        if (cur >= target) { finishTurn(who, target); return; }
        cur++;
        setPos(who, cur);
        const t = setTimeout(hop, 130);
        timersRef.current.push(t);
      };
      const t0 = setTimeout(hop, 130);
      timersRef.current.push(t0);
    }, 720);
    timersRef.current.push(rollT);
  };

  // Bot auto-rolls for Player 2 in Versus-Bot mode.
  useEffect(() => {
    if (!vsBot || done || resumeOffer) return;
    if (player !== 2 || animating || rolling) return;
    const t = setTimeout(() => roll(2), 650);
    return () => clearTimeout(t);
  }, [vsBot, player, animating, rolling, done, resumeOffer]);

  // Build the 10x10 cells (top row first for natural DOM order).
  const cells = [];
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    for (let col = 0; col < 10; col++) {
      const row = 9 - visualRow;              // bottom-origin board row
      const within = (row % 2 === 0) ? col : (9 - col);
      const n = row * 10 + within + 1;
      const isL = V.ladders[n] !== undefined;
      const mark = isL ? '🪜' : V.chutes[n] !== undefined ? (isMoksha ? '🐍' : '🛝') : null;
      const meaning = isMoksha ? CNL_MOKSHA_MEANINGS[n] : null;
      cells.push(
        <div
          key={n}
          className={'cnl-cell' + ((row + col) % 2 ? ' alt' : '') + (n === 100 ? ' cnl-goal' : '')}
          title={meaning ? `${n} — ${meaning.name} (${meaning.sanskrit})` : undefined}
        >
          <span>{n}</span>
          {mark && <span className="cnl-cell-mark">{mark}</span>}
          {/* On the Moksha board each special square is named on the board
              itself, so the lesson is legible without opening the glossary. */}
          {meaning && <span className={'cnl-cell-name' + (isL ? ' up' : ' down')}>{meaning.name}</span>}
        </div>
      );
    }
  }

  // Connectors. Ladders stay straight; Moksha's snakes are drawn as a curve so
  // they read as snakes rather than as chutes.
  const lines = Object.keys(V.jumps).map(k => {
    const from = parseInt(k, 10);
    const to = V.jumps[from];
    const a = cnlCenterPct(from);
    const b = cnlCenterPct(to);
    const isLadder = V.ladders[from] !== undefined;
    const stroke = isLadder ? C.emerald : C.rose;
    if (isMoksha && !isLadder) {
      // Two opposing arcs through the midpoint give a slither; the control
      // offset is perpendicular to the run so long snakes bend more.
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.max(Math.hypot(dx, dy), 0.001);
      const off = Math.min(9, len * 0.16);
      const nx = -dy / len * off, ny = dx / len * off;
      return (
        <path
          key={k}
          d={`M ${a.x} ${a.y} Q ${(a.x + mx) / 2 + nx} ${(a.y + my) / 2 + ny} ${mx} ${my} Q ${(mx + b.x) / 2 - nx} ${(my + b.y) / 2 - ny} ${b.x} ${b.y}`}
          fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.65"
        />
      );
    }
    return (
      <line
        key={k}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.6"
      />
    );
  });

  const p1c = cnlCenterPct(p1Pos);
  const p2c = cnlCenterPct(p2Pos);
  // Nudge pawns apart when sharing a square (incl. both off-board) so both stay visible.
  const sameCell = p1Pos === p2Pos;
  const p1x = sameCell ? p1c.x - 2.4 : p1c.x;
  const p2x = sameCell ? p2c.x + 2.4 : p2c.x;

  const bannerActive = !!banner;
  const bannerColor = done ? C.muted : activeColor;

  return (
    <div>
      {resumeOffer && (
        <ClassicResumeBanner onResume={applyResume} onDismiss={dismissResume} />
      )}
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Turn</div>
          <div className="pvalue" style={{ color: activeColor, fontSize: '0.95rem' }}>
            {done ? pLabel(winner) : pLabel(player)}
          </div>
        </div>
        <div className="pill">
          <div className="plabel">{pLabel(1)}</div>
          <div className="pvalue" style={{ color: p1Color, fontSize: '0.95rem' }}>{p1Pos}</div>
        </div>
        <div className="pill">
          <div className="plabel">{pLabel(2)}</div>
          <div className="pvalue" style={{ color: p2Color, fontSize: '0.95rem' }}>{p2Pos}</div>
        </div>
        <div className="pill">
          <div className="plabel">Rolls</div>
          <div className="pvalue">{rolls}</div>
        </div>
        {isMoksha && (
          <button className="p6-btn cnl-glossary-btn" onClick={onGlossary}>
            📖 What do these mean?
          </button>
        )}
      </div>

      <div
        className="cnl-banner"
        style={{
          color: bannerColor,
          background: (bannerActive ? bannerColor : activeColor) + '22',
          border: `1px solid ${(bannerActive ? bannerColor : activeColor)}44`,
        }}
      >
        {done
          ? `Game over — ${pLabel(winner)} win${vsBot && winner === 1 ? '' : 's'}! 🎉`
          : (banner || `${pLabel(player)}'s turn`)}
      </div>

      <div className="cnl-board-wrap">
        <div className="cnl-board">{cells}</div>
        <svg className="cnl-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {lines}
        </svg>
        <div className="cnl-pawn" style={{ left: p1x + '%', top: p1c.y + '%', background: p1Color }} aria-label="Player 1 pawn" />
        <div className="cnl-pawn" style={{ left: p2x + '%', top: p2c.y + '%', background: p2Color }} aria-label="Player 2 pawn" />
      </div>

      <div className="cnl-die">
        <div className={'cnl-die-face' + (rolling ? ' rolling' : '')} style={{ borderColor: activeColor + '88' }}>
          {die == null ? '·' : die}
        </div>
      </div>

      <div className="cnl-roll-buttons">
        <button
          className="cnl-roll-btn"
          style={{ background: p1Color }}
          onClick={() => roll(1)}
          disabled={done || animating || rolling || player !== 1 || !!resumeOffer}
        >
          {vsBot ? 'Your' : 'Player 1 -'} Roll
        </button>
        {vsBot ? (
          <button className="cnl-roll-btn" style={{ background: p2Color, opacity: 0.85 }} disabled>
            {player === 2 && !done ? 'Bot rolling…' : 'Bot'}
          </button>
        ) : (
          <button
            className="cnl-roll-btn"
            style={{ background: p2Color }}
            onClick={() => roll(2)}
            disabled={done || animating || rolling || player !== 2}
          >
            Player 2 - Roll
          </button>
        )}
      </div>
    </div>
  );
}

// In-stage mode selector for Chutes & Ladders (shown on first launch from the
// lobby; the Game Menu's New Game also routes here via the mode picker).
function ChutesLaddersModeSelect({ game, onPick, onGlossary }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Board style is independent of the play mode; Classic stays the default
  // because the Moksha board is deliberately a longer game.
  const [variant, setVariant] = useState('classic');

  const modes = [
    { id: '2p',     icon: '👥', name: '2 Players',         desc: 'Pass and play on this device' },
    { id: 'bot',    icon: '🤖', name: 'Versus Bot',        desc: 'The computer rolls for Player 2' },
    { id: 'online', icon: '🌐', name: 'Online Multiplayer', desc: 'Play a friend via room code' },
  ];

  const handleStart = async () => {
    if (!mode) return;
    if (mode !== 'online') { onPick(mode, { variant }); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      // The creator's board style travels with the room; the joining player
      // reads it back off the polled room state.
      const { ok, body } = await api('/api/classic/chutes-ladders/rooms', {
        method: 'POST', body: JSON.stringify({ variant }),
      });
      setBusy(false);
      if (ok && body) onPick('online', { roomAction: 'create', roomId: body.id, variant });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api('/api/classic/chutes-ladders/rooms/' + code + '/join', { method: 'POST' });
      setBusy(false);
      if (ok) onPick('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="mnc-mode-select">
      {modes.map(m => (
        <button key={m.id} className={'mnc-mode-btn' + (mode === m.id ? ' active' : '')} onClick={() => { setMode(m.id); setError(''); }}>
          <span className="mnc-mode-icon">{m.icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">{m.name}</span>
            <span className="mnc-mode-desc">{m.desc}</span>
          </span>
        </button>
      ))}
      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            </div>
          )}
        </div>
      )}
      <div className="cnl-variant-block">
        <div className="cnl-variant-label">Board style</div>
        <div className="mnc-mode-sub">
          <button className={'mnc-difficulty-pill' + (variant === 'classic' ? ' active' : '')}
            onClick={() => setVariant('classic')}>Classic</button>
          <button className={'mnc-difficulty-pill' + (variant === 'moksha' ? ' active' : '')}
            onClick={() => setVariant('moksha')}>Moksha Patam (original)</button>
        </div>
        {variant === 'moksha' && (
          <div className="cnl-variant-note">
            The Indian original: ladders on virtues, snakes on vices — 11 vices to
            5 virtues, so the climb is a slower one.{' '}
            <button className="cnl-variant-link" onClick={onGlossary}>📖 What do these mean?</button>
          </div>
        )}
      </div>
      {error && <div className="mnc-join-error">{error}</div>}
      {mode && <button className="mnc-mode-start-btn" onClick={handleStart} disabled={!canStart || busy}>{busy ? 'Please wait…' : 'Play'}</button>}
    </div>
  );
}

// Online Chutes & Ladders over classic_rooms. Server owns the dice; the client
// just sends a "roll" and renders the polled room state.
function ChutesLaddersOnlineGame({ onWin, onStepChange, roomId, myPlayerNum, onGlossary }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom('chutes-ladders', roomId);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const youWin = room.winner === String(myPlayerNum);
    const rolls = (room.state && room.state.rolls) || 0;
    const score = youWin ? Math.max(50, 300 - rolls * 5) : 0;
    const share = `🪜 Snakes & Ladders Online — ${youWin ? 'I won' : 'good game'} in ${rolls} rolls!`;
    onWin(score, movesRef.current, secsRef.current, { winnerLabel: youWin ? 'You win! 🎉' : 'Opponent wins', share });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} /><div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div></div>;
  }
  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }

  const status = room ? room.status : 'waiting';
  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ color: C.muted, marginBottom: '0.6rem', fontSize: '0.85rem' }}>Waiting for opponent to join…</div>
        <div className="mnc-room-code">{roomId}</div>
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.4rem' }}>Share this room code</div>
        <div className="mnc-spinner" style={{ margin: '1rem auto 0' }} />
      </div>
    );
  }

  const st = room.state || {};
  // The board style lives on the ROOM (the creator picked it), so the joining
  // player renders whatever board they actually joined.
  const vkey = cnlVariant(st.variant);
  const V = CNL_VARIANTS[vkey];
  const isMoksha = vkey === 'moksha';
  const cur = st.currentPlayer || 1;
  const isMyTurn = status === 'active' && cur === myPlayerNum;
  const p1Color = C.accent, p2Color = C.rose;
  const myColor = myPlayerNum === 1 ? p1Color : p2Color;

  const doRoll = () => {
    if (!isMyTurn) return;
    movesRef.current += 1; onStepChange && onStepChange(movesRef.current);
    submitMove({ type: 'roll' });
  };

  // Reuse the static board renderer by mapping positions onto pawns.
  const cells = [];
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    for (let col = 0; col < 10; col++) {
      const row = 9 - visualRow;
      const within = (row % 2 === 0) ? col : (9 - col);
      const n = row * 10 + within + 1;
      const isL = V.ladders[n] !== undefined;
      const mark = isL ? '🪜' : V.chutes[n] !== undefined ? (isMoksha ? '🐍' : '🛝') : null;
      const meaning = isMoksha ? CNL_MOKSHA_MEANINGS[n] : null;
      cells.push(
        <div key={n} className={'cnl-cell' + ((row + col) % 2 ? ' alt' : '') + (n === 100 ? ' cnl-goal' : '')}
          title={meaning ? `${n} — ${meaning.name} (${meaning.sanskrit})` : undefined}>
          <span>{n}</span>
          {mark && <span className="cnl-cell-mark">{mark}</span>}
          {meaning && <span className={'cnl-cell-name' + (isL ? ' up' : ' down')}>{meaning.name}</span>}
        </div>
      );
    }
  }
  const lines = Object.keys(V.jumps).map(k => {
    const from = parseInt(k, 10), to = V.jumps[from];
    const a = cnlCenterPct(from), b = cnlCenterPct(to);
    const isLadder = V.ladders[from] !== undefined;
    const stroke = isLadder ? C.emerald : C.rose;
    if (isMoksha && !isLadder) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.max(Math.hypot(dx, dy), 0.001);
      const off = Math.min(9, len * 0.16);
      const nx = -dy / len * off, ny = dx / len * off;
      return <path key={k} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.65"
        d={`M ${a.x} ${a.y} Q ${(a.x + mx) / 2 + nx} ${(a.y + my) / 2 + ny} ${mx} ${my} Q ${(mx + b.x) / 2 - nx} ${(my + b.y) / 2 - ny} ${b.x} ${b.y}`} />;
    }
    return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />;
  });
  const p1c = cnlCenterPct(st.p1Pos || 0), p2c = cnlCenterPct(st.p2Pos || 0);
  const same = (st.p1Pos || 0) === (st.p2Pos || 0);
  const p1x = same ? p1c.x - 2.4 : p1c.x, p2x = same ? p2c.x + 2.4 : p2c.x;

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : 'Opponent wins')
    : isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill"><div className="plabel">You</div><div className="pvalue" style={{ color: myColor, fontSize: '0.95rem' }}>{myPlayerNum === 1 ? (st.p1Pos || 0) : (st.p2Pos || 0)}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} /><div className="plabel">Online</div></div>
        {isMoksha && (
          <button className="p6-btn cnl-glossary-btn" onClick={onGlossary}>📖 What do these mean?</button>
        )}
      </div>
      {opponentDisconnected && <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Opponent connection lost — waiting for reconnect…</div>}
      <div className="cnl-board-wrap">
        <div className="cnl-board">{cells}</div>
        <svg className="cnl-svg" viewBox="0 0 100 100" preserveAspectRatio="none">{lines}</svg>
        <div className="cnl-pawn" style={{ left: p1x + '%', top: p1c.y + '%', background: p1Color }} />
        <div className="cnl-pawn" style={{ left: p2x + '%', top: p2c.y + '%', background: p2Color }} />
      </div>
      <div className="cnl-die">
        <div className="cnl-die-face" style={{ borderColor: myColor + '88' }}>{st.die == null ? '·' : st.die}</div>
      </div>
      <div className="cnl-roll-buttons">
        <button className="cnl-roll-btn" style={{ background: myColor }} onClick={doRoll} disabled={!isMyTurn}>
          {status === 'finished' ? 'Game over' : isMyTurn ? 'Roll' : 'Waiting…'}
        </button>
      </div>
    </div>
  );
}

const CNL_STREAK_KEY = 'puzzlechain_cnl_streak';

// Chutes & Ladders wrapper — picks a mode (2P / Versus Bot / Online) and
// delegates. Honors the Game Menu's gameMode/gameModeOpts props.