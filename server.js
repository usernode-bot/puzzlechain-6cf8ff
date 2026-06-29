const express = require('express');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const ethers = require('ethers');
const dapp = require('./lib/dapp');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const IS_STAGING = process.env.USERNODE_ENV === 'staging';

// App identity secrets (APP_PUBKEY, APP_SECRET_KEY) are declared in dapp.json
// and available via process.env for cryptographic operations when needed.

// ---- PvP wager config -------------------------------------------------------

const VALIDATOR_PRIVATE_KEY = process.env.VALIDATOR_PRIVATE_KEY;
const UTGO_CONTRACT_ADDRESS = process.env.UTGO_CONTRACT_ADDRESS;
const TREASURY_WALLET       = process.env.TREASURY_WALLET;
const UTGO_RPC_URL          = process.env.UTGO_RPC_URL || '';

// Wager-feature identity is OPTIONAL and must degrade gracefully: a malformed
// VALIDATOR_PRIVATE_KEY or UTGO_RPC_URL must DISABLE the wager feature, never
// crash boot (mirrors the APP_SECRET_KEY pattern below). ethers' Wallet /
// JsonRpcProvider constructors throw synchronously on bad input, so a
// fat-fingered prod secret would otherwise kill the process at module load —
// before listen() — and surface as a 502. We .trim() the key first so a
// valid-but-untrimmed secret (e.g. a copy/paste trailing newline) still works
// rather than disabling the feature.
let validatorWallet = null;
if (VALIDATOR_PRIVATE_KEY && VALIDATOR_PRIVATE_KEY.trim()) {
  try {
    validatorWallet = new ethers.Wallet(VALIDATOR_PRIVATE_KEY.trim());
  } catch (e) {
    console.warn('[wager] VALIDATOR_PRIVATE_KEY is invalid — wager signing disabled:', e.message);
  }
}

let utgoProvider = null;
if (UTGO_RPC_URL) {
  try {
    utgoProvider = new ethers.JsonRpcProvider(UTGO_RPC_URL);
  } catch (e) {
    console.warn('[wager] UTGO_RPC_URL is invalid — on-chain provider disabled:', e.message);
  }
}

// ---- dApps-integration app identity ---------------------------------------
// APP_PUBKEY / APP_SECRET_KEY identify this app to the dApps-integration
// surface and sign integration payloads. The feature is OPTIONAL and must
// degrade gracefully: a blank/missing APP_SECRET_KEY (e.g. a staging preview
// whose manifest staging_default is "") MUST NOT crash the server on boot.
// Instead the feature is treated as disabled — signing is skipped and the
// affected routes report it as unavailable so the UI can hide/disable it.
const APP_PUBKEY     = (process.env.APP_PUBKEY || '').trim();
const APP_SECRET_KEY = (process.env.APP_SECRET_KEY || '').trim();
const APP_INTEGRATION_ENABLED = APP_SECRET_KEY.length > 0;

if (!APP_INTEGRATION_ENABLED) {
  console.warn('[integration] APP_SECRET_KEY is empty — dApps integration disabled (signing/integration calls skipped).');
}

// Sign an integration payload with the app secret. Only ever called when
// APP_INTEGRATION_ENABLED is true; uses an opaque HMAC so any secret format is
// safe (no key parsing that could throw on a non-hex value).
function signIntegrationPayload(payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', APP_SECRET_KEY).update(body).digest('hex');
}

const UTGO_ABI_BALANCE   = ['function balanceOf(address account) view returns (uint256)'];
const WAGER_IFACE        = new ethers.Interface(['function claimWin(bytes32,address,bytes)']);
const CANCEL_QUEUE_IFACE = new ethers.Interface(['function cancelQueue(bytes32)']);
const TRANSFER_IFACE     = new ethers.Interface(['function transfer(address,uint256)']);
const CLAIM_REWARDS_IFACE = new ethers.Interface(['function claimRewards(address,uint256,uint256,bytes)']);

// Reward economics — single source of truth for balance/tuning.
// 1 UTGO per 1000 final points; streak multiplier already baked into finalScore.
// NOTE: $UTGO rewards are RETIRED — the daily win now pays MATCH (the single
// in-app currency). These constants are kept only for the one-time migration of
// legacy unclaimed pending_wei into MATCH.
const REWARD_PER_POINT_WEI = BigInt('1000000000000000'); // 0.001 UTGO per point → ~0.96 UTGO for ~960pts
const STREAK_FREEZE_PRICE_WEI = BigInt('5000000000000000000'); // 5 UTGO (legacy)

// ---- Single-currency (MATCH) economics — the only balance knobs --------------
// MATCH is the app's one in-app currency (off-chain ledger in tilematch_tokens,
// every movement anchored on-chain). Daily wins earn MATCH; hints / streak
// freezes / tips spend MATCH.
const MATCH_PER_POINT = 0.01;         // 1 MATCH per 100 final points
const MATCH_MIN_PER_WIN = 1;          // every win pays at least this
const MATCH_PER_UTGO = 10;            // legacy-$UTGO → MATCH migration rate (0.001 UTGO/pt ↔ 0.01 MATCH/pt)
const STREAK_FREEZE_PRICE_MATCH = 50; // 5 legacy UTGO × 10
const matchEarnedForScore = (finalScore) =>
  Math.max(MATCH_MIN_PER_WIN, Math.round((Number(finalScore) || 0) * MATCH_PER_POINT));

// Deterministic 32-byte hash committing a MATCH ledger movement, written
// on-chain (as tx calldata) by the client's bridge. Returned WITHOUT the 0x
// prefix to match the dappAnchor `'0x'+chainHash` convention.
function matchChainHash({ userId, kind, gameId, attemptDate, amount, eventId }) {
  try {
    const h = ethers.keccak256(
      ethers.toUtf8Bytes([userId, kind, gameId || '', attemptDate || '', amount, eventId].join('|'))
    );
    return h.startsWith('0x') ? h.slice(2) : h;
  } catch {
    return null;
  }
}

// Crypto Wordle paid hints — cost of the Nth hint bought today (0-indexed) is
// CW_HINT_BASE_COST * 2**N in MATCH tokens → 1, 2, 4, 8, … Resets per UTC day.
// Server-authoritative; the client mirrors this only for display.
const CW_HINT_BASE_COST = 1;
const cwHintCost = (purchased) => CW_HINT_BASE_COST * Math.pow(2, purchased);

// EVM address regex (same as PvP validation throughout)
const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

// Single shared connection pool to this app's Postgres DB.
// connectionTimeoutMillis bounds how long a query waits for a connection so a
// stalled/unreachable DB fails fast-and-loud (the migrate retry loop logs and
// retries) instead of hanging boot forever. statement_timeout caps any single
// query server-side so a wedged statement can't pin a connection indefinitely.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});

// Surface pool-level errors on idle clients instead of letting them bubble up
// as an uncaught exception that takes the process down.
pool.on('error', (err) => {
  console.error('[pg] idle client error:', err.message);
});

// Flipped true once the boot migration completes. Surfaced on /health for
// diagnostics; the container stays routable (and /health stays 200) while
// migrations are still running or retrying.
let migrationsReady = false;

// Redis client for PvP matchmaking queue (120s TTL keys). Graceful fallback to
// Postgres-only CAS queue if REDIS_URL is unset or connection fails.
let redis = null;
let redisReady = false;
(function initRedis() {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redis = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    redis.on('ready', () => { redisReady = true; console.log('[redis] connected'); });
    redis.on('error', (err) => { redisReady = false; console.warn('[redis] error:', err.message); });
    redis.connect().catch(err => console.warn('[redis] connect failed:', err.message));
  } catch (e) {
    console.warn('[redis] ioredis unavailable, using Postgres-only queue:', e.message);
  }
})();

// ---- Authoritative game registry -----------------------------------------
// Single source of truth for every game in the hub, keyed by id, mirroring the
// GAMES array in public/app.jsx. `category` is the lobby tab; `tier` is the
// DApp-Mode validation tier (A=full replay, B=snapshot/heuristic,
// C=server-authoritative). This reconciles the historical GAMES/GAME_IDS drift:
// GAME_IDS is now DERIVED from this registry's daily-category games (the set the
// per-day attempt routes validate against), and DApp validation keys off the
// registry too.
const GAME_REGISTRY = {
  sudoku:            { category: 'daily',   tier: 'A' },
  wordhunt:          { category: 'daily',   tier: 'A' },
  cryptowordle:      { category: 'daily',   tier: 'A' },
  tilematchingdaily: { category: 'daily',   tier: 'A' },
  minesweeper:       { category: 'classic', tier: 'A' },
  mancala:           { category: 'classic', tier: 'A' },
  'chutes-ladders':  { category: 'classic', tier: 'A' },
  '2048':            { category: 'classic', tier: 'A' },
  'knights-tour':    { category: 'classic', tier: 'A' },
  snake:             { category: 'classic', tier: 'B' },
  blockblast:        { category: 'classic', tier: 'A' },
  diamondrush:       { category: 'classic', tier: 'A' },
  texas:             { category: 'classic', tier: 'C' },
  tilematching:      { category: 'classic', tier: 'A' },
  bounce:            { category: 'classic', tier: 'B' },
  zuma:              { category: 'classic', tier: 'B' },
  hashrush:          { category: 'classic', tier: 'A' },
  match3:            { category: 'classic', tier: 'A' },
  idle:              { category: 'idle',    tier: 'C' },
  // DApp-only pseudo-game for PvP tile-match sessions (not a lobby card).
  tilematch_pvp:     { category: 'pvp',     tier: 'A' },
};

// Daily-attempt routes validate :gameId against the daily-category games.
// (Historically this set also carried mancala/idle/zuma by mistake; those are
// not daily games and were never reachable as daily attempts.)
const GAME_IDS = new Set(
  Object.keys(GAME_REGISTRY).filter(id => GAME_REGISTRY[id].category === 'daily')
);

// Any game id known to the hub (used by DApp session validation).
const ALL_GAME_IDS = new Set(Object.keys(GAME_REGISTRY));

// Consecutive-day streak milestones that unlock a named badge. Kept in sync
// with STREAK_BADGES in public/app.jsx (the client owns the icon/name copy;
// the server only persists the day thresholds as streak_milestone achievements
// so a player's earned badges survive a later streak reset).
const STREAK_BADGE_DAYS = [3, 7, 30, 50, 100, 180, 365];

// ---- Achievement badges (non-streak) -------------------------------------
// Persisted in user_achievements as one row per earned badge `type`, mirroring
// the streak_milestone pattern. Kept in sync with ACHIEVEMENT_BADGES in
// public/app.jsx (the client owns the icon/name copy; the server owns the
// award criteria and persists the earned `type`). All criteria derive from
// columns already recorded per solve (time_secs, steps, score, game_id,
// attempt_date), so no new data is needed.
//   first_solve    — the user's first ever finished daily attempt.
//   speed_demon    — solved any daily in under 60s.
//   flawless       — solved sudoku/wordhunt at/under a per-game step threshold.
//   daily_sweep    — finished ALL daily games within one UTC day.
//   podium         — held rank #1 on a game's daily leaderboard at finish time.
//   solve_milestone — lifetime finished+won solves crossed 10/50/100.
const SPEED_DEMON_MAX_SECS = 60;
// Per-game "no wasted moves" thresholds. Only the move-counted daily games
// qualify; games without a meaningful step economy are omitted (no flawless).
const FLAWLESS_STEP_THRESHOLDS = { sudoku: 18, wordhunt: 8 };
const SOLVE_MILESTONES = [10, 50, 100];

// The set of non-streak achievement badge `type`s a user has earned, plus the
// solve-milestone counts they've crossed. Read from the permanent
// user_achievements rows so earned badges persist forever. Returns
// { types: [...], milestones: [...] }.
async function earnedAchievementBadges(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT type, metadata
         FROM user_achievements
        WHERE user_id = $1
          AND type IN ('first_solve','speed_demon','flawless','daily_sweep','podium','solve_milestone')`,
      [userId]
    );
    const types = new Set();
    const milestones = new Set();
    for (const r of rows) {
      types.add(r.type);
      if (r.type === 'solve_milestone' && r.metadata && Number.isFinite(+r.metadata.count)) {
        milestones.add(+r.metadata.count);
      }
    }
    return {
      types: Array.from(types),
      milestones: Array.from(milestones).sort((a, b) => a - b),
    };
  } catch {
    return { types: [], milestones: [] };
  }
}

// ---- Match-3 puzzle configuration ----------------------------------------
const MATCH3_PUZZLES = [
  // Easy (1-10)
  { id: 1, name: 'Getting Started', target: 800, timeLimit: 120, moveLimit: 30, layers: 2, difficulty: 'Easy' },
  { id: 2, name: 'Gather Gems', target: 1200, timeLimit: 120, moveLimit: 28, layers: 3, difficulty: 'Easy' },
  { id: 3, name: 'Color Cascade', target: 1500, timeLimit: 120, moveLimit: 26, layers: 2, difficulty: 'Easy' },
  { id: 4, name: 'Tile Practice', target: 2000, timeLimit: 120, moveLimit: 35, layers: 3, difficulty: 'Easy' },
  { id: 5, name: 'Gem Master', target: 2500, timeLimit: 120, moveLimit: 32, layers: 2, difficulty: 'Easy' },
  { id: 6, name: 'Combo Chain', target: 1800, timeLimit: 120, moveLimit: 40, layers: 2, difficulty: 'Easy' },
  { id: 7, name: 'Rainbow Tiles', target: 2200, timeLimit: 120, moveLimit: 30, layers: 3, difficulty: 'Easy' },
  { id: 8, name: 'Momentum', target: 2700, timeLimit: 120, moveLimit: 28, layers: 2, difficulty: 'Easy' },
  { id: 9, name: 'Precision Match', target: 2000, timeLimit: 120, moveLimit: 25, layers: 3, difficulty: 'Easy' },
  { id: 10, name: 'Power Play', target: 2800, timeLimit: 120, moveLimit: 32, layers: 3, difficulty: 'Easy' },
  // Medium (11-30)
  { id: 11, name: 'Rising Challenge', target: 3000, timeLimit: 110, moveLimit: 28, layers: 3, difficulty: 'Medium' },
  { id: 12, name: 'Locked Tiles', target: 3200, timeLimit: 110, moveLimit: 26, layers: 4, difficulty: 'Medium' },
  { id: 13, name: 'Strategic Moves', target: 3500, timeLimit: 110, moveLimit: 30, layers: 3, difficulty: 'Medium' },
  { id: 14, name: 'Gem Rush', target: 3800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
  { id: 15, name: 'Pressure Cooker', target: 3200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
  { id: 16, name: 'Ice Breaker', target: 4000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
  { id: 17, name: 'Cascade Master', target: 3600, timeLimit: 110, moveLimit: 26, layers: 3, difficulty: 'Medium' },
  { id: 18, name: 'Deep Focus', target: 4200, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
  { id: 19, name: 'Tile Tactics', target: 3900, timeLimit: 100, moveLimit: 25, layers: 3, difficulty: 'Medium' },
  { id: 20, name: 'Gem Sculptor', target: 4400, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
  { id: 21, name: 'Locked & Loaded', target: 4100, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
  { id: 22, name: 'Precision Strike', target: 3800, timeLimit: 100, moveLimit: 23, layers: 3, difficulty: 'Medium' },
  { id: 23, name: 'Color Theory', target: 4300, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
  { id: 24, name: 'Momentum Shift', target: 4600, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
  { id: 25, name: 'Maze Solver', target: 4000, timeLimit: 100, moveLimit: 26, layers: 3, difficulty: 'Medium' },
  { id: 26, name: 'Time Pressure', target: 3900, timeLimit: 90, moveLimit: 22, layers: 4, difficulty: 'Medium' },
  { id: 27, name: 'Champion\'s Path', target: 4500, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
  { id: 28, name: 'Final Stand', target: 4800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
  { id: 29, name: 'Gem Dynasty', target: 4200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
  { id: 30, name: 'Gateway Challenge', target: 5000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
  // Hard (31-50)
  { id: 31, name: 'Expert Territory', target: 5200, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
  { id: 32, name: 'Ice Fortress', target: 5400, timeLimit: 100, moveLimit: 24, layers: 5, difficulty: 'Hard' },
  { id: 33, name: 'Avalanche', target: 5800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  { id: 34, name: 'Locked Labyrinth', target: 5600, timeLimit: 100, moveLimit: 25, layers: 5, difficulty: 'Hard' },
  { id: 35, name: 'Inferno', target: 6000, timeLimit: 90, moveLimit: 22, layers: 5, difficulty: 'Hard' },
  { id: 36, name: 'Master Puzzle', target: 5900, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
  { id: 37, name: 'Complexity', target: 6200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  { id: 38, name: 'Precision Required', target: 5800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
  { id: 39, name: 'Final Test', target: 6400, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
  { id: 40, name: 'Legendary Tier', target: 6600, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
  { id: 41, name: 'Peak Performance', target: 6000, timeLimit: 90, moveLimit: 24, layers: 5, difficulty: 'Hard' },
  { id: 42, name: 'Unrelenting', target: 6300, timeLimit: 100, moveLimit: 27, layers: 5, difficulty: 'Hard' },
  { id: 43, name: 'Titan\'s Trial', target: 6800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  { id: 44, name: 'Endgame', target: 6500, timeLimit: 90, moveLimit: 25, layers: 5, difficulty: 'Hard' },
  { id: 45, name: 'Perfection Quest', target: 6900, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
  { id: 46, name: 'Unstoppable', target: 6700, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
  { id: 47, name: 'Ultra Challenge', target: 7000, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  { id: 48, name: 'Reality Bender', target: 6800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
  { id: 49, name: 'Pandora\'s Box', target: 7100, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
  { id: 50, name: 'Master Challenge', target: 7200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
];

// ---- Schema bootstrap (idempotent, runs on boot) -------------------------
// daily_attempts is PUBLIC (the platform default): it holds gameplay
// results, not sensitive personal data, and a future leaderboard would
// want them visible. One row per (user, game, UTC day) — the UNIQUE
// constraint is what enforces "exactly one attempt per day". The day
// resets implicitly: a new UTC date yields a new attempt_date, so
// yesterday's rows simply stop matching today's lookups.
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_attempts (
      id           SERIAL PRIMARY KEY,
      user_id      TEXT NOT NULL,
      username     TEXT,
      game_id      TEXT NOT NULL,
      attempt_date DATE NOT NULL,
      score        INTEGER,
      steps        INTEGER,
      time_secs    INTEGER,
      started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at  TIMESTAMPTZ,
      UNIQUE (user_id, game_id, attempt_date)
    )
  `);
  // Resumability: persist mutable in-progress state (board moves) and the
  // accumulated active timer so an unfinished daily attempt can be resumed
  // exactly where the player left off. Idempotent ADD COLUMN per platform DB
  // convention. `progress` is game-specific JSON; the board itself is
  // re-derived from the deterministic daily seed, so only player moves live here.
  await pool.query(`ALTER TABLE daily_attempts ADD COLUMN IF NOT EXISTS progress JSONB`);
  await pool.query(`ALTER TABLE daily_attempts ADD COLUMN IF NOT EXISTS elapsed_secs INTEGER`);

  // mancala_rooms is PUBLIC — game results contain no sensitive data.
  // One row per multiplayer room; rooms persist until cleaned up.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mancala_rooms (
      id             TEXT PRIMARY KEY,
      player1_id     TEXT NOT NULL,
      player2_id     TEXT,
      player1_name   TEXT,
      player2_name   TEXT,
      pits           JSONB NOT NULL,
      current_player INTEGER NOT NULL DEFAULT 1,
      status         TEXT NOT NULL DEFAULT 'waiting',
      winner         TEXT,
      move_seq       INTEGER NOT NULL DEFAULT 0,
      last_move_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // poker_chips is PUBLIC — chip counts contain no sensitive data.
  // One row per user; upserted after every hand.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poker_chips (
      user_id    TEXT        PRIMARY KEY,
      chips      INTEGER     NOT NULL DEFAULT 1000,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Staging seed: give staging-demo-user 2500 chips so testers see a
  // non-default chip count in the lobby card. Idempotent, no-op in prod.
  if (IS_STAGING) {
    await pool.query(
      `INSERT INTO poker_chips (user_id, chips)
       VALUES ('staging-demo-user', 2500)
       ON CONFLICT (user_id) DO NOTHING`
    );
  }

  // idle_game_state is PUBLIC: game state, no sensitive data.
  // One row per user; tracks currency, prestige, units owned, upgrades.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idle_game_state (
      id              SERIAL PRIMARY KEY,
      user_id         TEXT NOT NULL UNIQUE,
      currency        BIGINT NOT NULL DEFAULT 0,
      peak_currency   BIGINT NOT NULL DEFAULT 0,
      prestige_points INTEGER NOT NULL DEFAULT 0,
      tap_power       DECIMAL NOT NULL DEFAULT 1,
      units_owned     JSONB NOT NULL DEFAULT '{}',
      upgrades        JSONB NOT NULL DEFAULT '{}',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // diamond_rush_progress is PUBLIC: per-user game progress, no sensitive
  // data (and a future leaderboard would want it visible). One row per user.
  // cleared_levels: array of cleared level numbers. best_results: map of
  // level -> { gems, timeSecs, score }. total_gems: lifetime gems collected.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS diamond_rush_progress (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL UNIQUE,
      username       TEXT,
      cleared_levels JSONB NOT NULL DEFAULT '[]',
      best_results   JSONB NOT NULL DEFAULT '{}',
      total_gems     INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // snake_scores is PUBLIC — high scores for the Snake classic game, shown on
  // a global leaderboard (no sensitive data; gameplay results only). One row
  // per user holding their personal best, upserted with GREATEST so a worse
  // run never clobbers a better one. No foreign keys (public-table rule).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snake_scores (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL UNIQUE,
      username       TEXT,
      best_score     INTEGER NOT NULL DEFAULT 0,
      best_length    INTEGER,
      best_time_secs INTEGER,
      games_played   INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // breakout_scores is PUBLIC — high scores for the Bounce classic game, shown
  // on a global leaderboard (no sensitive data; gameplay results only). One row
  // per user holding their personal best, upserted with GREATEST so a worse run
  // never clobbers a better one. No foreign keys (public-table rule). Mirrors
  // snake_scores.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS breakout_scores (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL UNIQUE,
      username       TEXT,
      best_score     INTEGER NOT NULL DEFAULT 0,
      best_level     INTEGER,
      best_time_secs INTEGER,
      games_played   INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // pvp_matches is PUBLIC — match results contain no sensitive data.
  // One row per PvP wager match; status: waiting|active|finished|cancelled.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pvp_matches (
      id              TEXT PRIMARY KEY,
      player1_id      TEXT NOT NULL,
      player2_id      TEXT,
      player1_name    TEXT,
      player2_name    TEXT,
      player1_addr    TEXT,
      player2_addr    TEXT,
      wager_utgo      TEXT NOT NULL DEFAULT '0',
      board_seed      BIGINT,
      status          TEXT NOT NULL DEFAULT 'waiting',
      winner_id       TEXT,
      p1_deposited    BOOLEAN NOT NULL DEFAULT false,
      p2_deposited    BOOLEAN NOT NULL DEFAULT false,
      p1_score        INTEGER,
      p2_score        INTEGER,
      p1_steps        INTEGER,
      p2_steps        INTEGER,
      p1_time_secs    INTEGER,
      p2_time_secs    INTEGER,
      p1_finished_at  TIMESTAMPTZ,
      p2_finished_at  TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // zuma_scores is PUBLIC — high scores for the Zuma classic game, shown on
  // a global leaderboard (no sensitive data; gameplay results only). One row
  // per user holding their personal best, upserted with GREATEST so a worse
  // run never clobbers a better one. No foreign keys (public-table rule).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zuma_scores (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL UNIQUE,
      username       TEXT,
      best_score     INTEGER NOT NULL DEFAULT 0,
      best_level     INTEGER,
      best_time_secs INTEGER,
      games_played   INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // mancala_sessions is PUBLIC — transient game tokens, no sensitive data.
  // One row per ZK proof session; status: pending|verified|rejected|expired.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mancala_sessions (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      commitment   TEXT NOT NULL,
      difficulty   TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      verified_at  TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mancala_sessions_user
    ON mancala_sessions(user_id, created_at DESC)
  `);

  // mancala_scores is PUBLIC — global leaderboard for verified AI-mode wins.
  // One row per (user_id, difficulty); upserted with GREATEST so worse runs
  // never overwrite a personal best.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mancala_scores (
      user_id        TEXT NOT NULL,
      username       TEXT,
      difficulty     TEXT NOT NULL,
      best_score     INTEGER NOT NULL DEFAULT 0,
      best_margin    INTEGER,
      best_moves     INTEGER,
      best_time_secs INTEGER,
      games_played   INTEGER NOT NULL DEFAULT 0,
      wins           INTEGER NOT NULL DEFAULT 0,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, difficulty)
    )
  `);

  // mancala_daily is PUBLIC — the global Daily Challenge leaderboard. One row
  // per (user_id, puzzle_date); the UTC day resets implicitly at midnight (a
  // new puzzle_date no longer matches today's lookups — no cron). score/margin/
  // moves/time_secs are null between consume-on-start and a verified finish.
  // progress/elapsed_secs back resume; session_id links the latest ZK session.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mancala_daily (
      user_id      TEXT NOT NULL,
      username     TEXT,
      puzzle_date  DATE NOT NULL,
      score        INTEGER,
      margin       INTEGER,
      moves        INTEGER,
      time_secs    INTEGER,
      won          BOOLEAN,
      session_id   TEXT,
      progress     JSONB,
      elapsed_secs INTEGER,
      started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at  TIMESTAMPTZ,
      PRIMARY KEY (user_id, puzzle_date)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mancala_daily_board
    ON mancala_daily(puzzle_date, score DESC)
  `);
  // The Daily Challenge reuses mancala_sessions for the commit-reveal token;
  // puzzle_date binds a session to the day whose board it committed to, so a
  // finish just after midnight still verifies against the start day's board.
  await pool.query(`ALTER TABLE mancala_sessions ADD COLUMN IF NOT EXISTS puzzle_date DATE`);

  // pvp_moves: per-move log for anti-cheat timing analysis. PUBLIC.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pvp_moves (
      id          BIGSERIAL PRIMARY KEY,
      match_id    TEXT NOT NULL,
      player_id   TEXT NOT NULL,
      move_seq    INTEGER NOT NULL,
      ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (match_id, player_id, move_seq)
    )
  `);

  // Schema migrations — add new columns idempotently (safe to run on every boot).
  await pool.query(`
    ALTER TABLE pvp_matches
      ADD COLUMN IF NOT EXISTS bet_tier          INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS p1_remaining      INTEGER,
      ADD COLUMN IF NOT EXISTS p2_remaining      INTEGER,
      ADD COLUMN IF NOT EXISTS contract_tx       TEXT,
      ADD COLUMN IF NOT EXISTS started_at        TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS p1_last_seen_at   TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS p2_last_seen_at   TIMESTAMPTZ
  `);
  await pool.query(`
    ALTER TABLE pvp_moves
      ADD COLUMN IF NOT EXISTS tile_type  INTEGER,
      ADD COLUMN IF NOT EXISTS ts_client  TIMESTAMPTZ
  `);

  // users is PUBLIC: centralized user metadata. Lazy init on first API call.
  // No sensitive data — just identity.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      username       TEXT NOT NULL UNIQUE,
      usernode_pubkey TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // user_wallets is PRIVATE: maps user_id to EVM wallet address.
  // Marked private because it links a Usernode identity to a financial address.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      user_id     TEXT PRIMARY KEY,
      wallet_addr TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`COMMENT ON TABLE user_wallets IS 'staging:private'`);

  // token_rewards_ledger is PUBLIC: per-user accrual of earned-but-unclaimed $UTGO.
  // No sensitive data (amounts are gameplay results like daily_attempts).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_rewards_ledger (
      user_id              TEXT PRIMARY KEY,
      pending_wei          NUMERIC(78,0) NOT NULL DEFAULT 0,
      lifetime_earned_wei  NUMERIC(78,0) NOT NULL DEFAULT 0,
      lifetime_claimed_wei NUMERIC(78,0) NOT NULL DEFAULT 0,
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // token_reward_events is PUBLIC: idempotency log for puzzle reward credits.
  // UNIQUE (user_id, game_id, attempt_date) prevents double-crediting on retries.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_reward_events (
      id           BIGSERIAL PRIMARY KEY,
      user_id      TEXT NOT NULL,
      game_id      TEXT NOT NULL,
      attempt_date DATE NOT NULL,
      amount_wei   NUMERIC(78,0) NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, game_id, attempt_date)
    )
  `);

  // token_tips is PUBLIC: one row per tip between users.
  // Mirrors public on-chain transfers; powers profile "tips received" panel.
  // LEGACY: retained for history; tips now move MATCH via match_ledger_events.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_tips (
      id           BIGSERIAL PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id   TEXT NOT NULL,
      from_addr    TEXT,
      to_addr      TEXT,
      amount_wei   NUMERIC(78,0) NOT NULL,
      tx_hash      TEXT,
      status       TEXT NOT NULL DEFAULT 'confirmed',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // match_ledger_events is PUBLIC: the unified, append-only log of every MATCH
  // movement (the single in-app currency) plus its on-chain anchor receipt.
  // No sensitive data — only user ids, kind, amount (integer MATCH),
  // counterpart user id (for tips), and public chain/tx hashes. No FK to any
  // private table. `amount` is the signed delta (earn/tip_received positive,
  // spend_*/tip_sent negative). `balance_after` is the post-movement balance.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_ledger_events (
      id            BIGSERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL,
      kind          TEXT NOT NULL,
      game_id       TEXT,
      attempt_date  DATE,
      amount        INTEGER NOT NULL,
      balance_after INTEGER,
      counterpart   TEXT,
      chain_hash    TEXT,
      anchor_status TEXT NOT NULL DEFAULT 'pending',
      anchor_tx_hash TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Idempotent earns: at most one 'earn' row per (user, game, day) — the direct
  // successor to token_reward_events' constraint, so a double-finish can't
  // double-credit MATCH.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS match_ledger_earn_unique
      ON match_ledger_events (user_id, game_id, attempt_date)
      WHERE kind = 'earn'
  `);
  // Idempotent hint spends: one row per (user, day, hint index).
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS match_ledger_hint_unique
      ON match_ledger_events (user_id, attempt_date, amount, kind)
      WHERE kind = 'spend_hint'
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS match_ledger_user_idx ON match_ledger_events (user_id, created_at DESC)`);

  // Migration marker for the one-time legacy $UTGO → MATCH fold.
  await pool.query(`ALTER TABLE token_rewards_ledger ADD COLUMN IF NOT EXISTS migrated_to_match_at TIMESTAMPTZ`);

  // user_follows is PUBLIC: directional follow relationships.
  // One row per (follower_id, followee_id) pair.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id    TEXT NOT NULL,
      followee_id    TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY    (follower_id, followee_id)
    )
  `);

  // user_stats_snapshot is PUBLIC: denormalized stats cache for fast profile
  // rendering. Updated on win and daily resets. One row per user.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_stats_snapshot (
      user_id        TEXT PRIMARY KEY,
      username       TEXT,
      total_score    INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      games_played   INTEGER NOT NULL DEFAULT 0,
      dailies_completed INTEGER NOT NULL DEFAULT 0,
      classics_played   INTEGER NOT NULL DEFAULT 0,
      last_win_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Add streak_freezes column to user_stats_snapshot (idempotent)
  await pool.query(`
    ALTER TABLE user_stats_snapshot
      ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 0
  `);

  // user_achievements is PUBLIC: recent milestones and notable events.
  // One row per achievement. Indexed for efficient friend-feed queries.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL,
      type           TEXT NOT NULL,
      game_id        TEXT,
      score          INTEGER,
      metadata       JSONB,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // posts is PUBLIC: shared game results and scores. No sensitive data.
  // One row per post. user_id is the author.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id              SERIAL PRIMARY KEY,
      user_id         TEXT NOT NULL,
      game_id         TEXT NOT NULL,
      score           INTEGER NOT NULL,
      steps           INTEGER,
      time_secs       INTEGER,
      caption         TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // post_comments is PUBLIC: comments on shared posts. No sensitive data.
  // One row per comment. Cascades delete when post is deleted.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id              SERIAL PRIMARY KEY,
      post_id         INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id         TEXT NOT NULL,
      text            TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // collab_sessions is PUBLIC: collaborative puzzle-solving sessions.
  // One row per co-op game session. status: waiting|active|finished.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collab_sessions (
      id              TEXT PRIMARY KEY,
      game_id         TEXT NOT NULL,
      initiator_id    TEXT NOT NULL,
      invitee_id      TEXT,
      initiator_name  TEXT,
      invitee_name    TEXT,
      status          TEXT NOT NULL DEFAULT 'waiting',
      state           JSONB,
      seed            BIGINT,
      initiator_score INTEGER,
      invitee_score   INTEGER,
      started_at      TIMESTAMPTZ,
      finished_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_activity   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Create indices for social queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_follows_followee
    ON user_follows(followee_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_stats_updated
    ON user_stats_snapshot(updated_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_achievements_user_created
    ON user_achievements(user_id, created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_achievements_created
    ON user_achievements(created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_user_created
    ON posts(user_id, created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_created
    ON posts(created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
    ON post_comments(post_id, created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_collab_sessions_initiator
    ON collab_sessions(initiator_id, created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_collab_sessions_invitee
    ON collab_sessions(invitee_id)
  `);

  // tilematch_scores is PUBLIC: personal-best scores for the Tile Match Puzzle
  // (1000-level mode). One row per user, upserted with GREATEST.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tilematch_scores (
      user_id            TEXT PRIMARY KEY,
      username           TEXT,
      highest_level      INTEGER NOT NULL DEFAULT 0,
      total_cleared      INTEGER NOT NULL DEFAULT 0,
      best_session_score INTEGER NOT NULL DEFAULT 0,
      games_played       INTEGER NOT NULL DEFAULT 0,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // tilematch_tokens is PUBLIC: off-chain MATCH token balance per user.
  // Server enforces balance >= 0 on every write.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tilematch_tokens (
      user_id    TEXT PRIMARY KEY,
      username   TEXT,
      balance    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // tilematch_daily_tasks is PUBLIC: per-user per-day task progress.
  // Uses the same UTC date reset semantics as daily_attempts.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tilematch_daily_tasks (
      user_id    TEXT NOT NULL,
      task_date  DATE NOT NULL,
      task_id    TEXT NOT NULL,
      progress   INTEGER NOT NULL DEFAULT 0,
      claimed_at TIMESTAMPTZ,
      PRIMARY KEY (user_id, task_date, task_id)
    )
  `);

  // cryptowordle_hints is PUBLIC: per-user, per-UTC-day count of paid hints
  // bought in Crypto Wordle. Drives the doubling cost ramp (1,2,4,8…) which
  // resets implicitly at midnight UTC (a new hint_date yields no row → count 0).
  // No sensitive data — just a gameplay counter, same class as daily_attempts.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cryptowordle_hints (
      user_id         TEXT NOT NULL,
      username        TEXT,
      hint_date       DATE NOT NULL,
      hints_purchased INTEGER NOT NULL DEFAULT 0,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, hint_date)
    )
  `);

  // tilematch_duels is PUBLIC: in-app MATCH token 1v1 duels.
  // Mirrors pvp_matches but uses MATCH tokens (off-chain), no on-chain fields.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tilematch_duels (
      id               TEXT PRIMARY KEY,
      player1_id       TEXT NOT NULL,
      player2_id       TEXT,
      player1_name     TEXT,
      player2_name     TEXT,
      stake_tokens     INTEGER NOT NULL DEFAULT 10,
      board_seed       BIGINT,
      status           TEXT NOT NULL DEFAULT 'waiting',
      winner_id        TEXT,
      p1_score         INTEGER,
      p2_score         INTEGER,
      p1_steps         INTEGER,
      p2_steps         INTEGER,
      p1_time_secs     INTEGER,
      p2_time_secs     INTEGER,
      p1_finished_at   TIMESTAMPTZ,
      p2_finished_at   TIMESTAMPTZ,
      p1_last_seen_at  TIMESTAMPTZ,
      p2_last_seen_at  TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // ---- DApp Mode (Phase 0) tables -----------------------------------------
  // game_sessions is PUBLIC: one wallet-bound verification session per play.
  // Holds gameplay results + the session's final chain hash + on-chain anchor
  // state. Deliberately stores NO wallet address (it carries usernode_pubkey,
  // which is already public in `users`); the EVM address is looked up from the
  // private user_wallets table at anchor time, so this public table never links
  // identity → financial address (public-table-no-FK-to-private rule).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL,
      username         TEXT,
      usernode_pubkey  TEXT,
      game_id          TEXT NOT NULL,
      seed             BIGINT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'active',  -- active|verified|disputed|abandoned
      dispute_reason   TEXT,
      final_score      INTEGER,
      final_steps      INTEGER,
      final_time_secs  INTEGER,
      final_chain_hash TEXT,
      anchor_status    TEXT NOT NULL DEFAULT 'none',     -- none|mock|pending|anchored
      anchor_tx_hash   TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at      TIMESTAMPTZ
    )
  `);

  // session_states is PUBLIC: the append-only hash-chain ledger. One row per
  // move/snapshot; gameplay data only, no sensitive content.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_states (
      id          BIGSERIAL PRIMARY KEY,
      session_id  TEXT NOT NULL,
      sequence    INTEGER NOT NULL,
      move        JSONB,
      state_hash  TEXT NOT NULL,
      prev_hash   TEXT NOT NULL,
      chain_hash  TEXT NOT NULL,
      ts_client   TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (session_id, sequence)
    )
  `);

  // wallet_ownership_proofs is PRIVATE: binds a Usernode identity to a signed
  // ownership challenge over an EVM address. Auth material → staging:private,
  // mirroring user_wallets.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_ownership_proofs (
      user_id         TEXT PRIMARY KEY,
      usernode_pubkey TEXT,
      wallet_addr     TEXT NOT NULL,
      nonce           TEXT NOT NULL,
      signature       TEXT NOT NULL,
      verified_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`COMMENT ON TABLE wallet_ownership_proofs IS 'staging:private'`);

  // match3_progress is PUBLIC — per-user campaign progress.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match3_progress (
      id                SERIAL PRIMARY KEY,
      user_id           TEXT NOT NULL UNIQUE,
      username          TEXT,
      highest_puzzle    INTEGER NOT NULL DEFAULT 0,
      best_score        INTEGER NOT NULL DEFAULT 0,
      total_puzzles_completed INTEGER NOT NULL DEFAULT 0,
      last_played_puzzle INTEGER NOT NULL DEFAULT 1,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // match3_scores is PUBLIC — per-user per-puzzle best scores.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match3_scores (
      user_id           TEXT NOT NULL,
      puzzle_id         INTEGER NOT NULL,
      best_score        INTEGER NOT NULL,
      best_time_secs    INTEGER,
      moves_used        INTEGER,
      completed_at      TIMESTAMPTZ,
      PRIMARY KEY (user_id, puzzle_id)
    )
  `);

  // match3_session is PUBLIC — in-progress puzzle state for resumability.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match3_session (
      user_id           TEXT NOT NULL UNIQUE,
      current_puzzle    INTEGER NOT NULL,
      tiles             JSONB NOT NULL,
      bar               JSONB NOT NULL,
      score             INTEGER NOT NULL DEFAULT 0,
      moves             INTEGER NOT NULL DEFAULT 0,
      elapsed_secs      INTEGER NOT NULL DEFAULT 0,
      board_seed        INTEGER NOT NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_game_status ON game_sessions(game_id, status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_states_session ON session_states(session_id, sequence)`);

  // user_game_state is PUBLIC: generic per-user game-state store (gameplay
  // progress, no sensitive data). One row per (user_id, game_id); `state` is
  // an arbitrary game-specific JSON blob. This is the reusable persistence
  // layer for NEW non-daily games — they read/write it via GET/PUT
  // /api/state/:gameId instead of needing a bespoke table. Existing bespoke
  // tables (idle_game_state, diamond_rush_progress, …) stay as-is.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_game_state (
      user_id    TEXT NOT NULL,
      username   TEXT,
      game_id    TEXT NOT NULL,
      state      JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, game_id)
    )
  `);
  await pool.query(`ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS save_hash TEXT`);
  await pool.query(`ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS anchor_tx_hash TEXT`);

  // classic_rooms is PUBLIC: open room-code multiplayer for Classic Games
  // (currently Chutes & Ladders). Mirrors mancala_rooms but is generic — the
  // `state` JSONB is game-specific and `game_id` is validated against
  // ALL_GAME_IDS. No sensitive data (gameplay results only). Any user can join
  // a waiting room by code, so no inviteeId is required (unlike collab_sessions).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS classic_rooms (
      id             TEXT PRIMARY KEY,
      game_id        TEXT NOT NULL,
      player1_id     TEXT NOT NULL,
      player2_id     TEXT,
      player1_name   TEXT,
      player2_name   TEXT,
      state          JSONB NOT NULL DEFAULT '{}',
      move_seq       INTEGER NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'waiting',
      winner         TEXT,
      last_move_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Staging-only: a fake user with unclaimed legacy $UTGO so the migration below
  // actually folds a row each fresh boot (and no-ops idempotently thereafter).
  if (IS_STAGING) {
    await pool.query(
      `INSERT INTO users (id, username) VALUES ('staging-demo-legacy', 'staging-demo-legacy')
       ON CONFLICT (id) DO NOTHING`
    );
    await pool.query(
      `INSERT INTO token_rewards_ledger (user_id, pending_wei, lifetime_earned_wei, lifetime_claimed_wei)
       VALUES ('staging-demo-legacy', '3000000000000000000', '3000000000000000000', 0)
       ON CONFLICT (user_id) DO NOTHING`
    );
  }

  // ---- One-time migration: legacy unclaimed $UTGO → MATCH ---------------------
  // Fold every player's unclaimed pending_wei into their single MATCH balance,
  // once. Idempotent: rows are stamped `migrated_to_match_at` and their
  // pending_wei zeroed, so re-running boot (or overlapping boots) never
  // double-credits. The daily finish no longer writes pending_wei after this
  // deploy, so there is no concurrent re-accrual race. MATCH granted =
  // floor(pending_wei / 10^17) (i.e. UTGO × MATCH_PER_UTGO). A 'migration'
  // ledger row records the credit (no on-chain anchor — this is a server-side
  // bulk credit with no interactive wallet).
  try {
    const { rows: legacyRows } = await pool.query(
      `SELECT user_id, pending_wei
         FROM token_rewards_ledger
        WHERE migrated_to_match_at IS NULL AND pending_wei > 0`
    );
    for (const lr of legacyRows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Re-check + lock so a concurrent boot can't migrate the same row twice.
        const { rows: lock } = await client.query(
          `SELECT pending_wei FROM token_rewards_ledger
             WHERE user_id = $1 AND migrated_to_match_at IS NULL AND pending_wei > 0
             FOR UPDATE`,
          [lr.user_id]
        );
        if (lock.length === 0) { await client.query('ROLLBACK'); client.release(); continue; }
        const pendingWei = BigInt(lock[0].pending_wei.toString());
        const granted = Number(pendingWei / (10n ** 17n)); // UTGO × MATCH_PER_UTGO, floored
        if (granted > 0) {
          const { rows: balRows } = await client.query(
            `INSERT INTO tilematch_tokens (user_id, balance)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET
               balance = tilematch_tokens.balance + $2, updated_at = now()
             RETURNING balance`,
            [lr.user_id, granted]
          );
          await client.query(
            `INSERT INTO match_ledger_events (user_id, kind, amount, balance_after, anchor_status)
             VALUES ($1, 'migration', $2, $3, 'migration')`,
            [lr.user_id, granted, balRows[0].balance]
          );
        }
        await client.query(
          `UPDATE token_rewards_ledger
              SET pending_wei = 0, migrated_to_match_at = now(), updated_at = now()
            WHERE user_id = $1`,
          [lr.user_id]
        );
        await client.query('COMMIT');
      } catch (mErr) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('[migrate] $UTGO→MATCH failed for', lr.user_id, mErr.message);
      } finally {
        client.release();
      }
    }
    if (legacyRows.length) console.log(`[migrate] folded legacy $UTGO into MATCH for ${legacyRows.length} user(s)`);
  } catch (migErr) {
    console.error('[migrate] $UTGO→MATCH scan failed (non-fatal):', migErr.message);
  }

  if (IS_STAGING) {
    // PvP staging seeds: three match states for UI testing.
    await pool.query(`
      INSERT INTO pvp_matches
        (id, player1_id, player1_name, player1_addr, bet_tier, wager_utgo, status)
      VALUES ('PVPWAIT', 'staging-demo-user', 'staging-p1',
              '0x1000000000000000000000000000000000000001',
              10, '10000000000000000000', 'waiting')
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO pvp_matches
        (id, player1_id, player2_id, player1_name, player2_name,
         player1_addr, player2_addr, bet_tier, wager_utgo, board_seed, status,
         p1_deposited, p2_deposited, started_at)
      VALUES ('PVPACTV', 'staging-demo-user', 'staging-opponent', 'staging-p1', 'staging-p2',
              '0x1000000000000000000000000000000000000001',
              '0x2000000000000000000000000000000000000002',
              10, '10000000000000000000', 42317893, 'active', true, true, now())
      ON CONFLICT (id) DO NOTHING
    `);
    // Seed 5 pvp_moves for each player in the active match
    for (let seq = 0; seq < 5; seq++) {
      await pool.query(`
        INSERT INTO pvp_moves (match_id, player_id, move_seq, tile_type)
        VALUES ('PVPACTV', 'staging-demo-user', $1, $2),
               ('PVPACTV', 'staging-opponent',  $1, $3)
        ON CONFLICT (match_id, player_id, move_seq) DO NOTHING
      `, [seq, seq % 8, (seq + 3) % 8]);
    }
    await pool.query(`
      INSERT INTO pvp_matches
        (id, player1_id, player2_id, player1_name, player2_name,
         player1_addr, player2_addr, bet_tier, wager_utgo, board_seed, status, winner_id,
         p1_deposited, p2_deposited,
         p1_score, p1_steps, p1_time_secs, p1_remaining,
         p2_score, p2_steps, p2_time_secs, p2_remaining,
         p1_finished_at, p2_finished_at, started_at)
      VALUES ('PVPFINI', 'staging-demo-user', 'staging-opponent', 'staging-p1', 'staging-p2',
              '0x1000000000000000000000000000000000000001',
              '0x2000000000000000000000000000000000000002',
              10, '10000000000000000000', 73518249, 'finished', 'staging-demo-user',
              true, true,
              850, 72, 67, 0,
              720, 72, 95, 0,
              now() - interval '5 minutes', now() - interval '3 minutes',
              now() - interval '8 minutes')
      ON CONFLICT (id) DO NOTHING
    `);

    // Social staging seeds: create demo users with follow relationships,
    // stats, and achievements. Idempotent, no-op in production.
    const demoUsers = [
      { id: 'staging-demo-user', username: 'staging-demo-user' },
      { id: 'staging-alice', username: 'staging-alice' },
      { id: 'staging-bob', username: 'staging-bob' },
      { id: 'staging-charlie', username: 'staging-charlie' },
    ];

    for (const u of demoUsers) {
      await pool.query(
        `INSERT INTO users (id, username)
         VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username]
      );
    }

    // Seed follow relationships: demo-user follows alice and bob,
    // alice follows bob
    const follows = [
      ['staging-demo-user', 'staging-alice'],
      ['staging-demo-user', 'staging-bob'],
      ['staging-alice', 'staging-bob'],
      ['staging-bob', 'staging-charlie'],
    ];

    for (const [follower, followee] of follows) {
      await pool.query(
        `INSERT INTO user_follows (follower_id, followee_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, followee_id) DO NOTHING`,
        [follower, followee]
      );
    }

    // Seed stats for each demo user
    const stats = [
      ['staging-demo-user', 'staging-demo-user', 4850, 12, 45, 8, 37],
      ['staging-alice', 'staging-alice', 3200, 7, 28, 5, 23],
      ['staging-bob', 'staging-bob', 5600, 15, 52, 12, 40],
      ['staging-charlie', 'staging-charlie', 1900, 3, 15, 2, 13],
    ];

    for (const [uid, uname, score, streak, games, dailies, classics] of stats) {
      await pool.query(
        `INSERT INTO user_stats_snapshot
           (user_id, username, total_score, current_streak, games_played,
            dailies_completed, classics_played, last_win_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now() - interval '2 hours')
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, uname, score, streak, games, dailies, classics]
      );
    }

    // Seed achievements for demo users
    const achievements = [
      ['staging-demo-user', 'personal_best', 'sudoku', 980, { previousBest: 850 }],
      ['staging-demo-user', 'personal_best', 'wordhunt', 1120, { previousBest: 900 }],
      ['staging-demo-user', 'streak_milestone', null, null, { streak: 10 }],
      ['staging-alice', 'personal_best', 'sudoku', 750, { previousBest: 620 }],
      ['staging-alice', 'personal_best', 'cryptowordle', 890, { previousBest: 700 }],
      ['staging-bob', 'personal_best', 'sudoku', 1100, { previousBest: 1050 }],
      ['staging-bob', 'streak_milestone', null, null, { streak: 15 }],
      ['staging-bob', 'personal_best', 'wordhunt', 1350, { previousBest: 1200 }],
      ['staging-charlie', 'personal_best', 'sudoku', 550, { previousBest: null }],
    ];

    for (const [uid, type, gameId, score, meta] of achievements) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, type, game_id, score, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, now() - interval '1 day')
         ON CONFLICT DO NOTHING`,
        [uid, type, gameId, score, JSON.stringify(meta)]
      );
    }

    // Match-3 campaign progression seed — viewer at puzzle 12 with in-progress session.
    const demoUserId = 'staging-demo-user';
    await pool.query(`
      INSERT INTO match3_progress (user_id, username, highest_puzzle, best_score, total_puzzles_completed, last_played_puzzle)
      VALUES ($1, 'staging-demo-user', 12, 3500, 12, 13)
      ON CONFLICT (user_id) DO UPDATE SET highest_puzzle = GREATEST(match3_progress.highest_puzzle, 12)
    `, [demoUserId]);

    // In-progress session on puzzle 13
    const boardSeed = 99999;
    const tiles = JSON.stringify([
      { id: 1, type: 0, pos: 0, locked: false, inBar: false, removed: false },
      { id: 2, type: 1, pos: 1, locked: false, inBar: false, removed: false },
      { id: 3, type: 2, pos: 2, locked: false, inBar: false, removed: false },
      { id: 4, type: 3, pos: 3, locked: false, inBar: false, removed: false },
      { id: 5, type: 4, pos: 4, locked: false, inBar: false, removed: false },
    ]);
    const bar = JSON.stringify([1, 2, 3]);
    await pool.query(`
      INSERT INTO match3_session (user_id, current_puzzle, tiles, bar, score, moves, elapsed_secs, board_seed)
      VALUES ($1, 13, $2, $3, 1200, 15, 60, $4)
      ON CONFLICT (user_id) DO UPDATE SET current_puzzle = 13, score = 1200, moves = 15
    `, [demoUserId, tiles, bar, boardSeed]);

    // Match-3 leaderboard seeds — fake players for global leaderboard display
    const match3Leaderboard = [
      { id: 'staging-m3-ada', name: 'Staging demo Ada', highest: 50, best: 9950 },
      { id: 'staging-m3-borg', name: 'Staging demo Borg', highest: 45, best: 8200 },
      { id: 'staging-m3-chen', name: 'Staging demo Chen', highest: 38, best: 6100 },
      { id: 'staging-m3-dot', name: 'Staging demo Dot', highest: 42, best: 7600 },
    ];
    for (const p of match3Leaderboard) {
      await pool.query(`
        INSERT INTO match3_progress (user_id, username, highest_puzzle, best_score, total_puzzles_completed)
        VALUES ($1, $2, $3, $4, $3)
        ON CONFLICT (user_id) DO NOTHING
      `, [p.id, p.name, p.highest, p.best]);
    }

    // Wallet staging seeds — user_wallets is private (schema-only in staging), so
    // we seed fake wallet addresses for demo users so tip/profile flows have targets.
    const walletSeeds = [
      ['staging-demo-user', '0xDEAD000000000000000000000000000000000001'],
      ['staging-alice',     '0xDEAD000000000000000000000000000000000002'],
      ['staging-bob',       '0xDEAD000000000000000000000000000000000003'],
      ['staging-charlie',   '0xDEAD000000000000000000000000000000000004'],
    ];
    for (const [uid, addr] of walletSeeds) {
      await pool.query(
        `INSERT INTO user_wallets (user_id, wallet_addr) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, addr]
      );
    }

    // Seed the demo user with 3 UTGO pending rewards so the Wallet screen's
    // Claim button and pending display are demonstrable without solving a puzzle.
    await pool.query(
      `INSERT INTO token_rewards_ledger
         (user_id, pending_wei, lifetime_earned_wei, lifetime_claimed_wei)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO NOTHING`,
      ['staging-demo-user',
       '3000000000000000000',  // 3 UTGO pending
       '5000000000000000000',  // 5 UTGO lifetime earned
       '2000000000000000000']  // 2 UTGO lifetime claimed
    );

    // Seed tips received by staging-demo-user so their profile and Wallet
    // recent-activity show rows without any real on-chain action.
    const tipSeeds = [
      ['staging-alice', 'staging-demo-user',
       '0xDEAD000000000000000000000000000000000002',
       '0xDEAD000000000000000000000000000000000001',
       '1000000000000000000', '0xstaging-tip-1'],
      ['staging-bob', 'staging-demo-user',
       '0xDEAD000000000000000000000000000000000003',
       '0xDEAD000000000000000000000000000000000001',
       '2000000000000000000', '0xstaging-tip-2'],
    ];
    for (const [from, to, fromAddr, toAddr, amount, tx] of tipSeeds) {
      await pool.query(
        `INSERT INTO token_tips
           (from_user_id, to_user_id, from_addr, to_addr, amount_wei, tx_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
         ON CONFLICT DO NOTHING`,
        [from, to, fromAddr, toAddr, amount, tx]
      );
    }

    // Seed posts from demo users with varied games
    const posts = [
      ['staging-demo-user', 'sudoku', 980, 17, 132, 'Finally beat my PB! 🎉'],
      ['staging-alice', 'wordhunt', 1050, 28, 95, 'Had so much fun with this one'],
      ['staging-bob', 'mancala', 750, null, 180, 'Mancala champion right here'],
      ['staging-demo-user', 'wordhunt', 920, 31, 108, ''],
      ['staging-charlie', 'sudoku', 620, 22, 156, 'Still learning but enjoying it'],
      ['staging-alice', 'cryptowordle', 890, 4, 85, 'Got the daily crypto word!'],
      ['staging-bob', 'sudoku', 1100, 19, 145, 'Personal record on sudoku today'],
      // Classic-game posts so the feed exercises the classic-result share shape
      // (game name/icon resolution, "pts" rendering) introduced by Share to Feed.
      ['staging-demo-user', 'snake', 320, 0, 95, 'New Snake high score! 🐍'],
      ['staging-alice', '2048', 2048, 412, 600, 'Finally hit 2048'],
      ['staging-bob', 'minesweeper', 540, 41, 70, 'Cashed out before the last mine 💣'],
      ['staging-charlie', 'blockblast', 880, 0, 210, 'Block Blast streak going strong'],
    ];

    for (const [userId, gameId, score, steps, timeSecs, caption] of posts) {
      await pool.query(
        `INSERT INTO posts (user_id, game_id, score, steps, time_secs, caption, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() - interval '${Math.floor(Math.random() * 48)}' hours)
         ON CONFLICT DO NOTHING`,
        [userId, gameId, score, steps, timeSecs, caption || null]
      );
    }

    // Seed comments on a few posts (fetch post IDs for linking)
    const postsForComments = await pool.query(
      `SELECT id FROM posts WHERE user_id IN ('staging-demo-user', 'staging-alice', 'staging-bob')
       LIMIT 3`
    );

    if (postsForComments.rows.length > 0) {
      const comments = [
        [postsForComments.rows[0].id, 'staging-alice', 'Nice score! 👍'],
        [postsForComments.rows[0].id, 'staging-bob', 'How did you solve that so fast?'],
        [postsForComments.rows[0].id, 'staging-charlie', 'Amazing!'],
      ];
      if (postsForComments.rows.length > 1) {
        comments.push([postsForComments.rows[1].id, 'staging-demo-user', 'Congrats Alice!']);
        comments.push([postsForComments.rows[1].id, 'staging-charlie', 'Great work']);
      }
      if (postsForComments.rows.length > 2) {
        comments.push([postsForComments.rows[2].id, 'staging-alice', 'Awesome!']);
      }

      for (const [postId, userId, text] of comments) {
        await pool.query(
          `INSERT INTO post_comments (post_id, user_id, text, created_at)
           VALUES ($1, $2, $3, now() - interval '${Math.floor(Math.random() * 24)}' hours)
           ON CONFLICT DO NOTHING`,
          [postId, userId, text]
        );
      }
    }

    // Seed collab sessions: one finished, one active
    const finishedPits = JSON.stringify([0,0,0,0,0,0,32,0,0,0,0,0,0,16]);
    const activePits = JSON.stringify([0,0,0,0,0,1,28,2,2,2,2,2,2,5]);

    await pool.query(
      `INSERT INTO collab_sessions
         (id, game_id, initiator_id, invitee_id, initiator_name, invitee_name,
          status, state, seed, initiator_score, invitee_score, started_at, finished_at, created_at, last_activity)
       VALUES ($1, 'mancala', 'staging-demo-user', 'staging-alice', 'staging-demo-user', 'staging-alice',
               'finished', $2, 42317893, 750, 620,
               now() - interval '2 hours', now() - interval '1 hour 50 minutes',
               now() - interval '2 hours', now() - interval '1 hour 50 minutes')
       ON CONFLICT (id) DO NOTHING`,
      ['COLL1', finishedPits]
    );

    await pool.query(
      `INSERT INTO collab_sessions
         (id, game_id, initiator_id, invitee_id, initiator_name, invitee_name,
          status, state, seed, created_at, last_activity)
       VALUES ($1, 'mancala', 'staging-bob', 'staging-charlie', 'staging-bob', 'staging-charlie',
               'waiting', $2, 12345678, now() - interval '15 minutes', now() - interval '5 minutes')
       ON CONFLICT (id) DO NOTHING`,
      ['COLL2', activePits]
    );
  }

  // Staging seeds for mancala_rooms so testers can exercise all states
  // without needing a second device. Strictly a no-op in production.
  if (IS_STAGING) {
    const initPits = JSON.stringify([4,4,4,4,4,4,0,4,4,4,4,4,4,0]);
    const finishedPits = JSON.stringify([0,0,0,0,0,0,32,0,0,0,0,0,0,16]);
    const midPits = JSON.stringify([0,0,0,0,0,1,28,2,2,2,2,2,2,5]);

    await pool.query(
      `INSERT INTO mancala_rooms (id, player1_id, player1_name, pits, status)
       VALUES ('STAGE1', 'staging-demo-user', 'staging-p1', $1, 'waiting')
       ON CONFLICT (id) DO NOTHING`,
      [initPits]
    );
    await pool.query(
      `INSERT INTO mancala_rooms
         (id, player1_id, player1_name, player2_id, player2_name, pits, status, winner, current_player)
       VALUES ('STAGE2', 'staging-demo-user', 'staging-p1', 'staging-opponent', 'staging-p2',
               $1, 'finished', '1', 1)
       ON CONFLICT (id) DO NOTHING`,
      [finishedPits]
    );
    await pool.query(
      `INSERT INTO mancala_rooms
         (id, player1_id, player1_name, player2_id, player2_name, pits, status, current_player)
       VALUES ('STAGE3', 'staging-demo-user', 'staging-p1', 'staging-opponent', 'staging-p2',
               $1, 'active', 1)
       ON CONFLICT (id) DO NOTHING`,
      [midPits]
    );

    // Game Menu staging seeds (this change). Both are no-ops in production.
    // 1) A saved Versus-Bot Mancala game so the "Resume Saved" prompt is
    //    demonstrable without playing an AI game to completion.
    await pool.query(
      `INSERT INTO user_game_state (user_id, username, game_id, state)
       VALUES ('staging-demo-user', 'staging-demo-user', 'mancala', $1::jsonb)
       ON CONFLICT (user_id, game_id) DO NOTHING`,
      [JSON.stringify({
        mode: 'bot', difficulty: 'medium',
        pits: [3, 4, 2, 5, 1, 4, 6, 3, 4, 3, 5, 2, 4, 5],
        currentPlayer: 1, moves: 8, secs: 64,
      })]
    );
    // Set the on-chain anchor demo so the ⛓ On-chain badge is visible.
    await pool.query(
      `UPDATE user_game_state SET anchor_tx_hash = '0xstaginganchor'
       WHERE user_id = 'staging-demo-user' AND game_id = 'mancala'`
    );
    // 2) A waiting Chutes & Ladders online room so a tester can demo "Join Room"
    //    with code CLTST.
    await pool.query(
      `INSERT INTO classic_rooms (id, game_id, player1_id, player1_name, state, status)
       VALUES ('CLTST', 'chutes-ladders', 'staging-demo-user', 'staging-p1', $1::jsonb, 'waiting')
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify({ p1Pos: 0, p2Pos: 0, currentPlayer: 1, die: null, rolls: 0 })]
    );

    // Snake leaderboard seed — newly created table is empty in staging, so the
    // leaderboard tab would have nothing to show. Obviously-fake users with a
    // spread of scores so the ranking is visibly sorted. Idempotent; no-op in
    // production.
    const snakeSeed = [
      ['snake-demo-1', 'staging-snake-pro',    480, 51, 142],
      ['snake-demo-2', 'staging-snake-ace',    360, 39, 118],
      ['snake-demo-3', 'staging-snake-rookie', 210, 24, 77],
      ['snake-demo-4', 'staging-snake-fan',    150, 18, 55],
      ['snake-demo-5', 'staging-snake-newbie', 90,  12, 33],
    ];
    for (const [uid, uname, best, len, secs] of snakeSeed) {
      await pool.query(
        `INSERT INTO snake_scores
           (user_id, username, best_score, best_length, best_time_secs, games_played)
         VALUES ($1, $2, $3, $4, $5, 3)
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, uname, best, len, secs]
      );
    }

    // Bounce (Breakout) leaderboard seed — same rationale as Snake: a freshly
    // created table is empty in staging, so the leaderboard tab would have
    // nothing to show. Obviously-fake users with a descending spread.
    // Idempotent; no-op in production.
    const bounceSeed = [
      ['bounce-demo-1', 'staging-bounce-pro',    2400, 6, 188],
      ['bounce-demo-2', 'staging-bounce-ace',    1500, 4, 140],
      ['bounce-demo-3', 'staging-bounce-rookie', 900,  3, 96],
      ['bounce-demo-4', 'staging-bounce-fan',    450,  2, 64],
      ['bounce-demo-5', 'staging-bounce-newbie', 180,  1, 38],
    ];
    for (const [uid, uname, best, lvl, secs] of bounceSeed) {
      await pool.query(
        `INSERT INTO breakout_scores
           (user_id, username, best_score, best_level, best_time_secs, games_played)
         VALUES ($1, $2, $3, $4, $5, 3)
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, uname, best, lvl, secs]
      );
    }

    // Zuma leaderboard seed — newly created table is empty in staging, so the
    // leaderboard tab would have nothing to show. Obviously-fake users with a
    // spread of scores. Idempotent; no-op in production.
    const zumaSeed = [
      ['zuma-demo-1', 'staging-zuma-master',  4200, 3, 210],
      ['zuma-demo-2', 'staging-zuma-ace',     2900, 3, 275],
      ['zuma-demo-3', 'staging-zuma-rookie',  1600, 2, 188],
      ['zuma-demo-4', 'staging-zuma-fan',      750, 2, 130],
      ['zuma-demo-5', 'staging-zuma-newbie',   280, 1,  60],
    ];
    for (const [uid, uname, best, lvl, secs] of zumaSeed) {
      await pool.query(
        `INSERT INTO zuma_scores
           (user_id, username, best_score, best_level, best_time_secs, games_played)
         VALUES ($1, $2, $3, $4, $5, 3)
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, uname, best, lvl, secs]
      );
    }
  }

  // Tilematch Puzzle staging seeds: populate leaderboard, wallet, tasks, duels,
  // and daily attempts for the daily leaderboard tab. All idempotent; no-op in prod.
  if (IS_STAGING) {
    // Global leaderboard — 5 fake users with spread of highest levels
    const tmScoreSeed = [
      ['tm-demo-1', 'staging-tm-legend',  480, 510, 12400],
      ['tm-demo-2', 'staging-tm-expert',  310, 325,  8200],
      ['tm-demo-3', 'staging-tm-veteran', 195, 205,  5100],
      ['tm-demo-4', 'staging-tm-player',   88,  92,  2300],
      ['tm-demo-5', 'staging-tm-newbie',   25,  27,   650],
    ];
    for (const [uid, uname, hl, tc, bs] of tmScoreSeed) {
      await pool.query(
        `INSERT INTO tilematch_scores
           (user_id, username, highest_level, total_cleared, best_session_score, games_played)
         VALUES ($1, $2, $3, $4, $5, 10)
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, uname, hl, tc, bs]
      );
    }

    // Wallet: give staging-demo-user 500 MATCH tokens
    await pool.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ('staging-demo-user', 'staging-demo-user', 500)
       ON CONFLICT (user_id) DO NOTHING`
    );

    // Daily tasks for staging-demo-user: one completable, one in-progress, one not started
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO tilematch_daily_tasks (user_id, task_date, task_id, progress)
       VALUES ('staging-demo-user', $1, 'clear_3_levels', 3),
              ('staging-demo-user', $1, 'daily_match_2min', 0),
              ('staging-demo-user', $1, 'match_50_tiles', 30)
       ON CONFLICT (user_id, task_date, task_id) DO NOTHING`,
      [today]
    );

    // Duels: one waiting, one finished
    await pool.query(
      `INSERT INTO tilematch_duels
         (id, player1_id, player1_name, stake_tokens, status)
       VALUES ('TMWAIT1', 'staging-demo-user', 'staging-demo-user', 10, 'waiting')
       ON CONFLICT (id) DO NOTHING`
    );
    await pool.query(
      `INSERT INTO tilematch_duels
         (id, player1_id, player2_id, player1_name, player2_name,
          stake_tokens, board_seed, status, winner_id,
          p1_score, p2_score, p1_steps, p2_steps, p1_time_secs, p2_time_secs,
          p1_finished_at, p2_finished_at)
       VALUES ('TMFINI1', 'staging-demo-user', 'staging-opponent',
               'staging-demo-user', 'staging-opponent',
               10, 54321, 'finished', 'staging-demo-user',
               850, 720, 72, 80, 67, 95,
               now() - interval '5 minutes', now() - interval '3 minutes')
       ON CONFLICT (id) DO NOTHING`
    );

    // Daily attempts for daily leaderboard tab
    const dailySeeds = [
      ['staging-alice',   'staging-alice',   85,  960],
      ['staging-bob',     'staging-bob',    112,  840],
      ['staging-charlie', 'staging-charlie', 137, 720],
    ];
    for (const [uid, uname, timeSecs, score] of dailySeeds) {
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
         VALUES ($1, $2, 'tilematchingdaily', $3, $4, 72, $5, now() - interval '1 hour')
         ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
        [uid, uname, today, score, timeSecs]
      );
    }

    // ---- DApp Mode staging seeds -------------------------------------------
    // One VERIFIED + (mock-)ANCHORED tilematchingdaily session for the viewer,
    // with a real recomputed hash-chain ledger, so the Verified badge, the
    // session receipt, and the anchor link are demonstrable on a fresh DB.
    const okSession = {
      id: 'DAPPDEMOOK', game_id: 'tilematchingdaily', seed: 12345,
      usernode_pubkey: 'ut1stagingdemo',
    };
    // A short valid run of legal triples (mirrors what the client would send).
    const okEngine = dapp.getEngine(okSession.game_id);
    const okInit = okEngine.initialState(okSession.seed);
    const okTypes = Array.from(okInit.validTypes).slice(0, 3);
    const okMoves = [];
    let okTs = Date.now() - 120000;
    for (const ty of okTypes) for (let k = 0; k < 3; k++) { okMoves.push({ tileType: ty, tsClient: new Date(okTs).toISOString() }); okTs += 900; }
    const okLedger = dapp.buildLedger(okSession, okMoves);
    await pool.query(
      `INSERT INTO game_sessions
         (id, user_id, username, usernode_pubkey, game_id, seed, status,
          final_score, final_steps, final_time_secs, final_chain_hash,
          anchor_status, anchor_tx_hash, finished_at)
       VALUES ($1, 'staging-demo-user', 'staging-demo-user', $2, $3, $4, 'verified',
               150, $5, 95, $6, 'mock', '0xSTAGINGDEMOANCHOR0000000000000000000000000000000000000000000000', now())
       ON CONFLICT (id) DO NOTHING`,
      [okSession.id, okSession.usernode_pubkey, okSession.game_id, okSession.seed,
       okLedger.entries.length, okLedger.finalChainHash]
    );
    for (const e of okLedger.entries) {
      await pool.query(
        `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, sequence) DO NOTHING`,
        [okSession.id, e.sequence, JSON.stringify(e.move), e.stateHash, e.prevHash, e.chainHash, e.tsClient]
      );
    }

    // One DISPUTED session (anti-cheat rejection) so the "couldn't be verified"
    // state and the audit trail are demonstrable.
    await pool.query(
      `INSERT INTO game_sessions
         (id, user_id, username, usernode_pubkey, game_id, seed, status, dispute_reason,
          final_steps, finished_at)
       VALUES ('DAPPDEMOBAD', 'staging-demo-user', 'staging-demo-user', 'ut1stagingdemo',
               'tilematchingdaily', 99999, 'disputed', 'anti_cheat:invalid_tile_types:4', 30, now())
       ON CONFLICT (id) DO NOTHING`
    );

    // One VERIFIED + truly ANCHORED 6×6 Mini Sudoku session, so the daily
    // on-chain receipt for the headline puzzle is demonstrable (anchor_status
    // 'anchored', not the 'mock' the others use). Reached via ?demo=anchor,
    // which deep-links the client to this session's receipt by its fixed id.
    await pool.query(
      `INSERT INTO game_sessions
         (id, user_id, username, usernode_pubkey, game_id, seed, status,
          final_score, final_steps, final_time_secs, final_chain_hash,
          anchor_status, anchor_tx_hash, finished_at)
       VALUES ('DAPPDEMOSUDOKU', 'staging-demo-user', 'staging-demo-user', 'ut1stagingdemo',
               'sudoku', 20240, 'verified', 940, 22, 118,
               '0xSUDOKUDEMOCHAINHASH00000000000000000000000000000000000000000000',
               'anchored',
               '0xSUDOKUDEMOANCHORTX000000000000000000000000000000000000000000000', now())
       ON CONFLICT (id) DO NOTHING`
    );
    await pool.query(
      `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
       VALUES ('DAPPDEMOSUDOKU', 1, $1, $2, $3, $4, now())
       ON CONFLICT (session_id, sequence) DO NOTHING`,
      [
        JSON.stringify({ snapshot: true, score: 940 }),
        '0xSUDOKUDEMOSTATEHASH00000000000000000000000000000000000000000000',
        '0xSUDOKUDEMOGENESIS0000000000000000000000000000000000000000000000',
        '0xSUDOKUDEMOCHAINHASH00000000000000000000000000000000000000000000',
      ]
    );

    // A handful of VERIFIED leaderboard sessions — one Tier A game
    // (tilematchingdaily) and one Tier B game (zuma) — so the Verified filter
    // and ranking are visible. "Staging demo …" labelled, obviously fake.
    const demoBoard = [
      ['DAPPLBADA',  'Staging demo Ada',  'tilematchingdaily', 11, 980, 62],
      ['DAPPLBBORG', 'Staging demo Borg', 'tilematchingdaily', 12, 910, 70],
      ['DAPPLBCY',   'Staging demo Cy',   'zuma',              13, 4200, 140],
      ['DAPPLBDOT',  'Staging demo Dot',  'zuma',              14, 3800, 165],
    ];
    for (const [sid, uname, gameId, seed, score, secs] of demoBoard) {
      await pool.query(
        `INSERT INTO game_sessions
           (id, user_id, username, usernode_pubkey, game_id, seed, status,
            final_score, final_steps, final_time_secs, final_chain_hash,
            anchor_status, finished_at)
         VALUES ($1, $1, $2, 'ut1' || $1, $3, $4, 'verified', $5, 60, $6,
                 'beef' || $1, 'mock', now())
         ON CONFLICT (id) DO NOTHING`,
        [sid, uname, gameId, seed, score, secs]
      );
    }

    // One PROVEN wallet for the viewer so the "Verified identity" badge renders.
    await pool.query(
      `INSERT INTO wallet_ownership_proofs (user_id, usernode_pubkey, wallet_addr, nonce, signature)
       VALUES ('staging-demo-user', 'ut1stagingdemo',
               '0xDEAD000000000000000000000000000000009999',
               'staging-demo-nonce', '0xstagingdemosignature')
       ON CONFLICT (user_id) DO NOTHING`
    );

    // ---- Account screen staging seeds ---------------------------------------
    // Generic per-user game-state store: one demo row for the viewer so
    // GET /api/state/:gameId returns a non-empty payload during testing.
    await pool.query(
      `INSERT INTO user_game_state (user_id, username, game_id, state)
       VALUES ('staging-demo-user', 'staging-demo-user', 'minesweeper', $1::jsonb)
       ON CONFLICT (user_id, game_id) DO NOTHING`,
      [JSON.stringify({ demo: true, level: 3, board: 'expert', note: 'Staging demo saved state' })]
    );
    // "Linked but NOT verified" demo identity: staging-alice already has a
    // user_wallets row (seeded above) and deliberately NO wallet_ownership_proofs
    // row, so her Account screen shows "Linked", not "Verified ✓". Ensure the
    // link exists even if the earlier social block ordering changes.
    await pool.query(
      `INSERT INTO user_wallets (user_id, wallet_addr) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      ['staging-alice', '0xDEAD000000000000000000000000000000000002']
    );
  }

  // Mancala ZK leaderboard staging seeds: 3 session rows (one per status) and
  // 15 score rows (5 per difficulty) so the leaderboard tabs render with data.
  // Idempotent; no-op in production.
  if (IS_STAGING) {
    // Sessions — exercise pending / verified / rejected states in the UI
    await pool.query(`
      INSERT INTO mancala_sessions
        (id, user_id, commitment, difficulty, status, created_at, verified_at)
      VALUES
        ('MNCSESS1', 'staging-demo-user',
         'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
         'hard', 'verified',
         now() - interval '30 minutes', now() - interval '29 minutes'),
        ('MNCSESS2', 'staging-demo-user',
         'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
         'medium', 'rejected',
         now() - interval '1 hour', null),
        ('MNCSESS3', 'staging-mnc-seeder',
         'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
         'easy', 'pending',
         now() - interval '5 minutes', null)
      ON CONFLICT (id) DO NOTHING
    `);

    // Hard-mode leaderboard seed
    const mncHard = [
      ['mnc-h1', 'staging-mnc-hard-ace', 'hard', 680, 20, 24, 62],
      ['mnc-h2', 'staging-mnc-hard-pro', 'hard', 520, 14, 28, 75],
      ['mnc-h3', 'staging-mnc-hard-mid', 'hard', 410, 10, 32, 88],
      ['mnc-h4', 'staging-mnc-hard-fan', 'hard', 280,  6, 36, 105],
      ['mnc-h5', 'staging-mnc-hard-new', 'hard', 170,  3, 41, 115],
    ];
    // Medium-mode leaderboard seed
    const mncMed = [
      ['mnc-m1', 'staging-mnc-med-ace',  'medium', 750, 22, 22, 58],
      ['mnc-m2', 'staging-mnc-med-pro',  'medium', 580, 16, 26, 70],
      ['mnc-m3', 'staging-mnc-med-mid',  'medium', 430, 11, 30, 85],
      ['mnc-m4', 'staging-mnc-med-fan',  'medium', 310,  7, 34, 98],
      ['mnc-m5', 'staging-mnc-med-new',  'medium', 200,  4, 39, 110],
    ];
    // Easy-mode leaderboard seed (wider margins since AI plays randomly)
    const mncEasy = [
      ['mnc-e1', 'staging-mnc-easy-ace', 'easy', 900, 26, 20, 52],
      ['mnc-e2', 'staging-mnc-easy-pro', 'easy', 710, 19, 23, 65],
      ['mnc-e3', 'staging-mnc-easy-mid', 'easy', 510, 13, 28, 79],
      ['mnc-e4', 'staging-mnc-easy-fan', 'easy', 370,  9, 33, 92],
      ['mnc-e5', 'staging-mnc-easy-new', 'easy', 200,  4, 38, 108],
    ];
    for (const [uid, uname, diff, score, margin, moves, secs] of [...mncHard, ...mncMed, ...mncEasy]) {
      await pool.query(
        `INSERT INTO mancala_scores
           (user_id, username, difficulty, best_score, best_margin, best_moves, best_time_secs, games_played, wins)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 5, 3)
         ON CONFLICT (user_id, difficulty) DO NOTHING`,
        [uid, uname, diff, score, margin, moves, secs]
      );
    }

    // Mancala Daily Challenge seeds — populate the Today + All-Time leaderboards
    // on a fresh staging DB. Six obviously-fake solvers; "Staging demo Ada" is
    // the record-holder on TODAY and on each of the previous 5 days (so the
    // All-Time tab shows a 6-day "days held record" and a real streak). The
    // viewer's own row is left UNSET so a tester can take the attempt and try to
    // beat today's record. Idempotent; strict no-op in production.
    const mncDailyUsers = [
      ['staging-mnc-ada',  'Staging demo Ada',  320],
      ['staging-mnc-borg', 'Staging demo Borg', 265],
      ['staging-mnc-cyd',  'Staging demo Cyd',  210],
      ['staging-mnc-dot',  'Staging demo Dot',  170],
      ['staging-mnc-eve',  'Staging demo Eve',  120],
      ['staging-mnc-fin',  'Staging demo Fin',   80],
    ];
    const mncToday = new Date().toISOString().slice(0, 10);
    for (let back = 0; back <= 5; back++) {
      const d = new Date(mncToday + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - back);
      const dateStr = d.toISOString().slice(0, 10);
      for (let i = 0; i < mncDailyUsers.length; i++) {
        const [uid, uname, baseScore] = mncDailyUsers[i];
        // Ada stays top every day; others drift a little per day so ranks vary.
        const score = i === 0 ? baseScore : Math.max(40, baseScore - back * 5 - i * 3);
        const secs = 50 + i * 12 + back * 2;
        const margin = Math.max(1, Math.round(score / 15));
        await pool.query(
          `INSERT INTO mancala_daily
             (user_id, username, puzzle_date, score, margin, moves, time_secs, won, finished_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, now() - ($8 || ' days')::interval)
           ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
          [uid, uname, dateStr, score, margin, 28 + i, secs, String(back)]
        );
      }
    }
  }
}

// ---- Server-side PvP tile engine (mirrors client mulberry32 + tmGenerateLevel) ------
// Used for anti-cheat board reconstruction in POST /api/pvp/match/:id/finish.

function pvpMulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pvpGenerateLevel(cfg, seed) {
  const rng = pvpMulberry32(seed);
  const { tileTypes, setsPerType, boardCols, boardRows, maxLayer } = cfg;
  const typeList = [];
  for (let t = 0; t < tileTypes; t++) {
    for (let s = 0; s < setsPerType; s++) {
      typeList.push(t, t, t);
    }
  }
  for (let i = typeList.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [typeList[i], typeList[j]] = [typeList[j], typeList[i]];
  }
  const tiles = [];
  let idx = 0, tileId = 0;
  for (let layer = 0; layer <= maxLayer && idx < typeList.length; layer++) {
    const offset = layer * 0.5;
    const cols = boardCols - layer;
    const rows = boardRows - layer;
    if (cols <= 0 || rows <= 0) break;
    for (let r = 0; r < rows && idx < typeList.length; r++) {
      for (let c = 0; c < cols && idx < typeList.length; c++) {
        tiles.push({ id: tileId++, type: typeList[idx++], removed: false });
      }
    }
  }
  return tiles;
}

const TM_PVP_CONFIG = { tileTypes: 8, setsPerType: 3, boardCols: 8, boardRows: 5, maxLayer: 3 };

// Valid bet tiers (UTGO whole amounts)
const PVP_VALID_TIERS = new Set([10, 50, 100]);

// Valid stake tiers for off-chain MATCH token duels
const TILEMATCH_DUEL_VALID_STAKES = new Set([10, 50, 100]);

// Task definitions — used by GET /api/tilematch/tasks and claim validation
const TILEMATCH_TASK_DEFS = {
  clear_3_levels:   { label: 'Clear 3 levels',          description: 'Clear 3 levels in Tile Match Puzzle today.',                  rewardTokens: 100, target: 3  },
  daily_match_2min: { label: 'Daily in 2 minutes',       description: 'Complete the Daily Tile Match Puzzle in under 2 minutes.',    rewardTokens: 200, target: 1  },
  match_50_tiles:   { label: '50 tile taps',             description: 'Make 50 tile selections in Tile Match Puzzle in one session.', rewardTokens: 150, target: 50 },
};

// ---- Mancala room helpers ------------------------------------------------

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomId() {
  let id = '';
  for (let i = 0; i < 6; i++) id += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  return id;
}

function srvMncOpposite(i) { return 12 - i; }

// Server-side reimplementation of mncDistribute (mirrors client logic).
function srvMncDistribute(pits, pitIdx, player) {
  const p = pits.slice();
  const stones = p[pitIdx];
  p[pitIdx] = 0;
  const skipStore = player === 1 ? 13 : 6;
  const ownStore  = player === 1 ? 6  : 13;
  const ownMin    = player === 1 ? 0  : 7;
  const ownMax    = player === 1 ? 5  : 12;
  let cur = pitIdx;
  for (let i = 0; i < stones; i++) {
    do { cur = (cur + 1) % 14; } while (cur === skipStore);
    p[cur]++;
  }
  const lastIdx = cur;
  const extraTurn = lastIdx === ownStore;
  if (!extraTurn && lastIdx >= ownMin && lastIdx <= ownMax && p[lastIdx] === 1) {
    const opp = srvMncOpposite(lastIdx);
    if (p[opp] > 0) {
      p[ownStore] += p[opp] + 1;
      p[lastIdx]  = 0;
      p[opp]      = 0;
    }
  }
  return { pits: p, extraTurn };
}

// Apply distribute and sweep; returns final pits + game outcome.
function srvMncApplyMove(pits, pitIdx, player) {
  const { pits: p, extraTurn } = srvMncDistribute(pits, pitIdx, player);
  const p1Empty = p.slice(0, 6).every(v => v === 0);
  const p2Empty = p.slice(7, 13).every(v => v === 0);
  if (p1Empty || p2Empty) {
    for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    const winner = p[6] > p[13] ? '1' : p[13] > p[6] ? '2' : 'draw';
    return { pits: p, extraTurn: false, gameOver: true, winner, nextPlayer: null };
  }
  return { pits: p, extraTurn, gameOver: false, winner: null, nextPlayer: extraTurn ? player : (player === 1 ? 2 : 1) };
}

/* ============================================================
   Mancala Daily Challenge — deterministic board + AI engine
   These MUST stay byte-identical to the client helpers in app.jsx
   (mulberry32 / hashStr / mncDailyBoard / mncMinimax / mncAIMove) or
   verification fails. Pure integer math, no randomness.
   ============================================================ */
function mncMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mncHashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// UTC day-number for a YYYY-MM-DD string (matches client utcDayNum semantics).
function mncDayNumFromDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}
function mncTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}
// Deal 24 stones into one side of 6 pits using the day's seeded RNG, then place
// them rotationally-symmetrically (pit i ↔ opposite 12-i) so both players start
// from an identical, perfectly fair position. Stores (6, 13) stay empty.
function srvMncDailyBoard(dayNum) {
  const rng = mncMulberry32((dayNum + mncHashStr('mancaladaily')) >>> 0);
  const side = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < 24; s++) side[Math.floor(rng() * 6)]++;
  const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    board[i] = side[i];          // P1 pits 0..5
    board[12 - i] = side[i];     // P2 pits 12..7 (rotational mirror)
  }
  return board;
}

function srvMncGetValidMoves(pits, player) {
  const min = player === 1 ? 0 : 7;
  const max = player === 1 ? 5 : 12;
  const moves = [];
  for (let i = min; i <= max; i++) if (pits[i] > 0) moves.push(i);
  return moves;
}
function srvMncEval(pits) { return pits[6] - pits[13]; }
function srvMncMinimax(pits, player, depth, alpha, beta) {
  const p1Empty = pits.slice(0, 6).every(v => v === 0);
  const p2Empty = pits.slice(7, 13).every(v => v === 0);
  if (p1Empty || p2Empty) {
    const p = pits.slice();
    for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    return srvMncEval(p);
  }
  if (depth === 0) return srvMncEval(pits);
  const moves = srvMncGetValidMoves(pits, player);
  if (moves.length === 0) return srvMncEval(pits);
  if (player === 1) {
    let best = -Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = srvMncDistribute(pits, idx, 1);
      const score = srvMncMinimax(np, extraTurn ? 1 : 2, depth - 1, alpha, beta);
      if (score > best) best = score;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = srvMncDistribute(pits, idx, 2);
      const score = srvMncMinimax(np, extraTurn ? 2 : 1, depth - 1, alpha, beta);
      if (score < best) best = score;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}
// Hard-difficulty AI move for P2 (deterministic; first-best-wins tie-break,
// matching the client). The Daily Challenge always uses 'hard'.
function srvMncAIMove(pits) {
  const moves = srvMncGetValidMoves(pits, 2);
  if (moves.length === 0) return -1;
  let bestIdx = moves[0], bestScore = Infinity;
  for (const idx of moves) {
    const { pits: np, extraTurn } = srvMncDistribute(pits, idx, 2);
    const s = srvMncMinimax(np, extraTurn ? 2 : 1, 6, -Infinity, Infinity);
    if (s < bestScore) { bestScore = s; bestIdx = idx; }
  }
  return bestIdx;
}

function shapeRoom(r) {
  return {
    roomId:        r.id,
    status:        r.status,
    pits:          r.pits,
    currentPlayer: r.current_player,
    winner:        r.winner,
    player1Id:     r.player1_id,
    player2Id:     r.player2_id,
    player1Name:   r.player1_name,
    player2Name:   r.player2_name,
    moveSeq:       r.move_seq,
    lastMoveAt:    r.last_move_at,
  };
}

// Next 00:00:00 UTC after the given instant.
function nextResetUtc(from = new Date()) {
  const d = new Date(Date.UTC(
    from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 0, 0, 0, 0
  ));
  return d.toISOString();
}

// The UTC day (YYYY-MM-DD) before a given ISO date string.
function prevUtcDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// N UTC days before a given ISO date string.
function prevUtcDayN(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Consecutive-day streak for a user: the length of the unbroken run of UTC
// days (each with >=1 finished attempt) ending today, or ending yesterday if
// today hasn't been played yet (a streak stays alive until a full day is
// missed). Strict reset: ANY missed UTC day resets the streak to 0 — the
// former streak_freeze grace is disabled (column kept dormant). Computed from
// the existing daily_attempts rows.
async function computeStreak(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT attempt_date::text AS d
       FROM daily_attempts
      WHERE user_id = $1 AND finished_at IS NOT NULL
      ORDER BY d DESC
      LIMIT 60`,
    [userId]
  );
  if (rows.length === 0) return 0;
  const days = new Set(rows.map(r => r.d));
  const today = new Date().toISOString().slice(0, 10); // UTC
  const yesterday = prevUtcDay(today);
  let cursor;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else {
    // Strict reset: any missed UTC day breaks the streak back to 0. The
    // streak_freezes grace that once bridged a single missed day is
    // intentionally disabled (the column is kept dormant for backward
    // compatibility and possible future re-enablement as "streak insurance").
    return 0; // last finished day is older than yesterday → streak broken
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevUtcDay(cursor);
  }
  return streak;
}

// Mancala Daily Challenge record-streak: consecutive UTC days (ending today, or
// yesterday if today isn't won yet) on which this user HELD THE RECORD — their
// best score for that day equals that day's global maximum (ties count). A day
// they were beaten, skipped, or didn't win breaks it. Read-derived, no cron.
async function computeMancalaRecordStreak(userId) {
  const { rows } = await pool.query(
    `WITH day_max AS (
       SELECT puzzle_date, MAX(score) AS m
         FROM mancala_daily
        WHERE score IS NOT NULL AND score > 0
        GROUP BY puzzle_date
     )
     SELECT md.puzzle_date::text AS d
       FROM mancala_daily md
       JOIN day_max dm ON dm.puzzle_date = md.puzzle_date
      WHERE md.user_id = $1
        AND md.score IS NOT NULL AND md.score > 0
        AND md.score = dm.m
      ORDER BY d DESC
      LIMIT 120`,
    [userId]
  );
  if (rows.length === 0) return 0;
  const days = new Set(rows.map(r => r.d));
  const today = mncTodayUtc();
  const yesterday = prevUtcDay(today);
  let cursor;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevUtcDay(cursor);
  }
  return streak;
}

// The set of streak-milestone day thresholds a user has ever reached, as a
// sorted ascending int array (e.g. [3, 7, 30]). Read from the permanent
// user_achievements rows so earned badges persist across a streak reset.
async function earnedStreakBadges(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT (metadata->>'streak')::int AS days
         FROM user_achievements
        WHERE user_id = $1 AND type = 'streak_milestone'
          AND metadata ? 'streak'
        ORDER BY days ASC`,
      [userId]
    );
    return rows.map(r => r.days).filter(d => Number.isFinite(d));
  } catch {
    return [];
  }
}

// Shape a DB row for the client.
function shapeAttempt(row) {
  return {
    gameId: row.game_id,
    score: row.score,
    steps: row.steps,
    timeSecs: row.time_secs,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    progress: row.progress || null,
    elapsedSecs: row.elapsed_secs != null ? row.elapsed_secs : null,
  };
}

app.use(express.json());

// ---- Social feature helpers -----------------------------------------------

// Lazy init: ensure a user row exists, creating if needed.
async function ensureUser(userId, username, usernode_pubkey) {
  await pool.query(
    `INSERT INTO users (id, username, usernode_pubkey)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [userId, username, usernode_pubkey]
  );
  // Also ensure stats row exists
  await pool.query(
    `INSERT INTO user_stats_snapshot (user_id, username)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, username]
  );
}

// Verify platform-issued JWT if one was passed, then enforce auth on
// anything not explicitly marked public. The iframe adds `?token=…`
// on load; the frontend script forwards the token via `x-usernode-token`
// on subsequent fetches.
const PUBLIC_API_PATHS = new Set(['/health']);
const PUBLIC_PREFIXES = ['/explorer-api/'];

app.use((req, res, next) => {
  const token = req.query.token || req.headers['x-usernode-token'];
  if (token && JWT_SECRET) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }

  // Static assets (CSS/JS/images) are always served; the API and the HTML
  // shell are gated so direct hits to the staging/prod subdomain don't
  // leak app data to the public internet.
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.has(req.path)) return next();
    if (PUBLIC_PREFIXES.some((p) => req.path.startsWith(p))) return next();
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
});

// Always 200 so the container stays routable even while migrations are still
// running or the DB is briefly unreachable; `migrationsReady` is surfaced for
// diagnostics (true once the boot migration has completed).
app.get('/health', (_req, res) => res.json({ status: 'ok', migrationsReady }));

// ---- Social API ----------------------------------------------------------

// GET /api/social/profile/:userId or /api/social/profile/:username
// Returns public profile data
app.get('/api/social/profile/:userIdOrName', async (req, res) => {
  try {
    const idOrName = req.params.userIdOrName;

    // Try to find by ID first, then by username
    let { rows: users } = await pool.query(
      `SELECT id FROM users WHERE id = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
      [idOrName, idOrName]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const viewedUserId = users[0].id;

    // Get user info and stats
    const { rows: userRows } = await pool.query(
      `SELECT u.id, u.username, u.created_at,
              s.total_score, s.current_streak, s.games_played,
              s.dailies_completed, s.classics_played, s.last_win_at
       FROM users u
       LEFT JOIN user_stats_snapshot s ON u.id = s.user_id
       WHERE u.id = $1`,
      [viewedUserId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Check if signed-in user follows this user
    let following = false;
    if (req.user) {
      const { rows: followRows } = await pool.query(
        `SELECT 1 FROM user_follows WHERE follower_id = $1 AND followee_id = $2`,
        [req.user.id, viewedUserId]
      );
      following = followRows.length > 0;
    }

    // Count followers and following
    const { rows: followerRows } = await pool.query(
      `SELECT COUNT(*) as count FROM user_follows WHERE followee_id = $1`,
      [viewedUserId]
    );
    const followerCount = parseInt(followerRows[0].count);

    const { rows: followingRows } = await pool.query(
      `SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1`,
      [viewedUserId]
    );
    const followingCount = parseInt(followingRows[0].count);

    // Wallet info: whether they have a linked address, plus tips received
    const { rows: walletRows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`,
      [viewedUserId]
    );
    const walletLinked = walletRows.length > 0;

    // Tips received now come from the unified MATCH ledger (integer MATCH).
    const { rows: tipRows } = await pool.query(
      `SELECT SUM(amount) as total_match,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'fromUserId', counterpart,
                  'amount', amount,
                  'createdAt', created_at
                ) ORDER BY created_at DESC
              ) as tips
         FROM (
           SELECT counterpart, amount, created_at
             FROM match_ledger_events
            WHERE user_id = $1 AND kind = 'tip_received'
            ORDER BY created_at DESC
            LIMIT 5
         ) sub`,
      [viewedUserId]
    );
    const tipsReceivedMatch = tipRows[0].total_match ? Number(tipRows[0].total_match) : 0;
    const recentTippers = tipRows[0].tips || [];

    // Live, authoritative streak (computed from finished daily_attempts) rather
    // than the stale user_stats_snapshot.current_streak column, plus the set of
    // permanent streak-milestone badges this player has earned.
    const liveStreak = await computeStreak(viewedUserId);
    const badges = await earnedStreakBadges(viewedUserId);
    const achievements = await earnedAchievementBadges(viewedUserId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
      badges,
      achievements,
      stats: {
        totalScore: user.total_score || 0,
        currentStreak: liveStreak,
        gamesPlayed: user.games_played || 0,
        dailiesCompleted: user.dailies_completed || 0,
        classicsPlayed: user.classics_played || 0,
        lastWinAt: user.last_win_at,
      },
      following,
      followerCount,
      followingCount,
      walletLinked,
      tipsReceivedMatch,
      recentTippers,
    });
  } catch (err) {
    console.error('[social] profile failed:', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// GET /api/social/friends
// Returns the signed-in user's friend list
app.get('/api/social/friends', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, s.total_score, s.current_streak, s.last_win_at
       FROM users u
       LEFT JOIN user_stats_snapshot s ON u.id = s.user_id
       WHERE u.id IN (
         SELECT followee_id FROM user_follows WHERE follower_id = $1
       )
       ORDER BY u.username ASC`,
      [req.user.id]
    );

    res.json({
      friends: rows.map(r => ({
        id: r.id,
        username: r.username,
        totalScore: r.total_score || 0,
        currentStreak: r.current_streak || 0,
        lastWinAt: r.last_win_at,
      })),
      count: rows.length,
    });
  } catch (err) {
    console.error('[social] friends failed:', err.message);
    res.status(500).json({ error: 'Failed to load friends' });
  }
});

// POST /api/social/follow/:userId
// Follow another user
app.post('/api/social/follow/:userId', async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(409).json({ error: 'Cannot follow yourself' });
  }

  try {
    await pool.query(
      `INSERT INTO user_follows (follower_id, followee_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`,
      [req.user.id, userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error('[social] follow failed:', err.message);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/social/unfollow/:userId
// Unfollow another user
app.delete('/api/social/unfollow/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    await pool.query(
      `DELETE FROM user_follows
       WHERE follower_id = $1 AND followee_id = $2`,
      [req.user.id, userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error('[social] unfollow failed:', err.message);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// ---- Posts API (sharing) -----------------------------------------------

// POST /api/posts — create a post from a win
app.post('/api/posts', async (req, res) => {
  const { gameId, score, steps, timeSecs, caption } = req.body;
  if (!gameId || !Number.isFinite(score)) {
    return res.status(400).json({ error: 'gameId and score are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, game_id, score, steps, time_secs, caption)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, game_id, score, steps, time_secs, caption, created_at`,
      [req.user.id, gameId, score, steps || null, timeSecs || null, caption || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[posts] create failed:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts/feed — fetch feed for signed-in user
app.get('/api/posts/feed', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    // Get user's posts + posts from followed users, ordered by created_at DESC
    const { rows: posts } = await pool.query(
      `SELECT p.id, p.user_id, u.username, p.game_id, p.score, p.steps, p.time_secs, p.caption, p.created_at,
              (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
          OR p.user_id IN (SELECT followee_id FROM user_follows WHERE follower_id = $1)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM posts p
       WHERE p.user_id = $1
          OR p.user_id IN (SELECT followee_id FROM user_follows WHERE follower_id = $1)`,
      [req.user.id]
    );

    res.json({
      posts: posts.map(p => ({
        id: p.id,
        userId: p.user_id,
        username: p.username,
        gameId: p.game_id,
        score: p.score,
        steps: p.steps,
        timeSecs: p.time_secs,
        caption: p.caption,
        createdAt: p.created_at,
        commentCount: parseInt(p.comment_count),
      })),
      total: parseInt(countRows[0].total),
    });
  } catch (err) {
    console.error('[posts] feed failed:', err.message);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

// GET /api/posts/:postId — fetch single post
app.get('/api/posts/:postId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.user_id, u.username, p.game_id, p.score, p.steps, p.time_secs, p.caption, p.created_at,
              (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [req.params.postId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const p = rows[0];
    res.json({
      id: p.id,
      userId: p.user_id,
      username: p.username,
      gameId: p.game_id,
      score: p.score,
      steps: p.steps,
      timeSecs: p.time_secs,
      caption: p.caption,
      createdAt: p.created_at,
      commentCount: parseInt(p.comment_count),
    });
  } catch (err) {
    console.error('[posts] get failed:', err.message);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

// ---- Post comments API ---------------------------------------------------

// GET /api/posts/:postId/comments — fetch comments on a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    // Verify post exists
    const { rows: postRows } = await pool.query(
      `SELECT id FROM posts WHERE id = $1`,
      [req.params.postId]
    );
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { rows: comments } = await pool.query(
      `SELECT c.id, c.post_id, c.user_id, u.username, c.text, c.created_at
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.postId, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM post_comments WHERE post_id = $1`,
      [req.params.postId]
    );

    res.json({
      comments: comments.map(c => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        username: c.username,
        text: c.text,
        createdAt: c.created_at,
      })),
      total: parseInt(countRows[0].total),
    });
  } catch (err) {
    console.error('[comments] get failed:', err.message);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// POST /api/posts/:postId/comments — add a comment
app.post('/api/posts/:postId/comments', async (req, res) => {
  const { text } = req.body;
  if (!text || text.length > 280) {
    return res.status(400).json({ error: 'text is required and must be <= 280 chars' });
  }
  try {
    // Verify post exists
    const { rows: postRows } = await pool.query(
      `SELECT id FROM posts WHERE id = $1`,
      [req.params.postId]
    );
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, text, created_at`,
      [req.params.postId, req.user.id, text]
    );
    const c = rows[0];
    res.json({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      text: c.text,
      createdAt: c.created_at,
    });
  } catch (err) {
    console.error('[comments] create failed:', err.message);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/posts/:postId/comments/:commentId — delete own comment
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM post_comments
       WHERE id = $1 AND post_id = $2 AND user_id = $3
       RETURNING id`,
      [req.params.commentId, req.params.postId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not owned by you' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[comments] delete failed:', err.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ---- Collaborative sessions API ----------------------------------------

// POST /api/collab/sessions — initiate a collaborative session
app.post('/api/collab/sessions', async (req, res) => {
  const { gameId, inviteeId } = req.body;
  if (!gameId || !inviteeId) {
    return res.status(400).json({ error: 'gameId and inviteeId are required' });
  }
  if (inviteeId === req.user.id) {
    return res.status(409).json({ error: 'Cannot invite yourself' });
  }
  try {
    // Generate room ID (6-char code)
    let roomId = '';
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 6; i++) {
      roomId += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }

    // Get invitee name
    const { rows: inviteeRows } = await pool.query(
      `SELECT username FROM users WHERE id = $1`,
      [inviteeId]
    );
    if (inviteeRows.length === 0) {
      return res.status(404).json({ error: 'Invitee not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO collab_sessions
         (id, game_id, initiator_id, invitee_id, initiator_name, invitee_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'waiting')
       RETURNING id, game_id, initiator_id, invitee_id, initiator_name, invitee_name, status, created_at`,
      [roomId, gameId, req.user.id, inviteeId, req.user.username, inviteeRows[0].username]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[collab] create failed:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/collab/sessions/:roomId — poll session state
app.get('/api/collab/sessions/:roomId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, game_id, initiator_id, invitee_id, initiator_name, invitee_name,
              status, state, seed, initiator_score, invitee_score, started_at, finished_at, created_at
       FROM collab_sessions WHERE id = $1`,
      [req.params.roomId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const s = rows[0];
    res.json({
      id: s.id,
      gameId: s.game_id,
      initiatorId: s.initiator_id,
      inviteeId: s.invitee_id,
      initiatorName: s.initiator_name,
      inviteeName: s.invitee_name,
      status: s.status,
      state: s.state,
      seed: s.seed,
      initiatorScore: s.initiator_score,
      inviteeScore: s.invitee_score,
      startedAt: s.started_at,
      finishedAt: s.finished_at,
      createdAt: s.created_at,
    });
  } catch (err) {
    console.error('[collab] get failed:', err.message);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// POST /api/collab/sessions/:roomId/move — apply a move (game-dependent)
app.post('/api/collab/sessions/:roomId/move', async (req, res) => {
  const { move, moveSeq } = req.body;
  if (typeof move !== 'object' || typeof moveSeq !== 'number') {
    return res.status(400).json({ error: 'move (object) and moveSeq (number) are required' });
  }
  try {
    const { rows: sessionRows } = await pool.query(
      `SELECT game_id, state FROM collab_sessions WHERE id = $1`,
      [req.params.roomId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // For now, stub with success. In future: game-specific move validation.
    // Update state (placeholder: just track moves)
    const session = sessionRows[0];
    const newState = session.state || { moves: [] };
    newState.moves = (newState.moves || []).concat([move]);

    await pool.query(
      `UPDATE collab_sessions SET state = $2, last_activity = now()
       WHERE id = $1`,
      [req.params.roomId, JSON.stringify(newState)]
    );

    const { rows } = await pool.query(
      `SELECT id, game_id, status, state FROM collab_sessions WHERE id = $1`,
      [req.params.roomId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[collab] move failed:', err.message);
    res.status(500).json({ error: 'Failed to apply move' });
  }
});

// POST /api/collab/sessions/:roomId/finish — finish the session and record score
app.post('/api/collab/sessions/:roomId/finish', async (req, res) => {
  const { initiatorScore, inviteeScore } = req.body;
  try {
    const { rows: sessionRows } = await pool.query(
      `SELECT game_id, initiator_id, status FROM collab_sessions WHERE id = $1`,
      [req.params.roomId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRows[0];
    // Only initiator records a daily attempt
    if (GAME_IDS.has(session.game_id)) {
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, score, finished_at)
         VALUES ($1, $2, $3, (now() AT TIME ZONE 'utc')::date, $4, now())
         ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
        [session.initiator_id, req.user.username || null, session.game_id, initiatorScore]
      );

      // Update stats if this is a win
      if (initiatorScore && initiatorScore > 0) {
        await pool.query(
          `UPDATE user_stats_snapshot
             SET total_score = total_score + $2, last_win_at = now(), updated_at = now()
           WHERE user_id = $1`,
          [session.initiator_id, initiatorScore]
        );
      }
    }

    // Mark session as finished
    const { rows } = await pool.query(
      `UPDATE collab_sessions
         SET status = 'finished', initiator_score = $2, invitee_score = $3, finished_at = now()
       WHERE id = $1
       RETURNING id, game_id, status, initiator_score, invitee_score`,
      [req.params.roomId, initiatorScore, inviteeScore]
    );

    // Recompute streak
    const streak = await computeStreak(session.initiator_id);

    res.json({
      ...rows[0],
      streak,
    });
  } catch (err) {
    console.error('[collab] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to finish session' });
  }
});

// ---- Daily attempts API --------------------------------------------------

// Current UTC-day state for the signed-in user: which games are locked
// today (with their results), plus server time + next reset so the client
// can drive a clock-skew-proof countdown.
app.get('/api/daily', async (req, res) => {
  try {
    // Lazy init: ensure user and stats rows exist
    await ensureUser(req.user.id, req.user.username, req.user.usernode_pubkey);
    // Staging-only demo seed: gives the current viewer a finished attempt
    // for today so they immediately see the locked screen + countdown.
    // Idempotent, obviously fake (round score), strict no-op in production.
    if (IS_STAGING && req.query.demo === 'locked') {
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
         VALUES ($1, $2, 'sudoku', (now() AT TIME ZONE 'utc')::date, 980, 17, 132, now())
         ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
      // Crypto Wordle finished-attempt seed so its locked card/screen is
      // demonstrable on a fresh staging DB. Obviously-fake round numbers.
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
         VALUES ($1, $2, 'cryptowordle', (now() AT TIME ZONE 'utc')::date, 820, 4, 95, now())
         ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
    }

    // Staging-only demo seed: gives the current viewer a 10-day consecutive
    // streak (finished sudoku attempts for the last 10 UTC days BEFORE today)
    // so the multiplier tier UI is demonstrable — nav badge, lobby next-tier
    // hint, and a 1.5x win card on today's still-unplayed games. Today is left
    // open on purpose so a tester can trigger a multiplied win. Idempotent,
    // obviously fake (round scores), strict no-op in production.
    if (IS_STAGING && req.query.demo === 'streak') {
      for (let i = 1; i <= 10; i++) {
        await pool.query(
          `INSERT INTO daily_attempts
             (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
           VALUES ($1, $2, 'sudoku', ((now() AT TIME ZONE 'utc')::date - $3::int), 900, 20, 120, now())
           ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
          [req.user.id, req.user.username || 'staging-demo-user', i]
        );
      }
    }

    // Staging-only demo seed: give the current viewer a LONG streak plus the
    // full earned-badge ladder so the streak-badge UI (nav chip, lobby badge
    // strip incl. "Centurion"/"Year-Long Legend", profile badges) is
    // demonstrable. Seeds 60 consecutive finished sudoku days before today
    // (the computeStreak read cap → an active Half-Century badge) and inserts
    // a permanent streak_milestone achievement for EVERY threshold so the
    // higher badges render even past the live-streak cap. Today left open so a
    // tester can still trigger a multiplied win. Idempotent, no-op in prod.
    if (IS_STAGING && req.query.demo === 'badges') {
      for (let i = 1; i <= 60; i++) {
        await pool.query(
          `INSERT INTO daily_attempts
             (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
           VALUES ($1, $2, 'sudoku', ((now() AT TIME ZONE 'utc')::date - $3::int), 900, 18, 110, now())
           ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
          [req.user.id, req.user.username || 'staging-demo-user', i]
        );
      }
      for (const days of STREAK_BADGE_DAYS) {
        await pool.query(
          `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
           SELECT $1, 'streak_milestone', NULL, NULL, $2::jsonb
            WHERE NOT EXISTS (
              SELECT 1 FROM user_achievements
               WHERE user_id = $1 AND type = 'streak_milestone'
                 AND (metadata->>'streak')::int = $3
            )`,
          [req.user.id, JSON.stringify({ streak: days }), days]
        );
      }
      // Also seed one of every non-streak achievement badge so the broadened
      // badge strip renders fully earned for the viewer. Idempotent per type
      // (and per milestone count). Obviously-fake metadata.
      const achSeed = [
        { type: 'first_solve',     meta: {} },
        { type: 'speed_demon',     meta: { timeSecs: 42 } },
        { type: 'flawless',        meta: { gameId: 'sudoku', steps: 16 } },
        { type: 'daily_sweep',     meta: {} },
        { type: 'podium',          meta: { gameId: 'sudoku' } },
        { type: 'solve_milestone', meta: { count: 10 } },
        { type: 'solve_milestone', meta: { count: 50 } },
        { type: 'solve_milestone', meta: { count: 100 } },
      ];
      for (const a of achSeed) {
        const guard = a.type === 'solve_milestone'
          ? `AND type = 'solve_milestone' AND (metadata->>'count')::int = $3`
          : `AND type = $2`;
        await pool.query(
          `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
           SELECT $1, $2, NULL, NULL, $4::jsonb
            WHERE NOT EXISTS (
              SELECT 1 FROM user_achievements WHERE user_id = $1 ${guard}
            )`,
          [req.user.id, a.type, a.type === 'solve_milestone' ? a.meta.count : null, JSON.stringify(a.meta)]
        );
      }
    }

    // Staging-only demo seed: populate today's per-game leaderboards with a
    // handful of obviously-fake solvers so the ranking (fastest time, then
    // fewest steps) is demonstrable on a fresh staging DB. Spread time/steps
    // so order and tiebreakers are visible. `games` controls HOW MANY of the
    // daily games each demo user solved today, so the lobby-wide "Today's
    // Champions" board shows a spread of total-points and games-solved counts
    // (not every user clearing every game). Idempotent, strict no-op in prod.
    if (IS_STAGING && req.query.demo === 'leaderboard') {
      const lbSeed = [
        { name: 'Staging demo Ada',  time: 47,  steps: 12, games: 4 }, // swept all → top of champions
        { name: 'Staging demo Borg', time: 63,  steps: 18, games: 3 },
        { name: 'Staging demo Cleo', time: 63,  steps: 21, games: 3 }, // ties Borg on time → steps break
        { name: 'Staging demo Dax',  time: 88,  steps: 9,  games: 2 },
        { name: 'Staging demo Evy',  time: 121, steps: 30, games: 2 },
        { name: 'Staging demo Finn', time: 210, steps: 44, games: 1 },
      ];
      const dailyGameList = Array.from(GAME_IDS);
      for (let gi = 0; gi < dailyGameList.length; gi++) {
        const g = dailyGameList[gi];
        for (let i = 0; i < lbSeed.length; i++) {
          const r = lbSeed[i];
          // Only seed this user on the first `games` daily games, so games_solved
          // varies across the champions board while per-game boards stay full.
          if (gi >= r.games) continue;
          await pool.query(
            `INSERT INTO daily_attempts
               (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
             VALUES ($1, $2, $3, (now() AT TIME ZONE 'utc')::date, $4, $5, $6, now())
             ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING`,
            [`staging-demo-lb-${i + 1}`, r.name, g, 1000 - r.time, r.steps, r.time]
          );
        }
      }
    }

    // Staging-only demo seed: give the current viewer a CLAIMED, UNFINISHED
    // WORD HUNT attempt for today (accumulated timer/steps, no finished_at) so
    // the "In progress · resume" card and the resume flow are demonstrable.
    //
    // Deliberately targets `wordhunt`, NOT `sudoku`: the `demo=locked` and
    // `demo=streak` seeds finish the viewer's sudoku (and cryptowordle) rows
    // for today, and proposal checks share one staging DB across tests run in
    // order. If this used sudoku too, a prior `demo=locked` visit would have
    // left a FINISHED sudoku row, and `ON CONFLICT DO NOTHING` here would be a
    // no-op — the card would render LOCKED and the "In progress" text would
    // never appear. wordhunt is untouched by the other viewer seeds, so it's
    // collision-free. The DO UPDATE additionally forces the row back to an
    // unfinished state, making this order-independent and re-run safe.
    // Idempotent; today only; strict no-op in prod.
    if (IS_STAGING && req.query.demo === 'resume') {
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, steps, elapsed_secs, progress)
         VALUES ($1, $2, 'wordhunt', (now() AT TIME ZONE 'utc')::date, $3, $4, $5::jsonb)
         ON CONFLICT (user_id, game_id, attempt_date) DO UPDATE
           SET finished_at = NULL,
               score = NULL,
               time_secs = NULL,
               steps = EXCLUDED.steps,
               elapsed_secs = EXCLUDED.elapsed_secs,
               progress = EXCLUDED.progress`,
        [
          req.user.id,
          req.user.username || 'staging-demo-user',
          7,
          84,
          // dayNum omitted on purpose so the client treats the board as the
          // current daily seed; this just marks a claimed, in-progress row.
          JSON.stringify({ resumeDemo: true }),
        ]
      );
    }

    // Staging-only demo seed: set up the Crypto Wordle paid-hint flow for the
    // viewer — top up MATCH so hints are affordable, drop them into a claimed,
    // unfinished cryptowordle attempt (lobby shows "In progress · resume"), and
    // pre-buy 2 hints so the next cost shows 4 and persistence is demonstrable.
    // Forces the row unfinished so it survives a prior demo=locked on the shared
    // staging DB. Idempotent, strict no-op in production.
    if (IS_STAGING && req.query.demo === 'hints') {
      await pool.query(
        `INSERT INTO tilematch_tokens (user_id, username, balance)
         VALUES ($1, $2, 100)
         ON CONFLICT (user_id) DO UPDATE
           SET balance = GREATEST(tilematch_tokens.balance, 100),
               updated_at = now()`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, steps, elapsed_secs, progress)
         VALUES ($1, $2, 'cryptowordle', (now() AT TIME ZONE 'utc')::date, $3, $4, $5::jsonb)
         ON CONFLICT (user_id, game_id, attempt_date) DO UPDATE
           SET finished_at = NULL,
               score = NULL,
               time_secs = NULL,
               steps = EXCLUDED.steps,
               elapsed_secs = EXCLUDED.elapsed_secs,
               progress = EXCLUDED.progress`,
        [
          req.user.id,
          req.user.username || 'staging-demo-user',
          0,
          0,
          // dayNum omitted so the client treats the board as today's daily seed;
          // this just marks a claimed, in-progress row to resume into.
          JSON.stringify({ hintsDemo: true }),
        ]
      );
      await pool.query(
        `INSERT INTO cryptowordle_hints (user_id, username, hint_date, hints_purchased)
         VALUES ($1, $2, (now() AT TIME ZONE 'utc')::date, 2)
         ON CONFLICT (user_id, hint_date) DO UPDATE
           SET hints_purchased = 2, updated_at = now()`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
    }

    // Staging-only demo seed: a finished daily win that already earned MATCH and
    // anchored its earn on-chain, so the "+N MATCH earned" Solved! receipt and
    // its on-chain badge are demonstrable. Idempotent, no-op in production.
    if (IS_STAGING && req.query.demo === 'earn') {
      await pool.query(
        `INSERT INTO tilematch_tokens (user_id, username, balance)
         VALUES ($1, $2, 10)
         ON CONFLICT (user_id) DO UPDATE
           SET balance = GREATEST(tilematch_tokens.balance, 10), updated_at = now()`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, score, steps, time_secs, finished_at)
         VALUES ($1, $2, 'sudoku', (now() AT TIME ZONE 'utc')::date, 960, 30, 95, now())
         ON CONFLICT (user_id, game_id, attempt_date) DO UPDATE
           SET score = 960, steps = 30, time_secs = 95, finished_at = now()`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
      const { rows: dEarn } = await pool.query(
        `SELECT 1 FROM match_ledger_events
          WHERE user_id = $1 AND kind = 'earn' AND game_id = 'sudoku'
            AND attempt_date = (now() AT TIME ZONE 'utc')::date LIMIT 1`,
        [req.user.id]
      );
      if (dEarn.length === 0) {
        await pool.query(
          `INSERT INTO match_ledger_events
             (user_id, kind, game_id, attempt_date, amount, balance_after, chain_hash, anchor_status, anchor_tx_hash)
           VALUES ($1, 'earn', 'sudoku', (now() AT TIME ZONE 'utc')::date, 10, 10, 'deadbeefearn', 'anchored', '0xstagingmatchearn')`,
          [req.user.id]
        );
      }
    }

    // Staging-only demo seed: create a Bounce game attempt with active power-ups
    // so the power-up UI and mechanics are demonstrable on a fresh staging DB.
    if (IS_STAGING && req.query.demo === 'powerup') {
      await pool.query(
        `INSERT INTO breakout_scores
           (user_id, username, best_score, best_level, best_time_secs, games_played)
         VALUES ($1, $2, 1200, 3, 300, 5)
         ON CONFLICT (user_id) DO UPDATE
           SET best_score = GREATEST(breakout_scores.best_score, EXCLUDED.best_score),
               best_level = GREATEST(breakout_scores.best_level, EXCLUDED.best_level)`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
    }

    // Staging-only demo seed: create a Diamond Rush attempt with power-up gems
    // on the board so the power-up earning and usage UI is demonstrable.
    // Claimed but unfinished, with a board containing power-up gems at specific positions.
    if (IS_STAGING && req.query.demo === 'powerups') {
      const demoBoard = new Array(64).fill(null);
      for (let i = 0; i < 64; i++) demoBoard[i] = Math.floor(Math.random() * 6);
      demoBoard[10] = 6; demoBoard[25] = 7; demoBoard[40] = 8;
      await pool.query(
        `INSERT INTO daily_attempts
           (user_id, username, game_id, attempt_date, steps, elapsed_secs, progress)
         VALUES ($1, $2, 'diamondrush', (now() AT TIME ZONE 'utc')::date, $3, $4, $5::jsonb)
         ON CONFLICT (user_id, game_id, attempt_date) DO UPDATE
           SET finished_at = NULL,
               score = NULL,
               time_secs = NULL,
               steps = EXCLUDED.steps,
               elapsed_secs = EXCLUDED.elapsed_secs,
               progress = EXCLUDED.progress`,
        [
          req.user.id,
          req.user.username || 'staging-demo-user',
          3,
          45,
          JSON.stringify({ grid: demoBoard, powerUps: { hint: 1, shuffle: 1, extraTime: 0 } }),
        ]
      );
    }

    const { rows } = await pool.query(
      `SELECT * FROM daily_attempts
       WHERE user_id = $1 AND attempt_date = (now() AT TIME ZONE 'utc')::date`,
      [req.user.id]
    );
    const attempts = {};
    for (const row of rows) attempts[row.game_id] = shapeAttempt(row);

    const streak = await computeStreak(req.user.id);
    const badges = await earnedStreakBadges(req.user.id);
    const achievements = await earnedAchievementBadges(req.user.id);

    res.json({
      // Surface the signed-in account so the UI can confirm login +
      // that persistent data is active. Always present here (route is
      // auth-gated), but the client still handles a null user gracefully.
      user: {
        username: req.user.username || null,
        id: req.user.id,
        usernodePubkey: req.user.usernode_pubkey || null,
      },
      serverNowUtc: new Date().toISOString(),
      nextResetUtc: nextResetUtc(),
      streak,
      // Permanent streak-milestone badges (day thresholds) this user has ever
      // earned — kept even after a streak resets, so the lobby/profile can show
      // a player's collected badges independent of the current streak.
      badges,
      // Non-streak achievement badges earned (types) + solve-milestone counts.
      achievements,
      attempts,
    });
  } catch (err) {
    console.error('[daily] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load daily state' });
  }
});

// Claim today's single attempt for a game. First call wins (creates the
// row); any later call the same UTC day hits the unique constraint and is
// rejected as locked.
app.post('/api/daily/:gameId/start', async (req, res) => {
  const { gameId } = req.params;
  if (!GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO daily_attempts (user_id, username, game_id, attempt_date)
       VALUES ($1, $2, $3, (now() AT TIME ZONE 'utc')::date)
       ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING
       RETURNING *`,
      [req.user.id, req.user.username || null, gameId]
    );
    if (rows.length === 0) {
      // Already used today — return the existing attempt so the client can
      // render the locked screen with its stored result.
      const existing = await pool.query(
        `SELECT * FROM daily_attempts
         WHERE user_id = $1 AND game_id = $2
           AND attempt_date = (now() AT TIME ZONE 'utc')::date`,
        [req.user.id, gameId]
      );
      return res.status(409).json({
        error: 'Already played today',
        locked: true,
        nextResetUtc: nextResetUtc(),
        attempt: existing.rows[0] ? shapeAttempt(existing.rows[0]) : null,
      });
    }
    res.json({ attempt: shapeAttempt(rows[0]), nextResetUtc: nextResetUtc() });
  } catch (err) {
    console.error('[daily] start failed:', err.message);
    res.status(500).json({ error: 'Failed to start attempt' });
  }
});

// Record the result of today's attempt (score/steps/time). Only touches
// today's already-claimed row. Also updates user stats and creates achievements.
app.post('/api/daily/:gameId/finish', async (req, res) => {
  const { gameId } = req.params;
  if (!GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  const score = Number.isFinite(req.body.score) ? Math.round(req.body.score) : null;
  const steps = Number.isFinite(req.body.steps) ? Math.round(req.body.steps) : null;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  try {
    const { rows } = await pool.query(
      `UPDATE daily_attempts
         SET score = $3, steps = $4, time_secs = $5, finished_at = now()
       WHERE user_id = $1 AND game_id = $2
         AND attempt_date = (now() AT TIME ZONE 'utc')::date
       RETURNING *`,
      [req.user.id, gameId, score, steps, timeSecs]
    );
    if (rows.length === 0) {
      // No claimed attempt today (client out of sync) — surface so it resyncs.
      return res.status(409).json({ error: 'No active attempt to finish' });
    }

    // Update stats snapshot if this is a win (score > 0)
    if (score && score > 0) {
      await pool.query(
        `UPDATE user_stats_snapshot
           SET total_score = total_score + $2,
               last_win_at = now(),
               updated_at = now()
         WHERE user_id = $1`,
        [req.user.id, score]
      );

      // Check if this is a personal best for this game and create achievement
      const { rows: bestRows } = await pool.query(
        `SELECT MAX(score) as max_score FROM daily_attempts
         WHERE user_id = $1 AND game_id = $2 AND score IS NOT NULL
           AND finished_at IS NOT NULL`,
        [req.user.id, gameId]
      );

      if (bestRows.length > 0) {
        const prevBest = bestRows[0].max_score;
        if (!prevBest || score > prevBest) {
          await pool.query(
            `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
             VALUES ($1, 'personal_best', $2, $3, $4)`,
            [req.user.id, gameId, score, JSON.stringify({ previousBest: prevBest })]
          );
        }
      }
    }

    // Credit the daily-win MATCH reward (the single in-app currency) idempotently
    // via the unique (user, game, day) 'earn' ledger row. Only when a NEW row is
    // created do we credit tilematch_tokens, so a double-finish never
    // double-credits. The earn is anchored on-chain client-side via matchAnchor.
    let matchEarned = 0;
    let matchReceipt = null;
    if (score && score > 0) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const earned = matchEarnedForScore(score);
        const { rows: evtRows } = await pool.query(
          `INSERT INTO match_ledger_events (user_id, kind, game_id, attempt_date, amount, anchor_status)
           VALUES ($1, 'earn', $2, $3::date, $4, 'pending')
           ON CONFLICT (user_id, game_id, attempt_date) WHERE kind = 'earn' DO NOTHING
           RETURNING id`,
          [req.user.id, gameId, today, earned]
        );
        if (evtRows.length > 0) {
          const eventId = evtRows[0].id;
          const { rows: balRows } = await pool.query(
            `INSERT INTO tilematch_tokens (user_id, username, balance)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
               balance = tilematch_tokens.balance + $3, updated_at = now()
             RETURNING balance`,
            [req.user.id, req.user.username || null, earned]
          );
          const balanceAfter = balRows[0].balance;
          const chainHash = matchChainHash({ userId: req.user.id, kind: 'earn', gameId, attemptDate: today, amount: earned, eventId });
          await pool.query(
            `UPDATE match_ledger_events SET chain_hash = $2, balance_after = $3 WHERE id = $1`,
            [eventId, chainHash, balanceAfter]
          );
          matchEarned = earned;
          matchReceipt = { eventId, chainHash, amount: earned, anchorStatus: 'pending', balanceAfter };
        }
      } catch (rewardErr) {
        // Non-fatal: MATCH crediting is best-effort; the puzzle result still records.
        console.error('[daily] MATCH credit failed:', rewardErr.message);
      }
    }

    // Recompute the streak now that today is finished so the client can
    // reconcile its optimistic value without a full reload.
    const streak = await computeStreak(req.user.id);

    // Award streak-milestone badges as permanent achievements when this win
    // pushes the consecutive-day streak to (or past) a threshold. Idempotent:
    // each threshold is recorded at most once per user via a NOT EXISTS guard,
    // so a second daily game the same day (or a re-finish) never duplicates a
    // badge. Best-effort — a failure here never blocks the puzzle result.
    if (score && score > 0) {
      try {
        for (const days of STREAK_BADGE_DAYS) {
          if (streak >= days) {
            await pool.query(
              `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
               SELECT $1, 'streak_milestone', NULL, NULL, $2::jsonb
                WHERE NOT EXISTS (
                  SELECT 1 FROM user_achievements
                   WHERE user_id = $1 AND type = 'streak_milestone'
                     AND (metadata->>'streak')::int = $3
                )`,
              [req.user.id, JSON.stringify({ streak: days }), days]
            );
          }
        }
      } catch (badgeErr) {
        console.warn('[daily] streak badge award failed (non-fatal):', badgeErr.message);
      }
    }

    // Award non-streak achievement badges. Each criterion derives from data we
    // just recorded (time/steps/score/game/day). Every insert is guarded by a
    // NOT EXISTS so it's awarded at most once per user (per milestone count for
    // solve_milestone), and RETURNING tells us which ones were NEW this finish
    // so the client can pop a one-time celebration. Best-effort; never blocks.
    const newAchievements = [];
    if (score && score > 0) {
      try {
        // Helper: idempotent guarded insert; returns true if newly inserted.
        const award = async (type, metadata) => {
          const meta = metadata || {};
          const metaJson = JSON.stringify(meta);
          // For solve_milestone we de-dup per count; for the rest, per type.
          const guard = type === 'solve_milestone'
            ? `AND type = 'solve_milestone' AND (metadata->>'count')::int = $4`
            : `AND type = $2`;
          const { rows: ins } = await pool.query(
            `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
             SELECT $1, $2, $3, NULL, $5::jsonb
              WHERE NOT EXISTS (
                SELECT 1 FROM user_achievements WHERE user_id = $1 ${guard}
              )
             RETURNING type`,
            [req.user.id, type, gameId, type === 'solve_milestone' ? meta.count : null, metaJson]
          );
          if (ins.length > 0) newAchievements.push({ type, metadata: meta });
        };

        // first_solve — the user's first ever WON daily attempt.
        await award('first_solve', {});

        // speed_demon — solved any daily in under SPEED_DEMON_MAX_SECS.
        if (timeSecs !== null && timeSecs < SPEED_DEMON_MAX_SECS) {
          await award('speed_demon', { timeSecs });
        }

        // flawless — solved a move-counted daily at/under its step threshold.
        const flawlessMax = FLAWLESS_STEP_THRESHOLDS[gameId];
        if (flawlessMax != null && steps !== null && steps <= flawlessMax) {
          await award('flawless', { gameId, steps });
        }

        // daily_sweep — solved (won) EVERY daily game within today's UTC day.
        const { rows: sweepRows } = await pool.query(
          `SELECT COUNT(DISTINCT game_id)::int AS n
             FROM daily_attempts
            WHERE user_id = $1
              AND attempt_date = (now() AT TIME ZONE 'utc')::date
              AND finished_at IS NOT NULL AND score IS NOT NULL AND score > 0`,
          [req.user.id]
        );
        if (sweepRows[0] && sweepRows[0].n >= GAME_IDS.size) {
          await award('daily_sweep', {});
        }

        // podium — held rank #1 on THIS game's daily leaderboard at finish time.
        // Count solvers strictly ahead under the (time, steps, finished_at)
        // ordering; zero ahead ⇒ currently #1. Rank can change as others finish
        // later in the day — this is intentional ("held #1 at finish time").
        if (timeSecs !== null) {
          const { rows: aheadRows } = await pool.query(
            `SELECT COUNT(*)::int AS ahead
               FROM daily_attempts
              WHERE game_id = $1
                AND attempt_date = (now() AT TIME ZONE 'utc')::date
                AND finished_at IS NOT NULL AND score IS NOT NULL AND score > 0
                AND user_id <> $2
                AND (
                  time_secs < $3
                  OR (time_secs = $3 AND steps < $4)
                )`,
            [gameId, req.user.id, timeSecs, steps]
          );
          if (aheadRows[0] && aheadRows[0].ahead === 0) {
            await award('podium', { gameId });
          }
        }

        // solve_milestone — lifetime finished+won solves crossed a threshold.
        const { rows: cntRows } = await pool.query(
          `SELECT COUNT(*)::int AS n
             FROM daily_attempts
            WHERE user_id = $1 AND finished_at IS NOT NULL
              AND score IS NOT NULL AND score > 0`,
          [req.user.id]
        );
        const totalSolves = (cntRows[0] && cntRows[0].n) || 0;
        for (const m of SOLVE_MILESTONES) {
          if (totalSolves >= m) await award('solve_milestone', { count: m });
        }
      } catch (achErr) {
        console.warn('[daily] achievement award failed (non-fatal):', achErr.message);
      }
    }

    // Auto-report the "daily_match_2min" task when tilematchingdaily is finished
    // under 2 minutes with a positive score. Idempotent via GREATEST.
    if (gameId === 'tilematchingdaily' && timeSecs !== null && timeSecs <= 119 && score && score > 0) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        await pool.query(
          `INSERT INTO tilematch_daily_tasks (user_id, task_date, task_id, progress)
           VALUES ($1, $2, 'daily_match_2min', 1)
           ON CONFLICT (user_id, task_date, task_id)
           DO UPDATE SET progress = GREATEST(tilematch_daily_tasks.progress, 1)`,
          [req.user.id, today]
        );
      } catch (taskErr) {
        console.warn('[daily] task report failed (non-fatal):', taskErr.message);
      }
    }

    // ---- DApp Mode: mint a verified session for EVERY daily win ------------
    // Every category:'daily' completion (the 6×6 Mini Sudoku included) now gets
    // an on-chain-anchorable receipt — not just the tilematchingdaily pilot.
    // The daily finish endpoint doesn't carry a per-tap log, so the daily path
    // records a session-level snapshot (a single-link hash chain bound to
    // identity + the deterministic daily seed). The PvP path does full per-move
    // replay. Either way the result gets a Verified badge the client anchors via
    // the existing dappAnchor flow (wallet sendTransaction → anchor/confirm).
    // gameId is already validated against GAME_IDS (all category:'daily'), so a
    // positive score is the only additional gate.
    let dappSession = null;
    if (score && score > 0) {
      try {
        const seed = Math.floor(Date.now() / 86400000); // UTC day number (deterministic per day)
        const sid = newSessionId();
        await pool.query(
          `INSERT INTO game_sessions (id, user_id, username, usernode_pubkey, game_id, seed, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
          [sid, req.user.id, req.user.username || null, req.user.usernode_pubkey || null, gameId, seed]
        );
        const genesis = dapp.genesisHash({ gameId, seed, pubkey: req.user.usernode_pubkey, sessionId: sid });
        const stateHash = dapp.sha256Hex(dapp.canonicalize({ score, steps: steps || 0, terminal: 1 }));
        const chainHash = dapp.chainStep(genesis, stateHash, 1);
        await pool.query(
          `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
           VALUES ($1, 1, $2, $3, $4, $5, now()) ON CONFLICT (session_id, sequence) DO NOTHING`,
          [sid, JSON.stringify({ snapshot: true, score }), stateHash, genesis, chainHash]
        );
        await pool.query(
          `UPDATE game_sessions SET status='verified', final_score=$2, final_steps=$3,
                  final_time_secs=$4, final_chain_hash=$5, finished_at=now() WHERE id=$1`,
          [sid, score, steps, timeSecs, chainHash]
        );
        const { rows: sRows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [sid]);
        dappSession = shapeSession(sRows[0]);
      } catch (dappErr) {
        console.error('[daily] dapp session mint failed (non-fatal):', dappErr.message);
      }
    }

    res.json({ attempt: shapeAttempt(rows[0]), nextResetUtc: nextResetUtc(), streak, matchEarned, matchReceipt, dapp: dappSession, newAchievements });
  } catch (err) {
    console.error('[daily] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// Autosave in-progress state for today's already-claimed, unfinished attempt.
// Persists the game-specific `progress` JSON, the accumulated `elapsed_secs`
// timer, and the live `steps` count so the player can resume exactly where
// they left off. Never creates rows (start owns claiming) and never touches
// finished_at/score — a finished attempt is immutable here.
app.post('/api/daily/:gameId/progress', async (req, res) => {
  const { gameId } = req.params;
  if (!GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  const steps = Number.isFinite(req.body.steps) ? Math.round(req.body.steps) : null;
  const elapsedSecs = Number.isFinite(req.body.elapsedSecs) ? Math.round(req.body.elapsedSecs) : null;
  const progress = req.body.progress != null ? req.body.progress : null;
  try {
    const { rows } = await pool.query(
      `UPDATE daily_attempts
         SET progress = $3, steps = $4, elapsed_secs = $5
       WHERE user_id = $1 AND game_id = $2
         AND attempt_date = (now() AT TIME ZONE 'utc')::date
         AND finished_at IS NULL
       RETURNING *`,
      [req.user.id, gameId, progress, steps, elapsedSecs]
    );
    if (rows.length === 0) {
      // No claimed-and-unfinished attempt today: either never started or
      // already finished. Tell the client so it stops autosaving.
      return res.status(409).json({ error: 'No active attempt to save' });
    }
    res.json({ ok: true, attempt: shapeAttempt(rows[0]) });
  } catch (err) {
    console.error('[daily] progress failed:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Per-game daily leaderboard for today's puzzle. Solvers only (finished with a
// positive score — this excludes Crypto Wordle losses recorded with score 0).
// Ranked fastest completion time first, then fewest steps, then earliest finish
// as a final deterministic tiebreak. Returns the top N plus the current user's
// own row/rank (present even when outside the top N).
const LEADERBOARD_LIMIT = 20;
app.get('/api/daily/:gameId/leaderboard', async (req, res) => {
  const { gameId } = req.params;
  if (!GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `SELECT user_id, username, score, steps, time_secs,
              ROW_NUMBER() OVER (
                ORDER BY time_secs ASC, steps ASC, finished_at ASC
              ) AS rank
         FROM daily_attempts
        WHERE game_id = $1
          AND attempt_date = (now() AT TIME ZONE 'utc')::date
          AND finished_at IS NOT NULL
          AND score IS NOT NULL AND score > 0`,
      [gameId]
    );
    const total = rows.length;
    const shape = (r) => ({
      rank: Number(r.rank),
      username: r.username || 'anon',
      timeSecs: r.time_secs,
      steps: r.steps,
      score: r.score,
      isCurrentUser: r.user_id === req.user.id,
    });
    const entries = rows.slice(0, LEADERBOARD_LIMIT).map(shape);
    const mineRow = rows.find((r) => r.user_id === req.user.id);
    const me = mineRow ? shape(mineRow) : null;
    res.json({ entries, me, total });
  } catch (err) {
    console.error('[daily] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Lobby-wide "Today's Champions" leaderboard — everyone who SOLVED at least one
// daily puzzle today, aggregated across all daily games. Ranked by total points
// earned today, then games solved (tiebreak), then earliest first finish.
// Returns { entries: top-N, me, total, gameCount } mirroring the per-game shape
// so the client can reuse the same row rendering. Auth-gated under /api/.
app.get('/api/daily/leaderboard/today', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id,
              MAX(username) AS username,
              SUM(score)::int AS total_points,
              COUNT(DISTINCT game_id)::int AS games_solved,
              MIN(finished_at) AS first_finish,
              ROW_NUMBER() OVER (
                ORDER BY SUM(score) DESC,
                         COUNT(DISTINCT game_id) DESC,
                         MIN(finished_at) ASC
              ) AS rank
         FROM daily_attempts
        WHERE attempt_date = (now() AT TIME ZONE 'utc')::date
          AND finished_at IS NOT NULL
          AND score IS NOT NULL AND score > 0
        GROUP BY user_id`,
      []
    );
    const total = rows.length;
    const shape = (r) => ({
      rank: Number(r.rank),
      username: r.username || 'anon',
      totalPoints: r.total_points,
      gamesSolved: r.games_solved,
      userId: r.user_id,
      isCurrentUser: r.user_id === req.user.id,
    });
    const entries = rows.slice(0, LEADERBOARD_LIMIT).map(shape);
    const mineRow = rows.find((r) => r.user_id === req.user.id);
    const me = mineRow ? shape(mineRow) : null;
    res.json({ entries, me, total, gameCount: GAME_IDS.size });
  } catch (err) {
    console.error('[daily] today champions failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- Mancala multiplayer API --------------------------------------------

// Create a new room. Retries up to 3 times on ID collision.
app.post('/api/mancala/rooms', async (req, res) => {
  const initPits = [4,4,4,4,4,4,0,4,4,4,4,4,4,0];
  let roomId = generateRoomId();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO mancala_rooms (id, player1_id, player1_name, pits)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [roomId, req.user.id, req.user.username || null, JSON.stringify(initPits)]
      );
      return res.json(shapeRoom(rows[0]));
    } catch (err) {
      if (err.code === '23505') { roomId = generateRoomId(); continue; }
      console.error('[mancala] create room failed:', err.message);
      return res.status(500).json({ error: 'Failed to create room' });
    }
  }
  res.status(500).json({ error: 'Failed to generate unique room ID' });
});

// Join an existing waiting room as player 2.
app.post('/api/mancala/rooms/:roomId/join', async (req, res) => {
  const { roomId } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE mancala_rooms
         SET player2_id = $1, player2_name = $2, status = 'active', last_move_at = now()
       WHERE id = $3 AND status = 'waiting' AND player2_id IS NULL
         AND player1_id != $1
       RETURNING *`,
      [req.user.id, req.user.username || null, roomId]
    );
    if (rows.length === 0) {
      const existing = await pool.query('SELECT id, status, player2_id, player1_id FROM mancala_rooms WHERE id = $1', [roomId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
      const r = existing.rows[0];
      if (r.player1_id === req.user.id) return res.status(409).json({ error: 'You created this room — share the code with a friend' });
      return res.status(409).json({ error: 'Room is already full or finished' });
    }
    res.json(shapeRoom(rows[0]));
  } catch (err) {
    console.error('[mancala] join room failed:', err.message);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Poll room state. Any authenticated user can poll (supports reconnect).
app.get('/api/mancala/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM mancala_rooms WHERE id = $1', [roomId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json(shapeRoom(rows[0]));
  } catch (err) {
    console.error('[mancala] get room failed:', err.message);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Apply a move. Validates player identity, move_seq (anti-duplicate), and pit legality.
app.post('/api/mancala/rooms/:roomId/move', async (req, res) => {
  const { roomId } = req.params;
  const { pitIdx, moveSeq } = req.body;
  if (typeof pitIdx !== 'number' || typeof moveSeq !== 'number') {
    return res.status(400).json({ error: 'pitIdx and moveSeq are required' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM mancala_rooms WHERE id = $1', [roomId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    const r = rows[0];

    if (r.status !== 'active') return res.status(409).json({ error: 'Game is not active' });
    if (r.move_seq !== moveSeq - 1) {
      return res.status(409).json({ error: 'Stale move_seq', serverMoveSeq: r.move_seq });
    }

    const player = r.current_player;
    if (player === 1 && req.user.id !== r.player1_id) return res.status(403).json({ error: 'Not your turn' });
    if (player === 2 && req.user.id !== r.player2_id) return res.status(403).json({ error: 'Not your turn' });

    const ownMin = player === 1 ? 0 : 7;
    const ownMax = player === 1 ? 5 : 12;
    const pits = r.pits;
    if (pitIdx < ownMin || pitIdx > ownMax || pits[pitIdx] === 0) {
      return res.status(400).json({ error: 'Invalid pit selection' });
    }

    const { pits: finalPits, extraTurn, gameOver, winner, nextPlayer } = srvMncApplyMove(pits, pitIdx, player);
    const newStatus = gameOver ? 'finished' : 'active';

    // Atomic update — re-checks move_seq to prevent concurrent duplicate moves.
    const { rows: updated } = await pool.query(
      `UPDATE mancala_rooms
         SET pits = $1, current_player = $2, status = $3, winner = $4,
             move_seq = $5, last_move_at = now()
       WHERE id = $6 AND move_seq = $7
       RETURNING *`,
      [JSON.stringify(finalPits), nextPlayer, newStatus, winner, moveSeq, roomId, moveSeq - 1]
    );
    if (updated.length === 0) return res.status(409).json({ error: 'Concurrent update conflict' });
    res.json(shapeRoom(updated[0]));
  } catch (err) {
    console.error('[mancala] move failed:', err.message);
    res.status(500).json({ error: 'Failed to apply move' });
  }
});

// ---- Classic Games generic online rooms (classic_rooms) ------------------
// Open room-code multiplayer used by the Game Menu's "Online Multiplayer".
// Currently wired for Chutes & Ladders; the table/state is generic so other
// classic games can slot in later. Any authenticated user can join by code.

// Chutes & Ladders board map (mirrors CNL_LADDERS/CNL_CHUTES in public/app.jsx).
const CNL_LADDERS_SRV = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const CNL_CHUTES_SRV  = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const CNL_JUMPS_SRV   = Object.assign({}, CNL_LADDERS_SRV, CNL_CHUTES_SRV);

function shapeClassicRoom(r) {
  return {
    id: r.id,
    gameId: r.game_id,
    player1Id: r.player1_id,
    player2Id: r.player2_id,
    player1Name: r.player1_name,
    player2Name: r.player2_name,
    state: r.state || {},
    moveSeq: r.move_seq,
    status: r.status,
    winner: r.winner,
  };
}

// Apply a single Chutes & Ladders roll for `player` (1|2) to the room state.
// Returns the next state plus terminal info. Server owns the dice (anti-cheat).
function cnlApplyRoll(state, player) {
  const die = crypto.randomInt(1, 7); // 1..6
  const fromKey = player === 1 ? 'p1Pos' : 'p2Pos';
  const from = state[fromKey] || 0;
  const next = { ...state, die, rolls: (state.rolls || 0) + 1, lastJump: null };
  let landed = from;
  if (from + die <= 100) {
    landed = from + die;
    if (CNL_JUMPS_SRV[landed] !== undefined) {
      next.lastJump = { from: landed, to: CNL_JUMPS_SRV[landed] };
      landed = CNL_JUMPS_SRV[landed];
    }
  }
  next[fromKey] = landed;
  const gameOver = landed === 100;
  next.currentPlayer = gameOver ? player : (player === 1 ? 2 : 1);
  return { state: next, gameOver, winner: gameOver ? String(player) : null };
}

// Create an open room. Body: nothing needed; gameId is the path param.
app.post('/api/classic/:gameId/rooms', async (req, res) => {
  const { gameId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  const initState = gameId === 'chutes-ladders'
    ? { p1Pos: 0, p2Pos: 0, currentPlayer: 1, die: null, rolls: 0 }
    : {};
  let roomId = generateRoomId();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO classic_rooms (id, game_id, player1_id, player1_name, state)
         VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
        [roomId, gameId, req.user.id, req.user.username || null, JSON.stringify(initState)]
      );
      return res.json(shapeClassicRoom(rows[0]));
    } catch (err) {
      if (err.code === '23505') { roomId = generateRoomId(); continue; }
      console.error('[classic] create room failed:', err.message);
      return res.status(500).json({ error: 'Failed to create room' });
    }
  }
  res.status(500).json({ error: 'Failed to generate unique room ID' });
});

// Join an existing waiting room as player 2.
app.post('/api/classic/:gameId/rooms/:roomId/join', async (req, res) => {
  const { gameId, roomId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `UPDATE classic_rooms
         SET player2_id = $1, player2_name = $2, status = 'active', last_move_at = now()
       WHERE id = $3 AND game_id = $4 AND status = 'waiting' AND player2_id IS NULL
         AND player1_id != $1
       RETURNING *`,
      [req.user.id, req.user.username || null, roomId, gameId]
    );
    if (rows.length === 0) {
      const existing = await pool.query('SELECT id, status, player1_id FROM classic_rooms WHERE id = $1', [roomId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
      if (existing.rows[0].player1_id === req.user.id) {
        return res.status(409).json({ error: 'You created this room — share the code with a friend' });
      }
      return res.status(409).json({ error: 'Room is already full or finished' });
    }
    res.json(shapeClassicRoom(rows[0]));
  } catch (err) {
    console.error('[classic] join room failed:', err.message);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Poll room state.
app.get('/api/classic/:gameId/rooms/:roomId', async (req, res) => {
  const { gameId, roomId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query('SELECT * FROM classic_rooms WHERE id = $1 AND game_id = $2', [roomId, gameId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json(shapeClassicRoom(rows[0]));
  } catch (err) {
    console.error('[classic] get room failed:', err.message);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Apply a move. For Chutes & Ladders the only move is { type: 'roll' }; the
// server rolls the die so neither client can cheat. move_seq guards duplicates.
app.post('/api/classic/:gameId/rooms/:roomId/move', async (req, res) => {
  const { gameId, roomId } = req.params;
  const { moveSeq } = req.body || {};
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  if (gameId !== 'chutes-ladders') return res.status(400).json({ error: 'Online moves not supported for this game' });
  if (typeof moveSeq !== 'number') return res.status(400).json({ error: 'moveSeq is required' });
  try {
    const { rows } = await pool.query('SELECT * FROM classic_rooms WHERE id = $1 AND game_id = $2', [roomId, gameId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    const r = rows[0];
    if (r.status !== 'active') return res.status(409).json({ error: 'Game is not active' });
    if (r.move_seq !== moveSeq - 1) return res.status(409).json({ error: 'Stale move_seq', serverMoveSeq: r.move_seq });

    const player = (r.state && r.state.currentPlayer) || 1;
    if (player === 1 && req.user.id !== r.player1_id) return res.status(403).json({ error: 'Not your turn' });
    if (player === 2 && req.user.id !== r.player2_id) return res.status(403).json({ error: 'Not your turn' });

    const { state: newState, gameOver, winner } = cnlApplyRoll(r.state || {}, player);
    const newStatus = gameOver ? 'finished' : 'active';

    const { rows: updated } = await pool.query(
      `UPDATE classic_rooms
         SET state = $1::jsonb, status = $2, winner = $3, move_seq = $4, last_move_at = now()
       WHERE id = $5 AND move_seq = $6
       RETURNING *`,
      [JSON.stringify(newState), newStatus, winner, moveSeq, roomId, moveSeq - 1]
    );
    if (updated.length === 0) return res.status(409).json({ error: 'Concurrent update conflict' });
    res.json(shapeClassicRoom(updated[0]));
  } catch (err) {
    console.error('[classic] move failed:', err.message);
    res.status(500).json({ error: 'Failed to apply move' });
  }
});

// Mark a room finished early (forfeit / opponent left). Idempotent.
app.post('/api/classic/:gameId/rooms/:roomId/finish', async (req, res) => {
  const { gameId, roomId } = req.params;
  const { winner } = req.body || {};
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `UPDATE classic_rooms
         SET status = 'finished', winner = COALESCE(winner, $3), last_move_at = now()
       WHERE id = $1 AND game_id = $2
       RETURNING *`,
      [roomId, gameId, winner != null ? String(winner) : null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json(shapeClassicRoom(rows[0]));
  } catch (err) {
    console.error('[classic] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to finish room' });
  }
});

// ---- Mancala ZK leaderboard API ------------------------------------------

const MNC_SESSION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateMncSessionId() {
  let id = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    id += MNC_SESSION_ALPHABET[bytes[i] % MNC_SESSION_ALPHABET.length];
  }
  return id;
}

const VALID_MNC_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MNC_LB_LIMIT = 20;
// Server-side score formula — must mirror the client constant in MancalaAIGame.
function mncComputeScore(finalPits) {
  return Math.max((finalPits[6] - finalPits[13]) * 15, 50);
}

// Register a new ZK session: client commits to game state before playing.
app.post('/api/mancala/score/start', async (req, res) => {
  const { commitment, difficulty } = req.body;
  if (typeof commitment !== 'string' || commitment.length < 10) {
    return res.status(400).json({ error: 'commitment is required' });
  }
  if (!VALID_MNC_DIFFICULTIES.has(difficulty)) {
    return res.status(400).json({ error: 'difficulty must be easy, medium, or hard' });
  }
  try {
    const sessionId = generateMncSessionId();
    await pool.query(
      `INSERT INTO mancala_sessions (id, user_id, commitment, difficulty)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, req.user.id, commitment, difficulty]
    );
    res.json({ sessionId });
  } catch (err) {
    console.error('[mancala-zk] start failed:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Verify the move log, compute server-side score, upsert personal best.
// Score formula mirrors client: Math.max((finalPits[6] - finalPits[13]) * 15 - timeSecs, 50)
app.post('/api/mancala/score/verify', async (req, res) => {
  const { sessionId, nonce, moveLog, finalPits, timeSecs } = req.body;
  if (typeof sessionId !== 'string' || typeof nonce !== 'string') {
    return res.status(400).json({ error: 'sessionId and nonce are required' });
  }
  if (!Array.isArray(moveLog) || moveLog.length === 0 || moveLog.length > 200) {
    return res.status(400).json({ error: 'moveLog must be a non-empty array of ≤200 moves' });
  }
  if (!Array.isArray(finalPits) || finalPits.length !== 14) {
    return res.status(400).json({ error: 'finalPits must be a 14-element array' });
  }
  const tSecs = typeof timeSecs === 'number' ? Math.round(timeSecs) : null;
  if (tSecs === null || tSecs < 0) {
    return res.status(400).json({ error: 'timeSecs is required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM mancala_sessions WHERE id = $1`,
      [sessionId]
    );
    if (rows.length === 0) return res.status(404).json({ verified: false, reason: 'session_not_found' });
    const sess = rows[0];
    if (sess.user_id !== req.user.id) return res.status(403).json({ verified: false, reason: 'not_your_session' });
    if (sess.status !== 'pending') return res.status(409).json({ verified: false, reason: 'session_already_used' });

    // Check session age (max 2 hours)
    const ageMs = Date.now() - new Date(sess.created_at).getTime();
    if (ageMs > 7200 * 1000) {
      await pool.query(`UPDATE mancala_sessions SET status = 'expired' WHERE id = $1`, [sessionId]);
      return res.status(409).json({ verified: false, reason: 'session_expired' });
    }

    // Verify commitment: SHA-256(nonce + "||" + JSON(initBoard))
    const initBoard = [4,4,4,4,4,4,0,4,4,4,4,4,4,0];
    const expectedCommitment = crypto.createHash('sha256')
      .update(nonce + '||' + JSON.stringify(initBoard))
      .digest('hex');
    if (expectedCommitment !== sess.commitment) {
      await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
      return res.json({ verified: false, reason: 'commitment_mismatch' });
    }

    // Replay the full game from initBoard using the submitted move log.
    // Each move must be valid for the current player; we track currentPlayer.
    let pits = initBoard.slice();
    let currentPlayer = 1;
    for (let i = 0; i < moveLog.length; i++) {
      const pitIdx = moveLog[i];
      if (typeof pitIdx !== 'number' || !Number.isFinite(pitIdx)) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: 'invalid_move_type' });
      }
      const ownMin = currentPlayer === 1 ? 0 : 7;
      const ownMax = currentPlayer === 1 ? 5 : 12;
      if (pitIdx < ownMin || pitIdx > ownMax || pits[pitIdx] === 0) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: `illegal_move_at_index_${i}` });
      }
      const result = srvMncApplyMove(pits, pitIdx, currentPlayer);
      pits = result.pits;
      if (result.gameOver) {
        // Game should be over — remaining moves in log are unexpected
        if (i < moveLog.length - 1) {
          await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
          return res.json({ verified: false, reason: 'moves_after_game_over' });
        }
        break;
      }
      currentPlayer = result.nextPlayer;
    }

    // Check final board matches and player won
    for (let j = 0; j < 14; j++) {
      if (pits[j] !== finalPits[j]) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: 'final_pits_mismatch' });
      }
    }
    if (pits[6] <= pits[13]) {
      await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
      return res.json({ verified: false, reason: 'player_did_not_win' });
    }

    // Compute server-side score (mirrors client formula)
    const margin = pits[6] - pits[13];
    const score = Math.max(margin * 15 - tSecs, 50);
    const diff = sess.difficulty;
    const moves = moveLog.length;

    // Get previous best for achievement check
    const { rows: prevRows } = await pool.query(
      `SELECT best_score FROM mancala_scores WHERE user_id = $1 AND difficulty = $2`,
      [req.user.id, diff]
    );
    const prevBest = prevRows.length > 0 ? prevRows[0].best_score : null;

    // Upsert personal best — GREATEST so worse runs never overwrite better ones
    const { rows: updated } = await pool.query(
      `INSERT INTO mancala_scores
         (user_id, username, difficulty, best_score, best_margin, best_moves, best_time_secs,
          games_played, wins, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1, now())
       ON CONFLICT (user_id, difficulty) DO UPDATE SET
         username       = EXCLUDED.username,
         best_margin    = CASE WHEN EXCLUDED.best_score > mancala_scores.best_score
                               THEN EXCLUDED.best_margin ELSE mancala_scores.best_margin END,
         best_moves     = CASE WHEN EXCLUDED.best_score > mancala_scores.best_score
                               THEN EXCLUDED.best_moves  ELSE mancala_scores.best_moves  END,
         best_time_secs = CASE WHEN EXCLUDED.best_score > mancala_scores.best_score
                               THEN EXCLUDED.best_time_secs ELSE mancala_scores.best_time_secs END,
         best_score     = GREATEST(mancala_scores.best_score, EXCLUDED.best_score),
         games_played   = mancala_scores.games_played + 1,
         wins           = mancala_scores.wins + 1,
         updated_at     = now()
       RETURNING best_score, updated_at`,
      [req.user.id, req.user.username || null, diff, score, margin, moves, tSecs]
    );
    const me = updated[0];

    // Mark session verified
    await pool.query(
      `UPDATE mancala_sessions SET status = 'verified', verified_at = now() WHERE id = $1`,
      [sessionId]
    );

    // Update user stats snapshot
    await pool.query(
      `UPDATE user_stats_snapshot
         SET total_score = total_score + $2,
             classics_played = classics_played + 1,
             last_win_at = now(),
             updated_at = now()
       WHERE user_id = $1`,
      [req.user.id, score]
    );

    // Achievement for personal best
    if (!prevBest || score > prevBest) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
         VALUES ($1, 'personal_best', 'mancala', $2, $3)`,
        [req.user.id, score, JSON.stringify({ previousBest: prevBest, difficulty: diff })]
      );
    }

    // Caller's current rank within this difficulty
    const { rows: rankRows } = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM mancala_scores
        WHERE difficulty = $1
          AND (best_score > $2 OR (best_score = $2 AND updated_at < $3))`,
      [diff, me.best_score, me.updated_at]
    );

    res.json({ verified: true, score, rank: Number(rankRows[0].rank) });
  } catch (err) {
    console.error('[mancala-zk] verify failed:', err.message);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Global Mancala leaderboard — top 20 per difficulty + caller's own standing.
const VALID_MNC_LB_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
app.get('/api/mancala/leaderboard', async (req, res) => {
  const diff = req.query.difficulty || 'hard';
  if (!VALID_MNC_LB_DIFFICULTIES.has(diff)) {
    return res.status(400).json({ error: 'difficulty must be easy, medium, or hard' });
  }
  try {
    const { rows: top } = await pool.query(
      `SELECT user_id, username, best_score, best_margin, best_time_secs,
              ROW_NUMBER() OVER (ORDER BY best_score DESC, updated_at ASC) AS rank
         FROM mancala_scores
        WHERE difficulty = $1
        ORDER BY best_score DESC, updated_at ASC
        LIMIT $2`,
      [diff, MNC_LB_LIMIT]
    );

    let me = null;
    const { rows: mine } = await pool.query(
      `SELECT best_score, best_margin, best_time_secs, updated_at
         FROM mancala_scores
        WHERE user_id = $1 AND difficulty = $2`,
      [req.user.id, diff]
    );
    if (mine.length) {
      const row = mine[0];
      const { rows: rankRows } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM mancala_scores
          WHERE difficulty = $1
            AND (best_score > $2 OR (best_score = $2 AND updated_at < $3))`,
        [diff, row.best_score, row.updated_at]
      );
      me = {
        rank: Number(rankRows[0].rank),
        username: req.user.username || null,
        bestScore: row.best_score,
        bestMargin: row.best_margin,
        bestTimeSecs: row.best_time_secs,
      };
    }

    res.json({
      top: top.map(r => ({
        rank: Number(r.rank),
        username: r.username,
        bestScore: r.best_score,
        bestMargin: r.best_margin,
        bestTimeSecs: r.best_time_secs,
      })),
      me,
    });
  } catch (err) {
    console.error('[mancala-zk] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- Mancala Daily Challenge API -----------------------------------------

// Daily score formula — win margin rewarded, faster finish scores higher. Floor
// 0 (not 50) so losses/draws stay off the leaderboard, which filters score > 0.
function mncDailyScore(finalPits, timeSecs) {
  if (finalPits[6] <= finalPits[13]) return 0; // only a win scores
  return Math.max((finalPits[6] - finalPits[13]) * 15 - timeSecs, 0);
}

function shapeDailyAttempt(row) {
  if (!row) return null;
  return {
    puzzleDate:  row.puzzle_date,
    score:       row.score,
    margin:      row.margin,
    moves:       row.moves,
    timeSecs:    row.time_secs,
    won:         row.won,
    progress:    row.progress || null,
    elapsedSecs: row.elapsed_secs != null ? row.elapsed_secs : null,
    startedAt:   row.started_at,
    finishedAt:  row.finished_at,
  };
}

async function mncGlobalRecord(dateStr) {
  const { rows } = await pool.query(
    `SELECT MAX(score) AS m FROM mancala_daily
      WHERE puzzle_date = $1 AND score IS NOT NULL AND score > 0`,
    [dateStr]
  );
  return rows[0] && rows[0].m != null ? Number(rows[0].m) : null;
}

// GET /api/mancala/daily — today's state: board, global record, streak, attempt.
app.get('/api/mancala/daily', async (req, res) => {
  try {
    // Staging-only demo seed: give the viewer a 3-day record streak (today open)
    // so the 🔥 chip is demonstrable. Idempotent; strict no-op in production.
    if (IS_STAGING && req.query.demo === 'mancaladaily') {
      const today = mncTodayUtc();
      for (let back = 3; back >= 1; back--) {
        const d = prevUtcDayN(today, back);
        await pool.query(
          `INSERT INTO mancala_daily
             (user_id, username, puzzle_date, score, margin, moves, time_secs, won, finished_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, now() - ($8 || ' days')::interval)
           ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
          [req.user.id, req.user.username || 'You', d, 500 - back * 10, 24, 30, 40 + back, String(back)]
        );
      }
    }

    const now = new Date();
    const today = mncTodayUtc();
    const dayNum = mncDayNumFromDate(today);
    const board = srvMncDailyBoard(dayNum);
    const globalRecord = await mncGlobalRecord(today);
    const streak = await computeMancalaRecordStreak(req.user.id);
    const { rows } = await pool.query(
      `SELECT * FROM mancala_daily WHERE user_id = $1 AND puzzle_date = $2`,
      [req.user.id, today]
    );
    res.json({
      serverNowUtc: now.toISOString(),
      nextResetUtc: nextResetUtc(now),
      board,
      globalRecord,
      streak,
      attempt: shapeDailyAttempt(rows[0]),
    });
  } catch (err) {
    console.error('[mancala-daily] state failed:', err.message);
    res.status(500).json({ error: 'Failed to load daily state' });
  }
});

// POST /api/mancala/daily/start — consume-on-start + mint a commit-reveal
// session bound to today's board. Resumes an unfinished row; 409 once finished.
app.post('/api/mancala/daily/start', async (req, res) => {
  const { commitment } = req.body || {};
  if (typeof commitment !== 'string' || commitment.length < 10) {
    return res.status(400).json({ error: 'commitment is required' });
  }
  try {
    const now = new Date();
    const today = mncTodayUtc();
    // Claim the day's single row (no-op if it already exists).
    const { rows: inserted } = await pool.query(
      `INSERT INTO mancala_daily (user_id, username, puzzle_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, puzzle_date) DO NOTHING
       RETURNING *`,
      [req.user.id, req.user.username || null, today]
    );
    let attempt = inserted[0];
    if (!attempt) {
      const { rows: existing } = await pool.query(
        `SELECT * FROM mancala_daily WHERE user_id = $1 AND puzzle_date = $2`,
        [req.user.id, today]
      );
      attempt = existing[0];
      if (attempt && attempt.finished_at) {
        return res.status(409).json({
          error: 'locked',
          attempt: shapeDailyAttempt(attempt),
          nextResetUtc: nextResetUtc(now),
          globalRecord: await mncGlobalRecord(today),
        });
      }
    }
    // Mint a fresh session bound to today (board re-derived server-side on finish).
    const sessionId = generateMncSessionId();
    await pool.query(
      `INSERT INTO mancala_sessions (id, user_id, commitment, difficulty, puzzle_date)
       VALUES ($1, $2, $3, 'daily', $4)`,
      [sessionId, req.user.id, commitment, today]
    );
    await pool.query(
      `UPDATE mancala_daily SET session_id = $3 WHERE user_id = $1 AND puzzle_date = $2`,
      [req.user.id, today, sessionId]
    );
    res.json({
      sessionId,
      attempt: shapeDailyAttempt(attempt),
      nextResetUtc: nextResetUtc(now),
      board: srvMncDailyBoard(mncDayNumFromDate(today)),
      globalRecord: await mncGlobalRecord(today),
    });
  } catch (err) {
    console.error('[mancala-daily] start failed:', err.message);
    res.status(500).json({ error: 'Failed to start daily' });
  }
});

// POST /api/mancala/daily/progress — autosave moves/elapsed on the unfinished row.
app.post('/api/mancala/daily/progress', async (req, res) => {
  const { progress, moves, elapsedSecs } = req.body || {};
  try {
    const today = mncTodayUtc();
    const { rows } = await pool.query(
      `UPDATE mancala_daily
          SET progress = $3, moves = $4, elapsed_secs = $5
        WHERE user_id = $1 AND puzzle_date = $2 AND finished_at IS NULL
        RETURNING *`,
      [req.user.id, today,
       progress != null ? JSON.stringify(progress) : null,
       typeof moves === 'number' ? moves : null,
       typeof elapsedSecs === 'number' ? Math.round(elapsedSecs) : null]
    );
    if (rows.length === 0) return res.status(409).json({ error: 'No active attempt to save' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[mancala-daily] progress failed:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// POST /api/mancala/daily/finish — verify the move log against today's board AND
// the deterministic Hard AI, compute the authoritative score, record the result.
app.post('/api/mancala/daily/finish', async (req, res) => {
  const { sessionId, nonce, moveLog, finalPits, timeSecs } = req.body || {};
  if (typeof sessionId !== 'string' || typeof nonce !== 'string') {
    return res.status(400).json({ error: 'sessionId and nonce are required' });
  }
  if (!Array.isArray(moveLog) || moveLog.length === 0 || moveLog.length > 400) {
    return res.status(400).json({ error: 'moveLog must be a non-empty array of ≤400 moves' });
  }
  if (!Array.isArray(finalPits) || finalPits.length !== 14) {
    return res.status(400).json({ error: 'finalPits must be a 14-element array' });
  }
  const tSecs = typeof timeSecs === 'number' ? Math.round(timeSecs) : null;
  if (tSecs === null || tSecs < 0) return res.status(400).json({ error: 'timeSecs is required' });

  try {
    const { rows } = await pool.query(
      `SELECT *, puzzle_date::text AS puzzle_date_text FROM mancala_sessions WHERE id = $1`,
      [sessionId]
    );
    if (rows.length === 0) return res.status(404).json({ verified: false, reason: 'session_not_found' });
    const sess = rows[0];
    if (sess.user_id !== req.user.id) return res.status(403).json({ verified: false, reason: 'not_your_session' });
    if (sess.status !== 'pending') return res.status(409).json({ verified: false, reason: 'session_already_used' });
    if (sess.difficulty !== 'daily' || !sess.puzzle_date) {
      return res.status(400).json({ verified: false, reason: 'not_a_daily_session' });
    }
    const ageMs = Date.now() - new Date(sess.created_at).getTime();
    if (ageMs > 7200 * 1000) {
      await pool.query(`UPDATE mancala_sessions SET status = 'expired' WHERE id = $1`, [sessionId]);
      return res.status(409).json({ verified: false, reason: 'session_expired' });
    }

    // The board is the one committed to at start — derived from the session's
    // puzzle_date (read as text to avoid any DATE→local-TZ shift) so a finish
    // just after midnight still validates against the start day's board.
    const puzzleDate = (sess.puzzle_date_text || '').slice(0, 10);
    const initBoard = srvMncDailyBoard(mncDayNumFromDate(puzzleDate));

    const expectedCommitment = crypto.createHash('sha256')
      .update(nonce + '||' + JSON.stringify(initBoard))
      .digest('hex');
    if (expectedCommitment !== sess.commitment) {
      await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
      return res.json({ verified: false, reason: 'commitment_mismatch' });
    }

    // Replay the full game. Player 1 = human; Player 2 = deterministic Hard AI —
    // every AI move in the log must equal the engine's choice for that position.
    let pits = initBoard.slice();
    let currentPlayer = 1;
    for (let i = 0; i < moveLog.length; i++) {
      const pitIdx = moveLog[i];
      if (typeof pitIdx !== 'number' || !Number.isFinite(pitIdx)) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: 'invalid_move_type' });
      }
      if (currentPlayer === 2) {
        const expected = srvMncAIMove(pits);
        if (pitIdx !== expected) {
          await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
          return res.json({ verified: false, reason: `ai_move_mismatch_at_index_${i}` });
        }
      }
      const ownMin = currentPlayer === 1 ? 0 : 7;
      const ownMax = currentPlayer === 1 ? 5 : 12;
      if (pitIdx < ownMin || pitIdx > ownMax || pits[pitIdx] === 0) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: `illegal_move_at_index_${i}` });
      }
      const result = srvMncApplyMove(pits, pitIdx, currentPlayer);
      pits = result.pits;
      if (result.gameOver) {
        if (i < moveLog.length - 1) {
          await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
          return res.json({ verified: false, reason: 'moves_after_game_over' });
        }
        break;
      }
      currentPlayer = result.nextPlayer;
    }
    for (let j = 0; j < 14; j++) {
      if (pits[j] !== finalPits[j]) {
        await pool.query(`UPDATE mancala_sessions SET status = 'rejected' WHERE id = $1`, [sessionId]);
        return res.json({ verified: false, reason: 'final_pits_mismatch' });
      }
    }

    const margin = pits[6] - pits[13];
    const won = pits[6] > pits[13];
    const score = mncDailyScore(pits, tSecs);
    const moves = moveLog.length;

    const prevRecord = await mncGlobalRecord(puzzleDate);

    // Record on the day's claimed row. GREATEST so a worse retry can't lower a
    // better stored result; only a strictly better score updates the details.
    await pool.query(
      `INSERT INTO mancala_daily
         (user_id, username, puzzle_date, score, margin, moves, time_secs, won, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (user_id, puzzle_date) DO UPDATE SET
         username    = EXCLUDED.username,
         margin      = CASE WHEN EXCLUDED.score > COALESCE(mancala_daily.score, -1)
                            THEN EXCLUDED.margin ELSE mancala_daily.margin END,
         moves       = CASE WHEN EXCLUDED.score > COALESCE(mancala_daily.score, -1)
                            THEN EXCLUDED.moves ELSE mancala_daily.moves END,
         time_secs   = CASE WHEN EXCLUDED.score > COALESCE(mancala_daily.score, -1)
                            THEN EXCLUDED.time_secs ELSE mancala_daily.time_secs END,
         won         = COALESCE(mancala_daily.won, false) OR EXCLUDED.won,
         score       = GREATEST(COALESCE(mancala_daily.score, 0), EXCLUDED.score),
         finished_at = COALESCE(mancala_daily.finished_at, EXCLUDED.finished_at)`,
      [req.user.id, req.user.username || null, puzzleDate, score, margin, moves, tSecs, won]
    );

    await pool.query(
      `UPDATE mancala_sessions SET status = 'verified', verified_at = now() WHERE id = $1`,
      [sessionId]
    );

    // Best-effort total-score snapshot bump (matches the AI-mode pattern).
    if (score > 0) {
      await pool.query(
        `UPDATE user_stats_snapshot
            SET total_score = total_score + $2, last_win_at = now(), updated_at = now()
          WHERE user_id = $1`,
        [req.user.id, score]
      ).catch(() => {});
    }

    const newRecord = await mncGlobalRecord(puzzleDate);
    const streak = await computeMancalaRecordStreak(req.user.id);
    const { rows: meRows } = await pool.query(
      `SELECT * FROM mancala_daily WHERE user_id = $1 AND puzzle_date = $2`,
      [req.user.id, puzzleDate]
    );

    res.json({
      verified: true,
      score,
      won,
      streak,
      globalRecord: newRecord,
      becameRecord: won && score > 0 && (prevRecord == null || score > prevRecord),
      attempt: shapeDailyAttempt(meRows[0]),
    });
  } catch (err) {
    console.error('[mancala-daily] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to record daily result' });
  }
});

// GET /api/mancala/daily/leaderboard?scope=today|alltime
app.get('/api/mancala/daily/leaderboard', async (req, res) => {
  const scope = req.query.scope === 'alltime' ? 'alltime' : 'today';
  try {
    if (scope === 'today') {
      const today = mncTodayUtc();
      const { rows: top } = await pool.query(
        `SELECT user_id, username, score, time_secs, moves, margin,
                ROW_NUMBER() OVER (ORDER BY score DESC, time_secs ASC, finished_at ASC) AS rank
           FROM mancala_daily
          WHERE puzzle_date = $1 AND score IS NOT NULL AND score > 0 AND finished_at IS NOT NULL
          ORDER BY score DESC, time_secs ASC, finished_at ASC
          LIMIT $2`,
        [today, MNC_LB_LIMIT]
      );
      const shape = r => ({
        rank: Number(r.rank), userId: r.user_id, username: r.username,
        score: r.score, timeSecs: r.time_secs, moves: r.moves,
        daysHeldRecord: null, isCurrentUser: r.user_id === req.user.id,
      });
      const entries = top.map(shape);
      let me = entries.find(e => e.isCurrentUser) || null;
      if (!me) {
        const { rows: mine } = await pool.query(
          `SELECT user_id, username, score, time_secs, moves,
                  (SELECT COUNT(*) FROM mancala_daily x
                    WHERE x.puzzle_date = $1 AND x.score IS NOT NULL AND x.score > 0
                      AND (x.score > md.score
                           OR (x.score = md.score AND x.time_secs < md.time_secs))) + 1 AS rank
             FROM mancala_daily md
            WHERE md.user_id = $2 AND md.puzzle_date = $1 AND md.score IS NOT NULL AND md.score > 0`,
          [today, req.user.id]
        );
        if (mine.length) me = { ...shape(mine[0]), isCurrentUser: true };
      }
      const { rows: cnt } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM mancala_daily
          WHERE puzzle_date = $1 AND score IS NOT NULL AND score > 0`,
        [today]
      );
      return res.json({ scope, entries, me, total: cnt[0].n });
    }

    // All-time: rank by total of daily-best scores; show days held as record.
    const { rows: agg } = await pool.query(
      `WITH day_max AS (
         SELECT puzzle_date, MAX(score) AS m FROM mancala_daily
          WHERE score IS NOT NULL AND score > 0 GROUP BY puzzle_date
       ), per AS (
         SELECT md.user_id, MAX(md.username) AS username,
                SUM(md.score)::int AS total_score,
                COUNT(*) FILTER (WHERE md.score = dm.m)::int AS days_held
           FROM mancala_daily md
           JOIN day_max dm ON dm.puzzle_date = md.puzzle_date
          WHERE md.score IS NOT NULL AND md.score > 0
          GROUP BY md.user_id
       )
       SELECT *, ROW_NUMBER() OVER (ORDER BY total_score DESC, days_held DESC) AS rank
         FROM per ORDER BY total_score DESC, days_held DESC LIMIT $1`,
      [MNC_LB_LIMIT]
    );
    const shape = r => ({
      rank: Number(r.rank), userId: r.user_id, username: r.username,
      score: r.total_score, daysHeldRecord: r.days_held,
      isCurrentUser: r.user_id === req.user.id,
    });
    const entries = agg.map(shape);
    let me = entries.find(e => e.isCurrentUser) || null;
    if (!me) {
      const { rows: mine } = await pool.query(
        `WITH day_max AS (
           SELECT puzzle_date, MAX(score) AS m FROM mancala_daily
            WHERE score IS NOT NULL AND score > 0 GROUP BY puzzle_date
         ), per AS (
           SELECT md.user_id, MAX(md.username) AS username,
                  SUM(md.score)::int AS total_score,
                  COUNT(*) FILTER (WHERE md.score = dm.m)::int AS days_held
             FROM mancala_daily md
             JOIN day_max dm ON dm.puzzle_date = md.puzzle_date
            WHERE md.score IS NOT NULL AND md.score > 0
            GROUP BY md.user_id
         ), ranked AS (
           SELECT *, ROW_NUMBER() OVER (ORDER BY total_score DESC, days_held DESC) AS rank
             FROM per
         )
         SELECT * FROM ranked WHERE user_id = $1`,
        [req.user.id]
      );
      if (mine.length) me = { ...shape(mine[0]), isCurrentUser: true };
    }
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM mancala_daily
        WHERE score IS NOT NULL AND score > 0`
    );
    res.json({ scope, entries, me, total: cnt[0].n });
  } catch (err) {
    console.error('[mancala-daily] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- Poker chips API -----------------------------------------------------

// GET /api/poker/chips — returns the player's persistent chip count.
// Lazy init: no row yet → return the default 1000 without inserting.
app.get('/api/poker/chips', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT chips FROM poker_chips WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ chips: rows.length > 0 ? rows[0].chips : 1000 });
  } catch (err) {
    console.error('[poker] GET chips failed:', err.message);
    res.status(500).json({ error: 'Failed to load chips' });
  }
});

// POST /api/poker/chips { chips: N } — upsert the player's chip count.
app.post('/api/poker/chips', async (req, res) => {
  const chips = Math.round(Number(req.body.chips));
  if (!Number.isFinite(chips) || chips < 0) {
    return res.status(400).json({ error: 'chips must be a non-negative integer' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO poker_chips (user_id, chips)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET chips = EXCLUDED.chips, updated_at = now()
       RETURNING chips`,
      [req.user.id, chips]
    );
    res.json({ chips: rows[0].chips });
  } catch (err) {
    console.error('[poker] POST chips failed:', err.message);
    res.status(500).json({ error: 'Failed to save chips' });
  }
});

// ---- Idle clicker API -------------------------------------------------------

app.get('/api/idle/state', async (req, res) => {
  try {
    const demo = req.query.demo;
    if (IS_STAGING && demo === 'progress') {
      await pool.query(
        `INSERT INTO idle_game_state
           (user_id, currency, peak_currency, prestige_points, units_owned, upgrades)
         VALUES ($1, 50000, 100000, 5, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [
          req.user.id,
          JSON.stringify({ worker: 10, coinpress: 5, goldenwheel: 2 }),
          JSON.stringify({ iron_paws: 3, worker_motivation: 2 })
        ]
      );
    }

    let { rows } = await pool.query(
      'SELECT * FROM idle_game_state WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO idle_game_state (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING *`,
        [req.user.id]
      );
      rows = await pool.query(
        'SELECT * FROM idle_game_state WHERE user_id = $1',
        [req.user.id]
      ).then(r => r.rows);
    }

    const row = rows[0];
    res.json({
      currency: row.currency,
      peakCurrency: row.peak_currency,
      prestigePoints: row.prestige_points,
      tapPower: row.tap_power,
      unitsOwned: row.units_owned || {},
      upgrades: row.upgrades || {},
    });
  } catch (err) {
    console.error('[idle] GET state failed:', err.message);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

app.post('/api/idle/tap', async (req, res) => {
  try {
    const tapCount = Number.isFinite(req.body.tapCount) ? Math.max(1, Math.round(req.body.tapCount)) : 1;
    const { rows } = await pool.query(
      `UPDATE idle_game_state
         SET currency = currency + $2,
             peak_currency = GREATEST(peak_currency, currency + $2),
             updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, tapCount]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Game state not found' });
    const row = rows[0];
    res.json({
      currency: row.currency,
      unitsOwned: row.units_owned || {},
    });
  } catch (err) {
    console.error('[idle] tap failed:', err.message);
    res.status(500).json({ error: 'Failed to record tap' });
  }
});

app.post('/api/idle/buy-unit', async (req, res) => {
  try {
    const unitId = req.body.unitId;
    if (!unitId || typeof unitId !== 'string') return res.status(400).json({ error: 'Invalid unitId' });

    const IDLE_UNITS = {
      worker: { baseCost: 10, incomePerSec: 0.1 },
      coinpress: { baseCost: 100, incomePerSec: 1 },
      goldenwheel: { baseCost: 1000, incomePerSec: 10 },
      vault: { baseCost: 10000, incomePerSec: 100 },
    };

    if (!IDLE_UNITS[unitId]) return res.status(400).json({ error: 'Unknown unit' });

    const { rows: stateRows } = await pool.query(
      'SELECT * FROM idle_game_state WHERE user_id = $1',
      [req.user.id]
    );
    if (stateRows.length === 0) return res.status(404).json({ error: 'Game state not found' });

    const row = stateRows[0];
    const unitsOwned = row.units_owned || {};
    const count = unitsOwned[unitId] || 0;
    const cost = Math.ceil(IDLE_UNITS[unitId].baseCost * Math.pow(1.15, count));

    if (row.currency < cost) return res.status(409).json({ error: 'Insufficient currency' });

    unitsOwned[unitId] = count + 1;
    const { rows } = await pool.query(
      `UPDATE idle_game_state
         SET currency = currency - $2,
             units_owned = $3,
             updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, cost, JSON.stringify(unitsOwned)]
    );

    const updated = rows[0];
    res.json({
      currency: updated.currency,
      unitsOwned: updated.units_owned || {},
    });
  } catch (err) {
    console.error('[idle] buy-unit failed:', err.message);
    res.status(500).json({ error: 'Failed to purchase unit' });
  }
});

app.post('/api/idle/upgrade', async (req, res) => {
  try {
    const upgradeId = req.body.upgradeId;
    if (!upgradeId || typeof upgradeId !== 'string') return res.status(400).json({ error: 'Invalid upgradeId' });

    const IDLE_UPGRADES = {
      iron_paws: { baseCost: 50, maxLevel: 10, effect: 'tap', multiplier: 1.1 },
      worker_motivation: { baseCost: 150, maxLevel: 5, effect: 'unit', multiplier: 1.25 },
      coinpress_boost: { baseCost: 500, maxLevel: 5, effect: 'unit', multiplier: 1.25 },
      goldenwheel_boost: { baseCost: 5000, maxLevel: 5, effect: 'unit', multiplier: 1.25 },
      vault_boost: { baseCost: 50000, maxLevel: 5, effect: 'unit', multiplier: 1.25 },
    };

    if (!IDLE_UPGRADES[upgradeId]) return res.status(400).json({ error: 'Unknown upgrade' });

    const { rows: stateRows } = await pool.query(
      'SELECT * FROM idle_game_state WHERE user_id = $1',
      [req.user.id]
    );
    if (stateRows.length === 0) return res.status(404).json({ error: 'Game state not found' });

    const row = stateRows[0];
    const upgrades = row.upgrades || {};
    const currentLevel = upgrades[upgradeId] || 0;
    const upgrade = IDLE_UPGRADES[upgradeId];

    if (currentLevel >= upgrade.maxLevel) return res.status(409).json({ error: 'Upgrade already maxed' });

    const cost = Math.ceil(upgrade.baseCost * Math.pow(1.1, currentLevel));

    if (row.currency < cost) return res.status(409).json({ error: 'Insufficient currency' });

    upgrades[upgradeId] = currentLevel + 1;
    let tapPower = row.tap_power;
    if (upgrade.effect === 'tap' && upgradeId === 'iron_paws') {
      tapPower = parseFloat((parseFloat(row.tap_power) * upgrade.multiplier).toFixed(6));
    }

    const { rows } = await pool.query(
      `UPDATE idle_game_state
         SET currency = currency - $2,
             upgrades = $3,
             tap_power = $4,
             updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, cost, JSON.stringify(upgrades), tapPower]
    );

    const updated = rows[0];
    res.json({
      currency: updated.currency,
      upgrades: updated.upgrades || {},
      tapPower: updated.tap_power,
    });
  } catch (err) {
    console.error('[idle] upgrade failed:', err.message);
    res.status(500).json({ error: 'Failed to purchase upgrade' });
  }
});

app.post('/api/idle/prestige', async (req, res) => {
  try {
    const { rows: stateRows } = await pool.query(
      'SELECT * FROM idle_game_state WHERE user_id = $1',
      [req.user.id]
    );
    if (stateRows.length === 0) return res.status(404).json({ error: 'Game state not found' });

    const row = stateRows[0];
    const prestigeBonus = Math.floor(Math.sqrt(row.peak_currency / 1000));
    const newPrestigePoints = row.prestige_points + prestigeBonus;

    const { rows } = await pool.query(
      `UPDATE idle_game_state
         SET currency = 0,
             prestige_points = $2,
             tap_power = 1,
             units_owned = '{}',
             upgrades = '{}',
             updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, newPrestigePoints]
    );

    const updated = rows[0];
    res.json({
      prestigePoints: updated.prestige_points,
      prestigeBonus,
      currency: updated.currency,
      unitsOwned: updated.units_owned || {},
      upgrades: updated.upgrades || {},
    });
  } catch (err) {
    console.error('[idle] prestige failed:', err.message);
    res.status(500).json({ error: 'Failed to prestige' });
  }
});

// ---- Diamond Rush API -------------------------------------------------------

// Phase 1 ships 5 handcrafted levels. Used to validate level-complete posts.
const DIAMOND_LEVEL_COUNT = 5;

function shapeDiamondProgress(row) {
  return {
    clearedLevels: Array.isArray(row.cleared_levels) ? row.cleared_levels : [],
    bestResults: row.best_results || {},
    totalGems: row.total_gems || 0,
  };
}

// Today's saved progress for the signed-in user; creates a default row on
// first access (mirrors GET /api/idle/state's lazy insert).
app.get('/api/diamond/progress', async (req, res) => {
  try {
    // Staging-only demo seed: gives the current viewer a partial save (levels
    // 1-2 cleared, level 3 unlocked-but-unplayed) so the level-select UI's
    // cleared/locked/best-result states are demonstrable on a fresh staging
    // DB. Idempotent, obviously fake (round numbers), strict no-op in prod.
    if (IS_STAGING && req.query.demo === 'progress') {
      await pool.query(
        `INSERT INTO diamond_rush_progress
           (user_id, username, cleared_levels, best_results, total_gems)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [
          req.user.id,
          req.user.username || 'staging-demo-user',
          JSON.stringify([1, 2]),
          JSON.stringify({
            '1': { gems: 5, timeSecs: 22, score: 780 },
            '2': { gems: 6, timeSecs: 41, score: 920 },
          }),
          11,
        ]
      );
    }

    let { rows } = await pool.query(
      'SELECT * FROM diamond_rush_progress WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO diamond_rush_progress (user_id, username)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, req.user.username || null]
      );
      rows = await pool.query(
        'SELECT * FROM diamond_rush_progress WHERE user_id = $1',
        [req.user.id]
      ).then(r => r.rows);
    }

    res.json(shapeDiamondProgress(rows[0]));
  } catch (err) {
    console.error('[diamond] GET progress failed:', err.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Record a cleared level. Upserts the level into cleared_levels, keeps the
// best (highest-score) result per level, and recomputes total_gems.
app.post('/api/diamond/level-complete', async (req, res) => {
  const level = Number.isFinite(req.body.level) ? Math.round(req.body.level) : null;
  const gems = Number.isFinite(req.body.gems) ? Math.max(0, Math.round(req.body.gems)) : 0;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.max(0, Math.round(req.body.timeSecs)) : 0;
  const score = Number.isFinite(req.body.score) ? Math.max(0, Math.round(req.body.score)) : 0;
  if (level === null || level < 1 || level > DIAMOND_LEVEL_COUNT) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  try {
    // Ensure a row exists, then read-modify-write its JSONB fields.
    await pool.query(
      `INSERT INTO diamond_rush_progress (user_id, username)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows } = await pool.query(
      'SELECT * FROM diamond_rush_progress WHERE user_id = $1',
      [req.user.id]
    );
    const row = rows[0];
    const cleared = new Set(Array.isArray(row.cleared_levels) ? row.cleared_levels : []);
    cleared.add(level);
    const best = row.best_results || {};
    const prev = best[String(level)];
    if (!prev || score > prev.score) {
      best[String(level)] = { gems, timeSecs, score };
    }
    const totalGems = Object.values(best).reduce((acc, r) => acc + (r.gems || 0), 0);

    const { rows: updated } = await pool.query(
      `UPDATE diamond_rush_progress
         SET cleared_levels = $2, best_results = $3, total_gems = $4,
             username = COALESCE(username, $5), updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [
        req.user.id,
        JSON.stringify(Array.from(cleared).sort((a, b) => a - b)),
        JSON.stringify(best),
        totalGems,
        req.user.username || null,
      ]
    );
    res.json(shapeDiamondProgress(updated[0]));
  } catch (err) {
    console.error('[diamond] level-complete failed:', err.message);
    res.status(500).json({ error: 'Failed to record level' });
  }
});

// ---- Snake leaderboard API -----------------------------------------------

const SNAKE_LB_LIMIT = 20;

function shapeSnakeRow(row) {
  return {
    rank: Number(row.rank),
    username: row.username,
    bestScore: row.best_score,
  };
}

// Submit a finished run. Upserts the caller's personal-best row (GREATEST so a
// worse run never lowers it) and bumps games_played. Identity from req.user.
// Also updates user stats snapshot and creates achievements.
app.post('/api/snake/score', async (req, res) => {
  const score = Number.isFinite(req.body.score) ? Math.round(req.body.score) : null;
  const length = Number.isFinite(req.body.length) ? Math.round(req.body.length) : null;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  if (score === null) return res.status(400).json({ error: 'score is required' });
  try {
    // Get previous best before updating
    const { rows: prevRows } = await pool.query(
      `SELECT best_score FROM snake_scores WHERE user_id = $1`,
      [req.user.id]
    );
    const prevBest = prevRows.length > 0 ? prevRows[0].best_score : null;

    // Update best_length/best_time_secs only when this run set a new best score.
    const { rows } = await pool.query(
      `INSERT INTO snake_scores
         (user_id, username, best_score, best_length, best_time_secs, games_played, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, now())
       ON CONFLICT (user_id) DO UPDATE SET
         username       = EXCLUDED.username,
         best_length    = CASE WHEN EXCLUDED.best_score > snake_scores.best_score
                               THEN EXCLUDED.best_length ELSE snake_scores.best_length END,
         best_time_secs = CASE WHEN EXCLUDED.best_score > snake_scores.best_score
                               THEN EXCLUDED.best_time_secs ELSE snake_scores.best_time_secs END,
         best_score     = GREATEST(snake_scores.best_score, EXCLUDED.best_score),
         games_played   = snake_scores.games_played + 1,
         updated_at     = now()
       RETURNING *`,
      [req.user.id, req.user.username || null, score, length, timeSecs]
    );
    const me = rows[0];

    // Update user stats snapshot
    await pool.query(
      `UPDATE user_stats_snapshot
         SET total_score = total_score + $2,
             classics_played = classics_played + 1,
             last_win_at = now(),
             updated_at = now()
       WHERE user_id = $1`,
      [req.user.id, score]
    );

    // Create achievement if this is a personal best
    if (!prevBest || score > prevBest) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
         VALUES ($1, 'personal_best', 'snake', $2, $3)`,
        [req.user.id, score, JSON.stringify({ previousBest: prevBest })]
      );
    }

    // Caller's current rank (1-based) by best_score, ties broken by who got
    // there first — same ordering as the leaderboard query.
    const { rows: rankRows } = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM snake_scores
        WHERE best_score > $1
           OR (best_score = $1 AND updated_at < $2)`,
      [me.best_score, me.updated_at]
    );
    res.json({
      bestScore: me.best_score,
      rank: Number(rankRows[0].rank),
      gamesPlayed: me.games_played,
    });
  } catch (err) {
    console.error('[snake] score failed:', err.message);
    res.status(500).json({ error: 'Failed to record score' });
  }
});

// Top scores plus the caller's own standing (even when outside the top N).
app.get('/api/snake/leaderboard', async (req, res) => {
  try {
    const { rows: top } = await pool.query(
      `SELECT user_id, username, best_score,
              ROW_NUMBER() OVER (ORDER BY best_score DESC, updated_at ASC) AS rank
         FROM snake_scores
        ORDER BY best_score DESC, updated_at ASC
        LIMIT $1`,
      [SNAKE_LB_LIMIT]
    );

    let me = null;
    const { rows: mine } = await pool.query(
      `SELECT username, best_score, updated_at FROM snake_scores WHERE user_id = $1`,
      [req.user.id]
    );
    if (mine.length) {
      const row = mine[0];
      const { rows: rankRows } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM snake_scores
          WHERE best_score > $1
             OR (best_score = $1 AND updated_at < $2)`,
        [row.best_score, row.updated_at]
      );
      me = { rank: Number(rankRows[0].rank), username: row.username, bestScore: row.best_score };
    }

    res.json({ top: top.map(shapeSnakeRow), me });
  } catch (err) {
    console.error('[snake] leaderboard failed:', err.message);

    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- Bounce (Breakout) leaderboard API -----------------------------------
// Mirrors the Snake leaderboard exactly: one personal-best row per user,
// upserted with GREATEST, ranked by best_score then earliest-to-reach.

const BOUNCE_LB_LIMIT = 20;

function shapeBounceRow(row) {
  return {
    rank: Number(row.rank),
    username: row.username,
    bestScore: row.best_score,
  };
}

// Submit a finished run. Upserts the caller's personal-best row (GREATEST so a
// worse run never lowers it) and bumps games_played. Identity from req.user.
// Also updates user stats snapshot and creates achievements (Snake parity).
app.post('/api/bounce/score', async (req, res) => {
  const score = Number.isFinite(req.body.score) ? Math.round(req.body.score) : null;
  const level = Number.isFinite(req.body.level) ? Math.round(req.body.level) : null;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  if (score === null) return res.status(400).json({ error: 'score is required' });
  try {
    // Get previous best before updating
    const { rows: prevRows } = await pool.query(
      `SELECT best_score FROM breakout_scores WHERE user_id = $1`,
      [req.user.id]
    );
    const prevBest = prevRows.length > 0 ? prevRows[0].best_score : null;

    // Update best_level/best_time_secs only when this run set a new best score.
    const { rows } = await pool.query(
      `INSERT INTO breakout_scores
         (user_id, username, best_score, best_level, best_time_secs, games_played, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, now())
       ON CONFLICT (user_id) DO UPDATE SET
         username       = EXCLUDED.username,
         best_level     = CASE WHEN EXCLUDED.best_score > breakout_scores.best_score
                               THEN EXCLUDED.best_level ELSE breakout_scores.best_level END,
         best_time_secs = CASE WHEN EXCLUDED.best_score > breakout_scores.best_score
                               THEN EXCLUDED.best_time_secs ELSE breakout_scores.best_time_secs END,
         best_score     = GREATEST(breakout_scores.best_score, EXCLUDED.best_score),
         games_played   = breakout_scores.games_played + 1,
         updated_at     = now()
       RETURNING *`,
      [req.user.id, req.user.username || null, score, level, timeSecs]
    );
    const me = rows[0];

    // Update user stats snapshot
    await pool.query(
      `UPDATE user_stats_snapshot
         SET total_score = total_score + $2,
             classics_played = classics_played + 1,
             last_win_at = now(),
             updated_at = now()
       WHERE user_id = $1`,
      [req.user.id, score]
    );

    // Create achievement if this is a personal best
    if (!prevBest || score > prevBest) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
         VALUES ($1, 'personal_best', 'bounce', $2, $3)`,
        [req.user.id, score, JSON.stringify({ previousBest: prevBest })]
      );
    }

    // Caller's current rank (1-based) by best_score, ties broken by who got
    // there first — same ordering as the leaderboard query.
    const { rows: rankRows } = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM breakout_scores
        WHERE best_score > $1
           OR (best_score = $1 AND updated_at < $2)`,
      [me.best_score, me.updated_at]
    );
    res.json({
      bestScore: me.best_score,
      rank: Number(rankRows[0].rank),
      gamesPlayed: me.games_played,
    });
  } catch (err) {
    console.error('[bounce] score failed:', err.message);
    res.status(500).json({ error: 'Failed to record score' });
  }
});

// Top scores plus the caller's own standing (even when outside the top N).
app.get('/api/bounce/leaderboard', async (req, res) => {
  try {
    const { rows: top } = await pool.query(
      `SELECT user_id, username, best_score,
              ROW_NUMBER() OVER (ORDER BY best_score DESC, updated_at ASC) AS rank
         FROM breakout_scores
        ORDER BY best_score DESC, updated_at ASC
        LIMIT $1`,
      [BOUNCE_LB_LIMIT]
    );

    let me = null;
    const { rows: mine } = await pool.query(
      `SELECT username, best_score, updated_at FROM breakout_scores WHERE user_id = $1`,
      [req.user.id]
    );
    if (mine.length) {
      const row = mine[0];
      const { rows: rankRows } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM breakout_scores
          WHERE best_score > $1
             OR (best_score = $1 AND updated_at < $2)`,
        [row.best_score, row.updated_at]
      );
      me = { rank: Number(rankRows[0].rank), username: row.username, bestScore: row.best_score };
    }

    res.json({ top: top.map(shapeBounceRow), me });
  } catch (err) {
    console.error('[bounce] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- Zuma leaderboard API ------------------------------------------------
// Mirrors Bounce/Snake exactly: one personal-best row per user, upserted with
// GREATEST, ranked by best_score then earliest-to-reach.

const ZUMA_LB_LIMIT = 20;

function shapeZumaRow(row) {
  return {
    rank: Number(row.rank),
    username: row.username,
    bestScore: row.best_score,
  };
}

app.post('/api/zuma/score', async (req, res) => {
  const score = Number.isFinite(req.body.score) ? Math.round(req.body.score) : null;
  const level = Number.isFinite(req.body.level) ? Math.round(req.body.level) : null;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  if (score === null) return res.status(400).json({ error: 'score is required' });
  try {
    const { rows: prevRows } = await pool.query(
      `SELECT best_score FROM zuma_scores WHERE user_id = $1`,
      [req.user.id]
    );
    const prevBest = prevRows.length > 0 ? prevRows[0].best_score : null;

    const { rows } = await pool.query(
      `INSERT INTO zuma_scores
         (user_id, username, best_score, best_level, best_time_secs, games_played, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, now())
       ON CONFLICT (user_id) DO UPDATE SET
         username       = EXCLUDED.username,
         best_level     = CASE WHEN EXCLUDED.best_score > zuma_scores.best_score
                               THEN EXCLUDED.best_level ELSE zuma_scores.best_level END,
         best_time_secs = CASE WHEN EXCLUDED.best_score > zuma_scores.best_score
                               THEN EXCLUDED.best_time_secs ELSE zuma_scores.best_time_secs END,
         best_score     = GREATEST(zuma_scores.best_score, EXCLUDED.best_score),
         games_played   = zuma_scores.games_played + 1,
         updated_at     = now()
       RETURNING *`,
      [req.user.id, req.user.username || null, score, level, timeSecs]
    );
    const me = rows[0];

    await pool.query(
      `UPDATE user_stats_snapshot
         SET total_score = total_score + $2,
             classics_played = classics_played + 1,
             last_win_at = now(),
             updated_at = now()
       WHERE user_id = $1`,
      [req.user.id, score]
    );

    if (!prevBest || score > prevBest) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, type, game_id, score, metadata)
         VALUES ($1, 'personal_best', 'zuma', $2, $3)`,
        [req.user.id, score, JSON.stringify({ previousBest: prevBest })]
      );
    }

    const { rows: rankRows } = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM zuma_scores
        WHERE best_score > $1
           OR (best_score = $1 AND updated_at < $2)`,
      [me.best_score, me.updated_at]
    );
    res.json({
      bestScore: me.best_score,
      rank: Number(rankRows[0].rank),
      gamesPlayed: me.games_played,
    });
  } catch (err) {
    console.error('[zuma] score failed:', err.message);
    res.status(500).json({ error: 'Failed to record score' });
  }
});

app.get('/api/zuma/leaderboard', async (req, res) => {
  try {
    const { rows: top } = await pool.query(
      `SELECT user_id, username, best_score,
              ROW_NUMBER() OVER (ORDER BY best_score DESC, updated_at ASC) AS rank
         FROM zuma_scores
        ORDER BY best_score DESC, updated_at ASC
        LIMIT $1`,
      [ZUMA_LB_LIMIT]
    );

    let me = null;
    const { rows: mine } = await pool.query(
      `SELECT username, best_score, updated_at FROM zuma_scores WHERE user_id = $1`,
      [req.user.id]
    );
    if (mine.length) {
      const row = mine[0];
      const { rows: rankRows } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM zuma_scores
          WHERE best_score > $1
             OR (best_score = $1 AND updated_at < $2)`,
        [row.best_score, row.updated_at]
      );
      me = { rank: Number(rankRows[0].rank), username: row.username, bestScore: row.best_score };
    }

    res.json({ top: top.map(shapeZumaRow), me });
  } catch (err) {
    console.error('[zuma] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- PvP Wager API ----------------------------------------------------------

// Convert a DB match-id string to bytes32 hex for on-chain use.
function pvpMatchBytes32(matchId) {
  return ethers.keccak256(ethers.toUtf8Bytes(matchId));
}

function shapePvpMatch(r, requesterId, opts = {}) {
  const isPlayer = requesterId === r.player1_id || requesterId === r.player2_id;
  return {
    matchId:              r.id,
    status:               r.status,
    betTier:              r.bet_tier || 10,
    wagerUtgo:            r.wager_utgo,
    player1Id:            r.player1_id,
    player2Id:            r.player2_id,
    player1Name:          r.player1_name,
    player2Name:          r.player2_name,
    p1Deposited:          r.p1_deposited,
    p2Deposited:          r.p2_deposited,
    p1Score:              r.p1_score,
    p2Score:              r.p2_score,
    p1Steps:              r.p1_steps,
    p2Steps:              r.p2_steps,
    p1TimeSecs:           r.p1_time_secs,
    p2TimeSecs:           r.p2_time_secs,
    p1Remaining:          r.p1_remaining,
    p2Remaining:          r.p2_remaining,
    winnerId:             r.winner_id,
    boardSeed:            (isPlayer && r.status === 'active') ? r.board_seed : null,
    cancelQueueCalldata:  opts.cancelQueueCalldata || null,
    startedAt:            r.started_at,
    createdAt:            r.created_at,
    updatedAt:            r.updated_at,
  };
}

// GET /api/pvp/balance?addr=0x… — $UTGO balance check.
// In staging (no real contract) returns a mock 10 UTGO balance.
app.get('/api/pvp/balance', async (req, res) => {
  const addr = req.query.addr;
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return res.status(400).json({ error: 'Valid EVM address required' });
  }
  try {
    if (IS_STAGING || !utgoProvider || !UTGO_CONTRACT_ADDRESS) {
      return res.json({ balance: ethers.parseUnits('10', 18).toString(), mock: true });
    }
    const token = new ethers.Contract(UTGO_CONTRACT_ADDRESS, UTGO_ABI_BALANCE, utgoProvider);
    const balance = await token.balanceOf(addr);
    res.json({ balance: balance.toString() });
  } catch (err) {
    console.error('[pvp] balance check failed:', err.message);
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

// POST /api/pvp/join { betTier, playerAddr }
// Creates or joins a waiting match for this bet tier (10, 50, or 100 UTGO).
// Uses Redis queue (pvp:queue:{tier}:{matchId} TTL=120s) with Postgres CAS fallback.
app.post('/api/pvp/join', async (req, res) => {
  const tier = Number.isFinite(req.body.betTier) ? Math.round(req.body.betTier) : null;
  const { playerAddr } = req.body;
  if (!tier || !PVP_VALID_TIERS.has(tier)) {
    return res.status(400).json({ error: 'betTier must be 10, 50, or 100' });
  }
  if (!playerAddr || !/^0x[0-9a-fA-F]{40}$/.test(playerAddr)) {
    return res.status(400).json({ error: 'Valid EVM playerAddr required' });
  }
  const wagerUtgo = (BigInt(tier) * BigInt('1000000000000000000')).toString();

  try {
    // ── Redis-backed path ──────────────────────────────────────────────────
    if (redisReady && redis) {
      try {
        // Scan for available waiting-match keys for this tier
        const pattern = `pvp:queue:${tier}:*`;
        let cursor = '0';
        let matchedKey = null;
        let matchedMatchId = null;
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 20);
          cursor = nextCursor;
          for (const key of keys) {
            const creatorId = await redis.get(key);
            if (creatorId && creatorId !== req.user.id) {
              matchedKey = key;
              matchedMatchId = key.split(':')[3];
              break;
            }
          }
          if (matchedKey) break;
        } while (cursor !== '0');

        if (matchedKey && matchedMatchId) {
          const seed = Math.floor(Math.random() * 4294967295);
          const { rows: joined } = await pool.query(`
            UPDATE pvp_matches
              SET player2_id   = $1,
                  player2_name = $2,
                  player2_addr = $3,
                  board_seed   = $4,
                  status       = 'active',
                  started_at   = now(),
                  updated_at   = now()
            WHERE id = $5
              AND status = 'waiting'
              AND player1_id != $1
            RETURNING *
          `, [req.user.id, req.user.username || null, playerAddr, seed, matchedMatchId]);

          await redis.del(matchedKey);
          if (joined.length > 0) {
            return res.json({ ...shapePvpMatch(joined[0], req.user.id), isCreator: false });
          }
          // Key was stale — fall through to create new match
        }

        // Create new waiting match + queue key
        let newMatchId = generateRoomId();
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { rows } = await pool.query(`
              INSERT INTO pvp_matches (id, player1_id, player1_name, player1_addr, bet_tier, wager_utgo)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
            `, [newMatchId, req.user.id, req.user.username || null, playerAddr, tier, wagerUtgo]);
            await redis.set(`pvp:queue:${tier}:${newMatchId}`, req.user.id, 'EX', 120);
            return res.json({ ...shapePvpMatch(rows[0], req.user.id), isCreator: true });
          } catch (err) {
            if (err.code === '23505') { newMatchId = generateRoomId(); continue; }
            throw err;
          }
        }
        return res.status(500).json({ error: 'Failed to generate unique match ID' });
      } catch (redisErr) {
        console.warn('[pvp] Redis op failed, falling back to Postgres queue:', redisErr.message);
        // Fall through to Postgres CAS path
      }
    }

    // ── Postgres-only CAS fallback ─────────────────────────────────────────
    const seed = Math.floor(Math.random() * 4294967295);
    const { rows: joined } = await pool.query(`
      UPDATE pvp_matches
        SET player2_id   = $1,
            player2_name = $2,
            player2_addr = $3,
            board_seed   = $4,
            status       = 'active',
            started_at   = now(),
            updated_at   = now()
      WHERE id = (
        SELECT id FROM pvp_matches
        WHERE status = 'waiting'
          AND bet_tier = $5
          AND player1_id != $1
          AND created_at > now() - interval '120 seconds'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [req.user.id, req.user.username || null, playerAddr, seed, tier]);

    if (joined.length > 0) {
      return res.json({ ...shapePvpMatch(joined[0], req.user.id), isCreator: false });
    }

    let newMatchId = generateRoomId();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO pvp_matches (id, player1_id, player1_name, player1_addr, bet_tier, wager_utgo)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [newMatchId, req.user.id, req.user.username || null, playerAddr, tier, wagerUtgo]);
        return res.json({ ...shapePvpMatch(rows[0], req.user.id), isCreator: true });
      } catch (err) {
        if (err.code === '23505') { newMatchId = generateRoomId(); continue; }
        throw err;
      }
    }
    res.status(500).json({ error: 'Failed to generate unique match ID' });
  } catch (err) {
    console.error('[pvp] join failed:', err.message);
    res.status(500).json({ error: 'Failed to join PvP match' });
  }
});

// GET /api/pvp/match/:matchId?remaining=N
// Poll match state. Optional ?remaining=N updates calling player's tile count (progress bar).
// While active, updates p_last_seen_at; detects 30s inactivity and auto-forfeits.
app.get('/api/pvp/match/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const remainingParam = req.query.remaining !== undefined ? Number(req.query.remaining) : null;
  const remaining = Number.isFinite(remainingParam) ? Math.round(remainingParam) : null;
  try {
    const { rows } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });
    let m = rows[0];

    const isP1 = req.user.id === m.player1_id;
    const isP2 = req.user.id === m.player2_id;

    if ((isP1 || isP2) && m.status === 'active') {
      // Update last-seen timestamp and optional remaining tile count
      const seenCol = isP1 ? 'p1_last_seen_at' : 'p2_last_seen_at';
      const remPart = remaining !== null
        ? `, ${isP1 ? 'p1_remaining' : 'p2_remaining'} = $2`
        : '';
      const params = remaining !== null ? [matchId, remaining] : [matchId];
      await pool.query(
        `UPDATE pvp_matches SET ${seenCol} = now()${remPart}, updated_at = now() WHERE id = $1`,
        params
      );

      const { rows: fresh } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
      m = fresh[0];

      // 30s inactivity forfeit — only applies after match has been active for ≥30s
      const INACTIVITY_MS = 30000;
      const now = Date.now();
      const startedMs = m.started_at ? new Date(m.started_at).getTime() : new Date(m.created_at).getTime();
      if (now - startedMs > INACTIVITY_MS) {
        const p1Seen = m.p1_last_seen_at ? new Date(m.p1_last_seen_at).getTime() : null;
        const p2Seen = m.p2_last_seen_at ? new Date(m.p2_last_seen_at).getTime() : null;
        let forfeiteeId = null;
        let winnerAddr = null;
        if (isP2 && p1Seen && now - p1Seen > INACTIVITY_MS) {
          forfeiteeId = m.player1_id; winnerAddr = m.player2_addr;
        } else if (isP1 && p2Seen && now - p2Seen > INACTIVITY_MS) {
          forfeiteeId = m.player2_id; winnerAddr = m.player1_addr;
        }
        if (forfeiteeId) {
          const winnerId = forfeiteeId === m.player1_id ? m.player2_id : m.player1_id;
          const { rows: forfeited } = await pool.query(`
            UPDATE pvp_matches SET status = 'finished', winner_id = $2, updated_at = now()
            WHERE id = $1 AND status = 'active' RETURNING *
          `, [matchId, winnerId]);
          if (forfeited.length) {
            m = forfeited[0];
            let claimCalldata = null;
            if (validatorWallet && winnerAddr && /^0x[0-9a-fA-F]{40}$/.test(winnerAddr)) {
              try {
                const matchId32 = pvpMatchBytes32(matchId);
                const innerHash = ethers.keccak256(
                  ethers.solidityPacked(['bytes32', 'address'], [matchId32, winnerAddr])
                );
                const sig = await validatorWallet.signMessage(ethers.getBytes(innerHash));
                claimCalldata = WAGER_IFACE.encodeFunctionData('claimWin', [matchId32, winnerAddr, sig]);
              } catch (sigErr) {
                console.error('[pvp] inactivity forfeit signing failed:', sigErr.message);
              }
            }
            return res.json({
              ...shapePvpMatch(m, req.user.id),
              forfeitedBy: forfeiteeId,
              claimCalldata,
              contractAddr: UTGO_CONTRACT_ADDRESS || null,
            });
          }
        }
      }
    }

    // Compute cancelQueueCalldata for creator when match is waiting and 120s have elapsed
    let cancelQueueCalldata = null;
    const isCreator = req.user.id === m.player1_id;
    if (isCreator && m.status === 'waiting' && UTGO_CONTRACT_ADDRESS) {
      const ageMs = Date.now() - new Date(m.created_at).getTime();
      if (ageMs > 120000) {
        try {
          const matchId32 = pvpMatchBytes32(matchId);
          cancelQueueCalldata = CANCEL_QUEUE_IFACE.encodeFunctionData('cancelQueue', [matchId32]);
        } catch (e) {
          console.warn('[pvp] cancelQueueCalldata encode failed:', e.message);
        }
      }
    }

    res.json(shapePvpMatch(m, req.user.id, { cancelQueueCalldata }));
  } catch (err) {
    console.error('[pvp] get match failed:', err.message);
    res.status(500).json({ error: 'Failed to get match' });
  }
});

// DELETE /api/pvp/match/:matchId/cancel — creator cancels a waiting match
app.delete('/api/pvp/match/:matchId/cancel', async (req, res) => {
  const { matchId } = req.params;
  try {
    const { rows } = await pool.query(`
      UPDATE pvp_matches SET status = 'cancelled', updated_at = now()
      WHERE id = $1 AND player1_id = $2 AND status = 'waiting'
      RETURNING id
    `, [matchId, req.user.id]);
    if (rows.length === 0) return res.status(409).json({ error: 'Cannot cancel this match' });
    res.json({ cancelled: true });
  } catch (err) {
    console.error('[pvp] cancel failed:', err.message);
    res.status(500).json({ error: 'Failed to cancel match' });
  }
});

// POST /api/pvp/match/:matchId/deposit-confirmed { txHash }
// Client reports successful on-chain deposit; backend marks the flag.
// Production would verify via RPC; staging trusts the report.
app.post('/api/pvp/match/:matchId/deposit-confirmed', async (req, res) => {
  const { matchId } = req.params;
  try {
    const { rows: matchRows } = await pool.query(
      'SELECT * FROM pvp_matches WHERE id = $1', [matchId]
    );
    if (matchRows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const m = matchRows[0];
    if (m.status !== 'active') return res.status(409).json({ error: 'Match not active' });

    const isP1 = req.user.id === m.player1_id;
    const isP2 = req.user.id === m.player2_id;
    if (!isP1 && !isP2) return res.status(403).json({ error: 'Not a player in this match' });

    const col = isP1 ? 'p1_deposited' : 'p2_deposited';
    const { rows } = await pool.query(`
      UPDATE pvp_matches SET ${col} = true, updated_at = now()
      WHERE id = $1 RETURNING *
    `, [matchId]);
    res.json(shapePvpMatch(rows[0], req.user.id));
  } catch (err) {
    console.error('[pvp] deposit-confirmed failed:', err.message);
    res.status(500).json({ error: 'Failed to record deposit' });
  }
});

// POST /api/pvp/match/:matchId/finish { score, steps, timeSecs, remainingTiles, telemetry }
// Batch-telemetry finish: client sends full move array at game end (no per-move calls).
// Bulk-inserts telemetry, runs anti-cheat, then records result and (if both done) picks winner.
app.post('/api/pvp/match/:matchId/finish', async (req, res) => {
  const { matchId } = req.params;
  const score          = Number.isFinite(req.body.score)          ? Math.round(req.body.score)          : 0;
  const steps          = Number.isFinite(req.body.steps)          ? Math.round(req.body.steps)          : 0;
  const timeSecs       = Number.isFinite(req.body.timeSecs)       ? Math.round(req.body.timeSecs)       : 0;
  const remainingTiles = Number.isFinite(req.body.remainingTiles) ? Math.round(req.body.remainingTiles) : 0;
  const telemetry      = Array.isArray(req.body.telemetry) ? req.body.telemetry.slice(0, 500) : [];

  try {
    const { rows: matchRows } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
    if (!matchRows.length) return res.status(404).json({ error: 'Match not found' });
    const m = matchRows[0];
    if (m.status !== 'active') return res.status(409).json({ error: 'Match not active' });
    const isP1 = req.user.id === m.player1_id;
    const isP2 = req.user.id === m.player2_id;
    if (!isP1 && !isP2) return res.status(403).json({ error: 'Not a player' });

    // Hard floor: must have at least 24 tile taps
    if (steps < 24) return res.status(400).json({ error: 'Invalid step count' });

    // Bulk-insert telemetry into pvp_moves
    if (telemetry.length > 0) {
      const params = [];
      const clauses = [];
      telemetry.forEach((t, i) => {
        const base = i * 5;
        params.push(
          matchId,
          req.user.id,
          Number.isFinite(t.moveSeq) ? Math.round(t.moveSeq) : i,
          Number.isFinite(t.tileType) ? Math.round(t.tileType) : null,
          t.tsClient ? new Date(t.tsClient).toISOString() : null
        );
        clauses.push(`($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`);
      });
      try {
        await pool.query(
          `INSERT INTO pvp_moves (match_id, player_id, move_seq, tile_type, ts_client)
           VALUES ${clauses.join(',')}
           ON CONFLICT (match_id, player_id, move_seq) DO NOTHING`,
          params
        );
      } catch (insertErr) {
        console.error('[pvp] telemetry insert failed:', insertErr.message);
      }
    }

    // Anti-cheat validation against client timestamps
    let disputed = false;
    const clientTimes = telemetry
      .filter(t => Number.isFinite(t.tsClient))
      .map(t => t.tsClient)
      .sort((a, b) => a - b);

    if (clientTimes.length >= 2) {
      // Per-move interval: >5% under 250ms = suspicious, >15% = disputed
      const intervals = [];
      for (let i = 1; i < clientTimes.length; i++) intervals.push(clientTimes[i] - clientTimes[i - 1]);
      const fastCount = intervals.filter(iv => iv < 250).length;
      const fastRatio = fastCount / intervals.length;
      if (fastRatio > 0.15) {
        console.warn(`[pvp] anti-cheat disputed (${(fastRatio*100).toFixed(1)}% fast intervals): ${req.user.id} in ${matchId}`);
        disputed = true;
      } else if (fastRatio > 0.05) {
        console.warn(`[pvp] anti-cheat suspicious: ${req.user.id} in ${matchId}`);
      }

      // Aggregate rate: >3.0 moves/sec = disputed
      const spanMs = clientTimes[clientTimes.length - 1] - clientTimes[0];
      if (!disputed && spanMs > 0 && (clientTimes.length / (spanMs / 1000)) > 3.0) {
        console.warn(`[pvp] anti-cheat disputed (aggregate rate): ${req.user.id} in ${matchId}`);
        disputed = true;
      }

      // Timestamp drift: >15s beyond match duration = disputed
      if (!disputed) {
        const matchStartMs = m.started_at
          ? new Date(m.started_at).getTime()
          : new Date(m.created_at).getTime();
        const matchDurationMs = Date.now() - matchStartMs;
        const clientSpanMs = clientTimes[clientTimes.length - 1] - clientTimes[0];
        if (clientSpanMs > matchDurationMs + 15000) {
          console.warn(`[pvp] anti-cheat disputed (ts drift ${clientSpanMs}ms vs ${matchDurationMs}ms): ${req.user.id} in ${matchId}`);
          disputed = true;
        }
      }
    }

    // Board reconstruction: validate reported tile types exist on this board
    if (!disputed && m.board_seed && telemetry.length > 0) {
      const tiles = pvpGenerateLevel(TM_PVP_CONFIG, Number(m.board_seed));
      const validTypes = new Set(tiles.map(t => t.type));
      const invalidCount = telemetry.filter(t =>
        Number.isFinite(t.tileType) && !validTypes.has(t.tileType)
      ).length;
      if (invalidCount > 0) {
        console.warn(`[pvp] anti-cheat disputed (${invalidCount} invalid tile types): ${req.user.id} in ${matchId}`);
        disputed = true;
      }
    }

    if (disputed) {
      await pool.query(
        `UPDATE pvp_matches SET status = 'disputed', updated_at = now() WHERE id = $1 AND status = 'active'`,
        [matchId]
      );
      return res.status(409).json({ error: 'Result rejected by anti-cheat', disputed: true });
    }

    // Record result for this player
    const scoreCol = isP1 ? 'p1_score'       : 'p2_score';
    const stepsCol = isP1 ? 'p1_steps'       : 'p2_steps';
    const timeCol  = isP1 ? 'p1_time_secs'   : 'p2_time_secs';
    const finCol   = isP1 ? 'p1_finished_at' : 'p2_finished_at';
    const remCol   = isP1 ? 'p1_remaining'   : 'p2_remaining';

    const { rows: updated } = await pool.query(`
      UPDATE pvp_matches
        SET ${scoreCol} = $2, ${stepsCol} = $3, ${timeCol} = $4,
            ${finCol} = now(), ${remCol} = $5, updated_at = now()
      WHERE id = $1 AND status = 'active' RETURNING *
    `, [matchId, score, steps, timeSecs, remainingTiles]);

    if (!updated.length) {
      const { rows: cur } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
      return res.json({ match: shapePvpMatch(cur[0], req.user.id) });
    }
    const mu = updated[0];

    // ---- DApp Mode: mint a verified session from this player's telemetry ----
    // Reuses the same telemetry + board-seed the anti-cheat above already
    // validated; builds the hash-chain ledger server-side and persists it so the
    // PvP result carries a Verified badge + on-chain-anchorable session receipt.
    let dappSession = null;
    try {
      if (mu.board_seed != null) {
        const sid = newSessionId();
        await pool.query(
          `INSERT INTO game_sessions (id, user_id, username, usernode_pubkey, game_id, seed, status)
           VALUES ($1, $2, $3, $4, 'tilematch_pvp', $5, 'active')`,
          [sid, req.user.id, req.user.username || null, req.user.usernode_pubkey || null, Number(mu.board_seed)]
        );
        const sess = { id: sid, game_id: 'tilematch_pvp', seed: Number(mu.board_seed), usernode_pubkey: req.user.usernode_pubkey };
        const moves = telemetry
          .filter(t => Number.isFinite(t.tileType))
          .map(t => ({ tileType: Math.round(t.tileType), tsClient: t.tsClient ? new Date(t.tsClient).toISOString() : null }));
        let built = null;
        try { built = dapp.buildLedger(sess, moves); } catch (e) { built = null; }
        if (built) {
          for (const e of built.entries) {
            await pool.query(
              `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (session_id, sequence) DO NOTHING`,
              [sid, e.sequence, JSON.stringify(e.move), e.stateHash, e.prevHash, e.chainHash, e.tsClient]
            );
          }
          await pool.query(
            `UPDATE game_sessions SET status='verified', final_score=$2, final_steps=$3,
                    final_time_secs=$4, final_chain_hash=$5, finished_at=now() WHERE id=$1`,
            [sid, score, steps, timeSecs, built.finalChainHash]
          );
        } else {
          await pool.query(
            `UPDATE game_sessions SET status='disputed', dispute_reason='ledger_build_failed', finished_at=now() WHERE id=$1`,
            [sid]
          );
        }
        const { rows: sRows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [sid]);
        dappSession = shapeSession(sRows[0]);
      }
    } catch (dappErr) {
      console.error('[pvp] dapp session mint failed (non-fatal):', dappErr.message);
    }

    if (!mu.p1_finished_at || !mu.p2_finished_at) {
      return res.json({ waiting: true, match: shapePvpMatch(mu, req.user.id), dapp: dappSession });
    }

    // Both done — higher score wins; ties go to faster time
    const p1Wins    = mu.p1_score > mu.p2_score ||
                      (mu.p1_score === mu.p2_score && mu.p1_time_secs < mu.p2_time_secs);
    const winnerId  = p1Wins ? mu.player1_id  : mu.player2_id;
    const winnerAddr = p1Wins ? mu.player1_addr : mu.player2_addr;

    const { rows: finishedRows } = await pool.query(`
      UPDATE pvp_matches SET status = 'finished', winner_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'active' RETURNING *
    `, [matchId, winnerId]);

    if (!finishedRows.length) {
      const { rows: cur } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
      return res.json({ match: shapePvpMatch(cur[0], req.user.id) });
    }

    const final = finishedRows[0];
    let claimCalldata = null;

    if (validatorWallet && winnerAddr && /^0x[0-9a-fA-F]{40}$/.test(winnerAddr)) {
      try {
        const matchId32 = pvpMatchBytes32(matchId);
        const innerHash = ethers.keccak256(
          ethers.solidityPacked(['bytes32', 'address'], [matchId32, winnerAddr])
        );
        const sig = await validatorWallet.signMessage(ethers.getBytes(innerHash));
        claimCalldata = WAGER_IFACE.encodeFunctionData('claimWin', [matchId32, winnerAddr, sig]);
      } catch (sigErr) {
        console.error('[pvp] signing failed:', sigErr.message);
      }
    }

    const betTier   = final.bet_tier || 10;
    const pot       = betTier * 2;
    const winnerPrize = Math.floor(pot * 0.9);

    res.json({
      match:        shapePvpMatch(final, req.user.id),
      isWinner:     req.user.id === winnerId,
      claimCalldata,
      contractAddr: UTGO_CONTRACT_ADDRESS || null,
      prize: {
        betTier,
        pot,
        winnerPrize,
        treasuryFee: Math.floor(pot * 0.08),
        burned: pot - winnerPrize - Math.floor(pot * 0.08),
      },
      telemetrySummary: {
        moveCount:    telemetry.length,
        timeTaken:    timeSecs,
        tilesCleared: 72 - remainingTiles,
      },
      dapp: dappSession,
    });
  } catch (err) {
    console.error('[pvp] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// POST /api/pvp/match/:matchId/forfeit — forfeit; opponent wins immediately
app.post('/api/pvp/match/:matchId/forfeit', async (req, res) => {
  const { matchId } = req.params;
  try {
    const { rows: matchRows } = await pool.query(
      'SELECT * FROM pvp_matches WHERE id = $1', [matchId]
    );
    if (matchRows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const m = matchRows[0];
    if (m.status !== 'active') return res.status(409).json({ error: 'Match not active' });

    const isP1 = req.user.id === m.player1_id;
    const isP2 = req.user.id === m.player2_id;
    if (!isP1 && !isP2) return res.status(403).json({ error: 'Not a player' });

    const opponentId   = isP1 ? m.player2_id : m.player1_id;
    const opponentAddr = isP1 ? m.player2_addr : m.player1_addr;

    const { rows } = await pool.query(`
      UPDATE pvp_matches SET status = 'finished', winner_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'active' RETURNING *
    `, [matchId, opponentId]);

    if (rows.length === 0) return res.status(409).json({ error: 'Match already settled' });

    let claimCalldata = null;
    if (validatorWallet && opponentAddr && /^0x[0-9a-fA-F]{40}$/.test(opponentAddr)) {
      try {
        const matchId32 = pvpMatchBytes32(matchId);
        const innerHash = ethers.keccak256(
          ethers.solidityPacked(['bytes32', 'address'], [matchId32, opponentAddr])
        );
        const sig = await validatorWallet.signMessage(ethers.getBytes(innerHash));
        claimCalldata = WAGER_IFACE.encodeFunctionData('claimWin', [matchId32, opponentAddr, sig]);
      } catch (sigErr) {
        console.error('[pvp] forfeit signing failed:', sigErr.message);
      }
    }

    res.json({
      forfeited:    true,
      opponentId,
      claimCalldata,
      contractAddr: UTGO_CONTRACT_ADDRESS || null,
    });
  } catch (err) {
    console.error('[pvp] forfeit failed:', err.message);
    res.status(500).json({ error: 'Failed to forfeit' });
  }
});

// ---- Wallet API ----------------------------------------------------------

// POST /api/wallet/link { addr }
// Upsert the caller's EVM wallet address (captured client-side via bridge getNodeAddress).
app.post('/api/wallet/link', async (req, res) => {
  const { addr } = req.body;
  if (!addr || !EVM_ADDR_RE.test(addr)) {
    return res.status(400).json({ error: 'Valid EVM address required' });
  }
  try {
    await pool.query(
      `INSERT INTO user_wallets (user_id, wallet_addr, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE
         SET wallet_addr = EXCLUDED.wallet_addr, updated_at = now()`,
      [req.user.id, addr]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[wallet] link failed:', err.message);
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// GET /api/wallet
// Full wallet state for the Wallet screen: address, on-chain balance, pending rewards,
// streak freezes, and recent activity (rewards earned + tips sent/received + claims).
app.get('/api/wallet', async (req, res) => {
  try {
    // Staging demo seed: a MATCH balance + a handful of ledger movements for the
    // current viewer so the (single-currency) Wallet screen is demonstrable on a
    // fresh staging DB. Obviously-fake, idempotent, no-op in production.
    if (IS_STAGING && req.query.demo === '1') {
      const fakeAddr = '0xDEAD000000000000000000000000000000009999';
      await pool.query(
        `INSERT INTO user_wallets (user_id, wallet_addr) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, fakeAddr]
      );
      // DApp Mode: seed a verified ownership proof so the "Verified identity"
      // badge renders.
      await pool.query(
        `INSERT INTO wallet_ownership_proofs (user_id, usernode_pubkey, wallet_addr, nonce, signature)
         VALUES ($1, $2, $3, 'staging-demo-nonce', '0xstagingdemosignature')
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, req.user.usernode_pubkey || 'ut1stagingdemo', fakeAddr]
      );
      // MATCH balance + a banked freeze.
      await pool.query(
        `INSERT INTO tilematch_tokens (user_id, username, balance)
         VALUES ($1, $2, 120)
         ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(tilematch_tokens.balance, 120)`,
        [req.user.id, req.user.username || 'staging-demo-user']
      );
      await pool.query(
        `INSERT INTO user_stats_snapshot (user_id, streak_freezes)
         VALUES ($1, 1) ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id]
      );
      // A few demo ledger rows (anchored earn, hint spend, received tip, migration).
      const { rows: existing } = await pool.query(
        `SELECT 1 FROM match_ledger_events WHERE user_id = $1 AND anchor_tx_hash = '0xstagingmatch01' LIMIT 1`,
        [req.user.id]
      );
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO match_ledger_events
             (user_id, kind, game_id, attempt_date, amount, balance_after, counterpart, chain_hash, anchor_status, anchor_tx_hash)
           VALUES
             ($1, 'earn', 'sudoku', (now() AT TIME ZONE 'utc')::date, 10, 120, NULL, 'deadbeefearn', 'anchored', '0xstagingmatch01'),
             ($1, 'spend_hint', 'cryptowordle', (now() AT TIME ZONE 'utc')::date, -2, 118, NULL, 'deadbeefhint', 'mock', NULL),
             ($1, 'tip_received', NULL, NULL, 5, 125, 'Staging demo Ada', 'deadbeeftip', 'anchored', '0xstagingmatch02'),
             ($1, 'migration', NULL, NULL, 30, 150, NULL, NULL, 'migration', NULL)`,
          [req.user.id]
        );
      }
    }

    // Optional linked wallet address (for the identity card only — MATCH itself
    // is off-chain and needs no linked wallet).
    const { rows: wRows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`,
      [req.user.id]
    );
    const addr = wRows.length > 0 ? wRows[0].wallet_addr : null;

    // MATCH balance (the single currency).
    await pool.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows: bRows } = await pool.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1`,
      [req.user.id]
    );
    const balance = bRows.length ? bRows[0].balance : 0;

    // Lifetime earned / spent derived from the ledger.
    const { rows: lifeRows } = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int AS earned,
         COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)::int AS spent
       FROM match_ledger_events WHERE user_id = $1`,
      [req.user.id]
    );
    const lifetimeEarned = lifeRows.length ? lifeRows[0].earned : 0;
    const lifetimeSpent  = lifeRows.length ? lifeRows[0].spent  : 0;

    // Streak freezes
    const { rows: sRows } = await pool.query(
      `SELECT streak_freezes FROM user_stats_snapshot WHERE user_id = $1`,
      [req.user.id]
    );
    const streakFreezes = sRows.length > 0 ? (sRows[0].streak_freezes || 0) : 0;

    // DApp Mode: is this wallet identity cryptographically proven?
    const { rows: proofRows } = await pool.query(
      `SELECT verified_at FROM wallet_ownership_proofs WHERE user_id = $1`,
      [req.user.id]
    );
    const identityVerified = proofRows.length > 0;

    // Recent activity from the unified MATCH ledger — last 10 events.
    const { rows: evtRows } = await pool.query(
      `SELECT kind, amount, counterpart, anchor_status, anchor_tx_hash, chain_hash, created_at
         FROM match_ledger_events WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );

    res.json({
      addr,
      balance,
      lifetimeEarned,
      lifetimeSpent,
      streakFreezes,
      streakFreezePrice: STREAK_FREEZE_PRICE_MATCH,
      identityVerified,
      recent: evtRows,
    });
  } catch (err) {
    console.error('[wallet] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load wallet' });
  }
});

// GET /api/wallet/balance?addr=0x…
// On-chain balance for any address. Used by the nav balance chip.
app.get('/api/wallet/balance', async (req, res) => {
  const addr = req.query.addr;
  if (!addr || !EVM_ADDR_RE.test(addr)) {
    return res.status(400).json({ error: 'Valid EVM address required' });
  }
  try {
    if (IS_STAGING || !utgoProvider || !UTGO_CONTRACT_ADDRESS) {
      return res.json({ balance: ethers.parseUnits('10', 18).toString(), mock: true });
    }
    const token = new ethers.Contract(UTGO_CONTRACT_ADDRESS, UTGO_ABI_BALANCE, utgoProvider);
    const balance = await token.balanceOf(addr);
    res.json({ balance: balance.toString(), mock: false });
  } catch (err) {
    console.error('[wallet] balance check failed:', err.message);
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

// LEGACY tip/prepare + tip/confirm (on-chain $UTGO transfer) removed — tips now
// move MATCH via POST /api/wallet/tip (defined below).

// RETIRED: $UTGO rewards are folded into MATCH (the single in-app currency),
// which is earned and spent in-app with no claim step. These endpoints return
// 410 Gone so any stale client falls back gracefully.
app.post('/api/wallet/rewards/claim', (_req, res) => {
  res.status(410).json({ error: 'Rewards are now MATCH — claiming has been retired.' });
});
app.post('/api/wallet/rewards/claim/confirm', (_req, res) => {
  res.status(410).json({ error: 'Rewards are now MATCH — claiming has been retired.' });
});

// POST /api/wallet/spend/streak-freeze
// Debit STREAK_FREEZE_PRICE_MATCH from the MATCH balance and add one freeze.
// Atomic (SERIALIZABLE + FOR UPDATE), mirroring the hint-spend pattern, and
// records a 'spend_freeze' ledger row that the client anchors on-chain.
app.post('/api/wallet/spend/streak-freeze', async (req, res) => {
  const cost = STREAK_FREEZE_PRICE_MATCH;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows: balRows } = await client.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const balance = balRows.length ? balRows[0].balance : 0;
    if (balance < cost) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'insufficient_funds', error: 'Insufficient MATCH', balance });
    }
    const { rows: newBal } = await client.query(
      `UPDATE tilematch_tokens SET balance = balance - $2, updated_at = now()
        WHERE user_id = $1 RETURNING balance`,
      [req.user.id, cost]
    );
    const balanceAfter = newBal[0].balance;
    await client.query(
      `INSERT INTO user_stats_snapshot (user_id, streak_freezes)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET streak_freezes = user_stats_snapshot.streak_freezes + 1, updated_at = now()`,
      [req.user.id]
    );
    const { rows: evt } = await client.query(
      `INSERT INTO match_ledger_events (user_id, kind, amount, balance_after, anchor_status)
       VALUES ($1, 'spend_freeze', $2, $3, 'pending') RETURNING id`,
      [req.user.id, -cost, balanceAfter]
    );
    const eventId = evt[0].id;
    const chainHash = matchChainHash({ userId: req.user.id, kind: 'spend_freeze', amount: -cost, eventId });
    await client.query(`UPDATE match_ledger_events SET chain_hash = $2 WHERE id = $1`, [eventId, chainHash]);
    const { rows: sRows } = await client.query(
      `SELECT streak_freezes FROM user_stats_snapshot WHERE user_id = $1`,
      [req.user.id]
    );
    await client.query('COMMIT');
    res.json({
      ok: true,
      streakFreezes: sRows.length > 0 ? sRows[0].streak_freezes : 1,
      balance: balanceAfter,
      receipt: { eventId, chainHash, amount: -cost, anchorStatus: 'pending', balanceAfter },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[wallet] streak-freeze failed:', err.message);
    res.status(500).json({ error: 'Failed to purchase streak freeze' });
  } finally {
    client.release();
  }
});

// POST /api/wallet/tip { toUserId, amount } — MATCH ledger transfer (replaces
// the legacy on-chain $UTGO transfer). Atomic: debit sender, credit recipient,
// write paired tip_sent / tip_received ledger rows. The sender's row is
// anchored on-chain client-side.
app.post('/api/wallet/tip', async (req, res) => {
  const toUserId = req.body.toUserId;
  const amount = Number.isFinite(req.body.amount) ? Math.round(req.body.amount) : null;
  if (!toUserId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'toUserId and positive integer amount required' });
  }
  if (toUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot tip yourself' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows: balRows } = await client.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const balance = balRows.length ? balRows[0].balance : 0;
    if (balance < amount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'insufficient_funds', error: 'Insufficient MATCH', balance });
    }
    const { rows: senderBal } = await client.query(
      `UPDATE tilematch_tokens SET balance = balance - $2, updated_at = now()
        WHERE user_id = $1 RETURNING balance`,
      [req.user.id, amount]
    );
    await client.query(
      `INSERT INTO tilematch_tokens (user_id, balance)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $2, updated_at = now()`,
      [toUserId, amount]
    );
    const senderAfter = senderBal[0].balance;
    const { rows: evt } = await client.query(
      `INSERT INTO match_ledger_events (user_id, kind, amount, balance_after, counterpart, anchor_status)
       VALUES ($1, 'tip_sent', $2, $3, $4, 'pending') RETURNING id`,
      [req.user.id, -amount, senderAfter, toUserId]
    );
    const eventId = evt[0].id;
    const chainHash = matchChainHash({ userId: req.user.id, kind: 'tip_sent', amount: -amount, eventId });
    await client.query(`UPDATE match_ledger_events SET chain_hash = $2 WHERE id = $1`, [eventId, chainHash]);
    await client.query(
      `INSERT INTO match_ledger_events (user_id, kind, amount, counterpart, anchor_status)
       VALUES ($1, 'tip_received', $2, $3, 'pending')`,
      [toUserId, amount, req.user.id]
    );
    await client.query('COMMIT');
    res.json({ ok: true, balance: senderAfter, receipt: { eventId, chainHash, amount: -amount, anchorStatus: 'pending', balanceAfter: senderAfter } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[wallet] tip failed:', err.message);
    res.status(500).json({ error: 'Failed to send tip' });
  } finally {
    client.release();
  }
});

// POST /api/match/ledger/:eventId/anchor/confirm { txHash, mock }
// Record the on-chain anchor result for a MATCH ledger event the client just
// sent via the bridge. Mirrors the dapp session anchor/confirm.
app.post('/api/match/ledger/:eventId/anchor/confirm', async (req, res) => {
  const eventId = req.params.eventId;
  const txHash = typeof req.body.txHash === 'string' ? req.body.txHash : null;
  const mock = !!req.body.mock || IS_STAGING || !UTGO_CONTRACT_ADDRESS || !txHash;
  try {
    const { rows } = await pool.query(`SELECT user_id, anchor_status FROM match_ledger_events WHERE id = $1`, [eventId]);
    if (!rows.length) return res.status(404).json({ error: 'Ledger event not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });
    const status = mock ? 'mock' : 'anchored';
    await pool.query(
      `UPDATE match_ledger_events SET anchor_status = $2, anchor_tx_hash = $3 WHERE id = $1`,
      [eventId, status, mock ? null : txHash]
    );
    res.json({ ok: true, anchorStatus: status, anchorTxHash: mock ? null : txHash });
  } catch (err) {
    console.error('[match] anchor confirm failed:', err.message);
    res.status(500).json({ error: 'Failed to record anchor' });
  }
});

// ---- Crypto Wordle paid hints --------------------------------------------
// Per-UTC-day hint purchase counter with a doubling MATCH-token cost. The
// count is server-authoritative (survives reload, can't be reset client-side)
// and resets implicitly each UTC day. Hints never affect score/leaderboard.

// GET /api/cryptowordle/hint — today's { hintsPurchased, nextCost, balance }.
app.get('/api/cryptowordle/hint', async (req, res) => {
  try {
    // Lazy-init the MATCH wallet so a brand-new user reads a real 0 balance.
    await pool.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows: hRows } = await pool.query(
      `SELECT hints_purchased FROM cryptowordle_hints
        WHERE user_id = $1 AND hint_date = (now() AT TIME ZONE 'utc')::date`,
      [req.user.id]
    );
    const { rows: bRows } = await pool.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1`,
      [req.user.id]
    );
    const hintsPurchased = hRows.length ? hRows[0].hints_purchased : 0;
    res.json({
      hintsPurchased,
      nextCost: cwHintCost(hintsPurchased),
      balance: bRows.length ? bRows[0].balance : 0,
    });
  } catch (err) {
    console.error('[cryptowordle] hint read failed:', err.message);
    res.status(500).json({ error: 'Failed to load hint state' });
  }
});

// POST /api/cryptowordle/hint — buy the next hint. Atomically bumps today's
// counter and debits the doubling MATCH cost, mirroring the duel-join spend
// pattern (SERIALIZABLE + FOR UPDATE). Body may carry { maxHints } (the day's
// available clue count) so the server refuses to charge past the last clue.
app.post('/api/cryptowordle/hint', async (req, res) => {
  const maxHints = Number.isFinite(req.body.maxHints) ? Math.max(0, Math.round(req.body.maxHints)) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Today's hint counter, locked. Upsert-then-lock so the row always exists.
    await client.query(
      `INSERT INTO cryptowordle_hints (user_id, username, hint_date, hints_purchased)
       VALUES ($1, $2, (now() AT TIME ZONE 'utc')::date, 0)
       ON CONFLICT (user_id, hint_date) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows: hRows } = await client.query(
      `SELECT hints_purchased FROM cryptowordle_hints
        WHERE user_id = $1 AND hint_date = (now() AT TIME ZONE 'utc')::date
        FOR UPDATE`,
      [req.user.id]
    );
    const purchased = hRows.length ? hRows[0].hints_purchased : 0;

    // No clues left to reveal (client-known cap) → don't charge.
    if (maxHints != null && purchased >= maxHints) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'no_more_hints', error: 'No more clues' });
    }

    const cost = cwHintCost(purchased);

    // Check + deduct MATCH balance, locked.
    const { rows: balRows } = await client.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const balance = balRows.length ? balRows[0].balance : 0;
    if (balance < cost) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'insufficient_funds', error: 'Insufficient tokens', balance });
    }
    await client.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO UPDATE SET
         balance    = tilematch_tokens.balance - $3,
         updated_at = now()`,
      [req.user.id, req.user.username || null, cost]
    );
    await client.query(
      `UPDATE cryptowordle_hints
          SET hints_purchased = hints_purchased + 1, updated_at = now()
        WHERE user_id = $1 AND hint_date = (now() AT TIME ZONE 'utc')::date`,
      [req.user.id]
    );

    // Record the spend in the unified MATCH ledger (idempotent per day+amount).
    const balanceAfter = balance - cost;
    let receipt = null;
    try {
      const { rows: evt } = await client.query(
        `INSERT INTO match_ledger_events (user_id, kind, game_id, attempt_date, amount, balance_after, anchor_status)
         VALUES ($1, 'spend_hint', 'cryptowordle', (now() AT TIME ZONE 'utc')::date, $2, $3, 'pending')
         ON CONFLICT (user_id, attempt_date, amount, kind) WHERE kind = 'spend_hint' DO NOTHING
         RETURNING id`,
        [req.user.id, -cost, balanceAfter]
      );
      if (evt.length > 0) {
        const eventId = evt[0].id;
        const chainHash = matchChainHash({ userId: req.user.id, kind: 'spend_hint', gameId: 'cryptowordle', amount: -cost, eventId });
        await client.query(`UPDATE match_ledger_events SET chain_hash = $2 WHERE id = $1`, [eventId, chainHash]);
        receipt = { eventId, chainHash, amount: -cost, anchorStatus: 'pending', balanceAfter };
      }
    } catch (ledgerErr) {
      console.warn('[cryptowordle] hint ledger write failed (non-fatal):', ledgerErr.message);
    }

    await client.query('COMMIT');
    const hintsPurchased = purchased + 1;
    res.json({
      hintsPurchased,
      nextCost: cwHintCost(hintsPurchased),
      balance: balanceAfter,
      receipt,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[cryptowordle] hint buy failed:', err.message);
    res.status(500).json({ error: 'Failed to buy hint' });
  } finally {
    client.release();
  }
});

// ---- dApps integration (app-identity signing) -----------------------------
// Gated on APP_SECRET_KEY. When the secret is empty/missing (e.g. a staging
// preview whose staging_default is ""), these routes degrade gracefully: the
// server still boots, signing is skipped, and the routes report the feature as
// unavailable so the frontend hides/disables the related UI.

// Current integration availability for the signed-in user. Always 200 so the
// UI can branch on `enabled` rather than handling an error path.
app.get('/api/integration/status', (_req, res) => {
  res.json({
    enabled: APP_INTEGRATION_ENABLED,
    pubkey: APP_INTEGRATION_ENABLED ? (APP_PUBKEY || null) : null,
  });
});

// Sign an integration payload with the app secret. Returns 503 with a clear
// message when the feature is disabled so callers never reach a signing path
// that doesn't exist in this environment.
app.post('/api/integration/sign', (req, res) => {
  if (!APP_INTEGRATION_ENABLED) {
    return res.status(503).json({
      error: 'integration unavailable in this environment',
      code: 'integration_disabled',
      enabled: false,
    });
  }
  const payload = req.body && req.body.payload;
  if (payload === undefined || payload === null) {
    return res.status(400).json({ error: 'Missing payload' });
  }
  res.json({
    enabled: true,
    pubkey: APP_PUBKEY || null,
    signature: signIntegrationPayload(payload),
  });
});

// ---- Static + HTML shell -------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

// HTML shell: serve the app if authenticated, otherwise an "open in Usernode"
// ---- Tile Match Puzzle API (/api/tilematch/*) --------------------------------
// Off-chain MATCH token economy: leaderboard, wallet, daily tasks, 1v1 duels.
// All routes are auth-gated (req.user is always present here).

// --- Leaderboard ---

app.get('/api/tilematch/leaderboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Global: top 25 by highest_level (ties: earliest updated_at)
    const { rows: global } = await pool.query(
      `SELECT user_id, username, highest_level, total_cleared,
              ROW_NUMBER() OVER (ORDER BY highest_level DESC, updated_at ASC) AS rank
         FROM tilematch_scores
        ORDER BY highest_level DESC, updated_at ASC
        LIMIT 25`
    );

    // Daily: top 25 daily completions by time_secs for today
    const { rows: daily } = await pool.query(
      `SELECT user_id, username, time_secs, score,
              ROW_NUMBER() OVER (ORDER BY time_secs ASC, finished_at ASC) AS rank
         FROM daily_attempts
        WHERE game_id = 'tilematchingdaily'
          AND attempt_date = $1
          AND finished_at IS NOT NULL
          AND score > 0
        ORDER BY time_secs ASC, finished_at ASC
        LIMIT 25`,
      [today]
    );

    // Me — global rank
    let meGlobal = null;
    const { rows: myGlobal } = await pool.query(
      `SELECT username, highest_level, total_cleared, updated_at FROM tilematch_scores WHERE user_id = $1`,
      [req.user.id]
    );
    if (myGlobal.length) {
      const r = myGlobal[0];
      const { rows: gr } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM tilematch_scores
          WHERE highest_level > $1
             OR (highest_level = $1 AND updated_at < $2)`,
        [r.highest_level, r.updated_at]
      );
      meGlobal = { rank: Number(gr[0].rank), username: r.username, highestLevel: r.highest_level, totalCleared: r.total_cleared };
    }

    // Me — daily rank
    let meDaily = null;
    const { rows: myDaily } = await pool.query(
      `SELECT username, time_secs, score, finished_at FROM daily_attempts
        WHERE user_id = $1 AND game_id = 'tilematchingdaily'
          AND attempt_date = $2 AND finished_at IS NOT NULL AND score > 0`,
      [req.user.id, today]
    );
    if (myDaily.length) {
      const r = myDaily[0];
      const { rows: dr } = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM daily_attempts
          WHERE game_id = 'tilematchingdaily' AND attempt_date = $1
            AND finished_at IS NOT NULL AND score > 0
            AND (time_secs < $2 OR (time_secs = $2 AND finished_at < $3))`,
        [today, r.time_secs, r.finished_at]
      );
      meDaily = { rank: Number(dr[0].rank), username: r.username, timeSecs: r.time_secs, score: r.score };
    }

    res.json({
      global: global.map(r => ({ rank: Number(r.rank), username: r.username, highestLevel: r.highest_level, totalCleared: r.total_cleared })),
      daily:  daily.map(r => ({ rank: Number(r.rank), username: r.username, timeSecs: r.time_secs, score: r.score })),
      me: { global: meGlobal, daily: meDaily },
    });
  } catch (err) {
    console.error('[tilematch] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// --- Score submit ---

app.post('/api/tilematch/scores/submit', async (req, res) => {
  const highestLevel  = Number.isFinite(req.body.highestLevel)  ? Math.round(req.body.highestLevel)  : 0;
  const totalCleared  = Number.isFinite(req.body.totalCleared)  ? Math.round(req.body.totalCleared)  : 0;
  const sessionScore  = Number.isFinite(req.body.sessionScore)  ? Math.round(req.body.sessionScore)  : 0;
  try {
    await pool.query(
      `INSERT INTO tilematch_scores
         (user_id, username, highest_level, total_cleared, best_session_score, games_played)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (user_id) DO UPDATE SET
         username           = EXCLUDED.username,
         highest_level      = GREATEST(tilematch_scores.highest_level, EXCLUDED.highest_level),
         total_cleared      = tilematch_scores.total_cleared + EXCLUDED.total_cleared,
         best_session_score = GREATEST(tilematch_scores.best_session_score, EXCLUDED.best_session_score),
         games_played       = tilematch_scores.games_played + 1,
         updated_at         = now()`,
      [req.user.id, req.user.username || null, highestLevel, totalCleared, sessionScore]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[tilematch] score submit failed:', err.message);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// --- Wallet ---

app.get('/api/tilematch/wallet', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id, req.user.username || null]
    );
    const { rows } = await pool.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ balance: rows.length ? rows[0].balance : 0 });
  } catch (err) {
    console.error('[tilematch] wallet failed:', err.message);
    res.status(500).json({ error: 'Failed to load wallet' });
  }
});

// --- Daily tasks ---

function shapeTmTask(row, def) {
  return {
    id:           row.task_id,
    label:        def.label,
    description:  def.description,
    rewardTokens: def.rewardTokens,
    target:       def.target,
    progress:     row.progress,
    completable:  row.progress >= def.target && !row.claimed_at,
    claimed:      !!row.claimed_at,
  };
}

app.get('/api/tilematch/tasks', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Upsert today's rows (ensures they exist)
    for (const taskId of Object.keys(TILEMATCH_TASK_DEFS)) {
      await pool.query(
        `INSERT INTO tilematch_daily_tasks (user_id, task_date, task_id, progress)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (user_id, task_date, task_id) DO NOTHING`,
        [req.user.id, today, taskId]
      );
    }
    const { rows } = await pool.query(
      `SELECT task_id, progress, claimed_at FROM tilematch_daily_tasks
        WHERE user_id = $1 AND task_date = $2`,
      [req.user.id, today]
    );
    const taskMap = {};
    rows.forEach(r => { taskMap[r.task_id] = r; });
    const tasks = Object.entries(TILEMATCH_TASK_DEFS).map(([id, def]) => {
      const row = taskMap[id] || { task_id: id, progress: 0, claimed_at: null };
      return shapeTmTask(row, def);
    });
    // Next reset: midnight UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    res.json({ tasks, resetAt: tomorrow.toISOString() });
  } catch (err) {
    console.error('[tilematch] tasks failed:', err.message);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.post('/api/tilematch/tasks/report', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const levelsCleared = Number.isFinite(req.body.levelsCleared) ? Math.max(0, Math.round(req.body.levelsCleared)) : 0;
    const tileTaps      = Number.isFinite(req.body.tileTaps)      ? Math.max(0, Math.round(req.body.tileTaps))      : 0;

    if (levelsCleared > 0) {
      await pool.query(
        `INSERT INTO tilematch_daily_tasks (user_id, task_date, task_id, progress)
         VALUES ($1, $2, 'clear_3_levels', $3)
         ON CONFLICT (user_id, task_date, task_id)
         DO UPDATE SET progress = LEAST(3, tilematch_daily_tasks.progress + $3)`,
        [req.user.id, today, levelsCleared]
      );
    }
    if (tileTaps > 0) {
      await pool.query(
        `INSERT INTO tilematch_daily_tasks (user_id, task_date, task_id, progress)
         VALUES ($1, $2, 'match_50_tiles', $3)
         ON CONFLICT (user_id, task_date, task_id)
         DO UPDATE SET progress = LEAST(50, tilematch_daily_tasks.progress + $3)`,
        [req.user.id, today, tileTaps]
      );
    }

    const { rows } = await pool.query(
      `SELECT task_id, progress, claimed_at FROM tilematch_daily_tasks
        WHERE user_id = $1 AND task_date = $2`,
      [req.user.id, today]
    );
    const taskMap = {};
    rows.forEach(r => { taskMap[r.task_id] = r; });
    const tasks = Object.entries(TILEMATCH_TASK_DEFS).map(([id, def]) => {
      const row = taskMap[id] || { task_id: id, progress: 0, claimed_at: null };
      return shapeTmTask(row, def);
    });
    res.json({ tasks });
  } catch (err) {
    console.error('[tilematch] task report failed:', err.message);
    res.status(500).json({ error: 'Failed to report task progress' });
  }
});

app.post('/api/tilematch/tasks/:taskId/claim', async (req, res) => {
  const { taskId } = req.params;
  const def = TILEMATCH_TASK_DEFS[taskId];
  if (!def) return res.status(400).json({ error: 'Unknown task' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await client.query(
      `SELECT progress, claimed_at FROM tilematch_daily_tasks
        WHERE user_id = $1 AND task_date = $2 AND task_id = $3
        FOR UPDATE`,
      [req.user.id, today, taskId]
    );
    if (!rows.length || rows[0].progress < def.target) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Task not yet completable' });
    }
    if (rows[0].claimed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Already claimed' });
    }
    await client.query(
      `UPDATE tilematch_daily_tasks SET claimed_at = now()
        WHERE user_id = $1 AND task_date = $2 AND task_id = $3`,
      [req.user.id, today, taskId]
    );
    const { rows: balRows } = await client.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         balance    = tilematch_tokens.balance + $3,
         updated_at = now()
       RETURNING balance`,
      [req.user.id, req.user.username || null, def.rewardTokens]
    );
    await client.query('COMMIT');
    res.json({ newBalance: balRows[0].balance, task: { id: taskId, claimed: true } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tilematch] claim failed:', err.message);
    res.status(500).json({ error: 'Failed to claim reward' });
  } finally {
    client.release();
  }
});

// --- Duels ---

function shapeDuel(d) {
  return {
    id:           d.id,
    status:       d.status,
    stakeTokens:  d.stake_tokens,
    boardSeed:    d.board_seed,
    player1Id:    d.player1_id,
    player2Id:    d.player2_id,
    player1Name:  d.player1_name,
    player2Name:  d.player2_name,
    winnerId:     d.winner_id,
    p1Score:      d.p1_score,   p2Score:    d.p2_score,
    p1Steps:      d.p1_steps,   p2Steps:    d.p2_steps,
    p1TimeSecs:   d.p1_time_secs, p2TimeSecs: d.p2_time_secs,
    p1FinishedAt: d.p1_finished_at, p2FinishedAt: d.p2_finished_at,
    createdAt:    d.created_at,
  };
}

// Generate a random duel id
function generateDuelId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'TM';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

app.post('/api/tilematch/duel/join', async (req, res) => {
  const stakeTokens = Number.isFinite(req.body.stakeTokens) ? Math.round(req.body.stakeTokens) : 0;
  if (!TILEMATCH_DUEL_VALID_STAKES.has(stakeTokens)) {
    return res.status(400).json({ error: 'Invalid stake amount' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Check and deduct balance
    const { rows: balRows } = await client.query(
      `SELECT balance FROM tilematch_tokens WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const balance = balRows.length ? balRows[0].balance : 0;
    if (balance < stakeTokens) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Insufficient tokens' });
    }
    // Lazy-init row if needed, then deduct
    await client.query(
      `INSERT INTO tilematch_tokens (user_id, username, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO UPDATE SET
         balance    = tilematch_tokens.balance - $3,
         updated_at = now()`,
      [req.user.id, req.user.username || null, stakeTokens]
    );

    // Try to join an existing waiting duel with the same stake (not own)
    const seed = Math.floor(Math.random() * 2147483647) + 1;
    const { rows: waiting } = await client.query(
      `SELECT id FROM tilematch_duels
        WHERE status = 'waiting' AND stake_tokens = $1 AND player1_id != $2
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [stakeTokens, req.user.id]
    );

    if (waiting.length) {
      // Join existing duel
      const duelId = waiting[0].id;
      await client.query(
        `UPDATE tilematch_duels
            SET player2_id   = $1,
                player2_name = $2,
                board_seed   = $3,
                status       = 'active',
                updated_at   = now()
          WHERE id = $4`,
        [req.user.id, req.user.username || null, seed, duelId]
      );
      const { rows: duelRows } = await client.query(
        `SELECT * FROM tilematch_duels WHERE id = $1`, [duelId]
      );
      await client.query('COMMIT');
      return res.json({ duelId, status: 'active', boardSeed: seed, isCreator: false, duel: shapeDuel(duelRows[0]) });
    }

    // Create new waiting duel
    let duelId = generateDuelId();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await client.query(
          `INSERT INTO tilematch_duels (id, player1_id, player1_name, stake_tokens, status)
           VALUES ($1, $2, $3, $4, 'waiting')`,
          [duelId, req.user.id, req.user.username || null, stakeTokens]
        );
        break;
      } catch (e) {
        if (e.code === '23505') { duelId = generateDuelId(); continue; }
        throw e;
      }
    }
    await client.query('COMMIT');
    res.json({ duelId, status: 'waiting', isCreator: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tilematch] duel join failed:', err.message);
    res.status(500).json({ error: 'Failed to join duel' });
  } finally {
    client.release();
  }
});

// Poll duel state; apply 30s inactivity forfeit
app.get('/api/tilematch/duel/:duelId', async (req, res) => {
  const { duelId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM tilematch_duels WHERE id = $1 FOR UPDATE`, [duelId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Duel not found' }); }
    let d = rows[0];

    const isP1 = d.player1_id === req.user.id;
    const isP2 = d.player2_id === req.user.id;
    if (!isP1 && !isP2) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Not a player' }); }

    // Update last_seen_at
    const seenCol = isP1 ? 'p1_last_seen_at' : 'p2_last_seen_at';
    await client.query(
      `UPDATE tilematch_duels SET ${seenCol} = now(), updated_at = now() WHERE id = $1`,
      [duelId]
    );

    // Apply 30s inactivity forfeit on active duels
    if (d.status === 'active') {
      const opponentSeen = isP1 ? d.p2_last_seen_at : d.p1_last_seen_at;
      const opponentFinished = isP1 ? d.p2_finished_at : d.p1_finished_at;
      if (!opponentFinished && opponentSeen) {
        const idleSecs = (Date.now() - new Date(opponentSeen).getTime()) / 1000;
        if (idleSecs > 30) {
          const winnerId = req.user.id;
          const prize = Math.floor(d.stake_tokens * 2 * 0.9);
          await client.query(
            `UPDATE tilematch_duels SET status = 'finished', winner_id = $1, updated_at = now() WHERE id = $2`,
            [winnerId, duelId]
          );
          await client.query(
            `INSERT INTO tilematch_tokens (user_id, username, balance)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $3, updated_at = now()`,
            [winnerId, req.user.username || null, prize]
          );
          const { rows: updated } = await client.query(`SELECT * FROM tilematch_duels WHERE id = $1`, [duelId]);
          await client.query('COMMIT');
          return res.json({ duel: shapeDuel(updated[0]), inactivityForfeit: true });
        }
      }
    }

    // Matchmaking timeout: refund after 2 minutes if no opponent joined
    if (d.status === 'waiting' && isP1) {
      const ageSecs = (Date.now() - new Date(d.created_at).getTime()) / 1000;
      if (ageSecs > 120) {
        await client.query(
          `UPDATE tilematch_duels SET status = 'cancelled', updated_at = now() WHERE id = $1`,
          [duelId]
        );
        // Refund stake
        await client.query(
          `INSERT INTO tilematch_tokens (user_id, username, balance)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $3, updated_at = now()`,
          [req.user.id, req.user.username || null, d.stake_tokens]
        );
        const { rows: updated } = await client.query(`SELECT * FROM tilematch_duels WHERE id = $1`, [duelId]);
        await client.query('COMMIT');
        return res.json({ duel: shapeDuel(updated[0]), timedOut: true });
      }
    }

    await client.query('COMMIT');
    res.json({ duel: shapeDuel(d) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tilematch] duel get failed:', err.message);
    res.status(500).json({ error: 'Failed to get duel' });
  } finally {
    client.release();
  }
});

app.post('/api/tilematch/duel/:duelId/finish', async (req, res) => {
  const { duelId } = req.params;
  const score     = Number.isFinite(req.body.score)     ? Math.round(req.body.score)     : 0;
  const steps     = Number.isFinite(req.body.steps)     ? Math.round(req.body.steps)     : 0;
  const timeSecs  = Number.isFinite(req.body.timeSecs)  ? Math.round(req.body.timeSecs)  : 0;
  const remaining = Number.isFinite(req.body.remainingTiles) ? Math.round(req.body.remainingTiles) : 0;
  const telemetry = Array.isArray(req.body.telemetry)   ? req.body.telemetry : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM tilematch_duels WHERE id = $1 FOR UPDATE`, [duelId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Duel not found' }); }
    const d = rows[0];

    const isP1 = d.player1_id === req.user.id;
    const isP2 = d.player2_id === req.user.id;
    if (!isP1 && !isP2) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Not a player' }); }
    if (d.status !== 'active') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Duel not active' }); }

    // Anti-cheat: reconstruct board and check tile counts
    const board = pvpGenerateLevel(TM_PVP_CONFIG, d.board_seed);
    const totalTiles = board.length;
    if (steps > totalTiles + 10) { // sanity: can't tap more than tiles + some slack
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid move count' });
    }

    // Record telemetry moves
    if (telemetry.length > 0) {
      for (let i = 0; i < telemetry.length; i++) {
        const m = telemetry[i];
        await client.query(
          `INSERT INTO pvp_moves (match_id, player_id, move_seq, tile_type, ts_client)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (match_id, player_id, move_seq) DO NOTHING`,
          [duelId, req.user.id, i, m.tileType || null, m.ts ? new Date(m.ts) : null]
        );
      }

      // Interval ratio anti-cheat (same as PvP)
      if (telemetry.length >= 3) {
        const intervals = [];
        for (let i = 1; i < telemetry.length; i++) {
          const dt = (new Date(telemetry[i].ts) - new Date(telemetry[i-1].ts));
          if (dt > 0 && dt < 60000) intervals.push(dt);
        }
        if (intervals.length >= 2) {
          const minI = Math.min(...intervals);
          const maxI = Math.max(...intervals);
          if (minI > 0 && maxI / minI > 200) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Suspicious timing pattern' });
          }
        }
      }
    }

    // Update this player's finish
    const scoreCol   = isP1 ? 'p1_score'       : 'p2_score';
    const stepsCol   = isP1 ? 'p1_steps'       : 'p2_steps';
    const timeCol    = isP1 ? 'p1_time_secs'   : 'p2_time_secs';
    const finishedCol= isP1 ? 'p1_finished_at' : 'p2_finished_at';
    await client.query(
      `UPDATE tilematch_duels
          SET ${scoreCol} = $1, ${stepsCol} = $2, ${timeCol} = $3, ${finishedCol} = now(), updated_at = now()
        WHERE id = $4`,
      [score, steps, timeSecs, duelId]
    );

    // Reload
    const { rows: after } = await client.query(`SELECT * FROM tilematch_duels WHERE id = $1`, [duelId]);
    const updated = after[0];

    // Check if both finished
    if (updated.p1_finished_at && updated.p2_finished_at) {
      // Determine winner: higher score; tie → lower timeSecs
      let winnerId;
      if ((updated.p1_score || 0) > (updated.p2_score || 0)) {
        winnerId = updated.player1_id;
      } else if ((updated.p2_score || 0) > (updated.p1_score || 0)) {
        winnerId = updated.player2_id;
      } else {
        winnerId = (updated.p1_time_secs || 999) <= (updated.p2_time_secs || 999)
          ? updated.player1_id : updated.player2_id;
      }
      const prize = Math.floor(updated.stake_tokens * 2 * 0.9);
      await client.query(
        `UPDATE tilematch_duels SET status = 'finished', winner_id = $1, updated_at = now() WHERE id = $2`,
        [winnerId, duelId]
      );
      await client.query(
        `INSERT INTO tilematch_tokens (user_id, username, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $3, updated_at = now()`,
        [winnerId, req.user.username || null, prize]
      );
      const { rows: balRows } = await client.query(
        `SELECT balance FROM tilematch_tokens WHERE user_id = $1`, [req.user.id]
      );
      await client.query('COMMIT');
      const isWinner = winnerId === req.user.id;
      return res.json({
        isWinner,
        newBalance: isWinner ? (balRows[0]?.balance ?? 0) : undefined,
        prize: { stakeTokens: updated.stake_tokens, pot: updated.stake_tokens * 2, winnerPayout: prize },
      });
    }

    await client.query('COMMIT');
    res.json({ waiting: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tilematch] duel finish failed:', err.message);
    res.status(500).json({ error: 'Failed to finish duel' });
  } finally {
    client.release();
  }
});

app.post('/api/tilematch/duel/:duelId/forfeit', async (req, res) => {
  const { duelId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM tilematch_duels WHERE id = $1 FOR UPDATE`, [duelId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Duel not found' }); }
    const d = rows[0];

    const isP1 = d.player1_id === req.user.id;
    const isP2 = d.player2_id === req.user.id;
    if (!isP1 && !isP2) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Not a player' }); }
    if (d.status !== 'active' && d.status !== 'waiting') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Duel not active' });
    }

    const opponentId = isP1 ? d.player2_id : d.player1_id;
    await client.query(
      `UPDATE tilematch_duels SET status = 'finished', winner_id = $1, updated_at = now() WHERE id = $2`,
      [opponentId, duelId]
    );

    // Credit opponent if there was one (and it's an active duel)
    if (opponentId && d.status === 'active') {
      const prize = Math.floor(d.stake_tokens * 2 * 0.9);
      await client.query(
        `INSERT INTO tilematch_tokens (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $2, updated_at = now()`,
        [opponentId, prize]
      );
    } else if (d.status === 'waiting') {
      // Refund creator if no opponent
      await client.query(
        `UPDATE tilematch_duels SET status = 'cancelled', winner_id = NULL, updated_at = now() WHERE id = $1`,
        [duelId]
      );
      await client.query(
        `INSERT INTO tilematch_tokens (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = tilematch_tokens.balance + $2, updated_at = now()`,
        [req.user.id, d.stake_tokens]
      );
    }

    await client.query('COMMIT');
    res.json({ forfeited: true, opponentId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tilematch] forfeit failed:', err.message);
    res.status(500).json({ error: 'Failed to forfeit duel' });
  } finally {
    client.release();
  }
});

// ============================================================
// DApp Mode (Phase 0) — wallet identity + verification framework
// ============================================================

// GET /api/wallet/challenge — issue a one-time nonce for the client to sign
// (via the bridge's signMessage, if available) to prove wallet ownership.
app.get('/api/wallet/challenge', async (req, res) => {
  const nonce = `puzzlechain-ownership:${req.user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  res.json({
    nonce,
    message: `PuzzleChain wallet ownership proof\nuser: ${req.user.id}\nnonce: ${nonce}`,
  });
});

// Canonical message a client signs for an ownership proof.
function ownershipMessage(userId, nonce) {
  return `PuzzleChain wallet ownership proof\nuser: ${userId}\nnonce: ${nonce}`;
}

// POST /api/wallet/prove { addr, nonce, signature }
// Verify the signature recovers `addr`, then record the proof. Additive to the
// existing trust-on-report /api/wallet/link (which stays for lookups).
app.post('/api/wallet/prove', async (req, res) => {
  const { addr, nonce, signature } = req.body || {};
  if (!addr || !EVM_ADDR_RE.test(addr)) return res.status(400).json({ error: 'Valid EVM address required' });
  if (!nonce || !signature) return res.status(400).json({ error: 'nonce and signature required' });
  try {
    let recovered = null;
    try {
      recovered = ethers.verifyMessage(ownershipMessage(req.user.id, nonce), signature);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    if (!recovered || recovered.toLowerCase() !== addr.toLowerCase()) {
      return res.status(400).json({ error: 'Signature does not match address' });
    }
    // Keep the (public) wallet link fresh and record the (private) proof.
    await pool.query(
      `INSERT INTO user_wallets (user_id, wallet_addr, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET wallet_addr = EXCLUDED.wallet_addr, updated_at = now()`,
      [req.user.id, addr]
    );
    await pool.query(
      `INSERT INTO wallet_ownership_proofs (user_id, usernode_pubkey, wallet_addr, nonce, signature, verified_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id) DO UPDATE
         SET usernode_pubkey = EXCLUDED.usernode_pubkey, wallet_addr = EXCLUDED.wallet_addr,
             nonce = EXCLUDED.nonce, signature = EXCLUDED.signature, verified_at = now()`,
      [req.user.id, req.user.usernode_pubkey || null, addr, nonce, signature]
    );
    res.json({ ok: true, verified: true });
  } catch (err) {
    console.error('[wallet] prove failed:', err.message);
    res.status(500).json({ error: 'Failed to record ownership proof' });
  }
});

// POST /api/wallet/disconnect — clear the ownership proof (server-side record of
// "verified identity"). The public link row is left intact for tip lookups.
app.post('/api/wallet/disconnect', async (req, res) => {
  try {
    await pool.query(`DELETE FROM wallet_ownership_proofs WHERE user_id = $1`, [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[wallet] disconnect failed:', err.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Helper: does this user have a verified ownership proof?
async function walletIdentityVerified(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM wallet_ownership_proofs WHERE user_id = $1`, [userId]
  );
  return rows.length > 0;
}

// ---- Account API ----------------------------------------------------------

// GET /api/account — consolidated identity for the Account screen in ONE call:
// username + pubkey from the JWT (req.user), plus wallet link + verified-proof
// status from the DB. Kept separate from /api/daily and /api/wallet (which also
// do streak/balance/rewards work) so the Account screen stays cheap.
app.get('/api/account', async (req, res) => {
  try {
    await ensureUser(req.user.id, req.user.username, req.user.usernode_pubkey);
    const { rows: wRows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`, [req.user.id]
    );
    const walletAddr = wRows.length > 0 ? wRows[0].wallet_addr : null;
    const { rows: pRows } = await pool.query(
      `SELECT verified_at FROM wallet_ownership_proofs WHERE user_id = $1`, [req.user.id]
    );
    const identityVerified = pRows.length > 0;
    res.json({
      username: req.user.username || null,
      id: req.user.id,
      usernodePubkey: req.user.usernode_pubkey || null,
      walletAddr,
      walletLinked: !!walletAddr,
      identityVerified,
      verifiedAt: identityVerified ? pRows[0].verified_at : null,
    });
  } catch (err) {
    console.error('[account] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load account' });
  }
});

// ---- Generic per-user game-state store ------------------------------------
// Reusable key-value persistence keyed to (req.user.id, game_id). New non-daily
// games persist here via GET/PUT /api/state/:gameId. :gameId is validated
// against ALL_GAME_IDS (any hub game), NOT the daily-only GAME_IDS.
const MAX_STATE_BYTES = 100 * 1024; // 100 KB cap on a single state payload

app.get('/api/state/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `SELECT state, updated_at, save_hash, anchor_tx_hash FROM user_game_state WHERE user_id = $1 AND game_id = $2`,
      [req.user.id, gameId]
    );
    if (rows.length === 0) return res.json({ state: null });
    res.json({
      state: rows[0].state,
      updatedAt: rows[0].updated_at,
      saveHash: rows[0].save_hash || null,
      anchorTxHash: rows[0].anchor_tx_hash || null,
    });
  } catch (err) {
    console.error('[state] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

app.put('/api/state/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  const { state } = req.body || {};
  // Require a plain JSON object — reject null / arrays / scalars so the row's
  // shape stays predictable for consumers.
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ error: 'state must be a JSON object' });
  }
  let serialized;
  try { serialized = JSON.stringify(state); }
  catch { return res.status(400).json({ error: 'state not serializable' }); }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
    return res.status(400).json({ error: 'state too large (max 100KB)' });
  }
  const saveHash = crypto.createHash('sha256')
    .update(serialized + '|' + req.user.id + '|' + gameId)
    .digest('hex');
  try {
    // Last-write-wins upsert. Resets anchor_tx_hash so a stale anchor from a
    // previous save doesn't carry forward after the state is overwritten.
    await pool.query(
      `INSERT INTO user_game_state (user_id, username, game_id, state, save_hash, anchor_tx_hash, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NULL, now())
       ON CONFLICT (user_id, game_id) DO UPDATE
         SET state = EXCLUDED.state, username = EXCLUDED.username,
             save_hash = EXCLUDED.save_hash, anchor_tx_hash = NULL, updated_at = now()`,
      [req.user.id, req.user.username || null, gameId, serialized, saveHash]
    );
    res.json({ ok: true, saveHash });
  } catch (err) {
    console.error('[state] PUT failed:', err.message);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// POST /api/state/:gameId/anchor/confirm { txHash }
// Records the on-chain tx hash for the current save. Idempotent; no-ops if
// the row is missing. Only the owning user can confirm their own save.
app.post('/api/state/:gameId/anchor/confirm', async (req, res) => {
  const { gameId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  const { txHash } = req.body || {};
  if (!txHash || typeof txHash !== 'string') return res.status(400).json({ error: 'txHash required' });
  try {
    await pool.query(
      `UPDATE user_game_state SET anchor_tx_hash = $1 WHERE user_id = $2 AND game_id = $3`,
      [txHash, req.user.id, gameId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[state] anchor/confirm failed:', err.message);
    res.status(500).json({ error: 'Failed to confirm anchor' });
  }
});

function newSessionId() {
  return 'S' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function shapeSession(s) {
  return {
    sessionId:      s.id,
    gameId:         s.game_id,
    seed:           s.seed != null ? Number(s.seed) : null,
    status:         s.status,
    disputeReason:  s.dispute_reason || null,
    finalScore:     s.final_score,
    finalSteps:     s.final_steps,
    finalTimeSecs:  s.final_time_secs,
    chainHash:      s.final_chain_hash,
    anchorStatus:   s.anchor_status,
    anchorTxHash:   s.anchor_tx_hash,
    username:       s.username,
    usernodePubkey: s.usernode_pubkey,
    createdAt:      s.created_at,
    finishedAt:     s.finished_at,
  };
}

// POST /api/dapp/sessions/start { gameId, seed? }
// Claims a new verification session. Returns the genesis hash so the client can
// build its hash chain against the same binding the server will recompute.
app.post('/api/dapp/sessions/start', async (req, res) => {
  const { gameId } = req.body || {};
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  if (!dapp.getEngine(gameId)) return res.status(400).json({ error: 'Game not yet supported by DApp Mode' });
  let seed = Number.isFinite(req.body.seed) ? Math.round(req.body.seed) : null;
  if (seed === null) seed = Math.floor(Math.random() * 0x7fffffff);
  try {
    const id = newSessionId();
    await pool.query(
      `INSERT INTO game_sessions (id, user_id, username, usernode_pubkey, game_id, seed, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [id, req.user.id, req.user.username || null, req.user.usernode_pubkey || null, gameId, seed]
    );
    const genesisHash = dapp.genesisHash({ gameId, seed, pubkey: req.user.usernode_pubkey, sessionId: id });
    res.json({ sessionId: id, seed, genesisHash });
  } catch (err) {
    console.error('[dapp] start failed:', err.message);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/dapp/sessions/:id/append { entries:[{sequence,move,stateHash,prevHash,chainHash,tsClient}] }
// Autosave ledger flush. Append-only; rejects a finished or foreign session
// (mirrors the daily/progress immutability rule).
app.post('/api/dapp/sessions/:id/append', async (req, res) => {
  const { id } = req.params;
  const entries = Array.isArray(req.body.entries) ? req.body.entries.slice(0, 500) : [];
  try {
    const { rows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    const s = rows[0];
    if (s.user_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });
    if (s.status !== 'active') return res.status(409).json({ error: 'No active session to append to' });
    for (const e of entries) {
      if (!Number.isInteger(e.sequence) || !e.stateHash || !e.prevHash || !e.chainHash) continue;
      await pool.query(
        `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, sequence) DO NOTHING`,
        [id, e.sequence, e.move != null ? JSON.stringify(e.move) : null,
         e.stateHash, e.prevHash, e.chainHash, e.tsClient ? new Date(e.tsClient).toISOString() : null]
      );
    }
    res.json({ ok: true, count: entries.length });
  } catch (err) {
    console.error('[dapp] append failed:', err.message);
    res.status(500).json({ error: 'Failed to append' });
  }
});

// POST /api/dapp/sessions/:id/finish { entries?, claimedScore, claimedSteps, claimedChainHash, timeSecs }
// Runs validateSession over the (persisted + newly-supplied) ledger, settles the
// session status, and returns the canonical chain hash for the client to anchor.
app.post('/api/dapp/sessions/:id/finish', async (req, res) => {
  const { id } = req.params;
  const supplied = Array.isArray(req.body.entries) ? req.body.entries.slice(0, 500) : [];
  const claimedScore     = Number.isFinite(req.body.claimedScore) ? Math.round(req.body.claimedScore) : null;
  const claimedSteps     = Number.isFinite(req.body.claimedSteps) ? Math.round(req.body.claimedSteps) : null;
  const claimedChainHash = typeof req.body.claimedChainHash === 'string' ? req.body.claimedChainHash : null;
  const timeSecs         = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  try {
    const { rows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    const s = rows[0];
    if (s.user_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });
    if (s.status !== 'active') {
      return res.json({ session: shapeSession(s), alreadyFinished: true });
    }

    // Persist any final entries the client flushed with the finish call.
    for (const e of supplied) {
      if (!Number.isInteger(e.sequence) || !e.stateHash || !e.prevHash || !e.chainHash) continue;
      await pool.query(
        `INSERT INTO session_states (session_id, sequence, move, state_hash, prev_hash, chain_hash, ts_client)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, sequence) DO NOTHING`,
        [id, e.sequence, e.move != null ? JSON.stringify(e.move) : null,
         e.stateHash, e.prevHash, e.chainHash, e.tsClient ? new Date(e.tsClient).toISOString() : null]
      );
    }

    // Load the full ordered ledger.
    const { rows: stateRows } = await pool.query(
      `SELECT sequence, move, state_hash, prev_hash, chain_hash, ts_client
         FROM session_states WHERE session_id = $1 ORDER BY sequence ASC`,
      [id]
    );
    const entries = stateRows.map(r => ({
      sequence: r.sequence,
      move: r.move,
      stateHash: r.state_hash,
      prevHash: r.prev_hash,
      chainHash: r.chain_hash,
      tsClient: r.ts_client,
    }));

    const session = { id: s.id, game_id: s.game_id, seed: Number(s.seed), usernode_pubkey: s.usernode_pubkey };
    const verdict = dapp.validateSession(session, entries, {
      score: claimedScore, steps: claimedSteps, chainHash: claimedChainHash,
    });

    if (verdict.status === 'verified') {
      await pool.query(
        `UPDATE game_sessions
            SET status='verified', final_score=$2, final_steps=$3, final_time_secs=$4,
                final_chain_hash=$5, finished_at=now()
          WHERE id=$1 AND status='active'`,
        [id, verdict.score, verdict.steps, timeSecs, verdict.finalChainHash]
      );
    } else {
      await pool.query(
        `UPDATE game_sessions
            SET status='disputed', dispute_reason=$2, final_chain_hash=$3, finished_at=now()
          WHERE id=$1 AND status='active'`,
        [id, verdict.reason, verdict.finalChainHash]
      );
    }

    const { rows: after } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    res.json({
      status: verdict.status,
      reason: verdict.reason,
      chainHash: verdict.finalChainHash,
      score: verdict.score,
      steps: verdict.steps,
      session: shapeSession(after[0]),
    });
  } catch (err) {
    console.error('[dapp] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to finish session' });
  }
});

// POST /api/dapp/sessions/:id/anchor/confirm { txHash, mock? }
// Records the on-chain anchor tx (or a mock marker when the bridge/wallet is
// unavailable). Never blocks settlement — best-effort.
app.post('/api/dapp/sessions/:id/anchor/confirm', async (req, res) => {
  const { id } = req.params;
  const txHash = typeof req.body.txHash === 'string' ? req.body.txHash : null;
  const mock = !!req.body.mock || IS_STAGING || !UTGO_CONTRACT_ADDRESS;
  try {
    const { rows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });
    if (rows[0].status !== 'verified') return res.status(409).json({ error: 'Only verified sessions can be anchored' });
    await pool.query(
      `UPDATE game_sessions SET anchor_status=$2, anchor_tx_hash=$3 WHERE id=$1`,
      [id, mock ? 'mock' : 'anchored', txHash]
    );
    const { rows: after } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    res.json({ ok: true, session: shapeSession(after[0]) });
  } catch (err) {
    console.error('[dapp] anchor confirm failed:', err.message);
    res.status(500).json({ error: 'Failed to record anchor' });
  }
});

// GET /api/dapp/sessions/:id — session receipt for the audit view.
app.get('/api/dapp/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    const { rows: stateRows } = await pool.query(
      `SELECT sequence, move, state_hash, prev_hash, chain_hash, ts_client
         FROM session_states WHERE session_id = $1 ORDER BY sequence ASC LIMIT 200`,
      [id]
    );
    res.json({
      session: shapeSession(rows[0]),
      ledger: stateRows.map(r => ({
        sequence: r.sequence, move: r.move,
        stateHash: r.state_hash, prevHash: r.prev_hash, chainHash: r.chain_hash, tsClient: r.ts_client,
      })),
    });
  } catch (err) {
    console.error('[dapp] get session failed:', err.message);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// GET /api/dapp/leaderboard/:gameId — verified-session leaderboard (Phase 0:
// powers the "Verified" filter; ranked by score desc, then time asc).
app.get('/api/dapp/leaderboard/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!ALL_GAME_IDS.has(gameId)) return res.status(400).json({ error: 'Unknown game' });
  try {
    const { rows } = await pool.query(
      `SELECT id, username, usernode_pubkey, final_score, final_time_secs, final_chain_hash, anchor_status
         FROM game_sessions
        WHERE game_id = $1 AND status = 'verified' AND final_score IS NOT NULL
        ORDER BY final_score DESC, final_time_secs ASC NULLS LAST, finished_at ASC
        LIMIT 20`,
      [gameId]
    );
    res.json({
      entries: rows.map((r, i) => ({
        rank: i + 1,
        sessionId: r.id,
        username: r.username,
        score: r.final_score,
        timeSecs: r.final_time_secs,
        chainHash: r.final_chain_hash,
        anchored: r.anchor_status === 'anchored' || r.anchor_status === 'mock',
        verified: true,
      })),
    });
  } catch (err) {
    console.error('[dapp] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// landing page so stray visits to the staging URL don't reveal the app.
app.get('*', (req, res) => {
  if (!req.user) {
    return res.status(401).send(`<!doctype html><meta charset=utf-8><title>Open in Usernode</title>
<body style="font-family:system-ui;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="max-width:24rem;padding:2rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.5rem">Open this app inside Usernode</h1>
    <p style="color:#a1a1aa;font-size:0.9rem;margin:0 0 1.25rem">This page is served via the platform; direct visits aren't authenticated.</p>
    <a href="https://social-vibecoding.usernodelabs.org" style="display:inline-block;padding:0.5rem 1rem;background:#7c3aed;color:white;border-radius:0.5rem;text-decoration:none;font-size:0.9rem">Go to Usernode</a>
  </div>
</body>`);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Match-3 Campaign API (/api/match3/*) --------------------------------

app.get('/api/match3/progress', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { rows: progress } = await pool.query(
      'SELECT * FROM match3_progress WHERE user_id = $1',
      [req.user.id]
    );

    const userProgress = progress[0] || {
      user_id: req.user.id,
      username: req.user.username,
      highest_puzzle: 0,
      best_score: 0,
      total_puzzles_completed: 0,
      last_played_puzzle: 1,
    };

    // Global leaderboard
    const { rows: global } = await pool.query(
      `SELECT user_id, username, highest_puzzle, best_score,
              ROW_NUMBER() OVER (ORDER BY highest_puzzle DESC, best_score DESC, updated_at ASC) AS rank
         FROM match3_progress
        ORDER BY highest_puzzle DESC, best_score DESC, updated_at ASC
        LIMIT 25`
    );

    const meRank = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM match3_progress
        WHERE highest_puzzle > $1 OR (highest_puzzle = $1 AND best_score > $2)
           OR (highest_puzzle = $1 AND best_score = $2 AND updated_at < $3)`,
      [userProgress.highest_puzzle, userProgress.best_score, userProgress.updated_at]
    );

    const leaderboard = {
      global: global.map(r => ({
        rank: Number(r.rank),
        username: r.username || 'anon',
        highestPuzzle: r.highest_puzzle,
        bestScore: r.best_score,
      })),
      me: {
        rank: Number(meRank.rows[0]?.rank || 1),
        username: userProgress.username || req.user.username || 'you',
        highestPuzzle: userProgress.highest_puzzle,
        bestScore: userProgress.best_score,
      },
    };

    res.json({
      highestPuzzle: userProgress.highest_puzzle,
      bestScore: userProgress.best_score,
      totalCompleted: userProgress.total_puzzles_completed,
      lastPlayedPuzzle: userProgress.last_played_puzzle,
      leaderboard,
    });
  } catch (err) {
    console.error('[match3] progress failed:', err.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/match3/start/:puzzleId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const puzzleId = Number(req.params.puzzleId);
  const puzzle = MATCH3_PUZZLES.find(p => p.id === puzzleId);
  if (!puzzle) return res.status(400).json({ error: 'Unknown puzzle' });

  try {
    const { rows: session } = await pool.query(
      'SELECT * FROM match3_session WHERE user_id = $1',
      [req.user.id]
    );

    const boardSeed = puzzleId * 73 + 17; // deterministic seed per puzzle
    const savedSession = session.length > 0 && session[0].current_puzzle === puzzleId
      ? {
          tiles: session[0].tiles,
          bar: session[0].bar,
          score: session[0].score,
          moves: session[0].moves,
          elapsedSecs: session[0].elapsed_secs,
        }
      : null;

    res.json({
      puzzleId: puzzle.id,
      name: puzzle.name,
      targetScore: puzzle.target,
      timeLimit: puzzle.timeLimit,
      moveLimit: puzzle.moveLimit,
      layers: puzzle.layers,
      difficulty: puzzle.difficulty,
      boardSeed,
      savedSession,
    });
  } catch (err) {
    console.error('[match3] start failed:', err.message);
    res.status(500).json({ error: 'Failed to start puzzle' });
  }
});

app.post('/api/match3/finish/:puzzleId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const puzzleId = Number(req.params.puzzleId);
  const { score, timeSecs, moves } = req.body;

  if (!Number.isFinite(score) || !Number.isFinite(timeSecs) || !Number.isFinite(moves)) {
    return res.status(400).json({ error: 'Invalid score/time/moves' });
  }

  const puzzle = MATCH3_PUZZLES.find(p => p.id === puzzleId);
  if (!puzzle) return res.status(400).json({ error: 'Unknown puzzle' });

  try {
    // Update progress if this is a new completion
    if (score > 0) {
      const { rows: existing } = await pool.query(
        'SELECT highest_puzzle FROM match3_progress WHERE user_id = $1',
        [req.user.id]
      );

      const currentHighest = existing.length > 0 ? existing[0].highest_puzzle : 0;
      const newHighest = Math.max(currentHighest, puzzleId);
      const nextUnlocked = newHighest === puzzleId ? puzzleId + 1 : newHighest;

      await pool.query(`
        INSERT INTO match3_progress (user_id, username, highest_puzzle, best_score, total_puzzles_completed, last_played_puzzle, updated_at)
        VALUES ($1, $2, $3, $4, 1, $5, now())
        ON CONFLICT (user_id) DO UPDATE SET
          highest_puzzle = GREATEST(match3_progress.highest_puzzle, $3),
          best_score = GREATEST(match3_progress.best_score, $4),
          total_puzzles_completed = total_puzzles_completed + (CASE WHEN EXCLUDED.highest_puzzle < $3 THEN 1 ELSE 0 END),
          last_played_puzzle = $5,
          updated_at = now()
      `, [req.user.id, req.user.username || 'anon', newHighest, score, puzzleId + 1]);

      // Update per-puzzle best score
      await pool.query(`
        INSERT INTO match3_scores (user_id, puzzle_id, best_score, best_time_secs, moves_used, completed_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (user_id, puzzle_id) DO UPDATE SET
          best_score = GREATEST(match3_scores.best_score, $3),
          best_time_secs = LEAST(COALESCE(match3_scores.best_time_secs, 9999), $4),
          moves_used = LEAST(COALESCE(match3_scores.moves_used, 9999), $5),
          completed_at = now()
      `, [req.user.id, puzzleId, score, timeSecs, moves]);

      // Clear the session
      await pool.query('DELETE FROM match3_session WHERE user_id = $1', [req.user.id]);

      res.json({
        unlocked: nextUnlocked,
        newHighestPuzzle: newHighest,
        bestScoreOnThisPuzzle: score,
      });
    } else {
      // Score <= 0, no progression
      res.status(400).json({ error: 'Score must be > 0 to progress' });
    }
  } catch (err) {
    console.error('[match3] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.post('/api/match3/autosave/:puzzleId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const puzzleId = Number(req.params.puzzleId);
  const { tiles, bar, score, moves, elapsedSecs } = req.body;

  if (!tiles || !Array.isArray(bar)) {
    return res.status(400).json({ error: 'Invalid session state' });
  }

  try {
    const boardSeed = puzzleId * 73 + 17;
    await pool.query(`
      INSERT INTO match3_session (user_id, current_puzzle, tiles, bar, score, moves, elapsed_secs, board_seed, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (user_id) DO UPDATE SET
        current_puzzle = $2,
        tiles = $3,
        bar = $4,
        score = $5,
        moves = $6,
        elapsed_secs = $7,
        updated_at = now()
    `, [req.user.id, puzzleId, JSON.stringify(tiles), JSON.stringify(bar), score, moves, elapsedSecs, boardSeed]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[match3] autosave failed:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.post('/api/match3/abandon/:puzzleId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    await pool.query('DELETE FROM match3_session WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[match3] abandon failed:', err.message);
    res.status(500).json({ error: 'Failed to abandon puzzle' });
  }
});

app.get('/api/match3/leaderboard', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { rows: global } = await pool.query(
      `SELECT user_id, username, highest_puzzle, best_score,
              ROW_NUMBER() OVER (ORDER BY highest_puzzle DESC, best_score DESC, updated_at ASC) AS rank
         FROM match3_progress
        ORDER BY highest_puzzle DESC, best_score DESC, updated_at ASC
        LIMIT 25`
    );

    const meRow = await pool.query(
      `SELECT * FROM match3_progress WHERE user_id = $1`,
      [req.user.id]
    );

    let me = null;
    if (meRow.rows.length > 0) {
      const r = meRow.rows[0];
      const rankRow = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM match3_progress
          WHERE highest_puzzle > $1 OR (highest_puzzle = $1 AND best_score > $2)
             OR (highest_puzzle = $1 AND best_score = $2 AND updated_at < $3)`,
        [r.highest_puzzle, r.best_score, r.updated_at]
      );
      me = {
        rank: Number(rankRow.rows[0].rank),
        username: r.username || 'you',
        highestPuzzle: r.highest_puzzle,
        bestScore: r.best_score,
      };
    }

    res.json({
      global: global.map(r => ({
        rank: Number(r.rank),
        username: r.username || 'anon',
        highestPuzzle: r.highest_puzzle,
        bestScore: r.best_score,
      })),
      me,
    });
  } catch (err) {
    console.error('[match3] leaderboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Fail fast if the DApp hash/replay contract regresses (cross-runtime
// determinism is the framework's highest-risk dependency).
try {
  dapp.selfTest();
  console.log('[dapp] verification self-test passed');
} catch (e) {
  console.error('[dapp] verification self-test FAILED:', e.message);
}

// Global last-resort handlers so a stray rejection/throw during boot or at
// runtime logs a clear, greppable line before the process exits, instead of
// dying silently (which looks identical to a hang from the outside).
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason && reason.stack ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err && err.stack ? err.stack : err);
  process.exit(1);
});

// Boot order: bind the port FIRST so /health responds immediately, THEN run
// migrations. Decoupling listen() from migrate() means a transient DB issue at
// boot no longer produces a hard 502 — the container stays up and answers the
// healthcheck while the DB recovers, and DB-backed routes return their own 500s
// (caught per-route) until the migration succeeds.
app.listen(port, () => console.log(`Listening on :${port}`));

// Run the idempotent schema migration, retrying with capped exponential
// backoff instead of exiting on the first failure. A stalled/unreachable DB
// (the #1 historical cause of the production 502) now keeps the container up
// and routable, logging a loud, greppable line per attempt so the failure is
// diagnosable, until the DB recovers and the migration completes.
async function runMigrations() {
  const backoffMs = [1000, 2000, 5000, 10000, 15000, 30000];
  for (let attempt = 0; ; attempt++) {
    try {
      await migrate();
      migrationsReady = true;
      console.log('[migrate] schema ready');
      return;
    } catch (err) {
      const wait = backoffMs[Math.min(attempt, backoffMs.length - 1)];
      console.error(`[migrate] attempt ${attempt + 1} failed — retrying in ${wait}ms:`, err.message);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

runMigrations();
