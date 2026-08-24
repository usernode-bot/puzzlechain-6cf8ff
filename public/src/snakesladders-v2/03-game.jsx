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

/* Dice rules (local play only — online rooms stay server-refereed by
   lib/board-rules.js's chutesLadders, whose alternate-every-move rule is
   deliberately untouched so no in-flight match changes rules mid-game):

   Rule 1 — a 6 grants an EXTRA roll; the turn does not pass.
   Rule 2 — three 6s in a row FORFEIT the third roll: the pawn does not move
            at all, the streak resets and the turn passes immediately.
   Rule 3 — both only take effect once the pawn has fully settled. The board
            lerps each hop for SNLV2_GLIDE_MS and its rAF loop runs a frame or
            two past that (02-board.jsx's `now - gp.t0 < 140`), so the roll
            lock is released on a tail AFTER the last glide frame rather than
            on the state change that started it.
   Rule 4 — a pawn that ENDS its move on an occupied square knocks the
            occupant back SNLV2_KNOCKBACK squares (see `resolveCollision`).

   Rules 1, 2 and 4 all extend the SAME `busy` lock: it is taken when the die
   is thrown and released one tail after the last thing that moves — spin,
   hops, snake/ladder travel, knockback shove, and the knocked pawn's own
   snake/ladder. So the turn only passes, and an extra roll only becomes
   available, once the whole chain has visually settled. */
const SNLV2_SIX = 6;
const SNLV2_SIX_LIMIT = 3;        // third consecutive 6 is forfeited
const SNLV2_GLIDE_MS = 130;       // mirrors the board's per-hop lerp
const SNLV2_SETTLE_TAIL_MS = 60;  // > the rAF loop's 140ms tail minus a hop
const SNLV2_FORFEIT_MS = 1000;    // how long the forfeit message holds the turn
const SNLV2_KNOCKBACK = 10;       // squares an occupant is shoved back
const SNLV2_KNOCK_MS = 380;       // bump message before the shove (mirrors the jump banner)
const SNLV2_KNOCK_TAIL_MS = 320;  // past the shove glide's rAF tail, as the jump uses

function SnLV2LocalGame({ onWin, onStepChange, resetKey, vsBot, seats, difficulty, variant, initialState, onClearSave, onGlossary, script }) {
  const nSeats = vsBot ? 2 : Math.max(2, Math.min(6, seats || 2));
  const vkey = cnlVariant(variant);
  const isMoksha = vkey === 'moksha';
  const layout = isMoksha ? null : cnlv2LayoutById(difficulty);
  const isLegend = !isMoksha && layout.id === 'legend';
  const gildAll = !isMoksha && (layout.id === 'superstar' || layout.id === 'legend');
  const V = isMoksha
    ? CNL_VARIANTS.moksha
    : { ladders: layout.ladders, chutes: layout.snakes, jumps: Object.assign({}, layout.ladders, layout.snakes) };

  // Scripted dice fixture (?snldice / ?snlauto / ?snlsix) — see cnlv2DeepLinks().
  const SC = script || CNLV2_NO_DEEP_LINKS;

  const [skin, setSkin] = useCnlSkin();
  const SK = CNL_SKINS[isMoksha ? 'plain' : skin];
  const cycleSkin = () => {
    const ids = Object.keys(CNL_SKINS);
    setSkin(ids[(ids.indexOf(skin) + 1) % ids.length]);
  };

  /* Fixture seeding. ?snlpos / ?snlturn put the board one roll away from a
     collision instead of six; with neither param these are the plain
     all-at-zero, seat-1-to-move opening. */
  const seedPositions = () => {
    const a = Array(nSeats).fill(0);
    if (SC.pos) SC.pos.slice(0, nSeats).forEach((v, i) => { a[i] = v; });
    return a;
  };
  const seedPlayer = () => (SC.turn && SC.turn <= nSeats ? SC.turn : 1);

  const [positions, setPositions] = useState(seedPositions);
  const [player, setPlayer] = useState(seedPlayer);
  const [die, setDie] = useState(null);
  const [rolls, setRolls] = useState(0);
  /* ONE lock for the whole roll→settle sequence: spin, hop chain, snake/ladder
     travel, overshoot pause and forfeit message alike. It replaces the old
     `animating || rolling` pair, which left a ~700ms window where the roll
     button was live during an overshoot (that branch cleared `rolling` and
     never set `animating`) — harmless before, exploitable once a 6 can hand
     the same seat another roll. */
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [winner, setWinner] = useState(null);
  const [banner, setBanner] = useState('');
  const [resumeOffer, setResumeOffer] = useState(initialState || null);
  // Consecutive 6s, one counter PER SEAT. Reset by a non-6 roll, by the
  // forfeit itself, and again whenever the turn leaves the seat.
  const [sixes, setSixes] = useState(() => {
    const a = Array(nSeats).fill(0);
    if (SC.sixSeed) a[0] = SC.sixSeed;
    return a;
  });
  const [extraRoll, setExtraRoll] = useState(false);
  // Sticky for the whole game: a forfeit is over in a second, but a
  // navigation-driven check may not sample the DOM until after it has passed.
  const [forfeited, setForfeited] = useState(false);
  // Sticky for the same reason as `forfeited`: the bump message is gone in
  // under a second, but the fact that one happened has to outlive it.
  const [knocked, setKnocked] = useState(false);

  const animatingRef = useRef(false);
  const winTimerRef = useRef(null);
  const timersRef = useRef([]);
  /* Live mirrors + the move lock. `positionsRef` lets a timer chain read the
     CURRENT square at execution time instead of a stale render closure (a
     stale `from` is exactly the teleport-then-hop ghost). `busyRef` makes the
     double-roll guard render-independent. `moveGenRef` is a generation token:
     every roll captures (who, gen) at start, every timer in that move's chain
     re-checks the gen, and reset/resume bumps it — so a stale timer can never
     move a pawn or flip the turn after a new game starts. `sixesRef` is read
     synchronously inside the roll timer, which runs before the matching
     render lands. */
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const busyRef = useRef(false);
  const moveGenRef = useRef(0);
  const sixesRef = useRef(sixes);
  const diceQueueRef = useRef(SC.dice ? SC.dice.slice() : []);

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;
  const rollsRef = useRef(0);
  rollsRef.current = rolls;

  const pLabel = (who) => vsBot ? (who === 1 ? 'You' : 'Bot') : `Player ${who}`;
  const verb = (who, base) => `${base}${vsBot && who === 1 ? '' : 's'}`;

  // V2 bot snapshot for the Game Menu's Save button. The wrapper treats a
  // loaded snapshot without v:2 as no-save, so old-format saves never
  // mis-hydrate into this engine.
  useClassicSaveSource(vsBot && !done, () => ({
    v: 2, seats: nSeats, positions, currentPlayer: player,
    rolls, secs: secsRef.current, difficulty: isMoksha ? null : layout.id, variant: vkey,
  }));

  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    moveGenRef.current += 1;
    const ps = Array.isArray(s.positions) ? s.positions.slice(0, nSeats) : [];
    while (ps.length < nSeats) ps.push(0);
    setPositions(ps);
    setPlayer(s.currentPlayer || 1);
    setRolls(s.rolls || 0);
    rollsRef.current = s.rolls || 0;
    // A saved game predates the dice rules and carries no streak; the seat
    // resumes on a clean counter rather than inheriting seat 1's fixture.
    setSixCount(0, 0);
    setExtraRoll(false);
    setResumeOffer(null);
  };
  const dismissResume = () => { setResumeOffer(null); if (onClearSave) onClearSave(); };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
  };

  /* `who` of 0 rewrites every seat — used by reset and resume. Writes the ref
     first: `roll` reads the streak inside a timer, before React commits. */
  const setSixCount = (who, val) => {
    const next = who
      ? sixesRef.current.map((n, i) => (i === who - 1 ? val : n))
      : Array(nSeats).fill(val);
    sixesRef.current = next;
    setSixes(next);
  };

  const release = () => { busyRef.current = false; setBusy(false); };

  const passTurn = (who) => {
    setSixCount(who, 0);
    setExtraRoll(false);
    setPlayer(who >= nSeats ? 1 : who + 1);
  };

  /* The one exit from a completed move. `keepTurn` is Dice Rule 1: the seat
     keeps the turn and gets another roll — but the lock is only lifted
     SNLV2_SETTLE_TAIL_MS later, which is past the last glide frame of the hop
     that just finished, so an extra roll can never start mid-glide. */
  const endRoll = (who, gen, keepTurn) => {
    animatingRef.current = false;
    if (keepTurn) {
      setExtraRoll(true);
      setBanner(`Rolled a 6 — ${pLabel(who)} ${verb(who, 'roll')} again! 🎲`);
    } else {
      setBanner('');
      passTurn(who);
    }
    const t = setTimeout(() => {
      if (gen !== moveGenRef.current) return;
      release();
    }, SNLV2_SETTLE_TAIL_MS);
    timersRef.current.push(t);
  };

  const resetGame = () => {
    moveGenRef.current += 1; // invalidate every in-flight move chain
    animatingRef.current = false;
    busyRef.current = false;
    clearTimers();
    setPositions(seedPositions());
    setPlayer(seedPlayer()); setDie(null); setRolls(0);
    setBusy(false);
    setDone(false); setWinner(null); setBanner('');
    setExtraRoll(false); setForfeited(false); setKnocked(false);
    /* The scripted fixture is (re-)armed HERE, not at useState time: the
       mount effect below runs resetGame after the initial state, so a queue
       built in a useState initializer would be wiped before the first roll. */
    const seeded = Array(nSeats).fill(0);
    if (SC.sixSeed) seeded[0] = SC.sixSeed;
    sixesRef.current = seeded;
    setSixes(seeded);
    diceQueueRef.current = SC.dice ? SC.dice.slice() : [];
  };

  // A seat-count / board change mid-mount must rebuild the positions array,
  // not just repaint — hence the wider dep list than the old 2P board had.
  useEffect(() => { resetGame(); }, [resetKey, nSeats, isMoksha ? 'moksha' : layout.id]);
  useEffect(() => () => clearTimers(), []);

  const seatColor = (who) => CNLV2_SEAT_COLORS[(who - 1) % CNLV2_SEAT_COLORS.length];
  const activeColor = done ? PAL.muted : seatColor(player);

  // Immutable functional update — never mutates the previous array, and only
  // ever touches the one locked seat's slot.
  const setPos = (who, val) => setPositions((ps) => ps.map((p, i) => (i === who - 1 ? val : p)));

  /* Collision penalty (Rule 4). A pawn that ends its move — AFTER any snake
     or ladder has resolved — on a square another pawn occupies knocks that
     pawn back SNLV2_KNOCKBACK squares, floored at the start square. Three
     deliberate limits:

     - The shove does NOT re-trigger a collision. Shoving a pawn onto a third
       pawn and shoving that one in turn is a chain that can ping-pong between
       two crowded squares; one hop, then stop.
     - A snake or ladder under the shoved pawn DOES fire — that is the point
       of the rule, the knockback is a real landing and not a teleport. It is
       resolved here rather than by recursing into finishTurn, which would
       drag the win check and the turn machinery in with it.
     - No layout sends a jump to square 100 (`cnlv2-layouts` asserts it), so a
       shoved pawn can never chain into a win it never rolled for.

     Both steps are ordinary setPositions writes, so 02-board.jsx's rAF glide
     animates them exactly like a rolled move: there is no second motion path
     to keep in sync. */
  const collisionHits = (who, square) => {
    if (square <= 0) return [];
    const hits = [];
    positionsRef.current.forEach((p, i) => {
      if (i === who - 1 || p !== square) return;
      const back = Math.max(0, p - SNLV2_KNOCKBACK);
      const jump = back > 0 ? V.jumps[back] : undefined;
      hits.push({ seat: i + 1, back, jump: jump === undefined ? null : jump });
    });
    return hits;
  };

  /* Every hit seat is shoved in ONE write. Sequencing them would make the
     pause scale with how crowded the square is, and they all travel the same
     distance anyway — the glide runs them in parallel. */
  const shove = (hits, key) => setPositions((ps) => ps.map((p, i) => {
    const h = hits.find((x) => x.seat === i + 1);
    return h ? h[key] : p;
  }));

  const resolveCollision = (who, hits, gen, wasSix) => {
    setKnocked(true);
    const names = hits.map((h) => pLabel(h.seat)).join(' & ');
    setBanner(`💥 Bump! ${names} knocked back ${SNLV2_KNOCKBACK} squares.`);
    const t = setTimeout(() => {
      if (gen !== moveGenRef.current) return;
      shove(hits, 'back');
      const chain = hits.filter((h) => h.jump !== null);
      const t2 = setTimeout(() => {
        if (gen !== moveGenRef.current) return;
        if (!chain.length) { setBanner(''); endRoll(who, gen, wasSix); return; }
        const ladder = V.ladders[chain[0].back] !== undefined;
        setBanner(chain.length > 1
          ? 'Knocked onto a snake or ladder!'
          : `${pLabel(chain[0].seat)} landed on a ${ladder ? 'ladder 🪜' : 'snake 🐍'}`);
        shove(chain, 'jump');
        const t3 = setTimeout(() => {
          if (gen !== moveGenRef.current) return;
          setBanner(''); endRoll(who, gen, wasSix);
        }, SNLV2_KNOCK_TAIL_MS);
        timersRef.current.push(t3);
      }, SNLV2_KNOCK_TAIL_MS);
      timersRef.current.push(t2);
    }, SNLV2_KNOCK_MS);
    timersRef.current.push(t);
  };

  /* `who` and `gen` were captured when the roll STARTED; every step below
     belongs to that one move. The turn is advanced in `endRoll` and nowhere
     else, so nothing (bot included) can act until this animation chain —
     hops, jump banner, climb/slide glide — has fully finished. */
  const finishTurn = (who, landed, gen, wasSix) => {
    const jump = V.jumps[landed];
    // The win check must look at where the turn actually ENDS — a jump can
    // carry the pawn into 100 (see the old finishTurn's soft-lock note).
    const finalSquare = jump !== undefined ? jump : landed;
    const settle = () => {
      if (gen !== moveGenRef.current) return;
      if (finalSquare === 100) {
        setDone(true);
        setWinner(who);
        if (onClearSave) onClearSave();
        let label = `${pLabel(who)} ${verb(who, 'win')}! 🎉`;
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
        // Deliberately no endRoll: the game is over, so a winning 6 grants
        // no extra roll and the lock simply stays on.
        return;
      }
      /* The one place a move ends, so the one place a collision is tested —
         and because settle() runs after the jump above, `finalSquare` is the
         square the pawn actually came to rest on. */
      const hits = collisionHits(who, finalSquare);
      if (hits.length) { resolveCollision(who, hits, gen, wasSix); return; }
      endRoll(who, gen, wasSix);
    };

    if (jump !== undefined) {
      const isLadder = V.ladders[landed] !== undefined;
      const m = isMoksha ? CNL_MOKSHA_MEANINGS[landed] : null;
      setBanner(m
        ? `${m.name} (${m.sanskrit}) — ${isLadder ? 'climb up 🪜' : 'down you go 🐍'}`
        : (isLadder ? 'Ladder up! 🪜' : (isLegend ? 'Dragon strike! 🐉' : 'Down the snake! 🐍')));
      const t = setTimeout(() => {
        if (gen !== moveGenRef.current) return;
        setPos(who, jump);
        // 320ms is already past the jump glide's 140ms rAF tail; settle()
        // then adds the shared release tail on top.
        const t2 = setTimeout(() => {
          if (gen !== moveGenRef.current) return;
          setBanner(''); settle();
        }, 320);
        timersRef.current.push(t2);
      }, 380);
      timersRef.current.push(t);
    } else {
      settle();
    }
  };

  const roll = (clickedWho) => {
    if (busyRef.current || done) return;
    if (clickedWho !== undefined && clickedWho !== player) return;
    // Lock the mover NOW: `who` is the seat this entire move chain belongs
    // to, `gen` invalidates the chain if a new game starts under it.
    const who = player;
    const gen = moveGenRef.current;
    // A scripted value wins until the queue drains; after that the die is
    // fair again, so a fixture route stays playable by hand once it lands.
    const forced = diceQueueRef.current.length ? diceQueueRef.current.shift() : null;
    const value = forced != null ? forced : Math.floor(Math.random() * 6) + 1;

    busyRef.current = true;
    setBusy(true);
    setExtraRoll(false);
    setDie(value);
    setBanner('');
    const newRolls = rollsRef.current + 1;
    rollsRef.current = newRolls;
    setRolls(newRolls);
    onStepChange(newRolls);

    const rollT = setTimeout(() => {
      if (gen !== moveGenRef.current) return;

      /* Dice Rule 2 is resolved BEFORE any movement: on the third consecutive
         6 the pawn does not move at all. */
      const isSix = value === SNLV2_SIX;
      const streak = isSix ? (sixesRef.current[who - 1] || 0) + 1 : 0;
      if (streak >= SNLV2_SIX_LIMIT) {
        setSixCount(who, 0);
        setForfeited(true);
        setBanner(`Three 6s in a row — ${pLabel(who)} ${verb(who, 'forfeit')} this roll 🚫`);
        const fT = setTimeout(() => {
          if (gen !== moveGenRef.current) return;
          passTurn(who);
          release();
        }, SNLV2_FORFEIT_MS);
        timersRef.current.push(fT);
        return;
      }
      setSixCount(who, streak);

      // Read the start square at EXECUTION time from the live ref — a stale
      // render closure here teleports the pawn back before hopping.
      const from = positionsRef.current[who - 1];
      if (from + value > 100) {
        setBanner('Overshoot — stay put');
        const passT = setTimeout(() => {
          if (gen !== moveGenRef.current) return;
          endRoll(who, gen, isSix);
        }, 700);
        timersRef.current.push(passT);
        return;
      }
      // Hop square-by-square: post-check increment lands on from+1 .. target,
      // exactly `value` steps — no pre-increment off-by-one.
      animatingRef.current = true;
      const target = from + value;
      let cur = from;
      const hop = () => {
        if (gen !== moveGenRef.current || !animatingRef.current) return;
        if (cur >= target) { finishTurn(who, target, gen, isSix); return; }
        cur += 1;
        setPos(who, cur);
        const t = setTimeout(hop, SNLV2_GLIDE_MS);
        timersRef.current.push(t);
      };
      const t0 = setTimeout(hop, SNLV2_GLIDE_MS);
      timersRef.current.push(t0);
    }, 720);
    timersRef.current.push(rollT);
  };

  /* Bot auto-rolls for Player 2 in Versus-Bot mode. `busy` is the only
     movement dep now, which is also what re-arms it after the bot rolls a 6:
     the seat does not change, but the lock releases. The fire-time guard
     re-checks the ref so the bot can NEVER roll into a move that started
     after this timer was scheduled. */
  useEffect(() => {
    if (!vsBot || done || resumeOffer) return;
    if (player !== 2 || busy) return;
    const t = setTimeout(() => {
      if (busyRef.current) return;
      roll(2);
    }, 650);
    return () => clearTimeout(t);
  }, [vsBot, player, busy, done, resumeOffer]);

  /* Scripted auto-roller (?snlauto=1). Proposal checks and the before/after
     screenshots can only NAVIGATE — they cannot tap a canvas roll button — so
     without this no route could ever reach an extra roll or a forfeit. It
     fires exactly as many rolls as the forced-dice queue holds and then stops
     on its own; it writes nothing and touches no endpoint. */
  useEffect(() => {
    if (!SC.auto || done || busy || resumeOffer) return;
    if (!diceQueueRef.current.length) return;
    if (vsBot && player === 2) return; // that seat belongs to the bot effect
    const t = setTimeout(() => {
      if (busyRef.current) return;
      roll(player);
    }, 300);
    return () => clearTimeout(t);
  }, [SC.auto, player, busy, done, resumeOffer]);

  const bannerActive = !!banner;
  const twoRows = nSeats > 2;
  const tierLabel = isMoksha ? '' : (isLegend ? '🐉 Legend' : layout.label);
  const streakNow = sixes[player - 1] || 0;
  const idleBanner = `${pLabel(player)}'s turn`
    + (streakNow ? ` · ${streakNow} six${streakNow > 1 ? 'es' : ''} in a row` : '');

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
          ? `Game over — ${pLabel(winner)} ${verb(winner, 'win')}! 🎉`
          : (banner || idleBanner),
      }])} />

      {/* The dice-rule state is mirrored onto the wrapper because the board,
          the banner and the roll buttons are all CANVAS — a check can neither
          read them nor click them. data-snl-forfeit and data-snl-knock are sticky
          for the run; data-snl-pos is the live square of every seat, which is
          how a check reads a knockback and its chained snake or ladder. */}
      <div
        className="cnl-board-wrap"
        data-snl-turn={done ? 0 : player}
        data-snl-sixes={streakNow}
        data-snl-extra={extraRoll ? '1' : '0'}
        data-snl-forfeit={forfeited ? '1' : '0'}
        data-snl-knock={knocked ? '1' : '0'}
        data-snl-pos={positions.join(',')}
        data-snl-busy={busy ? '1' : '0'}
      >
        <SnLV2Board V={V} isMoksha={isMoksha} isLegend={isLegend} gildAll={gildAll} SK={SK} positions={positions} vsBot={vsBot} />
      </div>

      <CuiBar height={54} build={(W) => {
        const dieBtn = { id: 'die', kind: 'button', r: [Math.floor(W / 2) - 24, 3, 48, 48], label: die == null ? '·' : String(die), twinLabel: die == null ? 'Die not yet rolled' : `Die showing ${die}`, pips: die == null ? null : CNL_DIE_PIPS[die], font: 20, mono: true, disabled: true };
        // `busy` spans the whole sequence — spin, hops, snake/ladder travel,
        // overshoot and forfeit — so the extra roll a 6 grants only becomes
        // clickable once the pawn has finished gliding.
        if (vsBot) {
          const bw = Math.floor((W - 78) / 2) - 8;
          return [
            dieBtn,
            { id: 'roll1', kind: 'button', r: [4, 7, bw, 40], label: extraRoll && player === 1 ? 'Roll again 🎲' : 'Your Roll', solid: true, bg: seatColor(1), ink: '#fff',
              disabled: done || busy || player !== 1 || !!resumeOffer, action: () => roll(1) },
            { id: 'roll2', kind: 'button', r: [W - bw - 4, 7, bw, 40], label: player === 2 && !done ? (extraRoll ? 'Bot rolls again…' : 'Bot rolling…') : 'Bot', solid: true, bg: seatColor(2), ink: '#fff', disabled: true },
          ];
        }
        if (nSeats === 2) {
          const bw = Math.floor((W - 78) / 2) - 8;
          const lbl = (who) => `Player ${who} - Roll${extraRoll && player === who ? ' again' : ''}`;
          return [
            dieBtn,
            { id: 'roll1', kind: 'button', r: [4, 7, bw, 40], label: lbl(1), solid: true, bg: seatColor(1), ink: '#fff', disabled: done || busy || player !== 1, action: () => roll(1) },
            { id: 'roll2', kind: 'button', r: [W - bw - 4, 7, bw, 40], label: lbl(2), solid: true, bg: seatColor(2), ink: '#fff', disabled: done || busy || player !== 2, action: () => roll(2) },
          ];
        }
        // 3–6 seats: one Roll button for the active human, in their color.
        const bw = Math.floor(W * 0.4);
        const active = player;
        return [
          dieBtn,
          { id: 'roll', kind: 'button', r: [W - bw - 4, 7, bw, 40],
            label: done ? 'Game over' : `Player ${active} - Roll${extraRoll ? ' again' : ''}`, solid: true, bg: seatColor(active), ink: '#fff',
            disabled: done || busy, action: () => roll(active) },
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
        script={dl}
      />
      {glossaryModal}
    </React.Fragment>
  );
}
