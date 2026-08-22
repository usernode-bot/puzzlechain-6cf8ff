/* ============================================================
   Snakes & Ladders V2 — game components + wrapper
   ============================================================
   Local play generalizes the old 2-player engine to positions[] for 2–6
   hotseat seats and resolves the board from the 7-tier CNLV2_LAYOUTS
   (Moksha stays the fixed CNL_VARIANTS table and hides difficulty).
   Online play is unchanged mechanically: 2 players, Classic/Moksha,
   server-refereed rooms — only the renderer is the V2 canvas.

   Shared data from the old file is READ, never redefined: CNL_VARIANTS,
   CNL_MOKSHA_MEANINGS, MokshaGlossaryModal, CNL_DIE_PIPS, useCnlSkin/
   CNL_SKINS, CNL_STREAK_KEY, cnlVariant, cnlCenterPct. */

function SnLV2LocalGame({ onWin, onStepChange, resetKey, vsBot, seats, difficulty, variant, initialState, onClearSave, onGlossary }) {
  const nSeats = vsBot ? 2 : Math.max(2, Math.min(6, seats || 2));
  const vkey = cnlVariant(variant);
  const isMoksha = vkey === 'moksha';
  const layout = isMoksha ? null : cnlv2LayoutById(difficulty);
  const isLegend = !isMoksha && layout.id === 'legend';
  const gildAll = !isMoksha && (layout.id === 'superstar' || layout.id === 'legend');
  const V = isMoksha
    ? CNL_VARIANTS.moksha
    : { ladders: layout.ladders, chutes: layout.snakes, jumps: Object.assign({}, layout.ladders, layout.snakes) };

  const [skin, setSkin] = useCnlSkin();
  const SK = CNL_SKINS[isMoksha ? 'plain' : skin];
  const cycleSkin = () => {
    const ids = Object.keys(CNL_SKINS);
    setSkin(ids[(ids.indexOf(skin) + 1) % ids.length]);
  };

  const [positions, setPositions] = useState(() => Array(nSeats).fill(0));
  const [player, setPlayer] = useState(1);
  const [die, setDie] = useState(null);
  const [rolls, setRolls] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(false);
  const [winner, setWinner] = useState(null);
  const [banner, setBanner] = useState('');
  const [resumeOffer, setResumeOffer] = useState(initialState || null);

  const animatingRef = useRef(false);
  const winTimerRef = useRef(null);
  const timersRef = useRef([]);

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;
  const rollsRef = useRef(0);
  rollsRef.current = rolls;

  const pLabel = (who) => vsBot ? (who === 1 ? 'You' : 'Bot') : `Player ${who}`;

  // V2 bot snapshot for the Game Menu's Save button. The wrapper treats a
  // loaded snapshot without v:2 as no-save, so old-format saves never
  // mis-hydrate into this engine.
  useClassicSaveSource(vsBot && !done, () => ({
    v: 2, seats: nSeats, positions, currentPlayer: player,
    rolls, secs: secsRef.current, difficulty: isMoksha ? null : layout.id, variant: vkey,
  }));

  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    const ps = Array.isArray(s.positions) ? s.positions.slice(0, nSeats) : [];
    while (ps.length < nSeats) ps.push(0);
    setPositions(ps);
    setPlayer(s.currentPlayer || 1);
    setRolls(s.rolls || 0);
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
    setPositions(Array(nSeats).fill(0));
    setPlayer(1); setDie(null); setRolls(0);
    setAnimating(false); setRolling(false);
    setDone(false); setWinner(null); setBanner('');
  };

  // A seat-count / board change mid-mount must rebuild the positions array,
  // not just repaint — hence the wider dep list than the old 2P board had.
  useEffect(() => { resetGame(); }, [resetKey, nSeats, isMoksha ? 'moksha' : layout.id]);
  useEffect(() => () => clearTimers(), []);

  const seatColor = (who) => CNLV2_SEAT_COLORS[(who - 1) % CNLV2_SEAT_COLORS.length];
  const activeColor = done ? PAL.muted : seatColor(player);

  const setPos = (who, val) => setPositions((ps) => ps.map((p, i) => (i === who - 1 ? val : p)));

  const finishTurn = (who, landed) => {
    const jump = V.jumps[landed];
    // The win check must look at where the turn actually ENDS — a jump can
    // carry the pawn into 100 (see the old finishTurn's soft-lock note).
    const finalSquare = jump !== undefined ? jump : landed;
    const settle = () => {
      if (finalSquare === 100) {
        setDone(true);
        setWinner(who);
        if (onClearSave) onClearSave();
        let label = `${pLabel(who)} win${vsBot && who === 1 ? '' : 's'}! 🎉`;
        // Legend unlocks on a Super Star win where YOUR pawn (seat 1)
        // reaches 100 first — bot or hotseat. Device-local, like every other
        // classic free-play state.
        if (!isMoksha && layout.id === 'superstar' && who === 1 && !cnlv2LegendUnlocked()) {
          cnlv2SaveUnlock('legend');
          label += ' 🔓 Legend unlocked!';
        }
        setBanner(label);
        const finalRolls = rollsRef.current;
        const finalSecs = secsRef.current;
        const score = Math.max(50, 300 - finalRolls * 5);
        const tierBit = isMoksha ? 'Moksha Patam' : layout.label;
        const share = `🪜 Snakes & Ladders (${tierBit}) — ${pLabel(who)} won in ${finalRolls} rolls!`;
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          onWin(score, finalRolls, finalSecs, { winner: who, winnerLabel: label, share });
        }, 1300);
        return;
      }
      animatingRef.current = false;
      setAnimating(false);
      setPlayer(who >= nSeats ? 1 : who + 1);
    };

    if (jump !== undefined) {
      const isLadder = V.ladders[landed] !== undefined;
      const m = isMoksha ? CNL_MOKSHA_MEANINGS[landed] : null;
      setBanner(m
        ? `${m.name} (${m.sanskrit}) — ${isLadder ? 'climb up 🪜' : 'down you go 🐍'}`
        : (isLadder ? 'Ladder up! 🪜' : (isLegend ? 'Dragon strike! 🐉' : 'Down the snake! 🐍')));
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
    if (clickedWho !== undefined && clickedWho !== player) return;
    const who = player;
    const value = Math.floor(Math.random() * 6) + 1;
    const from = positions[who - 1];
    const newRolls = rolls + 1;

    setRolling(true);
    setDie(value);
    setBanner('');
    setRolls(newRolls);
    rollsRef.current = newRolls;
    onStepChange(newRolls);

    const rollT = setTimeout(() => {
      setRolling(false);
      if (from + value > 100) {
        setBanner('Overshoot — stay put');
        const passT = setTimeout(() => {
          setBanner('');
          setPlayer(who >= nSeats ? 1 : who + 1);
        }, 700);
        timersRef.current.push(passT);
        return;
      }
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

  const bannerActive = !!banner;
  const twoRows = nSeats > 2;
  const tierLabel = isMoksha ? '' : (isLegend ? '🐉 Legend' : layout.label);

  return (
    <div>
      {resumeOffer && (
        <ClassicResumeBanner onResume={applyResume} onDismiss={dismissResume} />
      )}
      <CuiBar height={twoRows ? 142 : 96} build={(W) => {
        const out = [];
        if (!twoRows) {
          const pr = cuiRow(0, 0, W, 46, 5);
          out.push(
            { id: 'p-time', kind: 'pill', r: pr[0], label: 'Time', value: fmt, gold: true },
            { id: 'p-turn', kind: 'pill', r: pr[1], label: 'Turn', value: done ? pLabel(winner) : pLabel(player), color: activeColor },
            { id: 'p-1', kind: 'pill', r: pr[2], label: pLabel(1), value: positions[0], color: seatColor(1) },
            { id: 'p-2', kind: 'pill', r: pr[3], label: pLabel(2), value: positions[1], color: seatColor(2) },
            { id: 'p-rolls', kind: 'pill', r: pr[4], label: 'Rolls', value: rolls },
          );
        } else {
          const pr = cuiRow(0, 0, W, 44, 3);
          out.push(
            { id: 'p-time', kind: 'pill', r: pr[0], label: 'Time', value: fmt, gold: true },
            { id: 'p-turn', kind: 'pill', r: pr[1], label: 'Turn', value: done ? pLabel(winner) : pLabel(player), color: activeColor },
            { id: 'p-rolls', kind: 'pill', r: pr[2], label: 'Rolls', value: rolls },
          );
          const sr = cuiRow(0, 48, W, 44, nSeats, 6);
          for (let i = 1; i <= nSeats; i++) {
            out.push({ id: 'p-seat' + i, kind: 'pill', r: sr[i - 1], label: 'P' + i, value: positions[i - 1], color: seatColor(i) });
          }
        }
        const by = twoRows ? 98 : 52;
        if (isMoksha) {
          out.push({ id: 'glossary', kind: 'button', r: [Math.floor(W * 0.2), by, Math.floor(W * 0.6), 40], label: '📖 What do these mean?', font: 12, action: onGlossary });
        } else {
          // Cosmetic skin cycle (per-device, never server-bound) in the same
          // slot as always; the tier label rides beside it when present.
          const half = tierLabel ? Math.floor(W * 0.44) : Math.floor(W * 0.6);
          const x0 = tierLabel ? Math.floor(W * 0.04) : Math.floor(W * 0.2);
          out.push({ id: 'skin', kind: 'button', r: [x0, by, half, 40], label: `${SK.icon} ${SK.label}`, font: 12, action: cycleSkin });
          if (tierLabel) out.push({ id: 'tier', kind: 'pill', r: [Math.floor(W * 0.52), by, Math.floor(W * 0.44), 40], label: 'Difficulty', value: tierLabel });
        }
        return out;
      }} />

      <CuiBar height={30} build={(W) => ([{
        id: 'banner', kind: 'label', r: [0, 0, W, 28], font: 13, bold: true,
        color: bannerActive || done ? activeColor : activeColor,
        label: done
          ? `Game over — ${pLabel(winner)} win${vsBot && winner === 1 ? '' : 's'}! 🎉`
          : (banner || `${pLabel(player)}'s turn`),
      }])} />

      <div className="cnl-board-wrap">
        <SnLV2Board V={V} isMoksha={isMoksha} isLegend={isLegend} gildAll={gildAll} SK={SK} positions={positions} vsBot={vsBot} />
      </div>

      <CuiBar height={54} build={(W) => {
        const dieBtn = { id: 'die', kind: 'button', r: [Math.floor(W / 2) - 24, 3, 48, 48], label: die == null ? '·' : String(die), twinLabel: die == null ? 'Die not yet rolled' : `Die showing ${die}`, pips: die == null ? null : CNL_DIE_PIPS[die], font: 20, mono: true, disabled: true };
        if (vsBot) {
          const bw = Math.floor((W - 78) / 2) - 8;
          return [
            dieBtn,
            { id: 'roll1', kind: 'button', r: [4, 7, bw, 40], label: 'Your Roll', solid: true, bg: seatColor(1), ink: '#fff',
              disabled: done || animating || rolling || player !== 1 || !!resumeOffer, action: () => roll(1) },
            { id: 'roll2', kind: 'button', r: [W - bw - 4, 7, bw, 40], label: player === 2 && !done ? 'Bot rolling…' : 'Bot', solid: true, bg: seatColor(2), ink: '#fff', disabled: true },
          ];
        }
        if (nSeats === 2) {
          const bw = Math.floor((W - 78) / 2) - 8;
          return [
            dieBtn,
            { id: 'roll1', kind: 'button', r: [4, 7, bw, 40], label: 'Player 1 - Roll', solid: true, bg: seatColor(1), ink: '#fff', disabled: done || animating || rolling || player !== 1, action: () => roll(1) },
            { id: 'roll2', kind: 'button', r: [W - bw - 4, 7, bw, 40], label: 'Player 2 - Roll', solid: true, bg: seatColor(2), ink: '#fff', disabled: done || animating || rolling || player !== 2, action: () => roll(2) },
          ];
        }
        // 3–6 seats: one Roll button for the active human, in their color.
        const bw = Math.floor(W * 0.4);
        const active = player;
        return [
          dieBtn,
          { id: 'roll', kind: 'button', r: [W - bw - 4, 7, bw, 40],
            label: done ? 'Game over' : `Player ${active} - Roll`, solid: true, bg: seatColor(active), ink: '#fff',
            disabled: done || animating || rolling, action: () => roll(active) },
        ];
      }} />
    </div>
  );
}

// Online: 2-player, Classic/Moksha only (tiers are local-only — the server
// referees online rooms). Same room routes and polling as the old game; only
// the board renderer changed.
function SnLV2OnlineGame({ onWin, onStepChange, roomId, myPlayerNum, onGlossary }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom('chutes-ladders', roomId);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);
  const [skin, setSkin] = useCnlSkin();
  const cycleSkin = () => {
    const ids = Object.keys(CNL_SKINS);
    setSkin(ids[(ids.indexOf(skin) + 1) % ids.length]);
  };

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
  const vkey = cnlVariant(st.variant);
  const V = CNL_VARIANTS[vkey];
  const isMoksha = vkey === 'moksha';
  const SK = CNL_SKINS[isMoksha ? 'plain' : skin];
  const cur = st.currentPlayer || 1;
  const isMyTurn = status === 'active' && cur === myPlayerNum;
  const myColor = CNLV2_SEAT_COLORS[myPlayerNum - 1];

  const doRoll = () => {
    if (!isMyTurn) return;
    movesRef.current += 1; onStepChange && onStepChange(movesRef.current);
    submitMove({ type: 'roll' });
  };

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : 'Opponent wins')
    : isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div>
      <CuiBar height={(opponentDisconnected ? 20 : 0) + 96} build={(W) => {
        const pr = cuiRow(0, 0, W, 46, 4);
        const out = [
          { id: 'p-time', kind: 'pill', r: pr[0], label: 'Time', value: fmt, gold: true },
          { id: 'p-turn', kind: 'pill', r: pr[1], label: 'Turn', value: turnLabel, color: isMyTurn ? myColor : PAL.muted },
          { id: 'p-you', kind: 'pill', r: pr[2], label: 'You', value: myPlayerNum === 1 ? (st.p1Pos || 0) : (st.p2Pos || 0), color: myColor },
          { id: 'p-conn', kind: 'pill', r: pr[3], label: 'Online', value: '●', color: opponentDisconnected ? PAL.gold : PAL.emerald },
        ];
        let y = 50;
        if (isMoksha) { out.push({ id: 'glossary', kind: 'button', r: [Math.floor(W * 0.2), y, Math.floor(W * 0.6), 40], label: '📖 What do these mean?', font: 12, action: onGlossary }); y += 46; }
        else { out.push({ id: 'skin', kind: 'button', r: [Math.floor(W * 0.2), y, Math.floor(W * 0.6), 40], label: `${SK.icon} ${SK.label}`, font: 12, action: cycleSkin }); y += 46; }
        if (opponentDisconnected) out.push({ id: 'disc', kind: 'label', r: [0, y, W, 18], label: 'Opponent connection lost — waiting for reconnect…', gold: true, font: 12 });
        return out;
      }} />
      <div className="cnl-board-wrap">
        <SnLV2Board V={V} isMoksha={isMoksha} isLegend={false} gildAll={false} SK={SK} positions={[st.p1Pos || 0, st.p2Pos || 0]} vsBot={false} />
      </div>
      <CuiBar height={54} build={(W) => ([
        { id: 'die', kind: 'button', r: [Math.floor(W / 2) - 24, 3, 48, 48], label: st.die == null ? '·' : String(st.die), twinLabel: st.die == null ? 'Die not yet rolled' : `Die showing ${st.die}`, pips: st.die == null ? null : CNL_DIE_PIPS[st.die], font: 20, mono: true, disabled: true },
        { id: 'roll', kind: 'button', r: [W - Math.floor(W * 0.34) - 4, 7, Math.floor(W * 0.34), 40],
          label: status === 'finished' ? 'Game over' : isMyTurn ? 'Roll' : 'Waiting…',
          solid: isMyTurn, bg: isMyTurn ? myColor : undefined, ink: isMyTurn ? '#fff' : undefined,
          disabled: !isMyTurn, action: doRoll },
      ])} />
    </div>
  );
}

/* The V2 wrapper — the registry's `component:` for chutes-ladders. Honors the
   same props contract as the old ChutesLaddersGame: gameMode/gameModeOpts
   (including the home-screen "your turn" pre-seat path) and the shared
   ClassicModePicker fallback when mounted with no mode. */
function SnLV2Game({ onWin, onStepChange, resetKey, gameMode, gameModeOpts, onModeChange }) {
  // Deep links, read once at mount: ?cnldiff pins the tier (and bypasses the
  // Legend lock for this session — the URL wins over stored state), ?seats
  // pins the hotseat seat count (only honored with mode=2p).
  const dl = useRef(cnlv2DeepLinks()).current;
  const [mode, setMode] = useState(gameMode || null);
  const [variant, setVariant] = useState((gameModeOpts && gameModeOpts.variant) || 'classic');
  const [difficulty, setDifficulty] = useState(
    (gameModeOpts && gameModeOpts.difficulty) || dl.difficulty || 'beginner');
  const [seats, setSeats] = useState((gameModeOpts && gameModeOpts.seats) || dl.seats || 2);
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

  // Win streak in localStorage + classic leaderboard submit — verbatim the
  // old logic, same key, so nobody's streak resets across the V2 swap.
  const handleWin = (score, steps, secs, meta) => {
    const playerWon = meta && meta.winner !== undefined ? meta.winner === 1 : score > 0;
    const prevStreak = parseInt(localStorage.getItem(CNL_STREAK_KEY) || '0', 10);
    const newStreak = playerWon ? prevStreak + 1 : 0;
    try { localStorage.setItem(CNL_STREAK_KEY, String(newStreak)); } catch (e) {}
    submitClassicScore('chutes-ladders', newStreak, { mode: mode || 'bot' });
    onWin(score, steps, secs, meta);
  };

  // Sync mode/options from the Game Menu's New Game selection.
  useEffect(() => {
    setMode(gameMode || null);
    if (gameModeOpts && gameModeOpts.variant) setVariant(gameModeOpts.variant);
    if (gameModeOpts && gameModeOpts.difficulty) setDifficulty(gameModeOpts.difficulty);
    if (gameModeOpts && gameModeOpts.seats) setSeats(gameModeOpts.seats);
    if (gameModeOpts && gameModeOpts.roomId) {
      setRoomId(gameModeOpts.roomId);
      setMyPlayerNum(gameModeOpts.roomAction === 'join' ? 2 : 1);
    }
  }, [gameMode, gameModeOpts, resetKey]);

  useEffect(() => { onModeChange && onModeChange(mode); }, [mode]);

  // Saved bot game check. Only a v:2 snapshot hydrates this engine — an old
  // 2P-shape save (p1Pos/p2Pos, no version) is treated as no-save and cleared.
  useEffect(() => {
    let cancelled = false;
    if (mode === 'bot' && !resumeChecked) {
      loadState().then((s) => {
        if (cancelled) return;
        if (s && s.v === 2) setResumeState(s);
        else { setResumeState(null); if (s) clearState(); }
        setResumeChecked(true);
      });
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
        <ClassicModePicker
          game={GAMES.find((g) => g.id === 'chutes-ladders')}
          onGlossary={() => setGlossary(true)}
          onPlay={(m, opts) => {
            if (opts && opts.variant) setVariant(opts.variant);
            if (opts && opts.difficulty) setDifficulty(opts.difficulty);
            if (opts && opts.seats) setSeats(opts.seats);
            if (m === 'online') {
              setRoomId(opts.roomId);
              setMyPlayerNum(opts.myPlayerNum || (opts.roomAction === 'join' ? 2 : 1));
            }
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
        <SnLV2OnlineGame
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
  const resumeVariant = mode === 'bot' && resumeState && resumeState.variant ? resumeState.variant : variant;
  const resumeDiff = mode === 'bot' && resumeState && resumeState.difficulty ? resumeState.difficulty : difficulty;
  return (
    <React.Fragment>
      <SnLV2LocalGame
        onWin={handleWin}
        onStepChange={onStepChange}
        resetKey={resetKey}
        vsBot={mode === 'bot'}
        seats={mode === '2p' ? seats : 2}
        difficulty={resumeDiff}
        variant={resumeVariant}
        onGlossary={() => setGlossary(true)}
        initialState={mode === 'bot' ? resumeState : null}
        onClearSave={mode === 'bot' ? clearState : null}
      />
      {glossaryModal}
    </React.Fragment>
  );
}
