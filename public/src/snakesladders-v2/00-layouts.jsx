/* ============================================================
   Snakes & Ladders V2 — difficulty layouts + Legend unlock
   ============================================================
   Seven hand-authored tier boards for LOCAL play (bot / hotseat).
   Online rooms keep the server-refereed CNL_VARIANTS tables — these
   tables are shaped to drop into lib/board-rules.js later, but that
   plumbing is deferred (see the V2 spec's "Deferred work").

   Authoring constraints — enforced by the `cnlv2-layouts` self-test:
   - starts and ends in 2–99. 100 is NOT a legal ladder end: the collision
     penalty can shove a pawn onto a ladder bottom, and a ladder to 100 would
     hand that pawn a win it never rolled for (see 03-game.jsx's Rule 4)
   - ladder start < end; snake start > end
   - no square is both a jump start and a jump destination (the engine
     applies exactly ONE jump per landing, so chains would be ambiguous)
   - no two jumps share a start square
   - Legend: ≥10 of its 15 snake heads in 80–99, ladders top out < 80.

   Everything here is CNLV2_-prefixed: the old file's CNL_* names and
   window.boardRules' browser globals share this one script scope, and
   a redeclared const is a parse error for the whole app. */

const CNLV2_LAYOUTS = [
  {
    id: 'beginner', label: 'Beginner',
    ladders: { 3: 22, 8: 31, 15: 44, 28: 56, 36: 64, 47: 68, 62: 81, 71: 92 },
    snakes:  { 39: 18, 66: 45, 88: 50 },
  },
  {
    id: 'amateur', label: 'Amateur',
    ladders: { 4: 25, 12: 33, 21: 49, 37: 57, 46: 73, 58: 82, 69: 91 },
    snakes:  { 30: 7, 52: 28, 65: 41, 84: 60, 96: 75 },
  },
  {
    id: 'regular', label: 'Regular',
    ladders: { 5: 27, 14: 35, 29: 54, 42: 63, 57: 78, 66: 89 },
    snakes:  { 23: 8, 48: 26, 61: 39, 75: 50, 86: 52, 97: 70 },
  },
  {
    id: 'professional', label: 'Professional',
    ladders: { 6: 29, 18: 41, 33: 60, 49: 72, 68: 90 },
    snakes:  { 25: 9, 43: 17, 56: 31, 64: 38, 79: 46, 88: 67, 94: 74, 98: 55 },
  },
  {
    id: 'topplayer', label: 'Top Player',
    ladders: { 7: 32, 20: 45, 39: 61, 55: 77 },
    snakes:  { 16: 4, 28: 11, 44: 22, 52: 30, 63: 35, 71: 48, 82: 58, 89: 53, 96: 68, 99: 80 },
  },
  {
    id: 'superstar', label: 'Super Star',
    ladders: { 9: 34, 27: 51, 46: 70 },
    snakes:  { 15: 3, 24: 6, 38: 12, 45: 19, 59: 37, 67: 40, 76: 54, 83: 49, 90: 62, 94: 71, 97: 65, 99: 58 },
  },
  {
    // The summit is a minefield: 11 of 15 heads sit in 80–99, 99 drops to
    // single digits, and both ladders top out below 80 so the last two rows
    // must be walked square by square.
    id: 'legend', label: 'Legend',
    ladders: { 10: 42, 31: 66 },
    snakes:  {
      18: 5, 36: 14, 53: 29, 68: 47,
      80: 44, 82: 57, 84: 26, 86: 50, 88: 33, 91: 70,
      93: 64, 95: 38, 97: 75, 98: 52, 99: 7,
    },
  },
];

function cnlv2LayoutById(id) {
  return CNLV2_LAYOUTS.find((l) => l.id === id) || CNLV2_LAYOUTS[0];
}

/* Device-local progression, matching the precedent of puzzlechain_cnl_skin /
   puzzlechain_cnl_streak: classic free-play state never round-trips the
   server. JSON so future tiers can add keys without a second storage slot. */
const CNLV2_UNLOCK_KEY = 'puzzlechain_cnlv2_unlocks';
function cnlv2Unlocks() {
  try { return JSON.parse(localStorage.getItem(CNLV2_UNLOCK_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}
function cnlv2SaveUnlock(id) {
  try {
    const u = cnlv2Unlocks();
    u[id] = true;
    localStorage.setItem(CNLV2_UNLOCK_KEY, JSON.stringify(u));
  } catch (e) {}
}
function cnlv2LegendUnlocked() { return !!cnlv2Unlocks().legend; }

/* Screenshot-state deep links (same role as ?cnlskin in the old file):
   ?cnldiff=<tierId> pins the difficulty — and for legend, bypasses the lock
   for the session (the URL wins over stored state; the lock itself is
   asserted separately on the bare picker). ?seats=2..6 pins the hotseat
   seat count and is only honored with mode=2p.

   The dice rules (a 6 rolls again; three 6s forfeit the third roll) are only
   reachable by ROLLING, which navigation-driven proposal checks and the
   before/after screenshots cannot do — so three more params script them
   deterministically. They are a pure client-side TEST FIXTURE: they write
   nothing, touch no endpoint, and are therefore deliberately NOT
   staging-gated (the "before" shot comes from production).

   - ?snldice=6,6,6  forces the next rolls in order (values outside 1–6 are
     dropped, at most 12 kept); once the queue empties the die is fair again.
   - ?snlauto=1      fires exactly as many rolls as the queue holds, so the
     whole sequence plays out on a plain page load.
   - ?snlsix=0..2    pre-seeds seat 1's consecutive-6 counter, putting the
     forfeit one roll away instead of three.

   The collision penalty (landing on an occupied square knocks its occupant
   back 10) needs two pawns on one square, which takes six honest rolls to
   reach — long enough that a check could time out waiting. Two more fixture
   params put the board one roll away instead:

   - ?snlpos=13,9    pre-places each seat (0–99, one per seat, extras
     ignored); anything unlisted starts at 0 as usual.
   - ?snlturn=1..6   starts the round on that seat rather than seat 1.

   Same fixture rules: client-side only, no writes, no endpoint. */
const CNLV2_NO_DEEP_LINKS = {
  difficulty: null, seats: null, dice: null, auto: false, sixSeed: 0, pos: null, turn: 0,
};

function cnlv2DeepLinks() {
  try {
    const q = new URLSearchParams(window.location.search);
    const diff = q.get('cnldiff');
    const seats = parseInt(q.get('seats') || '', 10);
    const dice = (q.get('snldice') || '')
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => n >= 1 && n <= 6)
      .slice(0, 12);
    const sixSeed = parseInt(q.get('snlsix') || '', 10);
    const pos = (q.get('snlpos') || '')
      .split(',')
      .map((s2) => parseInt(s2, 10))
      .filter((n) => n >= 0 && n <= 99)
      .slice(0, 6);
    const turn = parseInt(q.get('snlturn') || '', 10);
    return {
      difficulty: diff && CNLV2_LAYOUTS.some((l) => l.id === diff) ? diff : null,
      seats: seats >= 2 && seats <= 6 ? seats : null,
      dice: dice.length ? dice : null,
      auto: q.get('snlauto') === '1',
      // Clamped below the forfeit limit: seeding the limit itself would mean
      // the forfeit had already happened without a roll being thrown.
      sixSeed: sixSeed >= 1 && sixSeed <= 2 ? sixSeed : 0,
      // 99 is the ceiling on purpose: a pre-placed pawn on 100 would be a
      // finished game the shell never announced.
      pos: pos.length ? pos : null,
      turn: turn >= 1 && turn <= 6 ? turn : 0,
    };
  } catch (e) { return CNLV2_NO_DEEP_LINKS; }
}
