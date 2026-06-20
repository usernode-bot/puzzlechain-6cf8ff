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
- **Shared timer:** `useTimer(running)` counts **up** from 0 and
  returns `{ secs, fmt }`. Pass `!done` so it stops when the round
  ends.
- **Adding a game** (the extension point): write an
  `XxxGame({ onWin, onStepChange })` component that
  - renders a `.status-bar` of `.pill`s for its live stats,
  - calls `onStepChange(n)` as the player makes moves,
  - calls `onWin(score, steps, secs)` **exactly once** when solved;
  then add its CSS to `css` and append
  `{ id, name, icon, desc, tag, tagColor, component }` to the `GAMES`
  array. The root `App` auto-wires the lobby card, the one-play lock,
  the streak bonus (`floor(score * 0.1 * streak)`), and the win
  overlay — the game component never touches that machinery.
- **No persistence / no database.** `server.js` is a thin Express
  static server + JWT auth gate (`/health` and `/explorer-api/*` are
  public); there is **no Postgres and no `/api/*` endpoints**. Score,
  streak, and the `completed` (one-play) map are **in-memory React
  state** and reset on reload — so "one play per day" is currently
  per-session. Don't assume a DB exists; adding real persistence or a
  leaderboard means introducing `pg` + a schema + (per platform
  rules) staging seed data, and is deliberately out of scope today.
