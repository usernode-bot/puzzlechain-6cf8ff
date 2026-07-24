# Game Corner (formerly PuzzleChain) — notes for Claude Code

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

## About Game Corner

Game Corner (renamed from PuzzleChain via dapp.json's `name` — the repo
slug stays `puzzlechain-6cf8ff` and localStorage keys keep their
`puzzlechain_`/`pc_` prefixes on purpose) is a **daily-puzzle hub** — a "chain" of bite-size puzzle
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
- **Theming — `C` is CSS custom properties, not hex.** `PALETTES.light`
  / `PALETTES.dark` hold the raw values (plus `DERIVED` for
  shadow/scrim/well/hover tokens); `paletteVars()` emits them into
  `:root` and `:root[data-theme="dark"]` at the top of `css`, and every
  `C.x` is the string `var(--c-x)`. Consequences when writing styles:
  - Keep using `${C.accent}` — it re-themes for free, in `css` and in
    inline `style={{}}` objects alike.
  - **Never concatenate an alpha byte onto a token** (`${C.gold}1f` is
    broken now — `var()` isn't a hex string). Use **`ca('gold','1f')`**,
    which emits `rgb(var(--c-gold-rgb) / 12.2%)`.
  - **Canvas needs real colours**: `ctx.fillStyle = C.bg` draws nothing.
    Read from **`PAL`**, the live plain object `applyTheme()` keeps in
    sync with the resolved palette. If a canvas game caches colours,
    store palette **token names** and resolve via `PAL[name]` at draw
    time (see `BOUNCE_ROW_COLORS`) so a theme flip recolours mid-game.
  - Reach for `var(--c-shadow-sm|md|lg)`, `var(--c-scrim)`,
    `var(--c-well)`, `var(--c-well-strong)` and
    `var(--c-accent-hover|emerald-hover|gold-hover)` instead of
    hand-writing rgba shadows/scrims or hand-darkened hues.
  - **Intrinsic game art stays hardcoded on purpose** — Mancala's
    carved wood, checkers browns, Reversi felt, the goban, playing-card
    faces/suits, Mahjong ivory, and the 2048 / Tile Match / Drop Stack /
    tetromino palettes do NOT follow the theme. Only chrome re-colours.
  - The **preference** (`'system' | 'light' | 'dark'`, default
    `'system'`) lives in localStorage under `puzzlechain_theme`, device-
    local like every other pref. `applyTheme(pref, persist)` is the only
    writer; `useTheme()` → `{ pref, resolved, setPref }` is how
    components read it. A module-scope `prefers-color-scheme` listener
    re-resolves live while the pref is `'system'`.
  - `public/index.html` carries an **inline pre-paint script** that sets
    `data-theme` before the first style block (no ivory flash for
    dark-mode players) plus a self-contained dark boot-shell block. It
    duplicates the storage key and resolution rule from `app.jsx` on
    purpose — **keep the two in sync**. `?theme=` and `?settings=1` are
    the deep links proposal tests use.
  - The control is `ThemeChoice` (a System/Light/Dark segmented control),
    rendered by `CgSettings` so the global `SettingsSheet` (⚙ in the nav,
    ⚙ Settings row on your own profile) and a classic game's ☰ →
    Settings tab always agree. **Minesweeper's private light/dark button
    was removed** — its board reads the resolved theme through
    `data-ms-theme` now (its base `.ms-*` rules are dark and
    `[data-ms-theme="light"]` overrides them). Don't re-add per-game
    theme toggles.
- **Shared timer:** `useTimer(running, initialSecs = 0)` counts **up**
  from `initialSecs` and returns `{ secs, fmt }`. Pass `!done` so it
  stops when the round ends; pass a saved elapsed value as `initialSecs`
  to **resume** the timer where a player left off.
- **Deterministic daily boards — server-issued seeds (phase 2):** all
  daily games derive their board from **today's server-issued seed**
  (the `daily_seeds` table, one row per game per UTC day, created
  lazily on first request and returned by `GET /api/daily`, `/start`,
  and the public `GET /api/public/daily`). Use `dailyRng(offset,
  gameId)` (server seed → `mulberry32`; falls back to the legacy
  UTC-day derivation when no seed arrived, so a partial deploy can't
  blank the dailies) and thread it through your generator instead of
  `Math.random()`. Never seed from raw `Date.now()`. NOTE: the
  server's seed **generation policy currently issues the
  legacy-derivation value** (`legacyDailySeed` in `server.js`) so both
  paths agree byte-for-byte; switching to unpredictable per-day seeds
  is a server-side knob for the Game-of-the-Day phase — flip it only
  at a UTC boundary.
- **Adding a game** (the extension point): write an
  `XxxGame({ onWin, onStepChange })` component that
  - renders a `.status-bar` of `.pill`s for its live stats,
  - calls `onStepChange(n)` as the player makes moves,
  - calls `onWin(score, steps, secs)` **exactly once** when solved;
  then add its CSS to `css` and append a **fully-declarative** entry
  `{ id, name, icon, category, shell, daily?, desc, tag, tagColor,
  component }` to the `GAMES` array. The root `App` reads those flags
  to auto-wire the lobby card, the daily one-play lock, the streak
  **multiplier** (see "Streak multiplier tiers" below), and the win
  overlay — the game component never touches that machinery.
  - **`id` is mandatory** and must match the server's `GAME_REGISTRY`
    key (it keys the lobby card, `attempts[id]`, posts, leaderboards,
    and the daily routes). A missing `id` silently breaks those lookups.
  - **`category`** is the lobby tab (`'daily'` or `'classic'`).
  - **`shell`** declares how `App` renders the game body (a single
    `switch` in `renderGameBody`, no per-id special-casing):
    - `'daily'` — back-header `game-wrap`; the component also receives
      `savedProgress` / `onSaveProgress` for resumability. Use for daily
      puzzles (and any plain back-header game).
    - `'classic'` — wrapped in `ClassicShell` + `.cg-stage.cg-scroll`
      (the standard in-frame classic layout).
    - `'self'` — the component renders its **own** `ClassicShell`
      (full-screen, gesture-first; it gets `game` + `onBack` too).
  - **`daily: true`** marks the four daily games and is the **single
    gate** for the per-day start/lock/finish/streak/resume machinery —
    `launchGame`, `handleWin`, and `handleLose` all branch on
    `!game.daily`. Omit it (falsy) for classic games.
  - The client `GAMES` array and the server `GAME_REGISTRY`
    (`server.js`) are two separate objects (one needs React
    components, the other DApp tiers) that must be kept **in sync** by
    `id` and `category`, exactly as `GAMES`↔`GAME_IDS` were before.
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
  to show the signed-in username on one line (nothing renders while the
  load is in flight; a red "Signed out" state appears only after the
  call 401s / the DB is unreachable). Tapping it opens the viewer's own
  profile screen (stats, recent games, badges).
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

The **streak is a real consecutive-day count** with **GotD-participation
semantics** (spec §6.3): server-computed in `computeStreak(userId)`, a
UTC day counts toward the streak only when that day's FEATURED game (its
`daily_featured` row) has a finished attempt — days before
`GOTD_STREAK_CUTOVER` (`server.js`, next to `GOTD_WEIGHTS`) keep the
legacy any-daily rule, grandfathering every previously earned day so the
changeover reset nobody. The unbroken run ends today (or yesterday if
today isn't played yet — a streak stays alive until a full day is
missed). It persists across reloads/devices and is returned as `streak`
from `/api/daily` (and refreshed by `finish`). Client-side,
`handleWin` extends the optimistic streak only for a first
featured-game win of the day; other dailies still earn points/badges at
the current day count. The `demo=streak`/`demo=badges` fixtures seed
prior days via `seedFeaturedStreakDays` (featured-game attempts + their
`daily_featured` rows) so they hold under the new rule.

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
- **Surfaced in UI:** a `×N` `.mult-badge` next to the nav Streak and a
  multiplier row in the win overlay (both hidden at 1.0× or when signed
  out). The masthead's streak/next-tier hint line was removed in the
  home/profile cleanup pass.
- **Tier table is the single balance knob** — editing `STREAK_TIERS`
  changes breakpoints/multipliers everywhere.
- **Deferred:** server-authoritative scoring (server applies the
  multiplier in `finish` instead of trusting the client `finalScore`)
  matters only if a leaderboard ships; the displayed multi-day streak
  has **no** grace-day/freeze — a missed UTC day resets it to 0.

## Game Corner phase 2 — harness formalization

Phase 2 of the Game Corner evolution added four things; keep them in
mind when touching the daily flow:

- **Registry manifest metadata.** Both `GAME_REGISTRY` (`server.js`)
  and `GAMES` (`public/app.jsx`) now carry a per-game `manifest`:
  `{ scoreDirection, tieBreak, sessionLength, input, undo }` — the
  machine-relevant fields **must match by id across the two files**.
  The client entries additionally carry `howToPlay` card copy
  (`[{ title, body }, …]`), consumed by phase 3's shell-owned chrome
  (see below). `tieBreak` is the symbolic rule
  the leaderboard SQL implements (`'time-then-steps'` for dailies,
  `'first-to-score'` for classic all-time boards) — parameterize the
  SQL off it when the daily pool widens beyond fastest-solve games.
- **Server-issued daily seeds.** See "Deterministic daily boards"
  above. `daily_seeds` is PUBLIC (shared-by-definition data); rows are
  lazily upserted via `ensureDailySeed`, per-process cached per day.
- **Daily finishes route through `game_sessions` + `validateSession`.**
  `POST /api/daily/:gameId/finish` accepts optional `moves`
  (`[{ …, tsClient }]`, capped at 800) and `replay: bool`, collected
  client-side by App's shared `dailyRunLog` (the Daily Tile Match
  reports engine-shaped `{ tileType }` moves via `onMoveTile`; other
  dailies get their `onStepChange` calls logged as timestamp events).
  `settleDailySession` then runs **tier A** (full server-side replay
  re-simulation through `lib/dapp.js`'s engine + hash-chain ledger)
  when an engine exists and the run is replay-eligible, else **tier B**
  (snapshot chain + `antiCheat` timing heuristics + a wall-clock
  plausibility check). Replay eligibility breaks on resume and on
  boosters (`replayBreak` events) — those runs settle as tier B. A
  `disputed` verdict never blocks the attempt; it only withholds the
  win overlay's Verified badge. Sessions are bound to the server
  daily seed — the anchor phase 8's anonymous-commit check verifies
  against.
- **Public read allowlist.** `PUBLIC_API_GET` (regex list next to
  `PUBLIC_API_PATHS`) opens four GET routes to anonymous callers:
  `GET /api/public/daily` (server time, reset, seeds, game directory —
  the signed-out substitute for `GET /api/daily`; the client falls
  back to it on 401 so the signed-out lobby stays server-anchored),
  plus the two daily leaderboards and the classic leaderboard (all
  null-guard `req.user`: anonymous ⇒ `me: null`,
  `isCurrentUser: false`). Anonymous hits go through a simple
  in-memory per-IP sliding window (60/min, `publicRateLimited`);
  token-bearing traffic is not limited. Everything mutating stays
  deny-by-default — add new public reads to `PUBLIC_API_GET`
  consciously, with the same null-guard discipline.

## Game Corner phase 3 — shell-owned chrome

Phase 3 gave the daily flow standard, shell-owned furniture. Key
pieces (all in `public/app.jsx`):

- **Pre-game screen (`PreGameScreen`).** Opening a daily game now lands
  on `screen === 'pregame'` — game identity, manifest chips
  (session length / input / undo), personal best, streak, the reset
  countdown, and the "everyone plays this exact deal today" line.
  **Consume-on-start moved to the Play button**: `launchGame` only
  navigates; `startDailyRun` does the `/start` claim (or resume), so
  browsing the pre-game screen never burns the day's attempt. Personal
  bests come from `GET /api/daily`'s new `bests` map
  (`{ gameId: { score, timeSecs } }`, all-time, server-computed).
- **How-to-Play modal (`HowToPlayModal`).** Renders the manifest's
  `howToPlay` cards. Auto-opens on a player's **first-ever open** of
  each game (tracked per-browser in localStorage `pc_howto_seen_v1` —
  deliberately device-local onboarding state, not server state) and is
  always reachable from a "?" in the daily in-game header and the
  ClassicShell topbar (`onHowTo` prop). **Timed dailies can't tick
  under the auto-show**: it appears on the pre-game screen, and the
  game (with its timer) only mounts after Play.
- **End screen.** The existing shell-owned win overlay is the standard
  end screen (score breakdown: base → streak bonus → earned; share
  CTA; leaderboard; Verified badge). Phase 3 added the personal-best
  row ("🏅 New personal best!" when beaten, sourced from `bests`).
- **`?play=1` deep-link param** skips the pre-game screen (and the
  first-open auto-show) and claims/mounts immediately — the
  pre-phase-3 behaviour. Proposal tests that assert on in-game UI use
  it; plain `?game=` deep links land on the pre-game screen.
- Classic `shell: 'self'` games (Snake, Block Blast, Diamond Rush,
  Hash Rush) render their own shell and only get the first-open
  auto-show for now — extending the "?" affordance into their headers
  is the remaining game-by-game work.

## Game Corner phase 4 — leaderboard upgrades

- **Friends scope.** The daily per-game leaderboard, the cross-game
  "Today's Top Scores" board (formerly "Today's Champions"), and the classic all-time leaderboard all
  accept `?scope=friends`: same query filtered to the caller + the
  people they follow (`user_follows`), ranks recomputed within the
  filtered set. Anonymous callers get an empty board (no follow
  graph). Client-side every board renders shared `LbScopeTabs`
  (Global | Friends); `?lbscope=friends` in the URL preselects the
  Friends view (proposal tests use it). Boards with a custom `url`
  (snake, breakout) stay single-scope.
- **Rating ladder.** New PUBLIC `game_ratings` table (one row per
  user × head-to-head game: elo, win_streak, best_streak, W/L/D, and
  a `week_start_elo`/`week_start_date` snapshot so "weekly movers" =
  `elo − week_start_elo` needs no history table). `applyMatchRating`
  (K=32, start 1000, draw=0.5) settles both players; it's called from
  the four finish paths that transition a match to finished exactly
  once — Mancala move (CAS), Chutes & Ladders move (CAS), race
  both-scores-in (CAS), and the forfeit endpoint (now guarded on the
  active→finished transition; still idempotent for repeat calls).
  `H2H_GAME_IDS` = mancala, chutes-ladders, 2048, blockblast.
  `GET /api/ladder/:gameId` (public, null-guarded, in
  `PUBLIC_API_GET`) returns entries ranked elo → win_streak →
  earliest-updated, plus `movers` (top weekly climbers) and the
  pinned `me` row. The client's **Ladder lobby tab** (`?tab=ladder`)
  renders it with a game picker.
- **Friend search (home/profile cleanup pass).** The Friends screen
  carries a debounced search box backed by auth-gated
  `GET /api/social/search?q=` (≥2 chars, ILIKE with escaped wildcards,
  excludes the caller, LIMIT 20, returns `following` per row —
  deliberately NOT in `PUBLIC_API_GET`); "＋ Add friend" is an instant
  one-directional follow (no request/accept model). `?screen=friends`
  deep-links the screen.
- **Staging fixtures:** `demo=friends-lb` (fake "Staging friend …"
  users the viewer follows, with today's attempts + classic scores),
  `demo=friendsearch` (4 fake "Staging seeker …" `users` rows the
  viewer does NOT follow, so searching "Staging" returns addable
  results), and `demo=ladder` (8 "Staging rival …" ratings across
  chutes-ladders/2048 with varied streaks and week deltas, a viewer
  row, and backing finished `classic_rooms`). All idempotent,
  IS_STAGING-gated, seeded via `GET /api/daily?demo=…`; the ladder
  tab renders only after `loadDaily` settles so the fixture lands
  before the ladder fetch.

## Game Corner phase 5 — turn-based rules registry + board games

- **Rules registry (`lib/board-rules.js`).** Pure, DB-free rules
  modules shaped like `lib/dapp.js`'s `gameEngines`, one per
  turn-based game: `initialState()` (must include `currentPlayer`)
  and `applyMove(state, player, move)` → `{ state, gameOver, winner }`
  (throws on an illegal move; the endpoint surfaces it as a 400).
  Mancala's pure rules (`srvMncDistribute`/`srvMncApplyMove`) and the
  Chutes & Ladders roll logic were EXTRACTED here from server.js —
  server.js re-imports the mancala functions under their old names so
  the bot AI / ZK replay / daily-challenge call sites are untouched.
  Dice games own their randomness server-side (`crypto.randomInt`).
  `boardRules.selfTest()` runs at boot next to the dapp self-test.
- **Five new board games** — Checkers, Reversi, Four in a Row, Gomoku,
  Ludo (`BOARD_RULE_GAME_IDS`) — run on the EXISTING classic_rooms
  infrastructure: create/join by room code, turn ownership from
  `state.currentPlayer`, `move_seq` CAS, 1.5s polling, the guarded
  forfeit endpoint, and ladder rating on finish (all five are in
  `H2H_GAME_IDS`). The generic move endpoint dispatches on the
  registry; the move payload is game-specific under `{ move: {...} }`
  (chutes' legacy top-level roll body still works). They are
  **online-only and tier C**: the server referees every move, so the
  client (`BoardRoomGame` → `OnlineRoomSetup` + `BoardOnlineRoom` +
  per-game `BOARD_VIEWS` renderers) only renders polled state and
  submits move intents — no client-side rules to drift.
  - Checkers: captures not forced; multi-jump keeps the turn
    (`mustJumpFrom`); promotion ends a chain; no pieces/no moves loses.
  - Reversi: auto-pass when a side has no reply; disc count on double
    pass. Four in a Row: 7×6, draw on full board. Gomoku: 15×15,
    five-or-more wins. Ludo: relative token positions (−1 base,
    0–50 ring, 51–56 home column, 57 home), roll→move phases, 6 leaves
    base and re-rolls, ring captures except safe start cells, exact
    roll to finish.
- **Staging fixtures:** `demo=ladder` now also seeds checkers/reversi
  ratings; `demo=boardroom` (re-)arms a WAITING Checkers room with
  code `DEMOBG` whose state starts at `currentPlayer: 2`, so a tester
  who joins it moves immediately against a fake opponent.

## Game Corner phase 6 — shared card/tile engine + Lane A dailies

Phase 6 added a small client-side **card/tile engine** and eight new
daily games riding it (all in `public/app.jsx`, section "Phase 6 —
Shared card/tile engine + Lane A daily games"):

- **Engine primitives:** `ceDeck(nDecks, suits, rng)` /
  `ceShuffle(arr, rng)` (Fisher-Yates over the shared mulberry32
  family — same PRNG as `lib/dapp.js`'s tile generator), the shared
  `<CeCard>` / `<CeSlot>` renderers, and the Mahjong layered-tile
  helpers (`MJ_LAYOUT`, `mjIsFree`, `mjDeal`) — `mjDeal` uses
  **reverse-removal dealing** so every daily board is solvable in at
  least one order (the same layer/overlap model as `tileBoard` in
  `lib/dapp.js`, with solvability added).
- **Eight new dailies**, ids `klondike`, `spider` (1-suit, 8 decks of
  spades), `mahjongsol`, `nonogram`, `minefinder`, `anagrams`,
  `cratepush`, `dropstack`. All are `category: 'daily'` + `shell:
  'daily'` + `daily: true`, so the existing machinery picked them up
  with zero route changes: server-issued seeds (`ensureDailySeeds`
  loops the derived `GAME_IDS`), consume-on-start locks, resume,
  streak multipliers, per-game leaderboards, pre-game/How-to-Play
  chrome, and `demo=leaderboard` staging rows (that fixture loops
  `GAME_IDS` too).
- **Validation tier:** all eight are **tier B** in `GAME_REGISTRY` —
  finishes settle through `settleDailySession`'s snapshot + timing
  heuristics (their `onStepChange` calls feed the shared
  `dailyRunLog` automatically). Registering a per-game engine in
  `lib/dapp.js` flips one to tier A without touching game code.
- **Loss paths:** `minefinder` (mine tap), `mahjongsol` (stuck with
  no shuffles left), and `dropstack` (top-out) call `onLose` — the
  day locks with score 0, streak not extended, like Crypto Wordle.
- **Win-move autosave rule:** these games deliberately **skip the
  progress save on the winning move** — the finish call closes the
  attempt immediately and a racing progress write 409s against the
  finished row (harmless but logs a console error, which trips
  proposal checks). Keep that pattern for future dailies.
- **IP hygiene (spec §8):** names are generic on purpose — "Nonogram"
  not "Picross", "Drop Stack" not "Tetris" (own palette, no trade
  dress), "Crate Push" not "Sokoban", "Anagram Sprint" not "Boggle".
  Keep it that way when touching copy.
- **Determinism quirks:** `cratepush` picks one of ten hand-authored
  always-solvable rooms (`CP_LEVELS`) via the daily seed; `dropstack`
  derives a fixed 40-piece bag sequence; `anagrams` picks 2×5 + 2×6 +
  1×7 words from in-file pools. Progress shapes: klondike/spider
  `{ dayNum, st }` (full serialized deal state), mahjongsol
  `{ dayNum, faces, removed, shuffles, pairs }`, nonogram
  `{ dayNum, grid }`, minefinder `{ dayNum, revealed, flags }`,
  anagrams `{ dayNum, solved }`, cratepush `{ dayNum, player, crates,
  moves }`, dropstack `{ dayNum, grid, pieceIdx, lines, points }`.
- The single-file `app.jsx` (~19k lines) is still esbuild-compiled in
  one pass; the spec's deferred file-split remains available if it
  grows past comfortable, but was not needed for this phase.

## Game Corner phase 7 — Game of the Day, home reorg, per-game chat

- **Game of the Day.** New PUBLIC `daily_featured` table (seed_date PK →
  game_id, seed). `ensureDailyFeatured()` (`server.js`, next to
  `ensureDailySeeds`) picks today's game by a **deterministic weighted
  round-robin**: `gotdSchedule()` expands `GOTD_WEIGHTS` (flagship four = 2,
  every other daily = 1, pool = all Lane A dailies via `GAME_IDS`) into a
  round-interleaved schedule — round 0 lists every game, round r adds games
  with weight > r — and indexes it by UTC day number, so the same game never
  features on consecutive days and every process computes the same answer.
  The row is upserted lazily on the first request of the day and returned as
  `featured: { date, gameId, seed }` from BOTH `GET /api/daily` and the
  public `GET /api/public/daily` (so the signed-out hero renders too). The
  seed is the game's normal daily seed; streaks are **unchanged** (any daily
  play counts — GotD-participation streaks per spec §6.3 remain deferred).
- **Home reorg.** The three-tab lobby is retired. `lobbyTab` is now
  `'home' | 'ladder'` (legacy `?tab=daily/classic/feed` land on home;
  `?tab=ladder` still deep-links — the Community Feed screen, post/comment
  UI, Share-to-Feed, and profile follower counts were retired in the
  spec-audit pass; `user_follows` + the Friends screen stay, and the
  post/comment tables/routes remain retired-in-place). Home renders, in order
  (as revised by the home/profile cleanup pass): the dismissible "New this
  week" strip (in-repo `CHANGELOG` const; dismissal is deliberately
  per-page-load — plain state, no localStorage — ✕ hides it for that visit
  and it returns on refresh; its "See all ›" is the only entry to the
  What's-new sheet) → `GotdHero` (identity, "Next puzzle in" countdown,
  state-aware CTA; its old top-3 preview was removed as duplicate) →
  `TodayChampions` (GAME-OF-THE-DAY-ONLY board: `/api/daily/leaderboard/today`
  resolves today's featured game via `ensureDailyFeatured` and ranks its
  finishers by `score DESC, time_secs ASC, finished_at ASC`, returning
  `{ entries, me, total, gameId }` with `userId` per row for the
  row-tap → profile navigation) → `InProgressRow` (resumable daily attempts +
  the viewer's active online matches from the auth-gated
  `GET /api/rooms/mine`, your-turn flagged via `state.currentPlayer`, with an
  "expires in Xh" turn-timer line) → "Daily Puzzles" grid + "Classic Games"
  grid (same card markup as before — tests assert on its strings). The home
  badges panel and the Ladder/What's-new quick-link buttons are retired: the
  badge collection lives on the profile (`BadgeStrip`, now with the
  next-milestone progress pills), and the Rating Ladder is reachable only via
  the `?tab=ladder` deep link. Tapping a your-turn card re-enters the live
  room: it pre-seats `{ roomId, myPlayerNum }` through `classicGameModeOpts`,
  which `BoardRoomGame` (and Chutes & Ladders) read to skip the create/join
  setup screen.
- **Per-game public chat.** New tables `chat_messages` + `chat_reports` —
  both PUBLIC after the policy review: each game's room is open to every
  signed-in user in-app (the "already visible to other users" test), so
  staging may carry prod rows. Routes (all auth-gated — chat is an account
  moment; deliberately NOT in `PUBLIC_API_GET`):
  `GET /api/chat/:gameId?after=<id>` (ascending, last 50, 10s client poll),
  `POST /api/chat/:gameId` (`{ body }`, ≤500 chars), and
  `POST /api/chat/messages/:id/report` — one row per (message, reporter),
  auto-hide at `CHAT_REPORT_THRESHOLD = 3` distinct reporters. Hidden
  messages are tombstoned in reads (body/user nulled server-side, never
  deleted). Client `ChatPanel` is a bottom-sheet overlay reachable from the
  pre-game screen, the daily in-game header, and the ClassicShell topbar
  (new `onChat` prop); `?chat=<gameId>` deep-links it open (tests use it).
- **Staging fixtures** (in `GET /api/daily`, all idempotent, IS_STAGING):
  `demo=gotd` (6 fake finished attempts for today's featured game so the
  GotD-scoped Today's Top Scores board renders), `demo=chat` (10 messages across the featured game's
  room and the Checkers room — the hidden-by-reports example lives in
  **checkers** so tests have a stable `?chat=checkers` target), and
  `demo=yourturn` (re-arms active checkers room `DEMOYT` with the viewer as
  player 2 to move, so the your-turn card renders).

## Post-launch spec-audit changes (do not undo)

- **48h correspondence turn timer:** active two-player rooms auto-forfeit
  the side to move after `TURN_TIMEOUT_HOURS` (48) without a move —
  enforced LAZILY on the room read/poll paths (`expireStaleClassicRoom`
  / `expireStaleMancalaRoom` in `server.js`, same active→finished CAS +
  single `rateMatch` as the manual forfeit). `demo=yourturn` seeds a
  second room `DEMOEX` backdated 46h to demo the expiry line.
- **dApps chrome removed** (nav chip, Account row, Minesweeper wallet
  section); the server integration (`/api/integration/*`) and the
  Verified badge / session receipts stay.
- **Share cards are three lines** (`buildShareCard` in App): edition/date,
  the game's spoiler-free result line, then "#N on today's board" + the
  no-login `?game=` link. Rank is threaded in after finish (leaderboard
  `me.rank`) or the guest rank preview.
- **IP naming sweep:** display names only — Marble Loop (id `zuma`),
  Daily Cipher (id `cryptowordle`, tag Words), Hash Rush tag Arcade,
  Minesweeper "Lock In" (was Cash Out). Registry ids NEVER change (they
  key daily_attempts/classic_scores/chat/deep links).

## Retired features (Game Corner phase 1 — do not resurrect)

As of the "Game Corner" evolution's phase-1 subtraction, the following
were **deliberately removed** and should not be re-added piecemeal:

- **The MATCH in-app currency** and everything that moved it: earn on
  daily wins, paid hints, streak freezes, tips, the Wallet screen, the
  nav balance chip, the MATCH on-chain ledger/memo anchoring, and the
  Tile Match wallet/daily-tasks/duels surfaces. **Hints are now free**
  — still capped per day and counted server-side (`daily_hints`), just
  no cost. Points, streaks, and badges are the only rewards.
- **Texas Hold 'Em**, **Idle Empire**, and the **PvP staking arena**
  (games and their routes/registry entries).
- Their **database tables remain in the schema** (`poker_chips`,
  `idle_game_state`, `pvp_matches`/`pvp_moves`, `tilematch_tokens`,
  `match_ledger*`, `token_*`, `tilematch_duels`,
  `tilematch_daily_tasks`) — the migrations are intentionally
  non-destructive; no code path touches them anymore.
- `REDIS_URL`/ioredis (only ever the PvP matchmaking fast path) and the
  UTGO wager contract/ABIs are gone.
- **The Account screen and the wallet ownership proof / "On-chain login"
  identity** (home/profile cleanup pass): the Usernode-pubkey display,
  Connect / Verify / Disconnect wallet controls, the avatar "verified"
  tick, and the routes `POST /api/wallet/link`, `GET /api/wallet/challenge`,
  `POST /api/wallet/prove`, `POST /api/wallet/disconnect`, and
  `GET /api/account` are all removed — with them the `ethers` dependency
  (its only use was `verifyMessage` in the prove route). The
  `user_wallets` / `wallet_ownership_proofs` tables remain in the schema
  (non-destructive migrations); no code path touches them. Tapping the
  nav account chip now opens the viewer's own profile
  (stats + recent games + badges); `?screen=account` deep links land
  there too.

The DApp-Mode verification framework (`lib/dapp.js`, `game_sessions` /
`session_states`, session receipts, the Verified leaderboard) is NOT
part of the retirement — it stays and is the seed of Game Corner's
anti-cheat harness.
