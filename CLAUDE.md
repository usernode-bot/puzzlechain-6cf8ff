# PuzzleChain — notes for Claude Code

This app runs on **Usernode Social Vibecoding**. If you're Claude Code
editing this repo, read the platform conventions before making
changes:

**Platform conventions (authoritative, always current):**
https://social-vibecoding.usernodelabs.org/claude.md

Fetch that URL at the start of each session — it's the single source
of truth for platform-wide behavior (auth model, `USERNODE_ENV`,
public/private tables, "don't `git push`", etc.). The hosted copy is
updated in place when platform rules change, so fetching it gives you
today's rules, not a stale snapshot.

When running inside Usernode's dev-chat, those same conventions are
already injected into your system prompt, so the fetch is a no-op in
that path — but it's the right reflex when someone runs Claude Code
against this repo locally or from another harness.

If a rule below this line conflicts with the hosted conventions, the
hosted conventions win. This file is **app-specific** — write down
things about *this* app that belong in the repo: product intent,
data-model quirks, style preferences, opt-in policies (e.g. which
tables you've marked private), etc.

---

## About PuzzleChain

PuzzleChain is a **daily-puzzle hub** — a "chain" of bite-size puzzle
games sharing one lobby. You play each game **once per day**, earn
points for solving it (fast/efficient solves score higher), and build
a **streak** that adds a bonus to every subsequent win. Solving pops a
"Solved!" celebration, then the lobby card locks until the next day.
Ships with **Mini Sudoku** (6×6) and **Word Hunt** (8×8 word search);
more games slot into the same registry.

## App-specific conventions

This is a **single-page React 18 app with NO build step**. Read this
before editing the frontend — the loading mechanism is unusual on
purpose.

- **`public/app.jsx` is the entire frontend** — one file. React,
  hooks, the design system, every game component, the registry, and
  the root `App` all live here.
- **In-browser compile.** `public/index.html` loads React 18 UMD +
  ReactDOM + Babel Standalone from unpkg, then fetches `/app.jsx` and
  compiles it with `Babel.transform(src, { presets: ['react'],
  sourceType: 'script' })` — classic `React.createElement` runtime,
  **not** ES modules. Consequences:
  - **Never add `import` or `export`** to `app.jsx`. It runs as a
    classic script in global scope.
  - Use the globals: `const { useState, useEffect, useRef } = React;`
    and mount with `ReactDOM.createRoot`. `React`/`ReactDOM` are on
    `window`.
- **Don't touch these parts of `index.html`:** the deterministic
  fetch→compile→inject bootstrap, the `// usernode-dev-console@1`
  block (platform log forwarder), and the inline data-URI favicon
  (its absence triggers a `/favicon.ico` 401 that logs a console
  error and trips the no-console-errors check).
- **Design system lives in `app.jsx`:** a `const C` color-palette
  object and a single global `css` template literal injected via
  `<style>{css}</style>`. Add component styles to `css` and reuse `C`
  tokens (e.g. `${C.accent}`); don't introduce a second stylesheet.
  Fonts are Space Grotesk (body) + JetBrains Mono (`.mono`).
- **Shared timer:** `useTimer(running, initialSecs = 0)` counts **up**
  from `initialSecs` and returns `{ secs, fmt }`. Pass `!done` so it
  stops when the round ends; pass a saved elapsed value as `initialSecs`
  to **resume** the timer where a player left off.
- **Deterministic daily boards:** all daily games derive their board
  from a **seeded PRNG keyed on the server-anchored UTC day** so every
  player gets the same puzzle (the precondition for a fair leaderboard).
  Use `dailyRng(offset, gameId)` (built on `mulberry32` + `utcDayNum`)
  and thread it through your generator instead of `Math.random()`. Never
  seed from raw `Date.now()` — always the `offset`-corrected day.
- **Adding a game** (the extension point): write an
  `XxxGame({ onWin, onStepChange })` component that
  - renders a `.status-bar` of `.pill`s for its live stats,
  - calls `onStepChange(n)` as the player makes moves,
  - calls `onWin(score, steps, secs)` **exactly once** when solved;
  then add its CSS to `css` and append
  `{ id, name, icon, desc, tag, tagColor, component }` to the `GAMES`
  array. The root `App` auto-wires the lobby card, the daily one-play
  lock, the streak **multiplier** (see "Streak multiplier tiers" below),
  and the win overlay — the game component never touches that machinery.
  - **Optional win/loss extras (backward-compatible).** `onWin` accepts
    an optional 4th `meta` arg — `onWin(score, steps, secs, { share })` —
    and `App` stashes `meta.share` so the win overlay can show a **Share**
    button (copies the string to the clipboard). For games that can be
    *lost* (e.g. Crypto Wordle), `App` also passes an optional
    `onLose(steps, secs, { share, answer })` prop: call it **once** when
    the round is lost. `handleLose` records a finished row with `score: 0`
    (so the day still locks) **without** incrementing the streak, and
    renders a loss overlay that reveals `answer` plus the same Share
    button. Win-only games simply never call `onLose` and ignore the
    extra props — no change needed. Games that need the server-anchored
    UTC day (e.g. a deterministic daily word) also receive `offset`
    (`serverNow − clientNow`, ms).
  - **Resumability (backward-compatible).** `App` also passes
    `savedProgress` (the merged in-progress state for today's claimed,
    unfinished attempt — `null` on a fresh start) and
    `onSaveProgress(progressObj, steps, secs)`. A resumable game should:
    on mount, hydrate from `savedProgress` **only when**
    `savedProgress.dayNum === utcDayNum(offset)` (and seed `useTimer`'s
    `initialSecs` from `savedProgress.elapsedSecs`); store its
    *mutable player state* in `progressObj` as `{ dayNum, … }` (the board
    itself is re-derived from the daily seed, so only moves go here); and
    call `onSaveProgress` on every meaningful move. Idle timer-advance
    and tab-close saves are handled for you by the shared `useAutosave`
    hook — `useAutosave(onSaveProgress, () => ({ progress, steps, secs }),
    !done)`. Per-game progress shapes today: sudoku `{ dayNum, grid }`,
    wordhunt `{ dayNum, found: [...words] }`, cryptowordle
    `{ dayNum, rounds: [[...guessStrings], ...], hintsByRound: [...ints] }`
    (multi-word: one guess-list + applied-hint count per daily word round),
    tilematchingdaily
    `{ dayNum, tiles: [...], bar: [...ids], moves, boosters }` (the tile
    snapshot is stored in full because the shuffle booster moves tiles).
    The lock is **finished-aware**:
    a row with `finishedAt` set is locked; a claimed-but-unfinished row
    resumes into the game (lobby card shows "▶ In progress · resume").
  - **Daily leaderboard.** The win overlay and `LockedScreen` render a
    `<Leaderboard gameId solved />` that calls
    `GET /api/daily/:gameId/leaderboard` (today's solvers ranked by
    fastest `time_secs`, then fewest `steps`), highlighting the current
    user and pinning their row when outside the top N. New games get this
    automatically; no game-component work needed.
  - **Also add the new `id` to `GAME_IDS` in `server.js`.** The daily
    routes validate `:gameId` against that set and reject unknown ids
    with `400`, so a game that's in `GAMES` but not in `GAME_IDS`
    silently fails to start. Keep the two in sync.

## Persistence — Postgres-backed daily attempts

As of the daily-lock feature, this app **has a database**. Don't
describe it as static-only.

- **`server.js`** is still the Express + JWT auth gate, but now also
  opens a single `pg.Pool` from `DATABASE_URL` and runs an idempotent
  `CREATE TABLE IF NOT EXISTS` migration on boot before listening.
- **Table `daily_attempts`** (PUBLIC — gameplay results, no sensitive
  data) stores one row per `(user_id, game_id, attempt_date)` with a
  `UNIQUE` constraint on that triple. `attempt_date` is the UTC day,
  computed server-side as `(now() AT TIME ZONE 'utc')::date`. The day
  **resets implicitly at midnight UTC**: a new date yields rows that no
  longer match today's lookups — there is no cron/cleanup. `score`,
  `steps`, `time_secs` are nullable (null between start and finish).
  Two more nullable columns back **resumability**: `progress JSONB`
  (game-specific in-progress moves) and `elapsed_secs INTEGER`
  (accumulated active timer). They're written during play and ignored
  once `finished_at` is set.
- **Auth-gated API** (all under `/api/`, so the existing deny-by-default
  middleware requires `req.user` — do **not** whitelist these):
  - `GET /api/daily` — today's state for the signed-in user: `user`
    (`{ username, id, usernodePubkey }`), `serverNowUtc`,
    `nextResetUtc` (next 00:00 UTC), `streak` (server-computed
    consecutive-day count — see below), and `attempts` keyed by
    `game_id`. A present key = that game is locked today.
  - `POST /api/daily/:gameId/start` — **consume-on-start**: claims the
    day's single attempt via `INSERT … ON CONFLICT DO NOTHING
    RETURNING *`. Empty result ⇒ already used ⇒ `409` (locked) with the
    existing row.
  - `POST /api/daily/:gameId/finish` — records `score/steps/time_secs`
    on today's already-claimed row, and returns the freshly recomputed
    `streak` so the client reconciles its optimistic value.
  - `POST /api/daily/:gameId/progress` — **autosave**: updates today's
    claimed, **unfinished** row with `progress/steps/elapsed_secs`. Never
    creates a row and never touches `finished_at/score`; a finished row
    is immutable here (`409` "No active attempt to save").
  - `GET /api/daily/:gameId/leaderboard` — today's solvers for one game
    (finished with `score > 0`, so Crypto Wordle losses are excluded),
    ranked `time_secs ASC, steps ASC, finished_at ASC`. Returns
    `{ entries: top-N, me, total }`; `me` is the current user's row/rank
    even when outside the top N (`null` if they haven't solved today).
- **Identity comes from `req.user`** (the iframe JWT), never the client.
  Progress is keyed to the Usernode account and persists across reloads
  and devices. The nav's `AccountChip` reads `user` from `/api/daily`
  to show the signed-in username + "Progress saved" (or a "Signed out"
  state if the call 401s / the DB is unreachable).
- **Frontend** hydrates this on mount (`loadDaily`), claims on launch,
  persists on win, and renders a `LockedScreen` with an HH:MM:SS
  countdown driven by a **server-time offset** (`serverNowUtc −
  Date.now()`) so a wrong device clock can't unlock early.
- **Staging seed:** `GET /api/daily?demo=locked` (gated on
  `IS_STAGING`) upserts one finished `sudoku` attempt for the current
  viewer so the locked screen is demonstrable on a fresh staging DB.
  `GET /api/daily?demo=streak` (also `IS_STAGING`-only, idempotent)
  upserts finished `sudoku` attempts for the **10 UTC days before
  today**, giving the viewer a 10-day streak so the multiplier UI is
  demonstrable; today is left open so a tester can trigger a multiplied
  win. `GET /api/daily?demo=leaderboard` upserts ~6 obviously-fake
  solvers ("Staging demo Ada/Borg/…") per game for today so the per-game
  leaderboard ranking + tiebreakers are demonstrable.
  `GET /api/daily?demo=resume` upserts one **claimed, unfinished**
  `wordhunt` row for the current viewer (partial timer/steps) so the
  "In progress · resume" card and resume flow are demonstrable. It uses
  `wordhunt` (not `sudoku`) on purpose: `demo=locked`/`demo=streak`
  finish the viewer's sudoku row for today, and proposal checks share
  one staging DB, so a sudoku resume seed would collide and render
  locked instead. All strict no-ops in production.
- The nav **`Score`** is rehydrated from today's finished attempts.
  A per-game **daily leaderboard** now ships (see the API above);
  cross-day / all-time history remains **out of scope** (the public table
  leaves room for it).

## Streak multiplier tiers

The **streak is now a real consecutive-day count**, server-computed in
`computeStreak(userId)` from the distinct `attempt_date`s that have a
non-null `finished_at`: the unbroken run of UTC days ending today (or
ending yesterday if today isn't played yet — a streak stays alive until
a full day is missed). It persists across reloads/devices and is
returned as `streak` from `/api/daily` (and refreshed by `finish`).

The streak multiplies points via **tiers**, defined once in
`STREAK_TIERS` (`public/app.jsx`) and applied client-side in
`streakMultiplier(streak)`:

| Streak (consecutive days) | Multiplier |
|---|---|
| 0–2 | 1.0× |
| 3–4 | 1.1× |
| 5–9 | 1.2× |
| 10–19 | 1.5× |
| 20+ | 2.0× |

- **Where applied:** `handleWin` computes `effectiveStreak` (the day's
  first win extends the streak by 1; a second game the same day reuses
  the same day count — the multiplier is per-day, not per-game), then
  `finalScore = round(base × streakMultiplier(effectiveStreak))`. The
  client persists `finalScore` via `finish`; the server stores it as-is
  (no server-side multiplier math today — see below).
- **Surfaced in UI:** a `×N` `.mult-badge` next to the nav Streak, a
  `.lobby-hint` nudging toward the next tier, and a multiplier row in
  the win overlay (all hidden at 1.0× or when signed out).
- **Tier table is the single balance knob** — editing `STREAK_TIERS`
  changes breakpoints/multipliers everywhere.
- **Deferred:** server-authoritative scoring (server applies the
  multiplier in `finish` instead of trusting the client `finalScore`)
  matters only if a leaderboard ships; the displayed multi-day streak
  has **no** grace-day/freeze — a missed UTC day resets it to 0.
