/* ---------------- Texas Hold 'Em ---------------- */
const TH_SUITS = ['♠', '♥', '♦', '♣'];
const TH_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function thDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ r: r + 2, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function thScore5(cards) {
  const ranks = cards.map(c => c.r).sort((a, b) => b - a);
  const suits = cards.map(c => c.s);
  const flush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // wheel
  }
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map(g => g[1]);
  let cat;
  if (straightHigh && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const order = (cat === 4 || cat === 8) ? [straightHigh, 0, 0, 0, 0] : kick;
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 15 + (order[i] || 0);
  return v;
}
function thBest(cards) {
  if (cards.length < 5) return 0;
  let best = 0;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++)
    for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
      const v = thScore5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
      if (v > best) best = v;
    }
  return best;
}
const TH_CATS = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
function thCatName(v) { let cat = v; for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15); return TH_CATS[cat] || ''; }
function thHandStrength(hole, board) {
  if (board.length >= 3) {
    const v = thBest([...hole, ...board]);
    let cat = v; for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15);
    return Math.min(1, cat / 6 + (hole[0].r + hole[1].r) / 200);
  }
  // preflop heuristic
  const [a, b] = hole;
  let s = (a.r + b.r) / 40;
  if (a.r === b.r) s += 0.35;
  if (a.s === b.s) s += 0.08;
  if (Math.abs(a.r - b.r) === 1) s += 0.05;
  return Math.min(0.95, s);
}
function TexasHoldemGame({ onWin, onLose, onStepChange, resetKey, game, onBack }) {
  const START = 200, BB = 10;
  const [state, setState] = useState(null);
  const [betOpen, setBetOpen] = useState(false);
  const [betAmt, setBetAmt] = useState(BB);
  const doneRef = useRef(false);
  const handsRef = useRef(0);
  const bigPotRef = useRef(0);
  const secsRef = useRef(0);
  const [done, setDone] = useState(false);
  const secs = useElapsed(resetKey, !done);
  secsRef.current = secs;

  const newHand = (pc, ac, dealerIsPlayer) => {
    const deck = thDeck();
    const player = [deck.pop(), deck.pop()];
    const ai = [deck.pop(), deck.pop()];
    // simple blinds: dealer posts SB(BB/2), other posts BB
    const sb = BB / 2;
    let playerBet = dealerIsPlayer ? sb : BB;
    let aiBet = dealerIsPlayer ? BB : sb;
    playerBet = Math.min(playerBet, pc); aiBet = Math.min(aiBet, ac);
    return {
      deck, player, ai, board: [],
      pot: 0, pc: pc - playerBet, ac: ac - aiBet,
      playerBet, aiBet, street: 0,
      toAct: dealerIsPlayer ? 'player' : 'ai', // dealer/SB acts first preflop
      dealerIsPlayer, msg: 'Your move', reveal: false, phase: 'betting',
    };
  };
  const init = () => {
    handsRef.current = 0; doneRef.current = false; setDone(false);
    setState(newHand(START, START, true));
    setBetOpen(false); setBetAmt(BB);
  };
  useEffect(() => { init(); }, [resetKey]);

  // AI acts when it's their turn
  useEffect(() => {
    if (!state || state.phase !== 'betting' || state.toAct !== 'ai' || done) return;
    const t = setTimeout(() => aiAct(), 700);
    return () => clearTimeout(t);
  }, [state, done]);

  const dealNext = (s) => {
    const d = s.deck.slice();
    const board = s.board.slice();
    if (s.street === 0) { board.push(d.pop(), d.pop(), d.pop()); }
    else { board.push(d.pop()); }
    return { ...s, deck: d, board, street: s.street + 1 };
  };
  const showdown = (s) => {
    const pv = thBest([...s.player, ...s.board]);
    const av = thBest([...s.ai, ...s.board]);
    let pc = s.pc, ac = s.ac, msg;
    if (pv > av) { pc += s.pot; msg = `You win ${s.pot} with ${thCatName(pv)}`; cgSound('win'); }
    else if (av > pv) { ac += s.pot; msg = `Opponent wins with ${thCatName(av)}`; cgSound('lose'); }
    else { pc += Math.floor(s.pot / 2); ac += Math.ceil(s.pot / 2); msg = `Split pot (${thCatName(pv)})`; }
    bigPotRef.current = Math.max(bigPotRef.current, s.pot);
    return { ...s, pc, ac, msg, reveal: true, phase: 'handover' };
  };
  const advanceStreet = (s) => {
    const pot = s.pot + s.playerBet + s.aiBet;
    let ns = { ...s, pot, playerBet: 0, aiBet: 0, _pAct: false, _aAct: false };
    if (s.street >= 4) return showdown(ns);
    ns = dealNext(ns);
    ns.toAct = ns.dealerIsPlayer ? 'ai' : 'player'; // non-dealer acts first post-flop
    ns.msg = ns.toAct === 'player' ? 'Your move' : 'Opponent thinking…';
    return ns;
  };
  const endFold = (s, who) => {
    const pot = s.pot + s.playerBet + s.aiBet;
    let pc = s.pc, ac = s.ac, msg;
    if (who === 'ai') { pc += pot; msg = `Opponent folds — you win ${pot}`; cgSound('chip'); }
    else { ac += pot; msg = `You fold — opponent wins ${pot}`; }
    bigPotRef.current = Math.max(bigPotRef.current, pot);
    return { ...s, pc, ac, pot, playerBet: 0, aiBet: 0, msg, reveal: who !== 'player', phase: 'handover' };
  };
  // Unified heads-up round resolution: a betting round closes when bets are
  // equal AND the other player has already acted since the last aggression.
  const resolve = (s, actorIsPlayer) => {
    const equal = s.playerBet === s.aiBet;
    const otherActed = actorIsPlayer ? s._aAct : s._pAct;
    if (equal && otherActed) return advanceStreet(s);
    s.toAct = actorIsPlayer ? 'ai' : 'player';
    s.msg = s.toAct === 'player' ? 'Your move' : 'Opponent thinking…';
    return s;
  };
  const playerAction = (action, amount) => {
    if (!state || state.toAct !== 'player' || state.phase !== 'betting') return;
    let s = { ...state };
    const toCall = s.aiBet - s.playerBet;
    if (action === 'fold') { const ns = endFold(s, 'player'); setState(ns); setTimeout(() => checkMatch(ns), 0); return; }
    if (action === 'check') {
      if (toCall > 0) return;
      s._pAct = true; cgSound('chip');
      setState(resolve(s, true)); return;
    }
    if (action === 'call') {
      const pay = Math.min(toCall, s.pc);
      s.pc -= pay; s.playerBet += pay; s._pAct = true; cgSound('chip');
      setState(resolve(s, true)); return;
    }
    if (action === 'bet') {
      const minAdd = Math.min(toCall > 0 ? toCall + BB : BB, s.pc);
      let add = Math.min(Math.max(amount || BB, minAdd), s.pc);
      s.pc -= add; s.playerBet += add; s._pAct = true; s._aAct = false;
      cgSound('chip'); cgHaptic(12); setBetOpen(false);
      setState(resolve(s, true)); return;
    }
  };
  const aiAct = () => {
    setState(prev => {
      if (!prev || prev.toAct !== 'ai' || prev.phase !== 'betting') return prev;
      let s = { ...prev };
      const toCall = s.playerBet - s.aiBet;
      const strength = thHandStrength(s.ai, s.board);
      const r = Math.random();
      if (toCall > 0) {
        const potOdds = toCall / (s.pot + s.playerBet + s.aiBet + toCall);
        if (strength < 0.25 && potOdds > 0.18 && r > 0.2) { const ns = endFold(s, 'ai'); setTimeout(() => checkMatch(ns), 0); return ns; }
        if (strength > 0.7 && s.ac > toCall + BB && r > 0.55) {
          const add = Math.min(toCall + BB * 2, s.ac);
          s.ac -= add; s.aiBet += add; s._aAct = true; s._pAct = false; cgSound('chip');
          return resolve(s, false);
        }
        const pay = Math.min(toCall, s.ac);
        s.ac -= pay; s.aiBet += pay; s._aAct = true; cgSound('chip');
        return resolve(s, false);
      }
      if (strength > 0.6 && r > 0.5 && s.ac > BB) {
        const add = Math.min(BB * 2, s.ac);
        s.ac -= add; s.aiBet += add; s._aAct = true; s._pAct = false; cgSound('chip');
        return resolve(s, false);
      }
      s._aAct = true; cgSound('chip');
      return resolve(s, false);
    });
  };
  const checkMatch = (s) => {
    if (doneRef.current) return;
    handsRef.current++;
    onStepChange && onStepChange(handsRef.current);
    if (s.pc <= 0 || s.ac <= 0) {
      doneRef.current = true; setDone(true);
      const youWin = s.pc > 0;
      cgSound(youWin ? 'win' : 'lose'); cgHaptic(youWin ? [15, 30, 15] : [20, 40]);
      cgSaveHistory(TH_KEY, { win: youWin, hands: handsRef.current, ts: Date.now() });
      if (youWin) onWin(s.pc, handsRef.current, secsRef.current, { winnerLabel: 'You win!', share: `🃏 Won heads-up poker in ${handsRef.current} hands` });
      else onLose(handsRef.current, secsRef.current, { share: `🃏 Busted after ${handsRef.current} hands`, answer: 'Opponent wins' });
    }
  };
  const nextHand = () => {
    if (!state || doneRef.current) return;
    checkMatch(state);
    if (doneRef.current) return;
    setState(newHand(state.pc, state.ac, !state.dealerIsPlayer));
    setBetAmt(BB);
  };

  const Card = ({ c, hidden }) => {
    if (hidden) return <div className="th-card back">?</div>;
    const red = c.s === 1 || c.s === 2;
    return <div className={'th-card' + (red ? ' red' : '')}><span>{TH_RANKS[c.r - 2]}</span><span>{TH_SUITS[c.s]}</span></div>;
  };

  const hist = cgLoadHistory(TH_KEY);
  const wins = hist.filter(r => r.win).length;
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.win ? '🏆 Won match' : '💀 Lost match'}</span><span className="mono">{r.hands} hands</span></>),
    cgStatsSection([
      { val: wins, lbl: 'Matches won' }, { val: hist.length, lbl: 'Matches' },
      { val: bigPotRef.current, lbl: 'Biggest pot' }, { val: handsRef.current, lbl: 'Hands (match)' },
    ]),
    cgRulesSection(['Heads-up Texas Hold \'Em vs the computer.', 'Tap Check / Call / Fold to act.', 'Tap Bet/Raise to size a wager.', 'Win all the opponent\'s chips to take the match.']),
  ];

  if (!state) return <ClassicShell game={game} onExit={onBack} sheetSections={sheet}><div className="cg-stage" /></ClassicShell>;
  const s = state;
  const toCall = Math.max(0, s.aiBet - s.playerBet);
  const canAct = s.phase === 'betting' && s.toAct === 'player' && !done;
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet}>
      <div className="cg-stage">
        <div className="th-felt">
          <div className="th-seat">
            <div className="who">Opponent</div>
            <div className="chips">{s.ac} chips{s.aiBet ? ` · bet ${s.aiBet}` : ''}</div>
          </div>
          <div className="th-cards">
            <Card c={s.ai[0]} hidden={!s.reveal} /><Card c={s.ai[1]} hidden={!s.reveal} />
          </div>
          <div className="th-pot">Pot {s.pot + s.playerBet + s.aiBet}</div>
          <div className="th-community">
            {s.board.length === 0 ? <span className="th-msg">— flop comes after betting —</span> : s.board.map((c, i) => <Card key={i} c={c} />)}
          </div>
          <div className="th-msg">{s.msg}</div>
          <div className="th-cards">
            <Card c={s.player[0]} /><Card c={s.player[1]} />
          </div>
          <div className="th-seat">
            <div className="who">You{s.dealerIsPlayer ? ' (D)' : ''}</div>
            <div className="chips">{s.pc} chips{s.playerBet ? ` · bet ${s.playerBet}` : ''}</div>
          </div>
        </div>
        {s.phase === 'handover' ? (
          <div className="th-actions"><button className="bet" onClick={nextHand}>Next hand →</button></div>
        ) : betOpen ? (
          <>
            <div className="th-betsizer">
              <input type="range" min={BB} max={Math.max(BB, s.pc)} step={BB} value={betAmt} onChange={e => setBetAmt(+e.target.value)} />
              <span className="amt">{betAmt}</span>
            </div>
            <div className="th-actions">
              <button onClick={() => setBetOpen(false)}>Cancel</button>
              <button className="bet" disabled={!canAct} onClick={() => playerAction('bet', betAmt)}>{toCall > 0 ? 'Raise' : 'Bet'} {betAmt}</button>
            </div>
          </>
        ) : (
          <div className="th-actions">
            <button disabled={!canAct} onClick={() => playerAction('fold')}>Fold</button>
            {toCall > 0
              ? <button disabled={!canAct} onClick={() => playerAction('call')}>Call {toCall}</button>
              : <button disabled={!canAct} onClick={() => playerAction('check')}>Check</button>}
            <button className="bet" disabled={!canAct || s.pc <= 0} onClick={() => { setBetAmt(Math.min(Math.max(BB, toCall + BB), s.pc)); setBetOpen(true); cgSound('click'); }}>{toCall > 0 ? 'Raise' : 'Bet'}</button>
          </div>
        )}
      </div>
    </ClassicShell>
  );
}

