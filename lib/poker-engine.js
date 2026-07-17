// ============================================================
// Server-authoritative Texas Hold'em engine (6-max, play money).
//
// Pure, DB-free core used by server.js for the multiplayer poker
// tables. The hand-evaluation helpers (score5/bestScore/catName/
// handStrength) are ported from the client solo engine in
// public/app.jsx (thScore5/thBest/thCatName/thHandStrength) so both
// rank hands identically. Everything else — dealing, blinds, betting
// rounds, side pots, showdown, bots, and the lazy "tick on touch"
// advancement — lives here because the client can never be trusted
// with the deck or other players' hole cards.
//
// The engine operates on a single plain `state` object (stored as
// poker_tables.state JSONB). It NEVER touches the DB or the clock:
// callers pass `nowMs` in, so advancement is deterministic per call
// and easy to test.
// ============================================================

// ---- Cards & constants -----------------------------------------------------
// A card is { r: 2..14, s: 0..3 } (r=14 is Ace). Suits 1 & 2 render red on the
// client (hearts/diamonds) — kept consistent with public/app.jsx TH_SUITS.

const BOT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
const CAT_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
const DEFAULT_BUYIN = 1000;
const TURN_SECS = 25;          // per-decision clock
const HANDOVER_SECS = 5;       // pause between hands
const BOT_THINK_MS = 700;      // simulated bot "thinking" delay before it acts

function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}

function shuffle(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ---- Hand evaluation (ported from client thScore5/thBest) ------------------

function score5(cards) {
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

function bestScore(cards) {
  if (cards.length < 5) return 0;
  let best = 0;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++)
    for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
      const v = score5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
      if (v > best) best = v;
    }
  return best;
}

function catName(v) {
  let cat = v;
  for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15);
  return CAT_NAMES[cat] || '';
}

// Rough 0..1 hand strength used by bots (ported from thHandStrength).
function handStrength(hole, board) {
  if (!hole || hole.length < 2) return 0;
  if (board.length >= 3) {
    const v = bestScore([...hole, ...board]);
    let cat = v;
    for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15);
    return Math.min(1, cat / 6 + (hole[0].r + hole[1].r) / 200);
  }
  // preflop heuristic
  const [a, b] = hole;
  const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r);
  let s = (hi + lo) / 40;
  if (a.r === b.r) s += 0.35;                 // pocket pair
  if (a.s === b.s) s += 0.08;                 // suited
  if (hi - lo === 1) s += 0.05;               // connected
  if (hi >= 13) s += 0.08;                    // has a face/ace
  return Math.min(1, s);
}

// ---- Roster helpers --------------------------------------------------------
// state.seats is a fixed-length array (maxSeats); each entry is either null
// (empty) or { userId|null, name, isBot, stack, sittingOut, joinedAt }.

function occupiedCount(state) {
  return state.seats.filter(Boolean).length;
}

function firstEmptySeat(state) {
  for (let i = 0; i < state.seats.length; i++) if (!state.seats[i]) return i;
  return -1;
}

// Seats eligible to be dealt into a new hand: occupied, have chips, not sitting out.
function eligibleSeats(state) {
  const out = [];
  for (let i = 0; i < state.seats.length; i++) {
    const s = state.seats[i];
    if (s && !s.sittingOut && s.stack > 0) out.push(i);
  }
  return out;
}

function nextOccupied(state, from) {
  const n = state.seats.length;
  for (let k = 1; k <= n; k++) {
    const idx = (from + k) % n;
    const s = state.seats[idx];
    if (s && !s.sittingOut && s.stack > 0) return idx;
  }
  return -1;
}

// Seats still contesting the current hand (dealt in and not folded).
function liveSeats(state) {
  if (!state.players) return [];
  return Object.keys(state.players).map(Number).filter(i => !state.players[i].folded);
}

function log(state, msg, type) {
  state.log = state.log || [];
  state.log.push({ msg, type: type || 'info' });
  if (state.log.length > 60) state.log = state.log.slice(-60);
}

// ---- Fresh table -----------------------------------------------------------

function newTableState({ maxSeats = 6, smallBlind = 5, bigBlind = 10 } = {}) {
  return {
    maxSeats,
    smallBlind,
    bigBlind,
    seats: new Array(maxSeats).fill(null),
    button: 0,
    handNo: 0,
    phase: 'idle',       // 'idle' | 'betting' | 'showdown' | 'handover'
    street: 0,           // 0=preflop 1=flop 2=turn 3=river
    board: [],
    deck: [],
    pot: 0,
    players: {},         // seatIdx -> per-hand player state
    toAct: null,
    maxBet: 0,
    minRaise: bigBlind,
    sb: null,
    bb: null,
    actionDeadlineMs: null,
    handOverAtMs: null,
    log: [],
    lastResult: null,
  };
}

function seatPlayer(state, seatIdx, { userId, name, isBot, stack, sittingOut }) {
  state.seats[seatIdx] = {
    userId: userId || null,
    name: name || (isBot ? BOT_NAMES[seatIdx % BOT_NAMES.length] : 'Player'),
    isBot: !!isBot,
    stack: Math.max(0, Math.round(stack)),
    sittingOut: !!sittingOut,
    joinedAt: Date.now ? undefined : undefined, // timestamp stamped by caller/DB
  };
}

// Fill every empty seat with a bot so a hand can always start.
function fillBots(state, buyIn = DEFAULT_BUYIN) {
  for (let i = 0; i < state.seats.length; i++) {
    if (!state.seats[i]) {
      state.seats[i] = {
        userId: null,
        name: BOT_NAMES[i % BOT_NAMES.length],
        isBot: true,
        stack: buyIn,
        sittingOut: false,
      };
    }
  }
}

// ---- Dealing a hand --------------------------------------------------------

function startHand(state, nowMs) {
  // Bots always re-buy so seats stay live; busted humans stay sitting out
  // until they rebuy.
  for (const s of state.seats) {
    if (s && s.isBot && s.stack <= 0) s.stack = DEFAULT_BUYIN;
  }

  const elig = eligibleSeats(state);
  if (elig.length < 2) {
    state.phase = 'idle';
    state.toAct = null;
    state.actionDeadlineMs = null;
    return state;
  }

  state.handNo += 1;
  state.deck = shuffle(makeDeck());
  state.board = [];
  state.pot = 0;
  state.street = 0;
  state.players = {};
  state.lastResult = null;
  state.handOverAtMs = null;

  // Move the button to the next eligible seat.
  state.button = nextOccupied(state, state.button);
  if (state.button < 0) state.button = elig[0];

  // Initialise per-hand player state for every eligible seat.
  for (const i of elig) {
    state.players[i] = {
      hole: [state.deck.pop(), state.deck.pop()],
      bet: 0, committed: 0, folded: false, allIn: false, acted: false,
      lastAction: null,
    };
  }

  const heads = elig.length === 2;
  let sb, bb, first;
  if (heads) {
    sb = state.button;                 // heads-up: button posts SB, acts first preflop
    bb = nextOccupied(state, sb);
    first = sb;
  } else {
    sb = nextOccupied(state, state.button);
    bb = nextOccupied(state, sb);
    first = nextOccupied(state, bb);   // UTG
  }
  state.sb = sb;
  state.bb = bb;

  postBlind(state, sb, state.smallBlind);
  postBlind(state, bb, state.bigBlind);

  state.maxBet = state.bigBlind;
  state.minRaise = state.bigBlind;     // next legal raise increment
  state.toAct = first;
  state.phase = 'betting';
  state.actionDeadlineMs = nowMs + TURN_SECS * 1000;

  log(state, `Hand #${state.handNo} dealt — blinds ${state.smallBlind}/${state.bigBlind}`, 'hand');
  return state;
}

function postBlind(state, seatIdx, amount) {
  const seat = state.seats[seatIdx];
  const p = state.players[seatIdx];
  const pay = Math.min(amount, seat.stack);
  seat.stack -= pay;
  p.bet += pay;
  p.committed += pay;
  if (seat.stack === 0) p.allIn = true;
}

// ---- Legal actions for a seat ---------------------------------------------

function legalActions(state, seatIdx) {
  if (state.phase !== 'betting' || state.toAct !== seatIdx) return null;
  const seat = state.seats[seatIdx];
  const p = state.players[seatIdx];
  if (!seat || !p || p.folded || p.allIn) return null;
  const toCall = Math.max(0, state.maxBet - p.bet);
  const canCheck = toCall === 0;
  const stack = seat.stack;
  // Raise-to bounds (total street bet the seat would reach).
  const minRaiseTo = state.maxBet + state.minRaise;
  const maxRaiseTo = p.bet + stack;        // all-in ceiling
  const canRaise = stack > toCall;         // has chips beyond a call
  return {
    toCall: Math.min(toCall, stack),
    canCheck,
    canCall: toCall > 0,
    canRaise,
    minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
    maxRaiseTo,
    stack,
  };
}

// ---- Applying an action ----------------------------------------------------
// action ∈ 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'allin'.
// For raise/bet, `raiseTo` is the TOTAL street bet the seat wants to reach.
// Returns { ok, error } — mutates state in place on success.

function applyAction(state, seatIdx, action, raiseTo, nowMs) {
  if (state.phase !== 'betting') return { ok: false, error: 'No active betting round' };
  if (state.toAct !== seatIdx) return { ok: false, error: 'Not your turn' };
  const seat = state.seats[seatIdx];
  const p = state.players[seatIdx];
  if (!seat || !p || p.folded || p.allIn) return { ok: false, error: 'Cannot act' };

  const toCall = Math.max(0, state.maxBet - p.bet);
  const name = seat.name;

  if (action === 'fold') {
    p.folded = true;
    p.acted = true;
    p.lastAction = { type: 'fold', text: 'Fold' };
    log(state, `${name} folds`, 'info');
  } else if (action === 'check') {
    if (toCall > 0) return { ok: false, error: 'Cannot check facing a bet' };
    p.acted = true;
    p.lastAction = { type: 'check', text: 'Check' };
    log(state, `${name} checks`, 'info');
  } else if (action === 'call') {
    if (toCall <= 0) return { ok: false, error: 'Nothing to call' };
    const pay = Math.min(toCall, seat.stack);
    seat.stack -= pay; p.bet += pay; p.committed += pay;
    if (seat.stack === 0) p.allIn = true;
    p.acted = true;
    p.lastAction = { type: 'call', text: `Call ${pay}` };
    log(state, `${name} calls ${pay}`, 'info');
  } else if (action === 'raise' || action === 'bet' || action === 'allin') {
    let target;
    if (action === 'allin') {
      target = p.bet + seat.stack;
    } else {
      target = Math.round(raiseTo);
      if (!Number.isFinite(target)) return { ok: false, error: 'Invalid amount' };
    }
    const maxTarget = p.bet + seat.stack;
    if (target > maxTarget) target = maxTarget;
    // Must at least match a call.
    if (target <= state.maxBet && target < maxTarget) {
      return { ok: false, error: 'Raise must exceed the current bet' };
    }
    const isAllIn = target === maxTarget;
    const minLegal = state.maxBet + state.minRaise;
    // A raise below the min is only allowed as an all-in for less.
    if (target < minLegal && !isAllIn) {
      return { ok: false, error: `Minimum raise is to ${minLegal}` };
    }
    const raiseIncrement = target - state.maxBet;
    const pay = target - p.bet;
    seat.stack -= pay; p.bet += pay; p.committed += pay;
    if (seat.stack === 0) p.allIn = true;
    // A full raise reopens the betting; an undersized all-in does not raise the
    // min-raise reference but still increases maxBet.
    if (raiseIncrement >= state.minRaise) {
      state.minRaise = raiseIncrement;
      // Everyone else must act again.
      for (const k of Object.keys(state.players)) {
        const q = state.players[k];
        if (Number(k) !== seatIdx && !q.folded && !q.allIn) q.acted = false;
      }
    }
    state.maxBet = Math.max(state.maxBet, p.bet);
    p.acted = true;
    const label = state.board.length === 0 && action !== 'bet' ? 'Raise' : (action === 'bet' ? 'Bet' : 'Raise');
    p.lastAction = { type: isAllIn ? 'allin' : (label === 'Bet' ? 'bet' : 'raise'), text: isAllIn ? `All-in ${p.bet}` : `${label} ${p.bet}` };
    log(state, `${name} ${isAllIn ? 'is all-in for' : label.toLowerCase() + ' to'} ${p.bet}`, 'info');
  } else {
    return { ok: false, error: 'Unknown action' };
  }

  advanceAfterAction(state, nowMs);
  return { ok: true };
}

// After any action, decide whether the hand ends, the street advances, or the
// turn passes to the next seat.
function advanceAfterAction(state, nowMs) {
  const live = liveSeats(state);
  if (live.length <= 1) {
    return endHandFolded(state, live[0], nowMs);
  }

  if (bettingClosed(state)) {
    return advanceStreet(state, nowMs);
  }

  // Pass to the next seat that can still act.
  const next = nextToAct(state, state.toAct);
  if (next === -1) {
    // Everyone remaining is all-in — run out the board.
    return advanceStreet(state, nowMs);
  }
  state.toAct = next;
  state.actionDeadlineMs = nowMs + TURN_SECS * 1000;
}

// True when every non-folded, non-all-in seat has acted and matched maxBet.
function bettingClosed(state) {
  const contenders = liveSeats(state).map(i => state.players[i]).filter(p => !p.allIn);
  if (contenders.length === 0) return true;
  return contenders.every(p => p.acted && p.bet === state.maxBet);
}

function nextToAct(state, from) {
  const n = state.seats.length;
  for (let k = 1; k <= n; k++) {
    const idx = (from + k) % n;
    const p = state.players[idx];
    if (p && !p.folded && !p.allIn && !(p.acted && p.bet === state.maxBet)) return idx;
  }
  return -1;
}

function firstToActPostflop(state) {
  // First live, non-all-in seat left of the button.
  const n = state.seats.length;
  for (let k = 1; k <= n; k++) {
    const idx = (state.button + k) % n;
    const p = state.players[idx];
    if (p && !p.folded && !p.allIn) return idx;
  }
  return -1;
}

// ---- Street & showdown -----------------------------------------------------

function collectStreet(state) {
  for (const k of Object.keys(state.players)) {
    state.players[k].bet = 0;
    if (!state.players[k].folded && !state.players[k].allIn) state.players[k].acted = false;
  }
  state.maxBet = 0;
  state.minRaise = state.bigBlind;
}

function advanceStreet(state, nowMs) {
  collectStreet(state);
  state.street += 1;

  if (state.street === 1) state.board.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
  else if (state.street === 2 || state.street === 3) state.board.push(state.deck.pop());

  // If nobody can act (all remaining all-in) keep dealing to the river.
  const canAct = liveSeats(state).filter(i => !state.players[i].allIn).length;

  if (state.street >= 4) {
    return showdown(state, nowMs);
  }

  if (canAct <= 1) {
    // No more betting possible — deal the rest of the board then show down.
    return advanceStreet(state, nowMs);
  }

  const first = firstToActPostflop(state);
  state.toAct = first;
  state.phase = 'betting';
  state.actionDeadlineMs = nowMs + TURN_SECS * 1000;
}

// Build side pots from each seat's committed chips. Folded seats contribute
// but cannot win.
function buildPots(state) {
  const entries = [];
  for (const k of Object.keys(state.players)) {
    const p = state.players[k];
    if (p.committed > 0) entries.push({ seat: Number(k), committed: p.committed, folded: p.folded });
  }
  const levels = [...new Set(entries.map(e => e.committed))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const lvl of levels) {
    const layer = lvl - prev;
    const contributors = entries.filter(e => e.committed >= lvl);
    const amount = layer * contributors.length;
    const eligible = contributors.filter(e => !e.folded).map(e => e.seat);
    if (amount > 0) pots.push({ amount, eligible });
    prev = lvl;
  }
  // Merge adjacent pots with identical eligibility for a tidier result.
  const merged = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligible.length === pot.eligible.length && last.eligible.every(s => pot.eligible.includes(s))) {
      last.amount += pot.amount;
    } else {
      merged.push({ amount: pot.amount, eligible: pot.eligible.slice() });
    }
  }
  return merged;
}

// Order eligible winners for odd-chip distribution: first seat left of button.
function orderLeftOfButton(state, seats) {
  const n = state.seats.length;
  const order = [];
  for (let k = 1; k <= n; k++) {
    const idx = (state.button + k) % n;
    if (seats.includes(idx)) order.push(idx);
  }
  return order;
}

function showdown(state, nowMs) {
  const pots = buildPots(state);
  const revealed = {};
  const winShare = {}; // seatIdx -> total won
  const live = liveSeats(state);

  // Reveal everyone who reached showdown (more than one live seat).
  const goesToShowdown = live.length > 1;
  for (const i of live) {
    if (goesToShowdown) revealed[i] = state.players[i].hole;
  }

  // Best 5-card score per still-live seat.
  const scoreBySeat = {};
  for (const i of live) scoreBySeat[i] = bestScore([...state.players[i].hole, ...state.board]);

  for (const pot of pots) {
    const contenders = pot.eligible.filter(s => live.includes(s));
    if (contenders.length === 0) continue;
    const best = Math.max(...contenders.map(s => scoreBySeat[s]));
    const winners = contenders.filter(s => scoreBySeat[s] === best);
    const share = Math.floor(pot.amount / winners.length);
    let leftover = pot.amount - share * winners.length;
    for (const s of winners) {
      state.seats[s].stack += share;
      winShare[s] = (winShare[s] || 0) + share;
    }
    // Odd chips go to the first winner left of the button.
    for (const s of orderLeftOfButton(state, winners)) {
      if (leftover <= 0) break;
      state.seats[s].stack += 1;
      winShare[s] = (winShare[s] || 0) + 1;
      leftover -= 1;
    }
  }

  const winnerList = Object.keys(winShare).map(Number).map(s => ({
    seatIdx: s,
    name: state.seats[s].name,
    amount: winShare[s],
    handName: catName(scoreBySeat[s]),
  })).sort((a, b) => b.amount - a.amount);

  finishHand(state, winnerList, revealed, nowMs);
}

function endHandFolded(state, winnerSeat, nowMs) {
  // Everyone else folded — the last live seat wins the whole pot uncontested.
  const pots = buildPots(state);
  const total = pots.reduce((a, p) => a + p.amount, 0);
  state.seats[winnerSeat].stack += total;
  const winnerList = [{ seatIdx: winnerSeat, name: state.seats[winnerSeat].name, amount: total, handName: null }];
  finishHand(state, winnerList, {}, nowMs, true);
}

function finishHand(state, winners, revealed, nowMs, byFold) {
  state.phase = 'showdown';
  state.toAct = null;
  state.actionDeadlineMs = null;
  state.pot = 0;
  // The pot has been paid out to stacks — zero each player's contribution so
  // the displayed pot reads 0 during the showdown reveal. Folded flags and
  // hole cards are preserved (the reveal uses lastResult / players[i].folded).
  for (const k of Object.keys(state.players)) {
    state.players[k].committed = 0;
    state.players[k].bet = 0;
  }
  state.lastResult = {
    handNo: state.handNo,
    winners,
    revealed,
    board: state.board.slice(),
    byFold: !!byFold,
  };
  state.handOverAtMs = nowMs + HANDOVER_SECS * 1000;

  const names = winners.map(w => `${w.name}${w.amount ? ` (+${w.amount})` : ''}`).join(', ');
  const detail = byFold ? 'others folded' : (winners[0] && winners[0].handName) || '';
  log(state, `Hand #${state.handNo}: ${names} win${winners.length > 1 ? '' : 's'}${detail ? ' · ' + detail : ''}`, 'win');
  // Mark busted humans as sitting out (they must rebuy to return).
  for (const s of state.seats) {
    if (s && !s.isBot && s.stack <= 0) s.sittingOut = true;
  }
}

// ---- Bots ------------------------------------------------------------------

function botDecision(state, seatIdx) {
  const seat = state.seats[seatIdx];
  const p = state.players[seatIdx];
  const legal = legalActions(state, seatIdx);
  if (!legal) return { action: 'check' };

  const strength = handStrength(p.hole, state.board);
  const r = Math.random();
  const toCall = legal.toCall;
  const bb = state.bigBlind;

  if (toCall > 0) {
    const potOdds = toCall / (state.pot + totalStreetBets(state) + toCall);
    if (strength < 0.25 && potOdds > 0.2 && r > 0.25) return { action: 'fold' };
    if (strength > 0.72 && legal.canRaise && r > 0.5) {
      const target = Math.min(legal.maxRaiseTo, legal.minRaiseTo + bb);
      return { action: 'raise', raiseTo: target };
    }
    if (strength < 0.12 && r > 0.5) return { action: 'fold' };
    return { action: 'call' };
  }
  // No bet to call.
  if (strength > 0.6 && legal.canRaise && r > 0.5) {
    const target = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, bb * 2 + state.maxBet));
    return { action: 'raise', raiseTo: target };
  }
  return { action: 'check' };
}

function totalStreetBets(state) {
  let t = 0;
  for (const k of Object.keys(state.players)) t += state.players[k].bet;
  return t;
}

// ---- Lazy tick -------------------------------------------------------------
// Advances the table by AT MOST one logical step. Returns true if it mutated
// state (so the caller knows to persist). Drives: deal the first hand, bot
// turns, human timeouts, and the pause between hands.

function tick(state, nowMs) {
  // Enough players but no hand running yet → deal.
  if ((state.phase === 'idle') && eligibleSeats(state).length >= 2) {
    startHand(state, nowMs);
    return true;
  }

  if (state.phase === 'handover') {
    if (state.handOverAtMs != null && nowMs >= state.handOverAtMs) {
      if (eligibleSeats(state).length >= 2) startHand(state, nowMs);
      else { state.phase = 'idle'; state.toAct = null; }
      return true;
    }
    return false;
  }

  // Showdown auto-transitions to a short handover pause, then next hand.
  if (state.phase === 'showdown') {
    if (state.handOverAtMs != null && nowMs >= state.handOverAtMs) {
      state.phase = 'handover';
      state.handOverAtMs = nowMs; // deal on next tick
      return true;
    }
    return false;
  }

  if (state.phase === 'betting' && state.toAct != null) {
    const seat = state.seats[state.toAct];
    if (!seat) return false;
    if (seat.isBot) {
      // Bots pause briefly so play is legible.
      if (state.actionDeadlineMs != null && (state.actionDeadlineMs - TURN_SECS * 1000 + BOT_THINK_MS) > nowMs) return false;
      const d = botDecision(state, state.toAct);
      applyAction(state, state.toAct, d.action, d.raiseTo, nowMs);
      return true;
    }
    // Human whose clock expired → auto-check or auto-fold.
    if (state.actionDeadlineMs != null && nowMs >= state.actionDeadlineMs) {
      const legal = legalActions(state, state.toAct);
      const act = legal && legal.canCheck ? 'check' : 'fold';
      applyAction(state, state.toAct, act, undefined, nowMs);
      return true;
    }
  }
  return false;
}

// Run tick repeatedly until nothing changes or a human is on the clock, so a
// single request resolves a whole run of bot turns. Capped to avoid loops.
function runTicks(state, nowMs, maxSteps = 40) {
  let changed = false;
  for (let i = 0; i < maxSteps; i++) {
    // Stop looping the moment a human must act (their clock is live).
    if (state.phase === 'betting' && state.toAct != null) {
      const seat = state.seats[state.toAct];
      if (seat && !seat.isBot && !(state.actionDeadlineMs != null && nowMs >= state.actionDeadlineMs)) break;
      if (seat && seat.isBot) {
        // Only advance a bot once its think delay has elapsed; otherwise stop
        // and let a later poll pick it up.
        const ready = !(state.actionDeadlineMs != null && (state.actionDeadlineMs - TURN_SECS * 1000 + BOT_THINK_MS) > nowMs);
        if (!ready) break;
      }
    }
    const did = tick(state, nowMs);
    if (!did) break;
    changed = true;
  }
  return changed;
}

// ---- Per-viewer redaction --------------------------------------------------
// Produce the table view for one user, hiding hole cards the viewer must not
// see and never leaking the deck.

function viewFor(state, userId, nowMs) {
  let mySeat = -1;
  for (let i = 0; i < state.seats.length; i++) {
    if (state.seats[i] && state.seats[i].userId && state.seats[i].userId === userId) { mySeat = i; break; }
  }
  const revealed = (state.lastResult && state.lastResult.revealed) || {};

  const seats = state.seats.map((s, i) => {
    if (!s) return { seatIdx: i, empty: true };
    const p = state.players && state.players[i];
    let hand = null;
    if (p && !p.folded) {
      if (i === mySeat) hand = p.hole;
      else if (revealed[i]) hand = revealed[i];
      else hand = [null, null]; // face-down
    } else if (p && p.folded && i === mySeat) {
      hand = p.hole;
    }
    return {
      seatIdx: i,
      empty: false,
      userId: s.userId ? (i === mySeat ? s.userId : true) : null, // don't leak other user ids
      name: s.name,
      isBot: s.isBot,
      stack: s.stack,
      sittingOut: s.sittingOut,
      inHand: !!p,
      folded: p ? p.folded : false,
      allIn: p ? p.allIn : false,
      bet: p ? p.bet : 0,
      committed: p ? p.committed : 0,
      lastAction: p ? p.lastAction : null,
      hand,
    };
  });

  const potNow = totalStreetBets(state) + potCollected(state);
  const legal = (state.phase === 'betting' && state.toAct === mySeat && mySeat >= 0)
    ? legalActions(state, mySeat) : null;

  return {
    maxSeats: state.maxSeats,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    phase: state.phase,
    street: state.street,
    board: state.board,
    pot: potNow,
    handNo: state.handNo,
    button: state.button,
    sb: state.sb,
    bb: state.bb,
    toAct: state.toAct,
    maxBet: state.maxBet,
    seats,
    mySeat,
    legal,
    actionDeadlineMs: state.actionDeadlineMs,
    handOverAtMs: state.handOverAtMs,
    serverNowMs: nowMs,
    lastResult: state.lastResult,
    log: (state.log || []).slice(-30),
  };
}

// Pot already gathered from prior streets + current street bets.
function potCollected(state) {
  let t = 0;
  for (const k of Object.keys(state.players || {})) {
    const p = state.players[k];
    t += (p.committed - p.bet);
  }
  return t;
}

module.exports = {
  BOT_NAMES,
  DEFAULT_BUYIN,
  TURN_SECS,
  HANDOVER_SECS,
  makeDeck,
  shuffle,
  score5,
  bestScore,
  catName,
  handStrength,
  newTableState,
  seatPlayer,
  fillBots,
  firstEmptySeat,
  occupiedCount,
  eligibleSeats,
  startHand,
  legalActions,
  applyAction,
  botDecision,
  tick,
  runTicks,
  viewFor,
};
