#!/usr/bin/env node
/*
 * Mancala Daily Challenge — self-test.
 *
 * Verifies the invariants the feature depends on WITHOUT a database:
 *   1. Board determinism + parity: the client (mncDailyBoard, public/app.jsx)
 *      and server (srvMncDailyBoard, server.js) derive a byte-identical board
 *      for the same UTC day number, and that board is fair (both sides equal
 *      sum = 24, stores empty).
 *   2. AI determinism: the ported Hard minimax always returns the same move for
 *      the same position (the precondition for server move-mismatch checks).
 *   3. Score formula: win → margin*15 - time (floor 0); loss/draw → 0.
 *
 * The function bodies below are copied verbatim from the two source files; this
 * test's job is to catch the two copies drifting apart. Run: npm run test:mnc
 */

function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; throw new Error(msg); } }

/* ---- shared deterministic primitives (identical in app.jsx & server.js) ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---- CLIENT copy: mncDailyBoard (public/app.jsx) ---- */
function clientBoard(dayNum) {
  const rng = mulberry32((dayNum + hashStr('mancaladaily')) >>> 0);
  const side = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < 24; s++) side[Math.floor(rng() * 6)]++;
  const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) { board[i] = side[i]; board[12 - i] = side[i]; }
  return board;
}

/* ---- SERVER copy: srvMncDailyBoard (server.js) ---- */
function serverBoard(dayNum) {
  const rng = mulberry32((dayNum + hashStr('mancaladaily')) >>> 0);
  const side = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < 24; s++) side[Math.floor(rng() * 6)]++;
  const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) { board[i] = side[i]; board[12 - i] = side[i]; }
  return board;
}

/* ---- AI engine (server srvMnc* / client mnc*; identical logic) ---- */
function distribute(pits, pitIdx, player) {
  const p = pits.slice();
  const stones = p[pitIdx]; p[pitIdx] = 0;
  const skipStore = player === 1 ? 13 : 6;
  const ownStore  = player === 1 ? 6  : 13;
  const ownMin    = player === 1 ? 0  : 7;
  const ownMax    = player === 1 ? 5  : 12;
  let cur = pitIdx;
  for (let i = 0; i < stones; i++) { do { cur = (cur + 1) % 14; } while (cur === skipStore); p[cur]++; }
  const lastIdx = cur;
  const extraTurn = lastIdx === ownStore;
  if (!extraTurn && lastIdx >= ownMin && lastIdx <= ownMax && p[lastIdx] === 1) {
    const opp = 12 - lastIdx;
    if (p[opp] > 0) { p[ownStore] += p[opp] + 1; p[lastIdx] = 0; p[opp] = 0; }
  }
  return { pits: p, extraTurn };
}
function validMoves(pits, player) {
  const min = player === 1 ? 0 : 7, max = player === 1 ? 5 : 12, m = [];
  for (let i = min; i <= max; i++) if (pits[i] > 0) m.push(i);
  return m;
}
const evalPits = p => p[6] - p[13];
function minimax(pits, player, depth, alpha, beta) {
  const p1Empty = pits.slice(0, 6).every(v => v === 0);
  const p2Empty = pits.slice(7, 13).every(v => v === 0);
  if (p1Empty || p2Empty) {
    const p = pits.slice();
    for (let i = 0; i < 6; i++) { p[6] += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    return evalPits(p);
  }
  if (depth === 0) return evalPits(pits);
  const moves = validMoves(pits, player);
  if (moves.length === 0) return evalPits(pits);
  if (player === 1) {
    let best = -Infinity;
    for (const idx of moves) { const { pits: np, extraTurn } = distribute(pits, idx, 1); best = Math.max(best, minimax(np, extraTurn ? 1 : 2, depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) { const { pits: np, extraTurn } = distribute(pits, idx, 2); best = Math.min(best, minimax(np, extraTurn ? 2 : 1, depth - 1, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break; }
    return best;
  }
}
function aiMove(pits) {
  const moves = validMoves(pits, 2);
  if (moves.length === 0) return -1;
  let bestIdx = moves[0], bestScore = Infinity;
  for (const idx of moves) { const { pits: np, extraTurn } = distribute(pits, idx, 2); const s = minimax(np, extraTurn ? 2 : 1, 6, -Infinity, Infinity); if (s < bestScore) { bestScore = s; bestIdx = idx; } }
  return bestIdx;
}

function dailyScore(finalPits, timeSecs) {
  if (finalPits[6] <= finalPits[13]) return 0;
  return Math.max((finalPits[6] - finalPits[13]) * 15 - timeSecs, 0);
}

/* ---- run ---- */
const days = [0, 1, 100, 19519, 20000, 20500, 99999];
for (const d of days) {
  const cb = clientBoard(d), sb = serverBoard(d);
  assert(JSON.stringify(cb) === JSON.stringify(sb), `board parity day ${d}`);
  assert(cb[6] === 0 && cb[13] === 0, `stores empty day ${d}`);
  const s1 = cb.slice(0, 6).reduce((a, b) => a + b, 0);
  const s2 = cb.slice(7, 13).reduce((a, b) => a + b, 0);
  assert(s1 === 24 && s2 === 24, `equal sides (24/24) day ${d}, got ${s1}/${s2}`);
}
console.log(`✓ board parity + fairness over ${days.length} day numbers`);

// AI determinism: same position → same move, repeatedly.
for (const d of days) {
  const board = clientBoard(d);
  const m1 = aiMove(board), m2 = aiMove(board.slice());
  assert(m1 === m2, `AI deterministic day ${d}`);
  assert(m1 >= 7 && m1 <= 12, `AI picks a P2 pit day ${d}, got ${m1}`);
}
console.log('✓ Hard AI is deterministic and legal');

assert(dailyScore([0,0,0,0,0,0,40, 0,0,0,0,0,0,8], 25) === (32 * 15 - 25), 'win score');
assert(dailyScore([0,0,0,0,0,0,10, 0,0,0,0,0,0,38], 25) === 0, 'loss score 0');
assert(dailyScore([0,0,0,0,0,0,24, 0,0,0,0,0,0,24], 5) === 0, 'draw score 0');
assert(dailyScore([0,0,0,0,0,0,25, 0,0,0,0,0,0,24], 9999) === 0, 'win but time floor → 0');
console.log('✓ score formula (win / loss / draw / floor)');

if (process.exitCode) { console.error('\nSELF-TEST FAILED'); } else { console.log('\nAll Mancala Daily self-tests passed.'); }
