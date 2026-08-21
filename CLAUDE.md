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
`puzzlechain_`/`pc_` prefixes on purpose) is a **games hub** — a "chain"
of bite-size games sharing one lobby, each offering up to **three ways
to play** (#176):

- **Daily** — one seeded deal a day, ranked, the same board for
  everyone, one attempt. Solving pops a "Solved!" celebration and the
  card locks until midnight UTC. Wins build a **streak** that multiplies
  points.
- **Story** — a ladder of difficulty bands you clear and tick off. Pays
  once, on first clear.
- **Arcade** — endless, a fresh board every run, three difficulty bands.
  Pays only for landing higher: beating your own best, or crossing a
  rank threshold for the first time.

34 registry entries, 62 (game, mode) pairs. See "Play modes (#176)"
below — the mode table is the single declaration of what exists.

## Play modes (#176) — daily / story / arcade

**A play mode is a property of a CARD, not of a registry entry.** That
distinction is what keeps the whole feature cheap, and it is the first
thing to understand before touching any of it.

- **Registry ids never move.** `daily_attempts`, `classic_scores`, chat,
  leaderboards, badges and every deep link key off them. The four games
  that ship as two ids (Snake / Daily Snake, Bounce / Daily Bounce, Tile
  Match / Daily Tile Match, Mine Finder / Mine Finder Classic) keep BOTH
  and merge only on the home card. Nothing migrated.
- **`PLAY_MODES_BY_ID` (`public/src/29-cards.jsx`) is the declaration.**
  The home grid, the pre-game screen, the deep links and the self-tests
  all read it. Omissions there are decisions, and the comment says why
  for each one.
- **`scripts/check-registry.js` enforces the client↔server agreement**
  at build time (it runs as part of `npm run check`): the id sets match,
  every id declaring `daily` is in the server's `GAME_IDS`, and every id
  declaring `story` has a `STORY_BANDS` rung count. This pair used to be
  hand-mirrored under a "keep these in sync" comment. It is not any more
  — do not add a third copy of the same claim, extend the check.

### Things that are easy to get wrong here

- **Branch on the MODE, never on `game.daily`.** Seven classics (2048,
  Knight's Tour, Block Fit, Diamond Rush, Marble Loop, Hash Rush,
  Match-3) have a daily while keeping `daily: false` and their classic
  shell. `handleWin`/`handleLose` reading the registry flag sent their
  daily runs down the classic path, where they recorded nothing. Server
  side those entries carry `dailyMode: true`, and `GAME_IDS` derives
  from it.
- **Only a daily resumes.** `savedProgress`/`onSaveProgress` are the
  daily attempt row. A story run saving into it 409s, and READING from
  it would hydrate a half-finished daily into a rung that is supposed to
  be a fixed retryable deal. `resumable` in `renderGameBody` is the gate.
- **A real-time game's "Game Over" is a WIN everywhere but story.**
  Marble Loop, Bounce, Snake and Hash Rush report both endings through
  `onWin` because the score is the result. In story that ticks the rung
  you just failed, so they route through **`reportRunEnd`**, which sends
  an uncleared story run to `onLose` and leaves every other mode alone.
  A story rung must also END when its content is cleared — Bounce used
  to rebuild the same wall forever, so the rung could only be ticked by
  dying.
- **The arcade seed belongs to the RUN, and the shell owns the run.**
  `beginArcadeRun()` / `currentArcadeSeed()` in `05-core-lib.jsx`. A game
  that rolled its own seed inside `modeSeed` left the finish with nothing
  to store, so there was no board to replay — and games that call
  `modeSeed` twice for one run would have got two unrelated boards.
- **A story rung's board must be STABLE** (same seed every visit, so it
  is a rung you can retry) and an arcade board must not be (fresh per
  run). `modeSeed` is the one place that decides this.

### Arcade settlement

Arcade pays for leaderboard position, so a run is **anchored** before it
is played: `POST /api/arcade/:gameId/start` stamps `started_at`, and the
finish compares the claimed `timeSecs` against the server's own clock
(`ARCADE_TIME_GRACE_SECS`, 30s, generous — it only has to catch a claim
that could not have been played). A run that is unanchored, replayed
against a finished row, or claims materially more time than passed is
recorded **unverified**: it stays in the player's own history and it does
NOT touch `arcade_bests`, the rank, or the point total. The rule is
about the CLOCK, deliberately — a per-game score ceiling would be a
second copy of every game's scoring formula, and the daily's replay
harness already exists for the games that warrant that depth.

`arcade_runs` is trimmed to 50 rows per (user, game); the history screen
shows 25. Nothing else bounds that table — arcade is unlimited by design,
so it has no equivalent of the daily's uniqueness constraint.

### Replays are inert

Replaying a past arcade run goes through `practiceMode`, so `handleWin`
/`handleLose` stop before any endpoint. Without that, the cheapest way to
top an arcade board would be to replay the friendliest seed you ever drew
until you played it perfectly — the opposite of what a fresh-board mode
is for. The practice ribbon is rendered **once, pinned, at the game-screen
level** so it appears over all three shells; it used to live inside the
daily shell, which is why replaying 2048 showed no marker at all.

### A parameterised board and a canvas renderer

#176 made several boards VARY in size or length — Word Search runs 8×8 to 15×15,
Knight's Tour 5×5 to 8×8 with blocked squares, Drop Stack's arcade bag is 20000
pieces against the daily's 200, Mine Finder's ladder runs 6 to 38 mines. The
canvas renderers those games gained in #173 were written against the fixed
originals, so every one of them had a constant baked into the drawing loop, the
hit test, the pill row and the aria-label at once.

**A canvas board reads its dimensions from the run, never from the module
constant.** The constant stays as the free-play default; the component derives
`size`/`total`/`bagLen` from the board it was actually given and threads that
through `useFitBox`, the draw loop and the pointer math together — miss one and
the board draws at one size and is clicked at another. This bug class is silent:
it neither throws nor fails a parser, and at the default band it looks correct.

Related, and the reason the browser sweep exists: a merge that keeps the tail of
a block and drops the head leaves an identifier referenced but undeclared. That
is a `ReferenceError` at mount, which `npm run check` cannot see (it is valid
syntax) and which only mounting the game reveals.

### Offline-generated content

Two games cannot rate their own content at mount time and ship a corpus
in `public/corpus/` instead:

- **Klondike / Spider** (`scripts/rate-seeds.js`) ship rated SEEDS —
  `[[seed, band], …]` — because the deal is cheap to re-derive and it was
  RATING it that cost a search.
- **Crate Push** (`scripts/gen-sokoban.js`) ships LEVELS, because Sokoban
  generation is a search either way. 200 rooms across 8 bands, 3 pushes
  up to ~35, each carrying its exact minimum solution length.

`loadCorpus` handles both shapes and caches per game. **`startRun` and
`startPractice` await it**; the pre-game screen only WARMS it. That is
not belt-and-braces: `?game=cratepush&play=1` skips the pre-game screen,
and when the warm-up was the only fetch it dealt from the hand-built
fallback rooms every time — silently, because a graceful fallback is by
design invisible.

**How gen-sokoban works, and why it is worth reading before touching it.**
A push and a pull are exact inverses, so breadth-first expanding the
SOLVED position under pulls walks the forward push-graph backwards. Every
position it reaches is solvable by construction, and its BFS depth IS the
exact minimum solution length in pushes — one search per room instead of
one per candidate. Two rules fall out, both learned the hard way:

- **The search bound must fall BETWEEN whole levels.** Sampling states
  within a level means their successors are not discovered there and turn
  up later by a longer route: an earlier build shipped levels recorded at
  35 pushes that a forward solver cracked in 16.
- **Expanding a state and normalising its successors need SEPARATE reach
  buffers.** Sharing one meant the first successor's scan destroyed the
  map the move loop was still iterating against, silently allowing and
  forbidding later moves. It was present in both directions at once, and
  only the two disagreeing exposed it.

`node scripts/gen-sokoban.js --verify` re-solves the shipped corpus
FORWARD with an independent search and checks the recorded depths. Both
bugs above were caught by it and nothing else. Run it after any retune.

### Deep links

`?pmode=daily|story|arcade` opens a card in a play mode; `?band=` picks
the rung (story: 1-based) or difficulty (arcade: `easy|normal|hard`);
`&play=1` mounts the board. Deliberately not `?mode=`, which already pins
a classic's opponent. Checked BEFORE the mode-select branch, or 2048 and
Block Fit surface the opponent chooser instead.

Without these the story ladder, the band pickers and every board behind
them are reachable only by TAPPING a card button — which navigation-driven
proposal checks and screenshots cannot do, so none of #176 would have been
verifiable. `demo=modes` seeds a half-walked ladder plus arcade rivals and
run history.

### Every card entry point is a BUTTON, and there is one of them per mode

A card's tap target is its mode buttons — never the card itself. The
single-mode games (the seven head-to-head ones) used to have no button at
all: the whole card was one hit area, which made them read as a different
kind of thing to their neighbours and gave the player nothing to aim at.
`29-cards.jsx` synthesises a one-entry mode list for them
(`{ mode: null, label: 'Play' }`) so the same `.card-mode-btn` markup and
the same `tapProps` press feedback cover all 34 games. `.card-plain-hit`
is gone; a card without a button is a bug, not a layout variant.

The daily button is **outlined, not filled**. A filled accent block on
every daily card turned the grid into a wall of colour, which is the
opposite of the emphasis it was meant to carry — the state (fresh /
in-progress / done) reads from the border and label instead.

### One opponent screen for all seven head-to-head games

`OpponentScreen` (`07-ui-chrome.jsx`, `screen === 'opponent'`) is the
pre-game screen for a game whose axis is the opponent rather than the play
mode. Before it there were **two** first screens and neither was good:
Mancala and Snakes & Ladders dropped you onto the board, which then
rendered its own full-page picker; the five phase-5 board games opened a
modal over the lobby that listed the modes and nothing else. The modal was
also where bot difficulty went missing — the tiers existed and were plumbed
through to the search, and simply had no control on that path, which is why
Checkers and Gomoku only ever played at full depth.

- **One picker: `ClassicModePicker`.** It already handled bot strength,
  Ludo's 2–4 local seats, online create/join and Snakes & Ladders' board
  variants. Add the next per-mode option there and every game gets it, at
  first launch and from the ☰ menu's New Game alike.
- **`MancalaModeSelect` is deleted, deliberately.** It was a second copy of
  the same screen that predated the shared one, and it is what made Mancala
  look unlike the other six. `MancalaGame` now reads `gameMode` /
  `gameModeOpts` like `ChutesLaddersGame` does. **Don't re-add a per-game
  picker** — a game that needs something the shared picker lacks should
  declare it (see `variantPicker`, `roomApiBase`).
- **`roomApiBase`** is the whole accommodation for Mancala's older room
  routes (`/api/mancala/rooms`, its own table): the flow, the copy and the
  error handling stay shared. Create responses are read as
  `body.id || body.roomId` because the two shapes differ.
- **`rankedModes`** says which of a game's opponents post a score. Only
  Mancala's bot does (it has a verified-session leaderboard of its own);
  the five board games' bots are unrated by construction. Its old picker
  spelled that out with a 🏆 Ranked pill, so the shared one does too —
  moving a game onto a shared screen must not quietly drop the thing that
  told a player their result counts.
- It is a SCREEN and not a popup because it can then say what the game is —
  the first two `howToPlay` cards render inline as `.opp-brief` — before
  asking who you want to play against.
- **2048 and Block Fit land here too** (nine games in all, the nine with a
  `modes` list). Their axis is a score race rather than an opponent, so the
  chips and the heading come off `modes` — "Choose how to play", not
  "Choose an opponent". They also keep the retired modal's one good extra,
  the all-time leaderboard preview (`.opp-lb`).

### The How-to-Play modal never opens by itself

Phase 3's first-open auto-show is removed, along with its
`pc_howto_seen_v1` key. A modal in front of a board you just tapped is
something to dismiss, not onboarding; the pre-game and opponent screens
carry the short version inline and "❓ How to play" is always one tap away.

## App-specific conventions

This is a **single-page React 18 app** built by concatenation rather
than by a module bundler. Read this before editing the frontend — the
loading mechanism is unusual on purpose.

- **The frontend is `public/src/*.jsx` — 31 files, concatenated.**
  `scripts/build.js` joins them in the order declared by
  `public/src/ORDER` and runs esbuild's JSX transform over the result,
  emitting `public/app.js`. `index.html` loads that as a plain script.
  Run `npm run build`; the Dockerfile does it at image build time.
  (Before Aug 2026 this was a single 26k-line `public/app.jsx`. The
  split is provably behaviour-preserving: at that commit the
  concatenation was byte-identical to the old file and the compiled
  `app.js` did not change by one byte.)
  - **Still never add `import` or `export`.** The files are
    concatenated, not linked — one classic script, one global scope,
    exactly as before. Cross-file references just work.
  - **`ORDER` is load-bearing.** Anything read at evaluation time —
    the `css` template reads the palette, `GAMES` names every game
    component — must be declared in an earlier file. A new file that
    isn't listed in `ORDER` fails the build rather than silently not
    shipping.
  - Use the globals: `const { useState, useEffect, useRef } = React;`
    and mount with `ReactDOM.createRoot`. `React`/`ReactDOM` are on
    `window`.
  - `npm run check` compiles the same concatenation with Babel — a
    second, independent parser as a syntax backstop.
- **Don't touch these parts of `index.html`:** the `<script src="/app.js">`
  load and its watchdog/error shell, the `// usernode-dev-console@1`
  block (platform log forwarder), and the inline data-URI favicon
  (its absence triggers a `/favicon.ico` 401 that logs a console
  error and trips the no-console-errors check).
- **Design system lives in `public/src/00-palette.jsx` and
  `01-styles.jsx`:** a `const C` color-palette
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
    duplicates the storage key and resolution rule from
    `public/src/02-prefs-theme.jsx` on
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
`STREAK_TIERS` (`public/src/05-core-lib.jsx`) and applied client-side in
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
  and `GAMES` (`public/src/28-registry.jsx`) now carry a per-game `manifest`:
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
pieces (all under `public/src/`):

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
  `howToPlay` cards, reachable from the "?" on the pre-game / opponent
  screen, the daily in-game header and the ClassicShell topbar
  (`onHowTo` prop). It **never opens by itself** — the phase-3
  first-open auto-show and its `pc_howto_seen_v1` localStorage key were
  removed, because a modal in front of a game you just tapped is a
  thing to dismiss before playing, not onboarding. The pre-game and
  opponent screens carry the short version inline instead; the modal is
  the long form, on request.
- **End screen.** The existing shell-owned win overlay is the standard
  end screen (score breakdown: base → streak bonus → earned; share
  CTA; leaderboard; Verified badge). Phase 3 added the personal-best
  row ("🏅 New personal best!" when beaten, sourced from `bests`).
- **`?play=1` deep-link param** skips the pre-game screen and
  claims/mounts immediately — the pre-phase-3 behaviour. Proposal tests
  that assert on in-game UI use it; plain `?game=` deep links land on
  the pre-game screen.
- Classic `shell: 'self'` games (Snake, Block Blast, Diamond Rush,
  Hash Rush) render their own shell — extending the "?" affordance into
  their headers is the remaining game-by-game work.

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
daily games riding it (`public/src/24-engine-cards.jsx`, "Phase 6 —
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
  derives a fixed **200**-piece bag sequence; `anagrams` picks 2×5 + 2×6 +
  1×7 words from in-file pools. Progress shapes: klondike/spider
  `{ dayNum, st }` (full serialized deal state), mahjongsol
  `{ dayNum, faces, removed, shuffles, pairs }`, nonogram
  `{ dayNum, grid }`, minefinder `{ dayNum, revealed, flags }`,
  anagrams `{ dayNum, solved }`, cratepush `{ dayNum, player, crates,
  moves }`, dropstack `{ dayNum, grid, pieceIdx, lines, points, level,
  hold }` (the last two added by the phase-9 rebuild; hydration still
  accepts the old shape and derives `level` from `lines`).
- The frontend was a single `app.jsx` through this phase; it was split
  into `public/src/*.jsx` in Aug 2026 (see "App-specific conventions").

### What makes a good Daily Tile Match board (issue #116)

Recorded here because the original board was **trivial** and the reason
was structural, not cosmetic. The pre-phase-9 daily dealt 72 tiles as
8 icons × 3 triples into a **fixed stack** (40 bottom / 28 middle /
4 top) — the same silhouette every single day, with only the icons
moving. About 22 tiles were tappable at once across just 8 types, so a
matching triple was nearly always available, and with 7 tray slots
against 8 types you essentially **could not be trapped**. There was no
dead end to avoid and no ordering decision that mattered; the only
variable was how fast you could tap 72 times. Winning always paid a
flat 150 points.

Three properties make one of these boards actually a puzzle, in order
of importance:

1. **Solvable but not trivially solvable.** A winning order must always
   exist, but plenty of orders must lose — otherwise nothing you do is
   a decision. `tmDealSolvable` guarantees the first half by dealing
   with **reverse-removal**: it fills slots in a random linear
   extension of the coverage order (a slot may only be filled once
   everything beneath it is filled), then chunks that fill order into
   triples. Removing in the reverse of the fill order is therefore
   always legal. This is the same technique `mjDeal` uses for Mahjong
   Solitaire, and it becomes **mandatory** once a board is tight enough
   to lose on.
2. **Type count is what makes the tray bind.** This was the surprise:
   difficulty is governed far more by the number of icon types than by
   how many tiles are free. 12 types against 7 slots means you can
   genuinely fill the tray with junk; 8 types cannot.
3. **Triples split across layers.** Chunking the fill order into
   triples naturally straddles layer boundaries, so a set's third tile
   is often buried under tiles you'd otherwise clear first — which is
   what punishes greedy top-first play.

**Balance note — a deliberate deviation from the original plan.** The
plan called for reducing the free-tile count to 8–14. Measured against
a competent solver, that combination (12 types AND ~10 free tiles) was
near-unwinnable at roughly 3%: with no choice of tile you cannot steer
away from a jam. The free-tile count is therefore left in the 30s and
the difficulty ladder is set by layout shape instead. `TM_LAYOUTS` is
ordered gentlest-first by **measured** solver win rate (Courtyard ~46%
down to Fortress ~20%), and `TM_WEEK` maps each weekday onto a window
of that ladder — Monday gentlest, weekend hardest. Those rates come
from a boosterless solver with no lookahead, so real players (3 undos,
2 shuffles, 1 clear) do better. **If you retune the layouts, re-measure
rather than eyeballing the shape** — free-tile count alone predicts
difficulty poorly.

**Tier-A coupling — the sharp edge.** `tilematchingdaily` is tier A, so
every finish is re-simulated by `lib/dapp.js`'s engine. That engine
models only the tray, so layouts are free to change, but the **type and
set counts** (`TM_DAILY_TYPES` / `TM_DAILY_SETS` ↔ `TM_CONFIG`) and the
**score ceiling** (`tmDailyScore` ↔ `tmDailyCeiling`) must be mirrored
across the two files in the same commit. `validateSession` rejects a
claimed score above the recomputed one, so the engine returns the
*ceiling* (zero elapsed time, every booster unspent) and the client
formula only ever subtracts from it. Get this wrong and finishes still
record but silently settle as `disputed`, losing the Verified badge.

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

## Launch-set alignment pass (spec-v0.11 gap close — July 2026)

One PR closed the gap analysis against the Game Corner build spec v0.11:

- **Rename sweep (display names only; ids/storage keys never change):**
  `chutes-ladders` → "Snakes & Ladders" (Hasbro mark), `blockblast` →
  "Block Fit" (Hungry Studio's live title), `wordhunt` → "Word Search"
  (it IS a word search; frees the Word-Hunt mechanic name), `minesweeper`
  → "Mine Finder Classic" (family consistency with the daily), and
  `sudoku` → "Sudoku" (it now hosts both board sizes). Share strings and
  in-game copy were swept too; the CHANGELOG strip credits the renames
  and no longer references the old Zuma/Crypto Wordle marks.
- **`wordsprint` — Word Sprint** (the spec's Boggle-style launch game,
  new id because `wordhunt` was taken): 4×4 seeded letter grid
  (`WSPR_DICE`, own distribution), trace adjacent tiles, 90-second
  countdown (`WSPR_SECS`), open vocabulary against the in-file
  `WSPR_WORDS_RAW` set, per-length points (`WSPR_POINTS`). The countdown
  ending IS the win (score may be 0 — locks the day, never breaks a
  streak). **Its manifest `tieBreak` is `'score-then-time'`** — the daily
  per-game leaderboard and the public rank-preview both dispatch their
  ORDER BY / counting off that symbolic rule now (first non-fastest-solve
  daily). Progress `{ dayNum, found }`; autosave and per-word saves stop
  in the final 3 seconds so nothing races the clock-driven finish (409
  rule).
- **Sudoku difficulty (one entry, two boards):** an in-game chooser
  (before the timer starts) offers **9×9 Classic (×2 points)** or the
  original **6×6 Mini** (byte-identical board/stream to before). The 9×9
  derives a second stream from the same daily seed and generates with a
  uniqueness-checked dig (`generateSudoku9`/`sdk9CountSolutions`, 40
  givens). Progress gains `difficulty`; saves without it hydrate as mini.
  `boxAt`/`sudokuConflicts`/`sudokuSolved` are size-aware.
- **`snakedaily` / `bouncedaily`** — seeded, bounded daily variants of
  the free-play classics (which are untouched): Daily Snake eats a
  seeded apple SEQUENCE (skip-if-occupied), win at 20 apples, crash =
  `onLose`; Daily Bounce is one seeded brick wall, 3 balls, clear = win.
  Both are real-time and deliberately have **no mid-run resume** (a
  claimed unfinished attempt restarts the run; nothing is autosaved).
- **Ludo 2–4P:** `classic_rooms` grew `player3_*`/`player4_*`/
  `max_players` (default 2); the ludo rules module is seat-generic
  (`nPlayers`, `seats`, `forfeited`, legacy `{p1,p2}` states normalized
  in and mirrored back out), start offsets {1:0, 2:26, 3:13, 4:39}, all
  four start cells safe. Join fills seats 2→3→4 and activates when full
  (response carries `yourPlayerNum`); a multi-seat forfeit/expiry drops
  only that seat (`ludoForfeitSeat`) and the match continues —
  last-seat-standing wins. **Only 2P matches are rated**; 3–4P is
  unrated until multi-player Elo math is chosen. Staging fixture
  `demo=ludo4` re-arms a WAITING 3-seat room `DEMOL4` (two fake seats)
  so a tester who joins moves immediately.

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

## Cross-cutting remediation pass (#120–#145 — July 2026)

One PR closed all 26 open issues, in eight phases. The phases are ordered
because later ones use primitives the earlier ones build. **Four repo-wide
rules came out of it — break any of them and a self-test fails the build.**

### 1. Canvas colour: read `PAL`, never `C`

`C.x` is the string `'var(--c-x)'`. Assigning it to `ctx.fillStyle` is
**invalid, and the canvas silently keeps its previous colour** — which is
black on the first frame and "last frame's colour" thereafter. That single
mistake was issues #126 (black Nonogram), #127 (black Mine Finder) and #140
("Drop Stack's background keeps changing"). Rules now:

- Canvas code reads **`PAL`** (the live plain-object palette). For colours
  captured at module scope, store palette **token names** and resolve through
  **`palOf(name)`** / `PAL[name]` at draw time (`MF_NUM_COLORS`,
  `BOUNCE_ROW_COLORS`) so a theme flip recolours mid-game.
- **`guardCanvasCtx(ctx)`** wraps every one of the seven canvas contexts. It
  swallows a `var(...)` colour and logs a console error — deliberately NOT
  env-gated, so the bug class can never silently return.
- `useCanvasBoard` redraws on theme change (`useThemeVersion`), and the four
  hand-rolled loops (bounce, zuma, hashrush, bouncedaily) all cap DPR through
  **`canvasDpr()`** (max 3), matching the hook.
- **Intrinsic game art still stays hardcoded** — Drop Stack pieces, the Daily
  Bounce well/bricks/paddle, Hash Rush's miner/tokens/hazards, 2048 tiles,
  cards, Mahjong ivory. Only *chrome* re-themes. Hash Rush's background and
  lane markings moved to `PAL` because they were near-white and invisible in
  the light palette.

### 2. Tap targets: the allowlist is load-bearing

The `touch-action: manipulation` selector list (near the top of `css`) is now
registry-wide, and **`registry-touch-action` in `runClientSelfTests()` fails
if any listed class computes to `touch-action: auto`**. A game whose tappable
element is missing from that list pays ~300 ms per tap on touch.

- Use **`tapProps(onTap)`** on board cells: it sets `data-pressed` on
  `pointerdown` (feedback on finger-DOWN, not on the delayed click) and fires
  the action on `pointerup` for touch, falling through to `onClick` for mouse.
- Add press feedback for every new tappable class. `:hover` is not feedback —
  a finger never fires it. The app had 8 `:active` rules against 69 `:hover`
  rules before this pass.
- **Two boards are too dense to fix with feedback alone**, and their solutions
  are the pattern to copy: **Gomoku** (15×15 ⇒ ~24 px) uses ghost-then-confirm,
  and **Ludo** (tokens smaller than their cell, stacked 5 px apart) lists the
  legal moves as full-size buttons under the board. Both are built in the
  `BOARD_VIEWS` renderer, so online / pass-and-play / bot inherit them, and
  neither changes the move payload.

### 3. Nothing scrolls during play

- **`useScrollLock(active)`** locks the *document* while a run is live. That is
  what makes the guarantee hold for all 33 games — `fitShell` only covers
  dailies that opted in, and `shell: 'self'` games bypass it entirely.
- **Every `category: 'daily'` game MUST set `fitShell: true`** — asserted by
  the `registry-fitshell` self-test — **and its root must carry `.fit-col`**.
  `fitShell` without `.fit-col` *clips* instead of fitting: that was Daily
  Cipher's bug (its keyboard fell off the bottom), and `wordsprint` /
  `snakedaily` / `bouncedaily` had neither.
- In a fit column, everything except the board is `flex: 0 0 auto` (see that
  selector list). A board sized by `aspect-ratio` must give it up there
  (`.fit-col .cw-tile`) or it overflows its row track.
- Growing lists (`.wspr-found`, `.an-solved`, `.word-list`) get their own
  `max-height` + `overflow-y: auto` scroll strip.
- `.cg-stage` keeps `.cg-scroll` **on purpose** — making it `overflow: hidden`
  would clip a tall setup screen. The five phase-5 board games instead honour
  the `--cg-board` viewport cap, the same way `.ms-grid` / `.t2048-board-wrap`
  / `.mnc-board` already did.

### 4. The freeze layer must not eat the chrome

`.game-body.frozen { pointer-events: none }` wrapped the whole reviewed
subtree **including the header inside it** — that was #134, and it silently
killed the entire `.cg-topbar` (exit, ☰, ?, 💬) of all 14 in-frame classic
games too. `.game-head`, `.cg-topbar` and `.result-minibar` are re-enabled
inside `.frozen`. Keep any new chrome in that list.

### 5. Never pass `backToLobby` (or any state setter) as a bare handler

`onClick={backToLobby}` hands React's SyntheticEvent to the function's first
parameter. That put a DOM-bearing object into `lobbyTab`, and the next render's
`JSON.stringify(navState)` threw `Converting circular structure to JSON` —
which, with no error boundary, **unmounted the entire React root**, stylesheet
included. That was #150, and the resulting missing stylesheet is what made the
`registry-touch-action` sweep report all 18 tappable classes as broken, which
is how #149 got filed against the tap-target registry. Three standing rules:

- **Always wrap**: `onClick={() => backToLobby()}`. `backToLobby` also ignores
  a non-string `tab` now, and a game **category** (`'daily'`/`'classic'`)
  routes to `setHomeFilter` — `lobbyTab` is only ever `'home'`/`'ladder'`.
- **Every `navState` field goes through `navPrimitive()`** — asserted by the
  `nav-state-primitives` self-test. If you add a field, coerce it.
- **`<style>{css}</style>` lives at the root mount, OUTSIDE `AppErrorBoundary`**
  (a sibling of `<App/>`), so the boundary's "Something went wrong / Back to
  Home" panel renders *styled*. Don't move it back inside `App`.

### 6. In a fit column, a board needs `width: 100%`, not just `margin: 0 auto`

**An auto cross-axis margin opts a flex item out of `align-items: stretch`**,
collapsing it to fit-content. Every board carries `margin: … auto` for
centering outside the fit column, and inside `.fit-col` that silently shrank
them — at 390px (a 361px column) sudoku rendered 220px, the numpad 121px, word
search 224px, word sprint 150px, and **Daily Snake 16px** (#149). The fix is a
definite width; the caps (`max-width`) still centre the board.

- New board in a `.fit-col`? Add it to the `.fit-col … { width: 100% }` rules.
  `fitcol-auto-margin` (static scan of `css`) and `fitcol-fill` (measures the
  mounted board) both fail the build otherwise. **`max-width` alone does NOT
  count as a definite width** — it can't restore stretch.
- The `background: ${C.border}` gridline idiom **needs a matching `gap`** or no
  separator ever renders (that was `.sudoku`/`.wordsearch` since commit one).
  When you add the gap, box separators must out-read it: sudoku's 3×3 borders
  moved from `C.border` to `C.muted` for exactly that reason.
- **Canvas boards fit by scaling the BACKING STORE, not a CSS transform** — see
  Daily Bounce's `sizeCanvas`: it measures `.dbnc-wrap` (the flexible region),
  keeps the logical 320×430 coordinate space untouched, and sets
  `ctx.setTransform(dpr * scale, …)`. A transform would scale rasterized pixels
  and go soft. Pointer math stays `getBoundingClientRect`-relative, so it is
  scale-free.
- `token-alpha-concat` scans `css` for `var(--c-…)` followed by hex digits —
  the CSS half of the mistake `guardCanvasCtx` catches on canvas. It found
  three dead Ludo seat-3 tints (`${C.gold}22` → `ca('gold','22')`).
- When the stylesheet genuinely never mounts, `runClientSelfTests(false)`
  reports **one** `stylesheet-missing` failure and skips the computed-style
  checks. Don't "fix" that by running them anyway — that's what sent #149 at
  the wrong subsystem.
- **`?sdk=9` / `?sdk=6`** deep-links Sudoku's 9×9 / 6×6 board past the
  difficulty chooser. It exists because `dapp.json` tests cannot click, so
  without it no route reached a Sudoku grid at all.

### Also worth knowing

- **Browser history exists now.** A single reducer pushes one entry per
  navigable state and a `popstate` listener *derives* state from the event
  (never navigates imperatively); `navLock` stops a pop from pushing again.
  Every deep-link param must survive a push — the URL keeps its query string.
- **`lib/board-rules.js` is dual-mode.** It runs in Node (`module.exports`) and
  in the browser (`window.boardRules`, served by `GET /board-rules.js` and
  loaded from `index.html` before the app). The whole file is wrapped in an
  IIFE because in the browser it shares global scope with `app.js`, which
  declares its own `CNL_LADDERS` etc. — without the wrapper the app fails to
  parse. Local pass-and-play and Versus Bot referee with these exact functions;
  **never reimplement the rules client-side.** Bots validate candidate moves by
  calling the real `applyMove` and catching its throw.
- **Local board modes are unrated by construction** — `applyMatchRating` only
  runs in the four server finish paths, and local modes never call the server.
  They also skip `submitClassicScore`.
- **`finish` can carry a final board snapshot.** `POST /api/daily/:gameId/finish`
  accepts optional `progress` and writes it in the **same UPDATE** as
  `score/steps/finished_at`, which is why the *no-autosave-on-the-winning-move*
  rule is untouched (a separate write would 409 against the row the finish just
  closed). That snapshot is what the locked-day review board (#122) renders;
  real-time dailies with no resume legitimately have nothing to snapshot.
- **Practice replays (#133) must stay inert.** `practiceMode` short-circuits
  `handleWin`/`handleLose` before any endpoint, and suppresses `dailyRunLog`,
  `savedProgress` and `onSaveProgress`. That early return is the only thing
  guaranteeing "play again for fun" can't move a streak or a leaderboard.
- **Daily Cipher's rotation is a partition, not a sample.** Each theme is
  shuffled once with a fixed seed and cut into 5-word blocks; day N takes block
  `(N/4) mod blocks`. That gives a **sliding** no-repeat guarantee over
  `CW_CYCLE_LEN` (36) days, which reshuffling per cycle did NOT (a window
  straddling two shuffles could repeat). Verified by `cipher-rotation`.
- **Mahjong layouts are measured, not eyeballed.** `MJ_LAYOUTS` is ordered by a
  boosterless solver's win rate over 1200 seeded deals (Courtyard 35.8% →
  Bridge 27.3%). Note how weakly the silhouette predicts it: 5-layer Tower ties
  2-layer Courtyard. **Re-measure after any retune**, and keep every layout at
  exactly 60 slots (`mahjong-layouts` asserts it) or resume hydrates wrong.
- **Daily Bounce power-ups are pre-assigned at deal time**, not rolled on
  break — `spawnPowerup` uses `Math.random()`/`Date.now()` and would make a
  supposedly-fair daily differ per player. Two people playing today get
  identical drops from identical bricks.
- **Match 3 had three separate bugs that made it unplayable**, all found while
  giving it its design-system pass: its API routes were registered *after* the
  `app.get('*')` catch-all (so `/api/match3/progress` returned HTML and the
  campaign screen said "Loading..." forever); the unlock gate was
  `p.id <= highestPuzzle`, which locks all 50 puzzles for a new player; and
  `startPuzzle` sent a GET to a POST-only route. **Every real route must be
  registered above the catch-all.**
- **`usernode-native` is adopted for chrome only** (hosted tags in
  `index.html`, `unNative.alert` for destructive confirms). Do **not** apply
  native motion to boards, cells, cards or canvases — the kit's own fidelity
  rules forbid animating high-frequency interactions, and it fights the tap
  primitive.
- **Reduce-motion coverage is now app-wide.** The old query covered four
  selectors, one of which (`.tm-grid`) was dead CSS. Add new animations to it.
- **New staging fixtures:** `demo=solvedboard` (finished nonogram + solved-grid
  snapshot, for the review screen) and `demo=myroom` (the viewer's own waiting
  + active rooms across reversi/gomoku/ludo, for the Your-rooms list). New deep
  links: `?review=1`, `?practice=1`, `?rooms=mine`, `?mode=bot|2p`,
  `?syncfail=1`.

## End-of-run screen + tap-target registry (#158–#163, phases 1–3)

Four standing rules came out of the shared end-of-run pass. Three are enforced
by self-tests; the fourth is the kind of bug only a mounted browser shows.

### 1. `TAPPABLE_CLASSES` is the single source of truth for fast taps

`TAPPABLE_CLASSES` (`public/src/00-palette.jsx`, before `css`) is the ONE
list. Both
`touch-action: manipulation` and `-webkit-tap-highlight-color` are **generated**
from it (`emitTouchActionRules()` / `emitTapHighlightRules()`), and the
`registry-touch-action` self-test probes that same array. **Adding a game means
adding its cell class there — never to the stylesheet by hand**, or the two
drift (the old hand-copied probe list was missing 8 classes the CSS covered).

- Rules are emitted **one per class**, deliberately. A comma-separated selector
  list is all-or-nothing: one selector an engine rejects drops the whole rule,
  which is the only mechanism that yields the reported "touch-action:auto on
  <all 18 classes>" with the stylesheet present. Per-class rules make a bad
  entry cost exactly one class, and the test names that class.
- **The canary is the diagnosis.** `.un-selftest-canary` comes from the same
  generator; `tapCanaryApplied()` probes it first. Canary `auto` ⇒ ONE
  `stylesheet-not-applied` failure (with `document.styleSheets` counts and the
  app sheet's `cssRules` length) and every computed-style check is SKIPPED.
  That distinction is the whole point: #149 and #163 were both filed against
  the tap-target registry when the stylesheet was the actual suspect.
- `scheduleSelfTests` gates on the canary's **computed value**, not a text scan
  of `<style>` contents ("in the DOM" is strictly weaker than "applying"), and
  alternates rAF with `setTimeout` — rAF does not fire in a hidden/throttled
  tab, which silently skipped the whole suite.
- `touch-action-rules-emitted` is the static half: it fails even when the sheet
  is dead, proving the array and the emitted CSS are the same list.

### 1b. `tapProps`' de-dupe guard must OUTLIVE the render (#one-tap-two-letters)

`tapProps` fires the action on touch `pointerup` and then swallows the browser's
compatibility `click`. The guard that does the swallowing lived in the function's
own closure — and that is a **use-after-rerender** bug, because the action's
`setState` re-renders before the click arrives:

```
pointerup -> onTap() -> setState -> React 18 flushes SYNCHRONOUSLY (pointerup is
a discrete event) -> the element's props are replaced by a FRESH tapProps(...)
object -> the compat `click` dispatches against THAT object, whose per-render
`handledPointer` is back to false -> onTap() fires a SECOND time.
```

So **every tappable that changes state fired twice on every touch device** —
reported as Daily Cipher typing `LLEENND` instead of `LENDING`, but the Cipher
keyboard was only the most legible symptom, not the scope. The guard is now
module scope (`_tapHandledEl` / `_tapHandledAt`, one-shot, 700 ms window), so it
survives the re-render. Standing rules:

- **A tap guard may never be a per-render closure.** Anything that must span
  pointerup → click spans a re-render by construction.
- `tap-dedupe-survives-rerender` asserts it by simulating exactly that swap (two
  separate `tapProps(...)` objects against one element).
- Desktop had a second double path: with an on-screen key focused, Enter/Space
  fires that button's own click AND the window `keydown`. Daily Cipher's handler
  now ignores `e.repeat`/modifiers and defers Enter/Space to the focused button
  when `e.target.closest('.cw-kbd')` matches.
- `typeLetter`/`backspace` use **functional** `setCur`, so the length cap is
  evaluated against the live value and a batched double can never overflow the
  boxes.
- **`?cwtype=LEN-`** replays a real touch tap sequence (pointerdown → pointerup →
  compat click) against the on-screen keys at boot, and `.cw-board` carries
  `data-cw-typed`. That pair is what makes this testable at all: `dapp.json`
  checks can only navigate, so before it no check could see a tap-driven bug. A
  `-` means backspace. Keep the asserted strings **≤ 3 letters** — the day's word
  length varies (min 3) and `typeLetter` caps at it.

### 2. The `.game-body` wrapper is UNCONDITIONAL — never toggle it in/out

`{screen==='game' && <div className={'game-body' + (boardReviewable ? ' frozen'
: '')}>{renderGameBody()}</div>}`. It used to swap between a wrapped and an
unwrapped branch, which changes the element at that position, so **React
unmounted and remounted the entire game at the exact moment the run ended**.
2048 came back as a fresh 2-tile board (its mount reads the saved-board key the
loss had just cleared) — i.e. "the final board" was a brand new one. Keep one
stable element and change only its class. `.game-body` carries
`display:flex; flex-direction:column; flex:1 1 auto; min-height:0` so it is
layout-transparent (measured identical to the unwrapped baseline); **not**
`display:contents`, which generates no box and would drop `.frozen`'s
`filter`/`pointer-events`.

### 3. Every ending is a `resultData`

`resultData = winData || loseData || practiceResultData` drives the frozen
board, the minibar, the backdrop dismiss and "👁 View board" from one value.
Consequences:

- **`boardReviewable` no longer excludes `shell:'self'`.** Its old comment
  claimed Snake/Block Fit/Diamond Rush/Hash Rush draw their own game-over
  overlay; only **Hash Rush** does, and it now takes a `resultShown` prop and
  stands down (its panel is absolute-positioned over its own canvas, so leaving
  it up hides the board "View board" exists to reveal).
- Practice results carry a `gameId` so the "result belongs to the mounted game"
  guard still holds. The practice card was the one with no way back at all —
  no View board, no minibar, no dismiss (#158).
- Backdrop dismiss is `onPointerDown` with an `e.target === e.currentTarget`
  check (finger-DOWN, like `tapProps`), plus an `Escape` listener.
- **The daily `<Leaderboard>` renders only for `currentGame.daily`.**
  `/api/daily/:gameId/leaderboard` validates against `GAME_IDS` and 400s on a
  classic id — a console error that fails the no-console-errors check. Classics
  reach their all-time board via ClassicShell's ☰ sheet.

### 4. `meta.score` on the loss path is opt-in, per game

`handleLose(steps, timeSecs, meta)` takes `meta.score` (default 0) plus optional
`meta.scoreLabel`/`meta.scoreValue` for a headline-stat row. Games where a high
score IS the result pass it: **2048** (`Highest tile`) and **Diamond Rush**.
Snake and Bounce already route their game-over through `onWin` with
`winnerLabel: 'Game Over'`, so their score was never lost — leave them.

**Pass/fail dailies must keep score 0** (`cryptowordle`, `minefinder`,
`mahjongsol`, `dropstack`, `snakedaily`, `bouncedaily`): the daily leaderboard
filters `score > 0`, so a non-zero loss would put a FAILED run on the board.
Streaks are unaffected either way — `computeStreak` keys off `finished_at`.

### New deep links

`?result=1` mounts a game and opens a representative results card over its
frozen board (`&review=1` lands collapsed into the minibar instead). It writes
NOTHING — dailies go through the inert `practiceMode` path, classics set local
`loseData` only — so it is deliberately **not** staging-gated and needs no seed
data (the "before" screenshot comes from production). It is checked **before**
the `modeSelect` branch in the deep-link effect, or 2048/Block Fit would
surface the mode chooser instead. `?snake=easy|normal|hard` preselects Snake's
difficulty so the board itself is URL-reachable (same role as `?sdk=9`); note
`SnakeGame`'s reset-to-chooser effect now skips its mount pass, which would
otherwise clobber the deep link immediately.

### Proposal tests: two traps this repo keeps falling into

Fixing five stale assertions (July 2026) turned up the same two causes each time.

**1. A test whose route is a `&play=1` daily is ORDER-DEPENDENT.** The whole
suite runs against one staging DB as one viewer, and several fixtures finish a
daily for that viewer — `demo=locked` and `demo=streak` finish `sudoku`,
`demo=solvedboard` finishes `nonogram`. Any test that later loads
`?game=<that game>&play=1` lands on the locked result screen and its board
assertion fails, depending purely on declaration order. **Point in-game daily
assertions at `?practice=1` instead**: it mounts the same board with the same
seed, claims nothing, and is not blocked by a finished day. `&play=1` is still
right for a route that specifically needs a *claimed* attempt (`demo=review`
seeds one on purpose).

**2. A screen reachable only by a tap is invisible to tests AND screenshots.**
Three merged tests asserted on the classic all-time leaderboard behind
ClassicShell's ☰ sheet, which navigation cannot open — so they had never actually
been checking a leaderboard. `?sheet=<sectionId>` now deep-links any sheet tab
(`menu`, `leaderboard`, `history`, `stats`, `settings`, ignored when the game has
no such section). Add a deep link rather than retargeting the assertion at
whatever the route happens to render.

Two real bugs were hiding behind those stale tests, which is the argument for
not just deleting them:

- **`ClassicLeaderboard` only read `data.entries`.** The per-game boards reached
  through `url` return `{ top }` (`/api/snake/leaderboard`), so Snake's sheet
  leaderboard rendered "No scores yet — play to rank!" however many scores
  existed. It now accepts either key.
- **Snake's difficulty chooser passed `sheetSections={[]}`**, so the leaderboard
  was unreachable until you had already committed to a difficulty — the one
  moment you'd most want it. It now carries that one section.

Also stale, and worth knowing when writing assertions: the phase-7 home reorg
deleted the "Daily Puzzles" / "Classic Games" section titles (it is one merged
**All Games** grid with filter chips now), and the rename sweep made "Mini
Sudoku" just **Sudoku**. Prefer `expectSelector` for structure and reserve
`expectText` for copy that is genuinely part of the product's voice — and note
that `innerText` reflects `text-transform`, so a `.plabel` reading "Board" in the
source matches "BOARD" at runtime.

## Snakes & Ladders local party overhaul (`chutes-ladders`)

The classic 2-player Snakes & Ladders grew a **local hot-seat party mode** and a
**Ranked Match** beside it. Two constraints shaped it and still bound anything
built on top: **local hot-seat only — the online path is untouched**, and
**every sound is synthesized Web Audio, no asset files**.

The two old modes (`2p`, `bot`) and the whole `classic_rooms`/`lib/board-rules.js`
online path are **unchanged and must stay that way**. Party/Ranked are a
*parallel* client-side stack (`SNL_*` in `public/app.jsx`); nothing in them
touches the room endpoints, and `chutes-ladders` stays in `H2H_GAME_IDS` /
`BOARD_RULE_GAME_IDS` only for the online path.

### The rules engine is pure, module-scope, and the self-tests are the spec

`snlTakeTurn(match, die)` → `{ match, events }` is the single mutator: it is
pure (clones through `snlCloneMatch`), and everything the UI does — animation,
sound, banner text, standings — is driven off the returned **event list**
(`roll` / `reroll` / `forfeit-six` / `move` / `ladder` / `snake` / `bump` /
`finish` / `turn`). Rendering reads events; it never re-derives rules. Keep it
that way: the animation layer replays a queue, so a rule that only exists in the
view cannot be animated, tested, or replayed.

Because these rules are client-side, **the six `snl-*` client self-tests are the
only thing between an authoring slip and a permanently stuck board.** They live
in `runClientSelfTests` and assert behaviour, not snapshots:

| test | contract |
|---|---|
| `snl-boards` | every board passes `snlValidateBoard`; the difficulty ladder really ascends; Legend is gated by Super Star |
| `snl-six-rule` | 1st/2nd six re-roll, the **3rd six is forfeited** (turn passes, pawn does not move) |
| `snl-collision` | landing on an occupant knocks it back `SNL_BUMP`, both directions, clamped at square 1 |
| `snl-standings` | 2/4/6-seat matches play out to **places exactly 1..N** |
| `snl-rp-tiers` | `snlRankDelta` is monotone in place, positive at 1st, negative at last; tier mins ascend; RP floors at 0 |
| `snl-legend-lock` | only **wins on Super Star** count toward the unlock |

Two authoring traps those tests exist to catch, both hit while writing them:

- **Order the difficulty ladder by snake:ladder RATIO, not snake count.** The
  classic Regular board carries 10 snakes — *more* than Hard's 9 — so a
  count-based ordering check fails on the shipping boards. `snl-boards` asserts
  ascending `tier` **and** ascending ratio.
- **A collision assertion must read the `bump` event, not the victim's final
  square.** The knock-back destination is itself resolved through
  `snlResolveLanding`, so a snake/ladder there moves the pawn again — correctly.
  Same reason the clamp case uses squares 5/4 on Beginner: squares 1–2 are
  ladder feet, so a naive clamp test never reaches the clamp.

### Board authoring

`SNL_BOARDS` holds seven ladder boards (`beginner` → `legend`) plus `moksha`
(`special: true`, exempt from the chained-head rule — the original Moksha Patam
deliberately chains). `snlValidateBoard` runs at self-test time and rejects
off-grid endpoints, a ladder that descends, a snake that climbs, a jump on
square 1 or 100, and a square that is both a head and a tail. **Add a board and
you must place it in ratio order**, or `snl-boards` fails the build.

Constants are the balance knobs, and each has exactly one home:
`SNL_BUMP` (10), `SNL_MAX_SIX_STREAK` (3), `SNL_CHAIN_CAP` (8),
`SNL_LEGEND_UNLOCK_WINS` (3), `SNL_MIN_SEATS`/`SNL_MAX_SEATS` (2/6),
`SNL_RANKED_MIN_HUMANS` (4), `SNL_TIERS` (Bronze→Legend), `SNL_ANIM` (timings).

### Art is intrinsic — it does NOT follow the theme

Snake bodies, ladder rails and rungs, the six chess pieces (`SNL_PIECES`), the
six seat colours (`SNL_SEAT_COLORS`) and the seven tier colours are **hardcoded
on purpose**, exactly like Mancala's wood and the playing-card faces. Only the
surrounding chrome re-themes. The board canvas still reads `PAL`/`palOf` for
chrome — never `C.x`, which `guardCanvasCtx` would reject.

### Audio

Synthesized only. `SNL_CUES` (dice rattle, hop, ladder arpeggio, snake slide,
bump, forfeit, finish, rank-up) build on `cgNoiseBurst` / `cgSoundSeq`; the
generative bed is `snlMusicStart` / `snlMusicStop` / `snlMusicSetIntensity` /
`snlMusicSting`, scheduled against the AudioContext clock so it stays in time
while the main thread animates. Cues follow the existing `cgPrefs.sound`; the
bed follows the **new `cgPrefs.music`** pref (Settings → Music), and flipping
that pref off calls `snlMusicStop` immediately. **Never add an audio asset
file** — that was an explicit product constraint.

Reduced motion (`cgPrefs.motion`) still plays the full event sequence and every
sound; `snlDur()` just collapses the tweens, so no result is ever skipped.

### Persistence and the trust boundary

Two new PUBLIC tables (gameplay results, no sensitive data, no FKs):
`snl_progress` (`matches`, `wins`, `superstar_wins` — the Legend unlock's only
input) and `snl_ranked` (`rp`, `ranked_matches`, `ranked_wins`, `best_rp`, with
`idx_snl_ranked_rp`).

- `GET /api/snl/profile` — auth-gated; the account-level truth the local
  localStorage mirror (`puzzlechain_snl_progress`) reconciles against.
- `POST /api/snl/result` — auth-gated, and the **trust boundary**: it accepts
  only `{ boardId, mode, place, players }` and derives the RP delta itself via
  `snlRankDeltaSrv`, plus the Super Star win. The client never sends an RP
  number. Keep it that way.
- `GET /api/snl/ranked/leaderboard` — public read, in `PUBLIC_API_GET`,
  `req.user`-null-guarded (anonymous ⇒ `me: null`).

The local mirror exists so the unlock and the tier bar are instant and work
signed out; the server row wins on merge (`Math.max` per field).

### Deep links (screenshot- and check-reachable state)

The lobby, the running match and the animation layer are all behind taps, which
navigation-only screenshots and `dapp.json` checks cannot perform.

| link | reaches |
|---|---|
| `?game=chutes-ladders&mode=party` / `&mode=ranked` | the lobby, mode pinned |
| `&snlboard=<id>` / `&snlseats=<2..6>` | shape the lobby (and `?snlstart=1`) |
| `&snlstart=1` | skip the lobby into a running match |
| `&snlanim=snake\|ladder\|bump\|dice` | replay ONE scripted animation |
| `&snlunlock=1` | open the Legend board for this page load |
| `?sheet=ranked` | the ☰ Ranked / RP-leaderboard panel |
| `?result=1` | the standings results card (`.win-standings`) |

`?snlanim=` plays events against the frame/banner only — it never calls
`snlTakeTurn`, so no match state moves and nothing is recorded — and it **holds
the bots still** while it plays so the captured frame is deterministic.

`?snlunlock=1` is a **pure UI-state** link: it writes nothing, grants nothing
(Legend is only a harder board; the server never gated it), and is deliberately
**not** staging-gated, so the "before" screenshot from production works too. It
exists *instead of* a `demo=snl-legend` fixture on purpose — seeding the
viewer's `snl_progress.superstar_wins` would fabricate the exact signal
`snlLegendUnlocked` reads, making the lock untestable by the gate and different
for real users.

`.snl-match` carries `data-snl-mode` / `data-snl-board` / `data-snl-seats` /
`data-snl-anim` so checks can assert on state; the banner is a **canvas label**,
so `expectText` can never read it — assert on the attribute.

### Staging fixture

`GET /api/daily?demo=snl-ranked` (idempotent, `IS_STAGING`, no-op in production)
seeds 8 obviously-fake ranked players spread Bronze→Legend so the RP board is
demonstrable on a fresh staging DB. It seeds **nothing for the viewer** — an
unplayed account correctly shows no pinned `me` row, and the Legend lock keeps
its production-shaped state.
