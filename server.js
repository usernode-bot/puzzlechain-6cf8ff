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

const UTGO_ABI_BALANCE   = ['function balanceOf(address account) view returns (uint256)'];
const WAGER_IFACE        = new ethers.Interface(['function claimWin(bytes32,address,bytes)']);
const CANCEL_QUEUE_IFACE = new ethers.Interface(['function cancelQueue(bytes32)']);
const TRANSFER_IFACE     = new ethers.Interface(['function transfer(address,uint256)']);
const CLAIM_REWARDS_IFACE = new ethers.Interface(['function claimRewards(address,uint256,uint256,bytes)']);

// Reward economics — single source of truth for balance/tuning.
// 1 UTGO per 1000 final points; streak multiplier already baked into finalScore.
const REWARD_PER_POINT_WEI = BigInt('1000000000000000'); // 0.001 UTGO per point → ~0.96 UTGO for ~960pts
const STREAK_FREEZE_PRICE_WEI = BigInt('5000000000000000000'); // 5 UTGO

// EVM address regex (same as PvP validation throughout)
const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

// Single shared connection pool to this app's Postgres DB.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

// Known game ids — kept in sync with the GAMES registry in public/app.jsx.
// Used to validate :gameId on the daily-attempt routes.
const GAME_IDS = new Set(['sudoku', 'wordhunt', 'cryptowordle', 'mancala', 'tilematchingdaily', 'idle', 'zuma']);

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
// missed). A streak_freeze in user_stats_snapshot bridges exactly ONE missed
// UTC day — a 2+ day gap still resets. Computed from the existing daily_attempts rows.
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
    // Check if a freeze bridges today's gap
    const twoDaysAgo = prevUtcDay(yesterday);
    if (days.has(twoDaysAgo)) {
      const { rows: fRows } = await pool.query(
        `SELECT streak_freezes FROM user_stats_snapshot WHERE user_id = $1`,
        [userId]
      );
      if (fRows.length > 0 && fRows[0].streak_freezes > 0) {
        // Consume the freeze: deduct one and count from twoDaysAgo
        await pool.query(
          `UPDATE user_stats_snapshot
              SET streak_freezes = GREATEST(0, streak_freezes - 1), updated_at = now()
            WHERE user_id = $1 AND streak_freezes > 0`,
          [userId]
        );
        cursor = twoDaysAgo;
      } else {
        return 0;
      }
    } else {
      return 0; // last finished day is older than yesterday → streak broken
    }
  }
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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

    const { rows: tipRows } = await pool.query(
      `SELECT SUM(amount_wei) as total_wei,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'fromUserId', from_user_id,
                  'amountWei', amount_wei::text,
                  'createdAt', created_at
                ) ORDER BY created_at DESC
              ) as tips
         FROM (
           SELECT from_user_id, amount_wei, created_at
             FROM token_tips
            WHERE to_user_id = $1 AND status = 'confirmed'
            ORDER BY created_at DESC
            LIMIT 5
         ) sub`,
      [viewedUserId]
    );
    const tipsReceivedWei = tipRows[0].total_wei ? tipRows[0].total_wei.toString() : '0';
    const recentTippers = tipRows[0].tips || [];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
      stats: {
        totalScore: user.total_score || 0,
        currentStreak: user.current_streak || 0,
        gamesPlayed: user.games_played || 0,
        dailiesCompleted: user.dailies_completed || 0,
        classicsPlayed: user.classics_played || 0,
        lastWinAt: user.last_win_at,
      },
      following,
      followerCount,
      followingCount,
      walletLinked,
      tipsReceivedWei,
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

    // Staging-only demo seed: populate today's per-game leaderboards with a
    // handful of obviously-fake solvers so the ranking (fastest time, then
    // fewest steps) is demonstrable on a fresh staging DB. Spread time/steps
    // so order and tiebreakers are visible. Idempotent, strict no-op in prod.
    if (IS_STAGING && req.query.demo === 'leaderboard') {
      const lbSeed = [
        { name: 'Staging demo Ada',  time: 47,  steps: 12 },
        { name: 'Staging demo Borg', time: 63,  steps: 18 },
        { name: 'Staging demo Cleo', time: 63,  steps: 21 }, // ties Borg on time → steps break
        { name: 'Staging demo Dax',  time: 88,  steps: 9 },
        { name: 'Staging demo Evy',  time: 121, steps: 30 },
        { name: 'Staging demo Finn', time: 210, steps: 44 },
      ];
      for (const g of GAME_IDS) {
        for (let i = 0; i < lbSeed.length; i++) {
          const r = lbSeed[i];
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

    // Credit puzzle reward to ledger (idempotent via unique event constraint).
    // Only for daily-category games (classic/idle/pvp skip this; the score guard
    // below handles the rest). Credit amount = score * REWARD_PER_POINT_WEI.
    let rewardWei = '0';
    if (score && score > 0) {
      try {
        const amountWei = (BigInt(score) * REWARD_PER_POINT_WEI).toString();
        const today = new Date().toISOString().slice(0, 10);
        const { rows: evtRows } = await pool.query(
          `INSERT INTO token_reward_events
             (user_id, game_id, attempt_date, amount_wei)
           VALUES ($1, $2, $3::date, $4)
           ON CONFLICT (user_id, game_id, attempt_date) DO NOTHING
           RETURNING amount_wei`,
          [req.user.id, gameId, today, amountWei]
        );
        if (evtRows.length > 0) {
          // New event — credit the ledger
          await pool.query(
            `INSERT INTO token_rewards_ledger
               (user_id, pending_wei, lifetime_earned_wei, lifetime_claimed_wei)
             VALUES ($1, $2, $2, 0)
             ON CONFLICT (user_id) DO UPDATE
               SET pending_wei         = token_rewards_ledger.pending_wei + EXCLUDED.pending_wei,
                   lifetime_earned_wei = token_rewards_ledger.lifetime_earned_wei + EXCLUDED.lifetime_earned_wei,
                   updated_at          = now()`,
            [req.user.id, amountWei]
          );
          rewardWei = amountWei;
        }
      } catch (rewardErr) {
        // Non-fatal: reward crediting is best-effort; the puzzle result still records.
        console.error('[daily] reward credit failed:', rewardErr.message);
      }
    }

    // Recompute the streak now that today is finished so the client can
    // reconcile its optimistic value without a full reload.
    const streak = await computeStreak(req.user.id);

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

    res.json({ attempt: shapeAttempt(rows[0]), nextResetUtc: nextResetUtc(), streak, rewardWei });
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

    if (!mu.p1_finished_at || !mu.p2_finished_at) {
      return res.json({ waiting: true, match: shapePvpMatch(mu, req.user.id) });
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
    // Staging demo seed: insert a fake wallet address and rewards for the current
    // viewer so the Wallet screen is demonstrable on a fresh staging DB.
    if (IS_STAGING && req.query.demo === '1') {
      const fakeAddr = '0xDEAD000000000000000000000000000000009999';
      await pool.query(
        `INSERT INTO user_wallets (user_id, wallet_addr) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, fakeAddr]
      );
      await pool.query(
        `INSERT INTO token_rewards_ledger
           (user_id, pending_wei, lifetime_earned_wei, lifetime_claimed_wei)
         VALUES ($1, '3000000000000000000', '5000000000000000000', '2000000000000000000')
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id]
      );
    }

    // Wallet address
    const { rows: wRows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`,
      [req.user.id]
    );
    const addr = wRows.length > 0 ? wRows[0].wallet_addr : null;

    // On-chain balance (mock in staging/no-contract)
    let balanceWei = '0';
    let mock = true;
    if (addr) {
      if (IS_STAGING || !utgoProvider || !UTGO_CONTRACT_ADDRESS) {
        balanceWei = ethers.parseUnits('10', 18).toString();
        mock = true;
      } else {
        try {
          const token = new ethers.Contract(UTGO_CONTRACT_ADDRESS, UTGO_ABI_BALANCE, utgoProvider);
          balanceWei = (await token.balanceOf(addr)).toString();
          mock = false;
        } catch (e) {
          console.error('[wallet] balance check failed:', e.message);
          balanceWei = '0';
        }
      }
    }

    // Pending rewards ledger
    const { rows: lRows } = await pool.query(
      `SELECT pending_wei, lifetime_earned_wei, lifetime_claimed_wei
         FROM token_rewards_ledger WHERE user_id = $1`,
      [req.user.id]
    );
    const pendingWei          = lRows.length > 0 ? lRows[0].pending_wei.toString()          : '0';
    const lifetimeEarnedWei   = lRows.length > 0 ? lRows[0].lifetime_earned_wei.toString()  : '0';
    const lifetimeClaimedWei  = lRows.length > 0 ? lRows[0].lifetime_claimed_wei.toString() : '0';

    // Streak freezes
    const { rows: sRows } = await pool.query(
      `SELECT streak_freezes FROM user_stats_snapshot WHERE user_id = $1`,
      [req.user.id]
    );
    const streakFreezes = sRows.length > 0 ? (sRows[0].streak_freezes || 0) : 0;

    // Recent activity: rewards + tips (sent/received) + claims — last 10 events
    const { rows: evtRows } = await pool.query(
      `(SELECT 'reward' AS kind, amount_wei::text AS amount_wei,
               NULL AS counterpart, created_at
          FROM token_reward_events WHERE user_id = $1
      )
      UNION ALL
      (SELECT 'tip_sent' AS kind, amount_wei::text AS amount_wei,
               to_user_id AS counterpart, created_at
          FROM token_tips WHERE from_user_id = $1 AND status = 'confirmed'
      )
      UNION ALL
      (SELECT 'tip_received' AS kind, amount_wei::text AS amount_wei,
               from_user_id AS counterpart, created_at
          FROM token_tips WHERE to_user_id = $1 AND status = 'confirmed'
      )
      ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );

    res.json({
      addr,
      balanceWei,
      mock,
      pendingWei,
      lifetimeEarnedWei,
      lifetimeClaimedWei,
      streakFreezes,
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

// POST /api/wallet/tip/prepare { toUserId, amount }
// Look up recipient's wallet address, build transfer calldata, return to client.
// The client sends the transaction, then calls /tip/confirm.
app.post('/api/wallet/tip/prepare', async (req, res) => {
  const { toUserId, amount } = req.body;
  if (!toUserId || typeof amount !== 'string') {
    return res.status(400).json({ error: 'toUserId and amount (wei string) required' });
  }
  if (toUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot tip yourself' });
  }
  let amountWei;
  try { amountWei = BigInt(amount); } catch { return res.status(400).json({ error: 'Invalid amount' }); }
  if (amountWei <= 0n) return res.status(400).json({ error: 'Amount must be positive' });

  try {
    const { rows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`,
      [toUserId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Recipient has not linked a wallet' });
    }
    const toAddr = rows[0].wallet_addr;

    let calldata = null;
    if (UTGO_CONTRACT_ADDRESS && TRANSFER_IFACE) {
      calldata = TRANSFER_IFACE.encodeFunctionData('transfer', [toAddr, amountWei]);
    }

    res.json({
      toAddr,
      calldata,
      contractAddr: UTGO_CONTRACT_ADDRESS || null,
    });
  } catch (err) {
    console.error('[wallet] tip/prepare failed:', err.message);
    res.status(500).json({ error: 'Failed to prepare tip' });
  }
});

// POST /api/wallet/tip/confirm { toUserId, amount, txHash }
// Record a completed tip (client reports after sendTransaction).
app.post('/api/wallet/tip/confirm', async (req, res) => {
  const { toUserId, amount, txHash } = req.body;
  if (!toUserId || typeof amount !== 'string' || !txHash) {
    return res.status(400).json({ error: 'toUserId, amount, txHash required' });
  }
  if (toUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot tip yourself' });
  }
  let amountWei;
  try { amountWei = BigInt(amount); } catch { return res.status(400).json({ error: 'Invalid amount' }); }
  if (amountWei <= 0n) return res.status(400).json({ error: 'Amount must be positive' });

  try {
    const [fromWallet, toWallet] = await Promise.all([
      pool.query(`SELECT wallet_addr FROM user_wallets WHERE user_id = $1`, [req.user.id]),
      pool.query(`SELECT wallet_addr FROM user_wallets WHERE user_id = $1`, [toUserId]),
    ]);
    const fromAddr = fromWallet.rows.length > 0 ? fromWallet.rows[0].wallet_addr : null;
    const toAddr   = toWallet.rows.length > 0   ? toWallet.rows[0].wallet_addr   : null;

    await pool.query(
      `INSERT INTO token_tips
         (from_user_id, to_user_id, from_addr, to_addr, amount_wei, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
      [req.user.id, toUserId, fromAddr, toAddr, amount, txHash]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[wallet] tip/confirm failed:', err.message);
    res.status(500).json({ error: 'Failed to confirm tip' });
  }
});

// POST /api/wallet/rewards/claim
// Validator signs a claimRewards call; client sends via bridge.
// In staging/no-contract: immediately marks rewards as claimed and returns mock.
app.post('/api/wallet/rewards/claim', async (req, res) => {
  try {
    // Get user's wallet address
    const { rows: wRows } = await pool.query(
      `SELECT wallet_addr FROM user_wallets WHERE user_id = $1`,
      [req.user.id]
    );
    if (wRows.length === 0) {
      return res.status(400).json({ error: 'No wallet linked' });
    }
    const addr = wRows[0].wallet_addr;

    // Atomically read and zero pending_wei
    const { rows: lRows } = await pool.query(
      `UPDATE token_rewards_ledger
          SET pending_wei = 0, updated_at = now()
        WHERE user_id = $1 AND pending_wei > 0
        RETURNING pending_wei`,
      [req.user.id]
    );
    // If no row was updated, check if there's just nothing pending
    if (lRows.length === 0) {
      const { rows: check } = await pool.query(
        `SELECT pending_wei FROM token_rewards_ledger WHERE user_id = $1`,
        [req.user.id]
      );
      if (check.length === 0 || check[0].pending_wei === '0' || check[0].pending_wei === 0) {
        return res.status(409).json({ error: 'No pending rewards to claim' });
      }
    }

    // pending_wei was already zeroed above — reconstruct the claimed amount
    // Note: the UPDATE returns the OLD pending_wei only on Postgres 12+
    // We re-read lifetime for confirmation display
    const { rows: afterRows } = await pool.query(
      `UPDATE token_rewards_ledger
          SET lifetime_claimed_wei = lifetime_claimed_wei + $2, updated_at = now()
        WHERE user_id = $1
        RETURNING lifetime_claimed_wei, pending_wei`,
      [req.user.id, lRows.length > 0 ? lRows[0].pending_wei.toString() : '0']
    );

    const amountWei = lRows.length > 0 ? lRows[0].pending_wei.toString() : '0';

    // Staging / no contract: mock claim
    if (IS_STAGING || !validatorWallet || !UTGO_CONTRACT_ADDRESS) {
      return res.json({
        claimCalldata: null,
        contractAddr: null,
        amountWei,
        mock: true,
        txHash: '0xstagingclaim',
      });
    }

    // Production: validator-signed claim calldata
    try {
      const nonce = Date.now();
      const innerHash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'uint256'],
          [addr, BigInt(amountWei), BigInt(nonce)]
        )
      );
      const sig = await validatorWallet.signMessage(ethers.getBytes(innerHash));
      const claimCalldata = CLAIM_REWARDS_IFACE.encodeFunctionData(
        'claimRewards',
        [addr, BigInt(amountWei), BigInt(nonce), sig]
      );
      res.json({ claimCalldata, contractAddr: UTGO_CONTRACT_ADDRESS, amountWei, mock: false });
    } catch (sigErr) {
      console.error('[wallet] claim signing failed:', sigErr.message);
      res.status(500).json({ error: 'Failed to sign claim' });
    }
  } catch (err) {
    console.error('[wallet] claim failed:', err.message);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// POST /api/wallet/rewards/claim/confirm { txHash }
// Client reports successful on-chain claim — already settled in /claim, so this is a no-op
// record for auditability. In production you'd verify via RPC here.
app.post('/api/wallet/rewards/claim/confirm', async (req, res) => {
  res.json({ ok: true });
});

// POST /api/wallet/spend/streak-freeze
// Debit STREAK_FREEZE_PRICE_WEI from pending rewards and add one freeze.
app.post('/api/wallet/spend/streak-freeze', async (req, res) => {
  try {
    const priceWei = STREAK_FREEZE_PRICE_WEI;

    const { rows } = await pool.query(
      `UPDATE token_rewards_ledger
          SET pending_wei = pending_wei - $2, updated_at = now()
        WHERE user_id = $1 AND pending_wei >= $2
        RETURNING pending_wei`,
      [req.user.id, priceWei.toString()]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'Insufficient pending rewards' });
    }

    await pool.query(
      `UPDATE user_stats_snapshot
          SET streak_freezes = streak_freezes + 1, updated_at = now()
        WHERE user_id = $1`,
      [req.user.id]
    );

    const { rows: sRows } = await pool.query(
      `SELECT streak_freezes FROM user_stats_snapshot WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({
      ok: true,
      streakFreezes: sRows.length > 0 ? sRows[0].streak_freezes : 1,
      newPendingWei: rows[0].pending_wei.toString(),
    });
  } catch (err) {
    console.error('[wallet] streak-freeze failed:', err.message);
    res.status(500).json({ error: 'Failed to purchase streak freeze' });
  }
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
