const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const ethers = require('ethers');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const IS_STAGING = process.env.USERNODE_ENV === 'staging';

// ---- PvP wager config -------------------------------------------------------

const VALIDATOR_PRIVATE_KEY = process.env.VALIDATOR_PRIVATE_KEY;
const UTGO_CONTRACT_ADDRESS = process.env.UTGO_CONTRACT_ADDRESS;
const TREASURY_WALLET       = process.env.TREASURY_WALLET;
const UTGO_RPC_URL          = process.env.UTGO_RPC_URL || '';

const validatorWallet = VALIDATOR_PRIVATE_KEY
  ? new ethers.Wallet(VALIDATOR_PRIVATE_KEY)
  : null;

const utgoProvider = UTGO_RPC_URL
  ? new ethers.JsonRpcProvider(UTGO_RPC_URL)
  : null;

const UTGO_ABI_BALANCE = ['function balanceOf(address account) view returns (uint256)'];
const WAGER_IFACE = new ethers.Interface(['function claimWin(bytes32,address,bytes)']);

// Single shared connection pool to this app's Postgres DB.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Known game ids — kept in sync with the GAMES registry in public/app.jsx.
// Used to validate :gameId on the daily-attempt routes.
const GAME_IDS = new Set(['sudoku', 'wordhunt', 'cryptowordle', 'mancala', 'tilematchingdaily', 'idle']);

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

  if (IS_STAGING) {
    // PvP staging seeds: three match states for UI testing.
    await pool.query(`
      INSERT INTO pvp_matches (id, player1_id, player1_name, player1_addr, wager_utgo, status)
      VALUES ('PVPWAIT', 'staging-demo-user', 'staging-p1',
              '0x1000000000000000000000000000000000000001',
              '1000000000000000000', 'waiting')
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO pvp_matches
        (id, player1_id, player2_id, player1_name, player2_name,
         player1_addr, player2_addr, wager_utgo, board_seed, status,
         p1_deposited, p2_deposited)
      VALUES ('PVPACTV', 'staging-demo-user', 'staging-opponent', 'staging-p1', 'staging-p2',
              '0x1000000000000000000000000000000000000001',
              '0x2000000000000000000000000000000000000002',
              '1000000000000000000', 42317893, 'active', true, true)
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO pvp_matches
        (id, player1_id, player2_id, player1_name, player2_name,
         player1_addr, player2_addr, wager_utgo, board_seed, status, winner_id,
         p1_deposited, p2_deposited,
         p1_score, p1_steps, p1_time_secs, p2_score, p2_steps, p2_time_secs,
         p1_finished_at, p2_finished_at)
      VALUES ('PVPFINI', 'staging-demo-user', 'staging-opponent', 'staging-p1', 'staging-p2',
              '0x1000000000000000000000000000000000000001',
              '0x2000000000000000000000000000000000000002',
              '1000000000000000000', 73518249, 'finished', 'staging-demo-user',
              true, true,
              850, 36, 67, 720, 42, 95,
              now() - interval '5 minutes', now() - interval '3 minutes')
      ON CONFLICT (id) DO NOTHING
    `);
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
  }
}

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

// Consecutive-day streak for a user: the length of the unbroken run of UTC
// days (each with >=1 finished attempt) ending today, or ending yesterday if
// today hasn't been played yet (a streak stays alive until a full day is
// missed). Computed from the existing daily_attempts rows — no extra schema.
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
  const today = new Date().toISOString().slice(0, 10); // UTC, matches (now() AT TIME ZONE 'utc')::date
  const yesterday = prevUtcDay(today);
  let cursor;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0; // last finished day is older than yesterday → streak broken
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevUtcDay(cursor);
  }
  return streak;
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
  };
}

app.use(express.json());

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---- Daily attempts API --------------------------------------------------

// Current UTC-day state for the signed-in user: which games are locked
// today (with their results), plus server time + next reset so the client
// can drive a clock-skew-proof countdown.
app.get('/api/daily', async (req, res) => {
  try {
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

    const { rows } = await pool.query(
      `SELECT * FROM daily_attempts
       WHERE user_id = $1 AND attempt_date = (now() AT TIME ZONE 'utc')::date`,
      [req.user.id]
    );
    const attempts = {};
    for (const row of rows) attempts[row.game_id] = shapeAttempt(row);

    const streak = await computeStreak(req.user.id);

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
// today's already-claimed row.
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
    // Recompute the streak now that today is finished so the client can
    // reconcile its optimistic value without a full reload.
    const streak = await computeStreak(req.user.id);
    res.json({ attempt: shapeAttempt(rows[0]), nextResetUtc: nextResetUtc(), streak });
  } catch (err) {
    console.error('[daily] finish failed:', err.message);
    res.status(500).json({ error: 'Failed to record result' });
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
app.post('/api/snake/score', async (req, res) => {
  const score = Number.isFinite(req.body.score) ? Math.round(req.body.score) : null;
  const length = Number.isFinite(req.body.length) ? Math.round(req.body.length) : null;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : null;
  if (score === null) return res.status(400).json({ error: 'score is required' });
  try {
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

// ---- PvP Wager API ----------------------------------------------------------

// Convert a DB match-id string to bytes32 hex for on-chain use.
function pvpMatchBytes32(matchId) {
  return ethers.keccak256(ethers.toUtf8Bytes(matchId));
}

function shapePvpMatch(r, requesterId) {
  const isPlayer = requesterId === r.player1_id || requesterId === r.player2_id;
  return {
    matchId:      r.id,
    status:       r.status,
    wagerUtgo:    r.wager_utgo,
    player1Id:    r.player1_id,
    player2Id:    r.player2_id,
    player1Name:  r.player1_name,
    player2Name:  r.player2_name,
    p1Deposited:  r.p1_deposited,
    p2Deposited:  r.p2_deposited,
    p1Score:      r.p1_score,
    p2Score:      r.p2_score,
    p1Steps:      r.p1_steps,
    p2Steps:      r.p2_steps,
    p1TimeSecs:   r.p1_time_secs,
    p2TimeSecs:   r.p2_time_secs,
    winnerId:     r.winner_id,
    boardSeed:    (isPlayer && r.status === 'active') ? r.board_seed : null,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
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

// POST /api/pvp/join { wagerUtgo, playerAddr }
// Creates or joins a waiting match for this wager amount.
app.post('/api/pvp/join', async (req, res) => {
  const { wagerUtgo, playerAddr } = req.body;
  if (!wagerUtgo || typeof wagerUtgo !== 'string') {
    return res.status(400).json({ error: 'wagerUtgo required as string (wei)' });
  }
  if (!playerAddr || !/^0x[0-9a-fA-F]{40}$/.test(playerAddr)) {
    return res.status(400).json({ error: 'Valid EVM playerAddr required' });
  }
  try {
    // CAS join: atomically grab a waiting match for this wager from another player
    const { rows: joined } = await pool.query(`
      UPDATE pvp_matches
        SET player2_id   = $1,
            player2_name = $2,
            player2_addr = $3,
            board_seed   = $4,
            status       = 'active',
            updated_at   = now()
      WHERE id = (
        SELECT id FROM pvp_matches
        WHERE status = 'waiting'
          AND wager_utgo = $5
          AND player1_id != $1
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [req.user.id, req.user.username || null, playerAddr,
        Math.floor(Math.random() * 4294967295), wagerUtgo]);

    if (joined.length > 0) {
      return res.json({ ...shapePvpMatch(joined[0], req.user.id), isCreator: false });
    }

    // No match to join — create a new waiting room
    let matchId = generateRoomId();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO pvp_matches (id, player1_id, player1_name, player1_addr, wager_utgo)
          VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [matchId, req.user.id, req.user.username || null, playerAddr, wagerUtgo]);
        return res.json({ ...shapePvpMatch(rows[0], req.user.id), isCreator: true });
      } catch (err) {
        if (err.code === '23505') { matchId = generateRoomId(); continue; }
        throw err;
      }
    }
    res.status(500).json({ error: 'Failed to generate unique match ID' });
  } catch (err) {
    console.error('[pvp] join failed:', err.message);
    res.status(500).json({ error: 'Failed to join PvP match' });
  }
});

// GET /api/pvp/match/:matchId — poll match state
app.get('/api/pvp/match/:matchId', async (req, res) => {
  const { matchId } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM pvp_matches WHERE id = $1', [matchId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(shapePvpMatch(rows[0], req.user.id));
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

// POST /api/pvp/match/:matchId/move { moveSeq } — log a tile selection for anti-cheat
app.post('/api/pvp/match/:matchId/move', async (req, res) => {
  const { matchId } = req.params;
  const moveSeq = Number.isFinite(req.body.moveSeq) ? Math.round(req.body.moveSeq) : null;
  if (moveSeq === null) return res.status(400).json({ error: 'moveSeq required' });
  try {
    const { rows: matchRows } = await pool.query(
      'SELECT player1_id, player2_id, status FROM pvp_matches WHERE id = $1', [matchId]
    );
    if (matchRows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const m = matchRows[0];
    if (m.status !== 'active') return res.status(409).json({ error: 'Match not active' });
    if (req.user.id !== m.player1_id && req.user.id !== m.player2_id) {
      return res.status(403).json({ error: 'Not a player' });
    }

    await pool.query(`
      INSERT INTO pvp_moves (match_id, player_id, move_seq)
      VALUES ($1, $2, $3)
      ON CONFLICT (match_id, player_id, move_seq) DO NOTHING
    `, [matchId, req.user.id, moveSeq]);

    // Rate check: >3.0 moves/sec over last 6 moves is suspicious
    const { rows: recent } = await pool.query(`
      SELECT ts FROM pvp_moves
      WHERE match_id = $1 AND player_id = $2
      ORDER BY move_seq DESC LIMIT 6
    `, [matchId, req.user.id]);

    let suspicious = false;
    if (recent.length >= 2) {
      const elapsedMs = new Date(recent[0].ts) - new Date(recent[recent.length - 1].ts);
      if (elapsedMs > 0 && ((recent.length - 1) / (elapsedMs / 1000)) > 3.0) {
        suspicious = true;
        console.warn(`[pvp] anti-cheat: suspicious rate from ${req.user.id} in ${matchId}`);
      }
    }

    res.json({ ok: true, suspicious });
  } catch (err) {
    console.error('[pvp] move failed:', err.message);
    res.status(500).json({ error: 'Failed to log move' });
  }
});

// POST /api/pvp/match/:matchId/finish { score, steps, timeSecs }
// Record player's result. When both done: determine winner + return claimWin calldata.
app.post('/api/pvp/match/:matchId/finish', async (req, res) => {
  const { matchId } = req.params;
  const score    = Number.isFinite(req.body.score)    ? Math.round(req.body.score)    : 0;
  const steps    = Number.isFinite(req.body.steps)    ? Math.round(req.body.steps)    : 0;
  const timeSecs = Number.isFinite(req.body.timeSecs) ? Math.round(req.body.timeSecs) : 0;
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

    // Minimum 24 moves (72 tiles / 3 per matched set)
    if (steps < 24) return res.status(400).json({ error: 'Invalid step count' });

    // Aggregate timing anti-cheat: reject if >3.0 moves/sec over all logged moves
    const { rows: moves } = await pool.query(`
      SELECT ts FROM pvp_moves
      WHERE match_id = $1 AND player_id = $2
      ORDER BY move_seq ASC
    `, [matchId, req.user.id]);

    if (moves.length >= 20) {
      const elapsed = (new Date(moves[moves.length - 1].ts) - new Date(moves[0].ts)) / 1000;
      if (elapsed > 0 && (moves.length / elapsed) > 3.0) {
        console.warn(`[pvp] anti-cheat BLOCK: ${req.user.id} in ${matchId}`);
        return res.status(409).json({ error: 'Result rejected by anti-cheat' });
      }
    }

    // Record result for this player
    const scoreCol  = isP1 ? 'p1_score'       : 'p2_score';
    const stepsCol  = isP1 ? 'p1_steps'       : 'p2_steps';
    const timeCol   = isP1 ? 'p1_time_secs'   : 'p2_time_secs';
    const finCol    = isP1 ? 'p1_finished_at' : 'p2_finished_at';

    const { rows: updated } = await pool.query(`
      UPDATE pvp_matches
        SET ${scoreCol} = $2, ${stepsCol} = $3, ${timeCol} = $4,
            ${finCol} = now(), updated_at = now()
      WHERE id = $1 RETURNING *
    `, [matchId, score, steps, timeSecs]);
    const mu = updated[0];

    if (!mu.p1_finished_at || !mu.p2_finished_at) {
      return res.json({ waiting: true, match: shapePvpMatch(mu, req.user.id) });
    }

    // Both done — higher score wins; ties go to faster time
    const p1Wins = mu.p1_score > mu.p2_score ||
                   (mu.p1_score === mu.p2_score && mu.p1_time_secs < mu.p2_time_secs);
    const winnerId  = p1Wins ? mu.player1_id   : mu.player2_id;
    const winnerAddr = p1Wins ? mu.player1_addr : mu.player2_addr;

    const { rows: finishedRows } = await pool.query(`
      UPDATE pvp_matches SET status = 'finished', winner_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'active' RETURNING *
    `, [matchId, winnerId]);

    if (finishedRows.length === 0) {
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

    res.json({
      match:         shapePvpMatch(final, req.user.id),
      isWinner:      req.user.id === winnerId,
      claimCalldata,
      contractAddr:  UTGO_CONTRACT_ADDRESS || null,
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

// ---- Static + HTML shell -------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

// HTML shell: serve the app if authenticated, otherwise an "open in Usernode"
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

migrate()
  .then(() => app.listen(port, () => console.log(`Listening on :${port}`)))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
