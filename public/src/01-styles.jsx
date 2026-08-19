const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Fraunces:ital,opsz,wght@0,9..144,500..900;1,9..144,500..900&display=swap');

/* ---- Theme tokens ----
   Light is the :root default; dark is one attribute flip away. The inline
   boot script in index.html sets data-theme before first paint, so a
   dark-mode player never sees an ivory flash. */
:root {
${paletteVars('light')}
}
:root[data-theme="dark"] {
${paletteVars('dark')}
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* Painted on <html> too, so overscroll/rubber-band areas match the theme. */
html { background: ${C.bg}; }

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: ${C.bg};
  color: ${C.text};
  -webkit-font-smoothing: antialiased;
  /* No faux bold/italic: a style we didn't load should fail visibly,
     not render as a browser-synthesized slant (the old masthead bug). */
  font-synthesis: none;
}

.mono { font-family: 'JetBrains Mono', monospace; }

#root { min-height: 100vh; }

.app { min-height: 100vh; display: flex; flex-direction: column; }

/* ---- Nav bar ---- */
.nav {
  background: ${C.surface};
  border-bottom: 1px solid ${C.border};
  padding: 0.9rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-brand {
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.nav-brand .logo { color: ${C.accent}; }
.nav-stats { display: flex; gap: 1.5rem; }
.nav-stat { text-align: right; }
.nav-stat .label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
}
.nav-stat .value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 1.05rem;
}
.nav-stat .value.score { color: ${C.gold}; }
.nav-stat .value.streak { color: ${C.emerald}; }
.mult-badge {
  margin-left: 0.4rem;
  font-size: 0.62rem;
  font-weight: 600;
  color: ${C.gold};
  background: ${ca('gold','1f')};
  border: 1px solid ${ca('gold','40')};
  border-radius: 999px;
  padding: 0.05rem 0.35rem;
  vertical-align: middle;
}
.streak-badge-icon {
  margin-left: 0.35rem;
  font-size: 0.95rem;
  vertical-align: middle;
  line-height: 1;
}
/* Earned-badge collection strip (lobby + profile) */
.badge-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${C.text};
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  white-space: nowrap;
}
.badge-chip .badge-chip-icon { font-size: 1rem; line-height: 1; }
.badge-chip.locked { opacity: 0.35; }
.badge-chip.active { border-color: ${C.emerald}; color: ${C.emerald}; background: ${ca('emerald','14')}; }
/* Win-overlay "milestone unlocked" flourish */
.badge-unlock {
  margin: 0.4rem 0 0.9rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, ${ca('emerald','22')}, ${ca('gold','22')});
  border: 1px solid ${ca('emerald','55')};
  animation: badgePop 0.5s ease;
}
.badge-unlock .bu-icon { font-size: 1.8rem; line-height: 1; }
.badge-unlock .bu-title { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.muted}; margin-top: 0.25rem; }
.badge-unlock .bu-name { font-size: 1.05rem; font-weight: 700; color: ${C.emerald}; }
@keyframes badgePop {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
.win-badge-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
  color: ${C.muted};
}
.win-badge-row .wbr-icon { font-size: 1.1rem; }
.badge-chip .badge-chip-name { line-height: 1; }
/* Badge collection wrapper (lobby + profile) */
.badge-strip-wrap { margin-top: 1rem; }
.badge-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${C.muted};
}
.badge-strip-head .badge-strip-count { color: ${C.text}; }
/* Badge accordion trigger — base styles, mobile activation via @media (max-width: 560px) */
.badge-strip-trigger {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; background: none; border: none; padding: 0;
  font: inherit; color: inherit; cursor: default; text-align: left;
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase; pointer-events: none;
}
.badge-strip-trigger .badge-strip-count { color: ${C.text}; }
.badge-chevron {
  display: none; /* hidden on desktop */
  margin-left: 0.4rem; font-size: 0.85rem; color: ${C.muted};
  transition: transform 280ms ease; flex-shrink: 0;
}
.badge-chevron.open { transform: rotate(180deg); }
/* On desktop the body is always visible — transitions only activate at ≤560px */
.badge-strip-body { display: block; }
@media (max-width: 640px) {
  .badge-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  .badge-chip {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    border-radius: 12px;
    padding: 0.65rem 0.3rem;
    gap: 0.25rem;
    white-space: normal;
  }
  .badge-chip .badge-chip-icon { font-size: 1.8rem; }
  .badge-chip .badge-chip-name { font-size: 0.62rem; line-height: 1.2; }
}
/* Today's Top Scores leaderboard tweaks (reuses .lboard) */
.lboard.champions { margin-top: 0; }
.lboard .lrow.clickable { cursor: pointer; }
.lboard .lrow.clickable:hover { background: ${C.border}; }
/* Win-overlay "couldn't sync" note + retry */
.win-sync-note {
  margin: 0.4rem 0 0.7rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  font-size: 0.82rem;
  text-align: center;
  color: ${C.gold};
  background: ${ca('gold','14')};
  border: 1px solid ${ca('gold','55')};
}
.win-sync-note button {
  margin-top: 0.4rem;
  font: inherit;
  font-weight: 700;
  color: ${C.text};
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
}

/* ---- Account indicator ---- */
.nav-right { display: flex; align-items: center; gap: 1.25rem; }
.account-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 999px;
  padding: 0.35rem 0.7rem 0.35rem 0.45rem;
  cursor: default;
}
.account-chip .avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: ${C.accent};
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.account-chip .who { display: flex; align-items: center; line-height: 1.2; }
.account-chip .uname { font-size: 0.82rem; font-weight: 600; }
.account-chip .dot {
  width: 0.5rem; height: 0.5rem; border-radius: 50%; flex: 0 0 auto;
}
.account-chip.off { border-color: ${C.rose}; }
.account-chip.off .dot { background: ${C.rose}; }
.account-chip.off .who { color: ${C.rose}; font-size: 0.82rem; font-weight: 600; }
.account-chip.on { cursor: pointer; font-family: inherit; color: ${C.text}; transition: border-color 0.12s ease; }
.account-chip.on:hover { border-color: ${C.accent}; }

/* Profile "Connections" section — Friends entry, shown on mobile only. */
.account-connection-row {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  background: ${C.dim}; border: 1px solid ${C.border};
  border-radius: 10px; padding: 0.7rem 0.9rem;
  font-size: 0.9rem; font-weight: 600; color: ${C.text};
  cursor: pointer; text-align: left; transition: border-color 0.15s;
}
.account-connection-row:hover { border-color: ${C.accent}; }
.account-connection-row .chev { margin-left: auto; color: ${C.muted}; }
/* The Connections section is only shown at narrow widths — above 560px the
   Friends button lives in the top bar instead. */
@media (min-width: 561px) {
  .account-connections { display: none; }
  /* …except the Settings entry, which has no desktop equivalent elsewhere
     on the profile (the nav gear is the other entry point). */
  .account-connections.account-connections-always { display: block; }
  /* Force badge accordion always-open on desktop/tablet regardless of JS state */
  .badge-strip-body { max-height: none !important; opacity: 1 !important; overflow: visible !important; }
  .badge-strip-trigger { cursor: default; pointer-events: none; }
  .badge-chevron { display: none !important; }
}

@media (max-width: 560px) {
  .account-chip .who { display: none; }
  .account-chip { padding: 0.35rem; }
  .nav-right { gap: 0.8rem; }
  .nav-stats { gap: 1rem; }
  .lobby { padding: 1rem 0.75rem; }
  .lobby-head h1 { font-size: 1.3rem; }
  .lobby-head p { font-size: 0.85rem; }
  /* The Friends chip moves into the profile's Connections section
     on mobile. Scoped under .nav-right so it outranks the base chip rules
     defined later in this stylesheet regardless of source order. */
  .nav-right .nav-friends-btn { display: none; }
  /* Badge accordion: trigger is interactive on mobile */
  .badge-strip-body { overflow: hidden; transition: max-height 280ms ease, opacity 280ms ease; }
  .badge-strip-body.closed { max-height: 0; opacity: 0; }
  .badge-strip-body.open { max-height: 600px; opacity: 1; } /* 600px > any realistic badge grid height */
  .badge-chevron { display: inline-block; }
  .badge-strip-trigger { cursor: pointer; pointer-events: auto; }
}

/* ---- Lobby ---- */
.lobby { max-width: 920px; margin: 0 auto; padding: 1.75rem 1.25rem; width: 100%; }
.lobby-head { margin-bottom: 1.5rem; }
.lobby-head h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; }
.lobby-head p { color: ${C.muted}; margin-top: 0.25rem; font-size: 0.92rem; }
.lobby-head .reset-countdown {
  margin-top: 0.5rem;
  color: ${C.accent};
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  /* #167 — one uniform tile height for the WHOLE grid, not just per row.
     grid-auto-rows: 1fr makes every implicit row the same height (the tallest
     card's content sets it) and the default align-items: stretch fills each
     cell, so the wall reads as even tiles.

     This deliberately REPLACES #146's align-items: start. That rule existed
     because a dual-mode card stacked two captioned mode buttons and towered
     over a single-mode card, so stretching left big voids under the short
     ones. The fix for that is upstream, not here: .card-modes is now a compact
     SIDE-BY-SIDE pair, which shrinks the difference to a normal amount of tile
     padding, and every card clamps its own title/desc so no one long string
     can inflate the entire wall. Undo either half and the voids come back. */
  grid-auto-rows: 1fr;
}

@media (max-width: 380px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 1.1rem;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  position: relative;
  overflow: hidden;
  /* #167 — a column, so the identity block sits at the top and the state footer
     (tag / lock / resume / mode buttons) is pushed to the bottom by its own
     margin-top: auto. In a stretched grid cell that is what turns the leftover
     space into even tile padding instead of a ragged edge. min-height: 0 lets
     the clamped children actually shrink. */
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent, ${C.accent});
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--accent, ${C.accent});
  box-shadow: 0 10px 26px var(--c-shadow-md);
}
.card.done {
  opacity: 0.55;
  cursor: default;
}
.card.done:hover { transform: none; border-color: ${C.border}; box-shadow: none; }

.card-icon { font-size: 1.9rem; line-height: 1; margin-bottom: 0.6rem; flex: 0 0 auto; }
/* #167 — clamped, so a long name or blurb can never grow its own tile (and,
   with grid-auto-rows: 1fr, can never grow the whole wall). The desc keeps a
   two-line floor as well as its new two-line ceiling, so short and long blurbs
   push the footer to exactly the same place. */
.card-name {
  font-size: 1.15rem; font-weight: 600; margin-bottom: 0.2rem;
  flex: 0 0 auto;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  overflow: hidden; overflow-wrap: anywhere;
}
.card-desc {
  font-size: 0.85rem; color: ${C.muted}; line-height: 1.35;
  min-height: 2.7em; margin-bottom: 0.75rem;
  flex: 0 0 auto;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  overflow: hidden;
}

/* #167 — the state footer. margin-top: auto is what pins it to the bottom of a
   stretched tile; .card-desc's margin-bottom is the minimum gap above it. .tag
   is an inline-block pill and a flex item gets blockified, so without
   align-self it would stretch to the full card width. These .card > X
   selectors outrank the plain margin-top declarations in .tag / .card-lock /
   .card-resume / .card-modes by specificity, whatever the source order. */
.card > .tag,
.card > .card-lock,
.card > .card-resume,
.card > .card-modes { margin-top: auto; flex: 0 0 auto; }
.card > .tag { align-self: flex-start; }

.tag {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  margin-top: 0.75rem;
}

.card-done-stats {
  margin-top: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: ${C.emerald};
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ---- Game screen ---- */
.game-wrap { max-width: 620px; margin: 0 auto; padding: 1.5rem 1.25rem; width: 100%; }

/* Fit-to-viewport layout mode (slice 1). A daily game that opts in renders
   header + board + controls inside one non-scrolling column: the board region
   is the only flexible child, and useFitBox measures it to size the cells.
   The .app-fit class pins the whole shell to one viewport (100dvh, not vh, so
   mobile browser chrome collapsing doesn't clip the pad) and the wrap then
   takes whatever is left BELOW the nav — sizing the wrap itself to 100dvh
   would push the nav's height back out into a scrollbar.
   NOTE: no backticks in this block — the whole stylesheet is one template
   literal, so a stray backtick silently ends the string. */
.app.app-fit { height: 100dvh; min-height: 0; overflow: hidden; }
.app.app-fit .nav { flex: 0 0 auto; }
.game-wrap.fit {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.7rem 0.9rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
  gap: 0.45rem;
}
.game-wrap.fit .game-head { flex: 0 0 auto; margin-bottom: 0; }
.game-wrap.fit .fit-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.game-wrap.fit .fit-board {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-wrap.fit .status-bar { flex: 0 0 auto; margin-bottom: 0; }
/* In fit mode the hint is a fixed footer line, not a scroll-away paragraph —
   the board flexes around it so it can never be pushed off the viewport. */
.game-wrap.fit .p6-hint { flex: 0 0 auto; margin-top: 0; font-size: 11.5px; line-height: 1.35; }
/* A daily's own root, inside .game-wrap.fit: a column whose board region is
   the single flexible child. Games opt in by adding .fit-col to their root. */
.fit-col {
  display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.5rem;
  /* Pin the column to the available width. Without this a wide min-content
     child (a five-pill status bar is ~400px) grows the column past the
     viewport and the overflow gets clipped instead of wrapping. */
  width: 100%; max-width: 100%; min-width: 0;
}
/* Stat pills wrap rather than forcing the column wider than the phone —
   a five-pill row is ~400px and would push the board off a 360px screen. */
.fit-col .status-bar { flex-wrap: wrap; }
.fit-col .status-bar .pill { flex: 1 1 auto; min-width: 0; }
/* Everything that is NOT the board is fixed-size, so only the board flexes.
   Miss one of these and it gets crushed to zero height by the board. */
.fit-col .status-bar, .fit-col .p6-hint, .fit-col .numpad,
.fit-col .word-list, .fit-col .cp-pad, .fit-col .an-actions,
.fit-col .cw-hint-bar, .fit-col .p6-banner, .fit-col .word-theme,
.fit-col .an-dots, .fit-col .an-slots, .fit-col .an-rack,
.fit-col .tm-daylabel, .fit-col .ds-pad, .fit-col .mf-controls,
.fit-col .ng-modes,
/* PHASE 3 — Daily Cipher never opted into the fit column, so its 8-row board
   plus 3-row keyboard was CLIPPED by the fit shell's overflow:hidden rather
   than fitted; players lost sight of Enter on long words. Everything except the
   board is fixed-size so only the board flexes. Word Sprint / Anagram Sprint
   growing lists get their own scroll strip below. */
.fit-col .cw-tracker, .fit-col .cw-clue, .fit-col .cw-kbd,
.fit-col .cw-alldone, .fit-col .wspr-found, .fit-col .an-solved,
.fit-col .dsnk-hint, .fit-col .dbnc-effects, .fit-col .wspr-actions,
.fit-col .mj-controls { flex: 0 0 auto; }
/* Growing lists must never push the board off screen (#131, #130). */
.fit-col .wspr-found, .fit-col .an-solved, .fit-col .word-list {
  max-height: 5.2rem; overflow-y: auto; overscroll-behavior: contain;
}
/* PHASE 3 — no page scroll while a run is live. useScrollLock() owns the
   document; these kill the inner rubber-band / pull-to-refresh on the boards
   the finger actually drags across. */
.cg-stage, .game-wrap, .dbnc-wrap, .dsnk-board, .fit-scale-box,
.wordsearch, .tm-stage, .bb-board-wrap, .dr-board {
  overscroll-behavior: contain;
}
html.un-scroll-locked, body.un-scroll-locked {
  overflow: hidden !important;
  overscroll-behavior: none;
  touch-action: pan-x pan-y;
}
/* #149 — an AUTO CROSS-AXIS MARGIN OPTS A FLEX ITEM OUT OF align-items:stretch,
   collapsing it to its fit-content size. Every one of these boards carries
   "margin: … auto" for centering outside the fit column, and inside it that
   silently shrank them: at 390px (a 361px column) sudoku rendered 220px, the
   numpad 121px (tall thin ovals instead of digit keys), word search 224px,
   word sprint 150px — and Daily Snake 16px, i.e. unplayable.
   "width: 100%" makes the cross size DEFINITE again, so the autos resolve to 0
   (or centre the board within its own max-width) instead of driving the size.
   The fitcol-auto-margin self-test guards the whole class of bug. */
.fit-col .numpad { margin-top: 0; width: 100%; }
/* Fluid square grids (Sudoku, Word Hunt) fit BOTH axes natively — no
   transform needed, so their pointer-drag selection math is untouched. */
.fit-col .sudoku, .fit-col .wordsearch {
  width: 100%; height: auto; max-width: 100%; max-height: 100%;
  margin: 0 auto; aspect-ratio: 1;
}
/* Same collapse, same cure: Word Sprint's 4×4 grid and Daily Snake's board
   keep their own max-width caps (320 / 340) and centre within the column. */
.fit-col .wspr-grid, .fit-col .dsnk-board { width: 100%; }
/* Sudoku's difficulty chooser is a fixed-size card, not a board. */
.fit-col .sdk-choose { flex: 0 0 auto; width: 100%; }
.kl-inner { display: flex; flex-direction: column; }

/* Scale-to-fit board wrapper (slice 5). The box is the flexible region; the
   content keeps its natural layout size and is scaled as one unit. */
.fit-scale-box {
  flex: 1 1 auto; min-height: 0; min-width: 0;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.fit-scale-content { transform-origin: center center; flex: 0 0 auto; }

/* Interactive board cells must never wait on double-tap-to-zoom detection —
   that browser delay is most of the "laggy clicking" in the daily grids.
   PHASE 2: this list is now registry-wide. An audit of all 33 games found the
   delay on ~20 of them; a game whose tappable element is NOT in this list (or
   does not carry .tappable) pays ~300ms per tap on touch.

   #163 — GENERATED from TAPPABLE_CLASSES, one rule per class, and the same
   generator emits the .${TAP_CANARY_CLASS} probe rule. A comma list was
   all-or-nothing: one selector the engine rejects drops every class with it,
   which is exactly the failure that was being reported. Adding a game means
   adding its cell class to TAPPABLE_CLASSES — the CSS and the self-test both
   follow automatically. */
${emitTouchActionRules()}
/* Canvases that own their own drag/long-press recognizer take the pointer
   stream outright, so the browser never scrolls or zooms out from under it.
   Emitted AFTER the generated block so it wins on source order. */
.board-canvas { touch-action: none; display: block; }

/* PHASE 2 — the one press idiom. Generalised from .ng-mode-btn/.mf-mode-btn,
   which were the only correct examples in the file. Before this, the app had 8
   :active rules against 69 :hover rules, and a finger never fires :hover —
   which is the whole "I tapped and nothing happened" complaint. Set
   [data-pressed] on pointerdown so the feedback lands on finger-DOWN, not on
   the delayed click, and clear it on up/cancel/lostpointercapture so it can
   never stick. */
${emitTapHighlightRules()}
.tappable:active, .tappable[data-pressed],
.mj-tile:active, .mj-tile[data-pressed],
.wspr-tile:not(.dim):active, .wspr-tile[data-pressed],
.ce-card:active, .ce-card[data-pressed],
.scell:not(.given):active, .scell[data-pressed],
.numkey:active, .numkey[data-pressed],
.wcell:not(.found):active, .wcell[data-pressed],
.cw-key:active, .cw-key[data-pressed],
.ms-cell.ms-hidden:active, .ms-cell[data-pressed],
.mnc-pit.mnc-clickable:active, .mnc-pit[data-pressed],
.kt-cell:active, .kt-cell[data-pressed],
.ck-cell:active, .rv-cell:active, .fir-cell:active, .gmk-cell:active,
.ludo-token.movable:active, .an-tile:active, .an-slot:active,
.tm-tile.available:active, .m3-tile:active {
  filter: brightness(0.9);
  transform: scale(0.96);
}
/* A press must never look "stuck on" for a disabled/decorative cell. */
.wspr-tile.dim:active, .scell.given:active, .ms-cell.ms-revealed:active,
.tm-tile.locked:active, .ce-card.face-down:active {
  filter: none; transform: none;
}
/* Selected-card affordance — tapping a card gave no sign it landed (#123). */
.ce-card.selected {
  outline: 3px solid ${C.accent};
  outline-offset: -1px;
  box-shadow: 0 0 0 2px ${ca('accent', '55')}, 0 4px 10px var(--c-shadow-md);
  transform: translateY(-3px);
}
/* A blocked Mahjong tile now says so instead of silently ignoring the tap. */
@keyframes un-nudge {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.mj-tile.nudge { animation: un-nudge 0.22s ease; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* End-screen board review (slice 4). The finished board stays mounted under
   the results card; .frozen makes it inert and visually settled, and the
   minibar is what the card collapses into. */
/* PHASE 1 — the wrapper is now ALWAYS rendered (see the render note in App), so
   it must be layout-transparent: without this the fit column's flex: 1 1 auto
   would resolve against a plain block instead of .app.app-fit and collapse.
   A flex pass-through, NOT display:contents — contents generates no box, so
   .frozen's filter/pointer-events below would have nothing to apply to.
   NOTE: no backticks in this block (see the stylesheet warning above). */
.game-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.game-body.frozen { pointer-events: none; filter: saturate(0.85); }
.game-body.frozen .game-wrap { padding-bottom: 5.5rem; }
/* PHASE 1 (#157/#160) — shell:'self' classics (Snake, Block Fit, Diamond Rush,
   Hash Rush) are frozen behind the results card now too. Their ClassicShell is
   a fixed full-viewport layer, so the fixed minibar would sit on top of the
   bottom of the stage; reserve the same gutter .game-wrap already gets. */
.game-body.frozen .cg-stage { padding-bottom: 5.5rem; }
/* PHASE 4 (#134) — the freeze used to kill the whole reviewed subtree, INCLUDING
   the header the shell renders inside it. That is why Back stopped working after
   "View board", and it hit every in-frame classic game's whole topbar (exit, ☰,
   ?, 💬) too, not just the dailies. Chrome stays live; only the board goes
   inert. */
.game-body.frozen .game-head,
.game-body.frozen .game-head *,
.game-body.frozen .cg-topbar,
.game-body.frozen .cg-topbar *,
.game-body.frozen .result-minibar { pointer-events: auto; }
.review-btn {
  margin-bottom: 0.6rem; background: ${C.surface};
  border: 1px solid ${C.border}; color: ${C.text};
}
.result-minibar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.85rem 1.1rem calc(0.85rem + env(safe-area-inset-bottom, 0px));
  background: ${C.card}; border: none; border-top: 1px solid ${C.border};
  box-shadow: 0 -6px 22px rgba(63,51,24,0.14);
  font-family: inherit; font-size: 0.92rem; font-weight: 600; color: ${C.text};
  cursor: pointer; width: 100%; touch-action: manipulation;
}
.result-minibar .rmb-cta { color: ${C.accent}; font-size: 0.82rem; white-space: nowrap; }
.game-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.back-btn {
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  transition: border-color 0.12s ease;
}
.back-btn:hover { border-color: ${C.accent}; }
.game-title { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }

.status-bar {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}
.pill {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  text-align: center;
}
.pill .plabel {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
}
.pill .pvalue {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 1.1rem;
  margin-top: 0.1rem;
}
.pill .pvalue.time { color: ${C.gold}; }

/* ---- Sudoku ---- */
.sudoku {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background: ${C.border};
  /* #149 — the "background: border" idiom only shows as gridlines if the grid
     actually has a gap. Without it the cells sat flush and no separators ever
     rendered, which is what made the 9×9 board hard to read. */
  gap: 1px;
  border: 2px solid ${C.border};
  border-radius: 10px;
  overflow: hidden;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
}
.sudoku.s9 .scell { font-size: 1.02rem; }
.sdk-choose { max-width: 380px; margin: 1.5rem auto; text-align: center; }
.sdk-choose-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem; }
.sdk-choose-sub { color: ${C.muted}; font-size: 0.82rem; margin-bottom: 1.1rem; }
.sdk-choice {
  display: block; width: 100%; margin-bottom: 0.7rem; padding: 0.9rem 1rem;
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  cursor: pointer; text-align: left; font-family: inherit; color: inherit;
  transition: border-color 0.12s ease, transform 0.12s ease;
}
.sdk-choice:hover { border-color: ${C.accent}; transform: translateY(-1px); }
.sdk-choice-name { display: block; font-size: 1.05rem; font-weight: 700; }
.sdk-choice-note { display: block; color: ${C.muted}; font-size: 0.78rem; margin-top: 0.15rem; }
/* ---- Word Sprint (daily Boggle-style word grid) ---- */
.wspr-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  max-width: 320px; margin: 0 auto; aspect-ratio: 1;
}
.wspr-tile {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; font-weight: 700;
  cursor: pointer; user-select: none; position: relative;
}
.wspr-tile.onpath { background: ${C.accent}; color: #fff; border-color: ${C.accent}; }
.wspr-tile.pathlast { box-shadow: 0 0 0 3px ${C.gold}; }
.wspr-tile.dim { opacity: 0.45; cursor: default; }
.wspr-word {
  text-align: center; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px;
  font-size: 1.15rem; font-weight: 700; min-height: 1.6rem; margin: 0.7rem 0 0.4rem;
}
.wspr-msg { text-align: center; font-size: 0.8rem; min-height: 1.1rem; color: ${C.muted}; }
.wspr-msg.good { color: ${GA.lime}; }
.wspr-msg.bad { color: ${C.rose}; }
.wspr-actions { display: flex; gap: 0.5rem; justify-content: center; margin: 0.5rem 0 0.8rem; }
.wspr-btn {
  padding: 0.55rem 1.4rem; border-radius: 10px; border: 1px solid ${C.border};
  background: ${C.card}; color: inherit; font-family: inherit; font-weight: 700; cursor: pointer;
}
.wspr-btn.primary { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.wspr-btn:disabled { opacity: 0.45; cursor: default; }
/* PHASE 3 (#131) — this list was unbounded and grew the document as you played,
   pushing the grid off screen. Own scroll strip, fixed height. */
.wspr-found {
  display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center;
  max-width: 360px; margin: 0 auto;
  max-height: 5.2rem; overflow-y: auto; overscroll-behavior: contain;
}
.wspr-found span {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 999px;
  padding: 0.15rem 0.6rem; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;
}
/* ---- Daily Snake / Daily Bounce (seeded daily arcade variants) ---- */
.dsnk-board {
  display: grid; gap: 1px; background: ${C.border}; border: 2px solid ${C.border};
  border-radius: 10px; overflow: hidden; max-width: 340px; margin: 0 auto; aspect-ratio: 1;
  touch-action: none;
}
.dsnk-cell { background: ${C.card}; }
.dsnk-cell.body { background: ${GA.lime}; }
.dsnk-cell.head { background: ${C.accent}; }
.dsnk-cell.food { background: ${C.rose}; border-radius: 50%; }
.dsnk-hint { text-align: center; color: ${C.muted}; font-size: 0.8rem; margin-top: 0.6rem; }
/* #149 — this is the flexible region of Daily Bounce's fit column, and its
   measured box is what sizeCanvas() reads to scale the canvas. Before, the
   canvas was pinned to its logical 320×430 and left ~135px of dead space. */
.dbnc-wrap { display: flex; justify-content: center; align-items: center; }
.fit-col .dbnc-wrap { flex: 1 1 auto; min-height: 0; min-width: 0; }
.dbnc-canvas {
  border: 2px solid ${C.border}; border-radius: 10px; background: #10131c;
  touch-action: none; max-width: 100%;
}
/* ---- Ludo seats 3/4 (2–4 player boards) ---- */
.ludo-cell.home3 { background: ${ca('gold','22')}; }
.ludo-cell.home4 { background: ${GA.teal}22; }
.ludo-cell.base3 { background: ${ca('gold','33')}; border-color: ${C.gold}; }
.ludo-cell.base4 { background: ${GA.teal}33; border-color: ${GA.teal}; }
.ludo-cell.start3 { background: ${ca('gold','2e')}; }
.ludo-cell.start4 { background: ${GA.teal}2e; }
.ludo-token.p3 { background: ${C.gold}; }
.ludo-token.p4 { background: ${GA.teal}; }
.ludo-token.forfeited { opacity: 0.35; }
.scell {
  background: ${C.card};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s ease;
  aspect-ratio: 1;
}
.scell.given { color: ${C.text}; cursor: default; }
.scell.user { color: ${C.accent}; }
.scell.sel { background: ${ca('accent','33')}; }
.scell.hl { background: ${ca('accent','0a')}; }
.scell.err { color: ${C.rose}; background: ${ca('rose','1a')}; }

.numpad {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  max-width: 360px;
  margin: 1.1rem auto 0;
}
.numkey {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  color: ${C.text};
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.2rem;
  font-weight: 600;
  padding: 0.65rem 0;
  cursor: pointer;
  transition: border-color 0.1s ease, background 0.1s ease;
}
.numkey:hover { border-color: ${C.accent}; background: ${ca('accent','1a')}; }
.numkey.erase { color: ${C.rose}; font-size: 1rem; }

/* ---- Win overlay ---- */
.win-overlay {
  position: fixed;
  inset: 0;
  background: var(--c-scrim);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: calc(1.25rem + env(safe-area-inset-top, 0px)) 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
}
.win-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 2rem 1.75rem;
  text-align: center;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 20px 50px var(--c-shadow-lg);
  max-height: calc(100vh - 2.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: calc(100dvh - 2.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.win-card .trophy { font-size: 2.6rem; }
.win-card h2 { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0 0.25rem; }
.win-card .sub { color: ${C.muted}; font-size: 0.9rem; margin-bottom: 1.25rem; }
.score-rows {
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  border-top: 1px solid ${C.border};
  border-bottom: 1px solid ${C.border};
  padding: 0.9rem 0;
  margin-bottom: 1.25rem;
}
.score-row { display: flex; justify-content: space-between; padding: 0.18rem 0; }
.score-row .k { color: ${C.muted}; }
.score-row.bonus .v { color: ${C.emerald}; }
.score-row.total { font-weight: 600; font-size: 1.05rem; padding-top: 0.5rem; }
.score-row.total .v { color: ${C.gold}; }

.primary-btn {
  width: 100%;
  background: ${C.accent};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.8rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;
}
.primary-btn:hover { background: var(--c-accent-hover); }

/* ---- Locked screen ---- */
.locked-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 2rem 1.75rem;
  text-align: center;
  max-width: 420px;
  margin: 1rem auto 0;
  box-shadow: 0 12px 34px var(--c-shadow-md);
}
.locked-card .lock-icon { font-size: 2.6rem; }
.locked-card h2 { font-size: 1.4rem; font-weight: 700; margin: 0.5rem 0 0.25rem; }
.locked-card .sub { color: ${C.muted}; font-size: 0.9rem; margin-bottom: 1.25rem; }
.countdown-block {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}
.countdown-block .clabel {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${C.muted};
  margin-bottom: 0.35rem;
}
.countdown-block .ctime {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 2rem;
  color: ${C.gold};
  letter-spacing: 0.04em;
}
.locked-result {
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  border-top: 1px solid ${C.border};
  padding-top: 0.9rem;
  margin-bottom: 1.25rem;
}
.locked-result .score-row { display: flex; justify-content: space-between; padding: 0.18rem 0; }
.locked-result .k { color: ${C.muted}; }
.locked-result .v { color: ${C.gold}; }

/* ---- Pre-game screen (shell-owned chrome, phase 3) ---- */
.pregame-card {
  max-width: 440px; margin: 1.5rem auto; padding: 2rem 1.5rem;
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 18px;
  text-align: center;
}
.pregame-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.pregame-card h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.3rem; }
.pregame-card .sub { color: ${C.muted}; font-size: 0.9rem; margin-bottom: 1rem; }
.pregame-chips {
  display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap;
  margin-bottom: 1rem;
}
.pregame-chip {
  font-size: 0.72rem; padding: 0.25rem 0.6rem; border-radius: 999px;
  background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.muted};
  white-space: nowrap;
}
.pregame-stats {
  display: flex; gap: 0.6rem; justify-content: center; margin-bottom: 1rem;
}
.pregame-stat {
  flex: 1; max-width: 130px; background: ${C.surface};
  border: 1px solid ${C.border}; border-radius: 12px; padding: 0.6rem 0.4rem;
}
.pregame-stat .l {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: ${C.muted}; margin-bottom: 0.2rem;
}
.pregame-stat .v { font-weight: 700; font-size: 1rem; }
.pregame-deal {
  font-size: 0.82rem; color: ${C.text}

/* #176 — the band pickers. Story's is a numbered ladder walked in order
   (cleared behind you, one open rung ahead, the rest locked); arcade's is
   three wide buttons with no lock at all, because all three difficulties are
   open from the first run and the recommendation steers instead of gating. */
.pregame-bands { margin-top: 0.9rem; text-align: left; }
.pregame-bands-label {
  font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
  letter-spacing: 0.12em; text-transform: uppercase; color: ${C.muted};
  margin-bottom: 0.4rem;
}
.pregame-band-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pregame-band-row.wide { display: grid; grid-template-columns: repeat(3, 1fr); }
.pregame-band {
  min-width: 44px; min-height: 44px; padding: 0.4rem 0.6rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 600;
  color: ${C.text}; background: ${C.card};
  border: 1px solid ${C.border}; border-radius: 10px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
}
.pregame-band.wide { font-family: inherit; font-size: 0.8rem; }
.pregame-band.on {
  border-color: var(--accent, ${C.accent});
  background: ${ca('accent', '14')};
  color: var(--accent, ${C.accent});
}
.pregame-band.done { color: ${C.emerald}; border-color: ${ca('emerald', '55')}; }
.pregame-band.locked { opacity: 0.4; cursor: not-allowed; }
.pregame-band[data-pressed] { background: ${C.well}; }
.pregame-band .rec {
  display: block; font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem; letter-spacing: 0.06em; text-transform: uppercase;
  color: ${C.muted}; margin-top: 0.1rem;
}
.pregame-band-note {
  margin-top: 0.45rem; font-size: 0.72rem; line-height: 1.4; color: ${C.muted};
}; background: ${ca('accent','14')};
  border: 1px solid ${ca('accent','44')}; border-radius: 10px;
  padding: 0.6rem 0.8rem; margin-bottom: 1rem;
}
.pregame-resume-note {
  font-size: 0.82rem; color: ${C.gold}; margin-bottom: 0.8rem;
}
.pregame-play { width: 100%; }
.pregame-play:disabled { opacity: 0.5; cursor: default; }
.pregame-signedout { font-size: 0.78rem; color: ${C.muted}; margin-top: 0.6rem; }
.pregame-howto-btn {
  margin-top: 0.8rem; background: none; border: none; color: ${C.accent};
  font-family: inherit; font-size: 0.85rem; cursor: pointer; padding: 0.3rem;
}
.pregame-howto-btn:hover { text-decoration: underline; }

/* ---- How-to-Play modal (shell-owned chrome, phase 3) ---- */
.howto-overlay {
  position: fixed; inset: 0; background: var(--c-scrim); z-index: 220;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.howto-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px;
  padding: 1.4rem 1.3rem; width: min(95vw, 420px); max-height: 85dvh;
  overflow-y: auto;
}
.howto-head {
  display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;
}
.howto-icon { font-size: 1.6rem; }
.howto-head h3 { font-size: 1.05rem; font-weight: 700; }
.howto-list { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1.2rem; }
.howto-step { display: flex; gap: 0.7rem; align-items: flex-start; }
.howto-step-num {
  flex: none; width: 1.6rem; height: 1.6rem; border-radius: 50%;
  background: ${ca('accent','22')}; color: ${C.accent}; font-weight: 700;
  display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
}
.howto-step-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.15rem; }
.howto-step-body { font-size: 0.82rem; color: ${C.muted}; line-height: 1.45; }

/* "?" help button in the in-game headers */
.help-btn {
  margin-left: auto; background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 50%; width: 1.9rem; height: 1.9rem; color: ${C.muted};
  font-family: inherit; font-size: 0.9rem; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.12s, color 0.12s;
}
.help-btn:hover { border-color: ${C.accent}; color: ${C.accent}; }

/* ---- Locked lobby card ---- */
.card.locked { cursor: default; }
.card.locked:hover { transform: none; border-color: ${C.border}; box-shadow: none; }
.card-lock {
  margin-top: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: ${C.gold};
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.card.inprogress { border-color: ${C.gold}; }
.card-resume {
  margin-top: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: ${C.gold};
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ---- Dual-mode (paired) lobby card (#146) ----
   A game that exists in BOTH an endless free-play form and a once-a-day form
   gets ONE card with two buttons instead of two near-duplicate cards. The card
   itself is never dimmed/locked — only the daily button changes state, so
   finishing today's daily can't make the free-play half look unavailable. */
.card.paired { cursor: default; }
.card.paired:hover { transform: none; border-color: ${C.border}; box-shadow: none; }
/* #167 — the two mode buttons sit SIDE BY SIDE, not stacked. Stacked, they made
   a paired card tower over a single-mode card, which is the whole reason the
   grid used to let cards hug their content (see .grid). Two equal columns with
   a clamped label/caption bring the paired card within a tile's padding of a
   single one, so one uniform height suits both. */
/* #176 — a card can now carry one, two or THREE mode buttons. Three across a
   200px column would leave ~50px of text each, which ellipsises to nothing, so
   the three-up case drops to a 2+1 grid: the two most-used modes share the top
   row and the third spans beneath. Column count is explicit per arity rather
   than auto-fit, because auto-fit would silently reflow to 1-up at the narrow
   end and tower the card again (the exact regression #167 fixed). */
.card-modes {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.4rem; margin-top: 0.7rem;
}
.card-modes.n1 { grid-template-columns: 1fr; }
.card-modes.n3 > :last-child { grid-column: 1 / -1; }
/* The state line replaces per-button chatter: the card says where you stand,
   and the buttons say where you can go. Tabular figures so "Story 4/8" does not
   jitter as the numerator grows. */
.card-state {
  margin-top: 0.5rem; font-size: 0.62rem; letter-spacing: 0.04em;
  color: ${C.dim}; font-variant-numeric: tabular-nums;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* A card with no play modes (the head-to-head games) is one big tap target
   rather than a card with a single redundant "Play" button under it. */
.card-plain-hit {
  display: flex; flex-direction: column; align-items: inherit;
  gap: inherit; width: 100%; height: 100%;
  background: none; border: 0; padding: 0; margin: 0;
  font: inherit; color: inherit; text-align: inherit; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.card-mode-btn {
  display: flex; flex-direction: column; justify-content: center;
  width: 100%; min-width: 0; text-align: center;
  font-family: inherit; color: ${C.text};
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  /* Vertical padding is set so the button clears the 44px minimum tap target
     even at the smaller side-by-side label/caption sizes. */
  padding: 0.45rem 0.3rem;
  min-height: 44px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s ease, background 0.12s ease;
}
/* One line each, ellipsised. At the grid's narrowest column (200px) the two
   buttons share ~166px, i.e. ~74px of text each, so anything that wraps costs
   every OTHER tile in the grid the same height (see .grid). The ellipsis is the
   safety net, not the plan — keep the caption copy in GAME_CARDS, and the
   dynamic strings in GameCard, inside that budget. The full captions live
   on the pre-game screen. */
.cmb-label, .cmb-caption {
  display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cmb-label { font-size: 0.72rem; font-weight: 700; line-height: 1.25; }
.cmb-caption {
  font-size: 0.62rem; line-height: 1.25; margin-top: 0.05rem;
  color: ${C.muted};
}
.card-mode-btn.story:hover, .card-mode-btn.arcade:hover { border-color: var(--accent, ${C.accent}); }
.card-mode-btn.story:hover .cmb-label,
.card-mode-btn.arcade:hover .cmb-label { color: var(--accent, ${C.accent}); }
.card-mode-btn.daily.fresh {
  background: var(--accent, ${C.accent});
  border-color: var(--accent, ${C.accent});
}
.card-mode-btn.daily.fresh .cmb-label { color: #fff; }
.card-mode-btn.daily.fresh .cmb-caption { color: rgba(255,255,255,0.85); }
.card-mode-btn.daily.fresh:hover { filter: brightness(0.9); }
.card-mode-btn.daily.resume {
  background: ${ca('gold', '16')};
  border-color: ${ca('gold', '35')};
}
.card-mode-btn.daily.resume .cmb-label { color: ${C.gold}; }
.card-mode-btn.daily.played {
  background: ${ca('emerald', '14')};
  border-color: ${ca('emerald', '30')};
}
.card-mode-btn.daily.played .cmb-label { color: ${C.emerald}; }
.card-mode-btn.daily.played .cmb-caption { font-family: 'JetBrains Mono', monospace; }

/* ---- Leaderboard scope tabs + rating ladder (phase 4) ---- */
.lb-scope-tabs { display: flex; gap: 0.35rem; margin: 0.5rem 0 0.6rem; flex-wrap: wrap; }
.lb-scope-tab {
  padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.75rem;
  font-family: inherit; cursor: pointer; white-space: nowrap;
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.muted};
  transition: border-color 0.12s, color 0.12s;
}
.lb-scope-tab:not(.active):hover { border-color: ${C.accent}; color: ${C.text}; }
.lb-scope-tab.active { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.lboard.ladder { max-width: 640px; margin: 0.5rem auto; }
/* Ladder rows carry five cells (rank, name, streak, elo, delta) — the base
   .lrow grid is four columns, so widen it here. */
.lboard.ladder .lrow { grid-template-columns: 2.4rem 1fr auto auto auto; }
.ladder-games { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
.ladder-note { font-size: 0.78rem; color: ${C.muted}; margin-bottom: 0.8rem; line-height: 1.45; }
.ladder-movers {
  font-size: 0.8rem; color: ${C.text}; background: ${ca('emerald','14')};
  border: 1px solid ${ca('emerald','44')}; border-radius: 8px;
  padding: 0.45rem 0.7rem; margin-bottom: 0.7rem;
}
.ladder-streak { min-width: 2.6rem; text-align: right; color: ${C.gold}; font-size: 0.8rem; }
.ladder-delta { min-width: 2.8rem; text-align: right; font-size: 0.8rem; }
.ladder-delta.up { color: ${C.emerald}; }
.ladder-delta.down { color: ${C.rose}; }
.ladder-delta.flat { color: ${C.muted}; }

/* ---- Daily leaderboard ---- */
.lboard {
  margin: 1rem 0 0.25rem;
  text-align: left;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
}
.lboard-title {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lboard-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: ${C.muted};
  font-weight: 400;
}
.lboard-empty { color: ${C.muted}; font-size: 0.82rem; padding: 0.4rem 0; }
.lboard-note {
  margin-top: 0.55rem;
  font-size: 0.76rem;
  color: ${C.muted};
  border-top: 1px dashed ${C.border};
  padding-top: 0.5rem;
}
.lboard-rows { display: flex; flex-direction: column; gap: 0.15rem; max-height: 280px; overflow-y: auto; }
.lrow {
  display: grid;
  grid-template-columns: 2.4rem 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.32rem 0.45rem;
  border-radius: 8px;
  font-size: 0.82rem;
}
.lrow .lrank { color: ${C.muted}; font-size: 0.76rem; }
.lrow .lname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lrow .ltime { color: ${C.text}; font-size: 0.78rem; }
.lrow .lsteps { color: ${C.muted}; font-size: 0.74rem; }
.lrow.me { background: ${ca('accent','22')}; }
.lrow.me .lrank, .lrow.me .lname { color: ${C.accent}; font-weight: 600; }
.lrow.pinned { margin-top: 0.3rem; border-top: 1px dashed ${C.border}; padding-top: 0.5rem; }

/* ---- Word Hunt ---- */
.wordsearch {
  display: grid;
  /* Kept in lockstep with WS_SIZE (#139). */
  grid-template-columns: repeat(10, 1fr);
  background: ${C.border};
  gap: 1px; /* #149 — see .sudoku: no gap meant no gridlines ever rendered. */
  border: 2px solid ${C.border};
  border-radius: 10px;
  overflow: hidden;
  max-width: 420px;
  margin: 0 auto;
  aspect-ratio: 1;
  touch-action: none;
}
.wcell {
  background: ${C.card};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.05rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.08s ease, color 0.08s ease;
  aspect-ratio: 1;
}
.wcell.found { background: ${ca('emerald','33')}; color: ${C.emerald}; cursor: default; }
.wcell.sel { background: ${ca('accent','55')}; color: #fff; }

.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: center;
  max-width: 420px;
  margin: 1.1rem auto 0;
}
.word-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.muted};
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.word-chip.found {
  background: ${ca('emerald','1a')};
  border-color: ${C.emerald};
  color: ${C.emerald};
  text-decoration: line-through;
}
.word-theme {
  text-align: center;
  color: ${C.muted};
  font-size: 0.82rem;
  margin: 0 auto 1rem;
}
.word-theme b { color: ${C.text}; }

/* ---- Crypto Wordle ---- */
.cw-tracker {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  max-width: 460px;
  margin: 0 auto 0.8rem;
}
.cw-tracker .cw-dot {
  font-size: 0.95rem;
  line-height: 1;
  color: ${C.muted};
  font-family: 'JetBrains Mono', monospace;
}
.cw-tracker .cw-dot.solved { color: ${C.emerald}; }
.cw-tracker .cw-dot.missed { color: ${C.rose}; }
.cw-tracker .cw-dot.active { color: ${C.accent}; }
.cw-alldone {
  text-align: center;
  max-width: 460px;
  margin: 1rem auto 0;
  font-weight: 600;
  color: ${C.emerald};
}
.cw-clue {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: 460px;
  margin: 0 auto 0.9rem;
  padding: 0.6rem 0.8rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-left: 3px solid ${C.emerald};
  border-radius: 10px;
}
.cw-clue-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${C.emerald};
  font-weight: 700;
}
.cw-clue-text { flex: 1 1 auto; font-size: 0.9rem; color: ${C.text}; }
.cw-clue-len {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: ${C.muted};
  white-space: nowrap;
}
.cw-clue-extra {
  margin-top: -0.4rem;
  border-left-color: ${C.gold};
}
.cw-clue-extra .cw-clue-label { color: ${C.gold}; }
.cw-hint-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  max-width: 460px;
  margin: 0 auto 0.9rem;
}
.cw-hint-btn {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: #fff;
  background: ${C.gold};
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  transition: filter 0.1s ease, opacity 0.1s ease;
}
.cw-hint-btn:hover:not(:disabled) { filter: brightness(1.08); }
.cw-hint-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.cw-hint-balance {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.74rem;
  color: ${C.muted};
}
.cw-hint-msg {
  font-size: 0.74rem;
  font-weight: 600;
  color: ${C.rose};
}
/* Hinted reveals in the daily puzzles */
.scell.hinted {
  color: ${C.gold};
  font-weight: 700;
  background: ${ca('gold','1a')};
}
.wcell.hinted {
  background: ${ca('gold','33')};
  outline: 2px solid ${C.gold};
  outline-offset: -2px;
  border-radius: 4px;
}
.tm-tile.hint-target {
  outline: 3px solid ${C.gold};
  outline-offset: -1px;
  animation: tmHintPulse 0.7s ease-in-out infinite;
  z-index: 999 !important;
}
@keyframes tmHintPulse {
  0%, 100% { box-shadow: 0 0 6px ${C.gold}; }
  50% { box-shadow: 0 0 16px ${C.gold}; }
}
.cw-board {
  display: grid;
  gap: 0.4rem;
  max-width: 330px;
  margin: 0 auto;
  width: 100%;
}
/* PHASE 3 — inside the fit column the board is the ONE flexible child: an
   8-row grid for a 7-letter word shrinks its rows instead of pushing the
   keyboard off the bottom of the screen (which is what #3's clipping was).
   The tiles must give up their aspect-ratio here — it forces height from width
   and would otherwise overflow the row tracks straight over the keyboard. */
.fit-col .cw-board {
  flex: 1 1 auto; min-height: 0; overflow: hidden;
  align-content: center;
}
.fit-col .cw-row { min-height: 0; }
.fit-col .cw-tile {
  aspect-ratio: auto; min-height: 0; min-width: 0;
  font-size: clamp(0.9rem, 4.2vw, 1.5rem);
}
.cw-row {
  display: grid;
  gap: 0.4rem;
}
.cw-row.shake { animation: cw-shake 0.4s ease; }
@keyframes cw-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.cw-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 2px solid ${C.dim};
  border-radius: 8px;
  background: ${C.card};
  color: ${C.text};
  user-select: none;
  transition: border-color 0.1s ease, background 0.1s ease;
}
.cw-tile.filled { border-color: ${C.muted}; }
.cw-tile.green  { background: ${C.emerald}; border-color: ${C.emerald}; color: #fff; }
.cw-tile.yellow { background: ${C.gold};    border-color: ${C.gold};    color: #fff; }
.cw-tile.gray   { background: ${C.dim};     border-color: ${C.dim};     color: ${C.text}; }

.cw-kbd {
  max-width: 480px;
  margin: 1.3rem auto 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cw-kbd-row { display: flex; gap: 0.22rem; justify-content: center; }
/* PHASE 2 — the worst tap surface in the app: ~34×41px keys with hover-only
   feedback on a game where typing IS the interaction. */
.cw-key {
  flex: 1 1 auto;
  min-width: 2rem;
  min-height: 46px;
  padding: 0.85rem 0.2rem;
  background: ${C.border};
  border: none;
  border-radius: 6px;
  color: ${C.text};
  font-family: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}
.cw-key:hover { background: ${C.accent}; color: #fff; }
.cw-key.wide { flex: 1.6 1 auto; font-size: 0.72rem; }
.cw-key.green  { background: ${C.emerald}; color: #fff; }
.cw-key.yellow { background: ${C.gold};    color: #fff; }
.cw-key.gray   { background: ${C.dim};     color: ${C.muted}; }

/* ---- Lobby tab switcher ---- */
.lobby-tabs { display: flex; gap: 0.35rem; margin-bottom: 1.1rem; flex-wrap: wrap; }
.lobby-tab {
  padding: 0.45rem 1.1rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 999px;
  font-size: 0.87rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  color: ${C.text};
  transition: border-color 0.12s, background 0.12s;
}
.lobby-tab.active { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.lobby-tab:not(.active):hover { border-color: ${C.accent}; }

@media (max-width: 480px) {
  .lobby-tab { padding: 0.35rem 0.8rem; font-size: 0.8rem; }
}

/* ---- Minesweeper ---- */
.ms-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  max-width: 360px;
  margin: 0 auto;
  background: ${C.border};
  border: 2px solid ${C.border};
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1/1;
  touch-action: none;
}
.ms-cell {
  font-family: 'JetBrains Mono', monospace;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.08s ease;
  border: none;
  background: ${C.card};
}
.ms-cell.ms-hidden { background: ${C.card}; }
.ms-cell.ms-hidden:hover { background: ${ca('accent','26')}; }
.ms-cell.ms-revealed { background: ${C.surface}; cursor: default; }
.ms-cell.ms-flagged { background: ${C.card}; cursor: default; }
.ms-cell.ms-mine-dead { background: ${ca('rose','40')}; cursor: default; }
.ms-cell.ms-exploded { background: ${ca('rose','99')}; cursor: default; }
.ms-n1 { color: ${C.accent}; }
.ms-n2 { color: ${C.emerald}; }
.ms-n3 { color: ${C.rose}; }
.ms-n4 { color: ${C.violet}; }
.ms-n5 { color: ${C.gold}; }
.ms-n6 { color: #06b6d4; }
.ms-n7 { color: #be123c; }
.ms-n8 { color: ${C.muted}; }
@keyframes ms-pulse {
  0%, 100% { box-shadow: 0 0 0 0 ${ca('emerald','40')}; }
  50% { box-shadow: 0 0 0 6px ${ca('emerald','00')}; }
}
.ms-cashout-btn {
  width: 100%;
  background: ${C.emerald};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.8rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;
  animation: ms-pulse 1.8s ease infinite;
}
.ms-cashout-btn:hover { background: var(--c-emerald-hover); }
.ms-cashout-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  animation: none;
  background: ${C.dim};
}
.ms-dev-badge {
  font-size: 0.6rem;
  color: ${C.muted};
  margin-top: 0.2rem;
  text-align: center;
}
.ms-settings-section { margin-bottom: 1.25rem; }
.ms-settings-section h4 {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
  margin-bottom: 0.6rem;
}
.ms-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  margin-bottom: 0.4rem;
}
.ms-settings-row .ms-settings-label {
  font-size: 0.88rem;
  font-weight: 500;
}
.ms-theme-toggle {
  background: ${C.surface};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 8px;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 600;
  transition: border-color 0.12s;
}
.ms-theme-toggle:hover { border-color: ${C.accent}; }
.ms-action-row {
  display: flex;
  gap: 0.6rem;
  max-width: 360px;
  margin: 0.9rem auto 0;
}
.ms-action-row .ms-cashout-wrap { flex: 2; }
.ms-action-row .ms-newgame-btn {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 12px;
  padding: 0.8rem 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s;
}
.ms-action-row .ms-newgame-btn:hover { border-color: ${C.accent}; }
.ms-action-row .ms-music-btn {
  flex: 0 0 auto;
  width: 3rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 12px;
  padding: 0.8rem 0.5rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, opacity 0.12s;
}
.ms-action-row .ms-music-btn:hover:not(:disabled) { border-color: ${C.accent}; }
.ms-action-row .ms-music-btn.paused { color: ${C.gold}; border-color: ${ca('gold','66')}; }
.ms-action-row .ms-music-btn.off { opacity: 0.5; cursor: default; }
.ms-action-row .ms-music-btn:disabled { cursor: default; }
.ms-bottom-nav {
  display: flex;
  border-top: 1px solid ${C.border};
  background: ${C.surface};
  position: sticky;
  bottom: 0;
  margin: 1rem -1.25rem -1.5rem;
}
.ms-tab {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.82rem;
  border: none;
  background: transparent;
  color: ${C.muted};
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-top: 2px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.ms-tab.active { color: ${C.accent}; border-top-color: ${C.accent}; }
.ms-history-list { overflow-y: auto; max-height: 60vh; padding: 0.5rem 0; }
.ms-history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0;
  font-size: 0.82rem;
}
.ms-outcome-chip {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}
.ms-outcome-chip.win { background: ${ca('emerald','22')}; color: ${C.emerald}; border: 1px solid ${ca('emerald','44')}; }
.ms-outcome-chip.loss { background: ${ca('rose','22')}; color: ${C.rose}; border: 1px solid ${ca('rose','44')}; }
.ms-leaderboard-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0;
  font-size: 0.82rem;
}
.ms-leaderboard-row .ms-rank {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: ${C.muted};
  width: 1.5rem;
  text-align: center;
}
.ms-empty-state {
  color: ${C.muted};
  text-align: center;
  padding: 2rem 0;
  font-size: 0.9rem;
}
.ms-dev-label {
  font-size: 0.72rem;
  color: ${C.muted};
  margin-bottom: 0.75rem;
  padding: 0.3rem 0.6rem;
  background: ${C.card};
  border-radius: 8px;
  display: inline-block;
}
/* Light theme overrides for minesweeper board only */
[data-ms-theme="light"] .ms-cell.ms-hidden { background: #e5e7eb; }
[data-ms-theme="light"] .ms-cell.ms-hidden:hover { background: #d1d5db; }
[data-ms-theme="light"] .ms-cell.ms-revealed { background: #f9fafb; color: #111827; }
[data-ms-theme="light"] .ms-cell.ms-flagged { background: #e5e7eb; }
[data-ms-theme="light"] .ms-grid { background: #9ca3af; border-color: #9ca3af; }
[data-ms-theme="light"] .ms-cell.ms-mine-dead { background: #fca5a5; }
[data-ms-theme="light"] .ms-cell.ms-exploded { background: #f87171; }

/* ---- Mancala ---- */
.mnc-board {
  display: grid;
  grid-template-columns: 3.2rem repeat(6, 1fr) 3.2rem;
  grid-template-rows: 1fr 1fr;
  gap: 5px;
  background: #7B4F2E;
  border: 2px solid #5A2F14;
  border-radius: 16px;
  padding: 8px;
  max-width: 480px;
  margin: 0 auto;
  align-items: stretch;
}
.mnc-store {
  border-radius: 999px;
  background: #4A1E09;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.4rem 0;
  min-height: 88px;
  border: 2px solid #3A1206;
  transition: border-color 0.2s;
  position: relative;
  overflow: hidden;
}
.mnc-store-score {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #C8A87A;
  transition: color 0.2s;
  position: relative;
  z-index: 1;
}
.mnc-store-label {
  font-size: 0.48rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #9E7A5A;
  position: relative;
  z-index: 1;
}
.mnc-pit {
  aspect-ratio: 1;
  border-radius: 50%;
  background: #4A1E09;
  border: 2px solid #3A1206;
  position: relative;
  overflow: hidden;
  user-select: none;
  cursor: default;
  transition: background 0.1s ease, transform 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}
.mnc-pit.mnc-clickable {
  cursor: pointer;
  border-color: #9E7A5A;
}
.mnc-pit.mnc-clickable:hover {
  background: #6B3A24;
  transform: scale(1.1);
  border-color: #C8A87A;
}
.mnc-pit.mnc-dim { opacity: 0.4; }
.mnc-pit.mnc-flash { animation: mnc-pit-flash 0.22s ease forwards; }
.mnc-pit.mnc-capture-flash { animation: mnc-capture-flash 0.32s ease forwards; }
@keyframes mnc-pit-flash {
  0%   { background: #4A1E09; border-color: #3A1206; }
  40%  { background: #5E2E12; border-color: #9E7A5A; }
  100% { background: #4A1E09; border-color: #3A1206; }
}
@keyframes mnc-capture-flash {
  0%   { background: #4A1E09; }
  40%  { background: ${ca('rose','22')}; border-color: ${C.rose}; }
  100% { background: #4A1E09; }
}
.mnc-pit-stones {
  position: absolute;
  inset: 0;
}
.mnc-stone {
  position: absolute;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
@keyframes mnc-stone-enter {
  from { transform: scale(0); opacity: 0.3; }
  to   { transform: scale(1); opacity: 1; }
}
.mnc-stone-entering {
  animation: mnc-stone-enter 0.12s ease-out forwards;
  transform-origin: center;
}
@keyframes mnc-stones-scatter {
  0%   { transform: scale(1);   opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.mnc-stones-capturing {
  animation: mnc-stones-scatter 0.22s ease-out forwards;
}
.mnc-banner {
  text-align: center;
  font-size: 0.92rem;
  font-weight: 600;
  color: ${C.gold};
  padding: 0.4rem 0.6rem;
  background: ${ca('gold','1a')};
  border: 1px solid ${ca('gold','33')};
  border-radius: 8px;
  margin: 0.6rem 0 0;
  min-height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mnc-controls {
  display: flex;
  gap: 0.5rem;
  max-width: 480px;
  margin: 0.8rem auto 0;
}
.mnc-controls button {
  flex: 1;
  min-width: 0;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.5rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  transition: border-color 0.12s;
  white-space: nowrap;
}
.mnc-controls button:hover { border-color: ${C.accent}; }
.mnc-controls button:disabled { opacity: 0.38; cursor: not-allowed; }
.mnc-controls button:disabled:hover { border-color: ${C.border}; }
.mnc-bottom-nav {
  display: flex;
  border-top: 1px solid ${C.border};
  background: ${C.surface};
  position: sticky;
  bottom: 0;
  margin: 1rem -1.25rem -1.5rem;
}
.mnc-tab {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.82rem;
  border: none;
  background: transparent;
  color: ${C.muted};
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-top: 2px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.mnc-tab.active { color: ${C.accent}; border-top-color: ${C.accent}; }
.mnc-history-list { overflow-y: auto; max-height: 55vh; padding: 0.5rem 0; }
.mnc-history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0;
  font-size: 0.82rem;
  gap: 0.5rem;
}
.mnc-outcome-chip {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.mnc-outcome-chip.p1win { background: ${ca('accent','22')}; color: ${C.accent}; border: 1px solid ${ca('accent','44')}; }
.mnc-outcome-chip.p2win { background: ${ca('rose','22')}; color: ${C.rose}; border: 1px solid ${ca('rose','44')}; }
.mnc-outcome-chip.draw { background: ${ca('muted','22')}; color: ${C.muted}; border: 1px solid ${ca('muted','44')}; }
.mnc-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  padding: 0.5rem 0;
}
.mnc-stat-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
}
.mnc-stat-card .mnc-stat-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${C.gold};
}
.mnc-stat-card .mnc-stat-lbl {
  font-size: 0.62rem;
  color: ${C.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 0.15rem;
}
.mnc-empty-state {
  color: ${C.muted};
  text-align: center;
  padding: 2rem 0;
  font-size: 0.9rem;
}
@media (max-width: 380px) {
  .mnc-board { grid-template-columns: 2.5rem repeat(6, 1fr) 2.5rem; gap: 3px; padding: 5px; }
  .mnc-store { min-height: 70px; }
}

/* ---- Mancala mode selection ---- */
.mnc-mode-select {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mnc-mode-btn {
  background: ${C.card};
  border: 2px solid ${C.border};
  border-radius: 14px;
  padding: 1rem 1.1rem;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: ${C.text};
  transition: border-color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
}
.mnc-mode-btn:hover { border-color: ${C.gold}; background: ${ca('gold','08')}; }
.mnc-mode-btn.active { border-color: ${C.gold}; background: ${ca('gold','14')}; }
.mnc-mode-icon { font-size: 1.7rem; flex-shrink: 0; }
.mnc-mode-text { display: flex; flex-direction: column; gap: 0.1rem; }
.mnc-mode-name { font-weight: 600; font-size: 1rem; }
.mnc-mode-desc { font-size: 0.78rem; color: ${C.muted}; }
.mnc-mode-sub {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.85rem 1rem;
}
.mnc-difficulty-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.mnc-difficulty-pill {
  flex: 1;
  padding: 0.45rem 0.4rem;
  background: ${C.card};
  border: 1.5px solid ${C.border};
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  color: ${C.muted};
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
  text-align: center;
}
.mnc-difficulty-pill:hover { border-color: ${C.gold}; color: ${C.text}; }
.mnc-difficulty-pill.active { border-color: ${C.gold}; color: ${C.gold}; background: ${ca('gold','14')}; font-weight: 600; }
.mnc-daily-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; flex-wrap: wrap;
  max-width: 480px; margin: 0 auto 0.6rem;
}
.mnc-daily-title { font-weight: 700; font-size: 0.95rem; color: ${C.text}; }
.mnc-daily-pills { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.mnc-record-pill {
  font-size: 0.74rem; font-weight: 700;
  background: ${ca('gold','14')}; color: ${C.gold};
  border: 1px solid ${ca('gold','55')};
  border-radius: 999px; padding: 0.18rem 0.55rem;
  white-space: nowrap;
}
.mnc-streak-chip {
  font-size: 0.74rem; font-weight: 700;
  background: ${ca('rose','1f')}; color: ${C.rose};
  border: 1px solid ${ca('rose','55')};
  border-radius: 999px; padding: 0.18rem 0.55rem;
  white-space: nowrap;
}
.mnc-mode-start-btn {
  width: 100%;
  padding: 0.65rem;
  background: ${C.gold};
  color: #000;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.mnc-mode-start-btn:hover { background: var(--c-gold-hover); }
.mnc-online-actions { display: flex; gap: 0.5rem; }
.mnc-online-actions button {
  flex: 1;
  padding: 0.6rem 0.5rem;
  background: ${C.card};
  border: 1.5px solid ${C.border};
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.87rem;
  font-weight: 600;
  color: ${C.text};
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.mnc-online-actions button:hover { border-color: ${C.gold}; background: ${ca('gold','0d')}; }

/* ---- Mancala online waiting / join screen ---- */
.mnc-room-waiting { max-width: 480px; margin: 0 auto; text-align: center; }
.mnc-room-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: ${C.gold};
  background: ${ca('gold','14')};
  border: 2px solid ${ca('gold','44')};
  border-radius: 14px;
  padding: 0.75rem 1.25rem;
  margin: 0.85rem 0;
  display: inline-block;
}
.mnc-spinner {
  display: inline-block;
  width: 1.4rem;
  height: 1.4rem;
  border: 2.5px solid ${C.border};
  border-top-color: ${C.gold};
  border-radius: 50%;
  animation: mnc-spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 0.5rem;
}
@keyframes mnc-spin { to { transform: rotate(360deg); } }
.mnc-join-form { max-width: 480px; margin: 0 auto; }
.mnc-join-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  background: ${C.card};
  border: 1.5px solid ${C.border};
  border-radius: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: ${C.text};
  text-transform: uppercase;
  outline: none;
  transition: border-color 0.12s;
  margin-bottom: 0.6rem;
  box-sizing: border-box;
  text-align: center;
}
.mnc-join-input:focus { border-color: ${C.gold}; }
.mnc-join-error { color: ${C.rose}; font-size: 0.82rem; margin-bottom: 0.6rem; text-align: center; }

/* ---- Mancala online in-game UI ---- */
.mnc-connection-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: ${C.muted};
  margin-bottom: 0.45rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}
.mnc-conn-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; }
.mnc-conn-dot.green { background: ${C.emerald}; }
.mnc-conn-dot.amber { background: ${C.gold}; }

/* ---- Mancala AI thinking banner ---- */
.mnc-ai-thinking {
  text-align: center;
  font-size: 0.82rem;
  font-weight: 500;
  color: ${C.muted};
  padding: 0.35rem 0.6rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 8px;
  margin: 0.5rem 0 0;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

/* ---- 2048 ---- */
.t2048-board-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
}
.t2048-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: ${C.card};
  border: 2px solid ${C.border};
  border-radius: 12px;
  padding: 8px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.t2048-cell {
  aspect-ratio: 1;
  border-radius: 8px;
  background: ${C.bg};
  border: 1px solid ${ca('border','44')};
}
/* PHASE 6 (#142) — tiles used to be grid children, so they teleported between
   cells and you could not see what a swipe did. They are now absolutely
   positioned over the (unchanged) 4x4 cell backdrop and animate their transform
   from the previous position to the new one. Input is NEVER gated on the
   animation: executeMove stays synchronous and the visual catches up.
   The slide (outer, transform) and the pop (inner, scale) are on SEPARATE
   elements on purpose — one transform property cannot carry both. */
.t2048-layer {
  position: absolute; inset: 8px;
  pointer-events: none;
}
.t2048-tile {
  position: absolute;
  top: 0; left: 0;
  width: calc((100% - 18px) / 4);
  height: calc((100% - 18px) / 4);
  transition: transform 100ms ease-out;
  will-change: transform;
}
.t2048-tile-inner {
  position: absolute; inset: 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}
.t2048-tile.is-new .t2048-tile-inner {
  animation: t2048-pop-in 120ms ease both;
}
.t2048-tile.is-merged .t2048-tile-inner {
  animation: t2048-merge-pop 150ms ease both;
}
@keyframes t2048-pop-in {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes t2048-merge-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}
.t2048-score-delta {
  position: absolute;
  top: -1.4rem;
  right: 0.1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${C.gold};
  pointer-events: none;
  animation: t2048-float-up 600ms ease-out forwards;
  white-space: nowrap;
}
@keyframes t2048-float-up {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-22px); }
}
.t2048-controls {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0.8rem auto 0;
}
.t2048-controls button {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.5rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  transition: border-color 0.12s;
  white-space: nowrap;
}
.t2048-controls button:hover { border-color: ${C.accent}; }
.t2048-controls button:disabled { opacity: 0.38; cursor: not-allowed; }
.t2048-controls button:disabled:hover { border-color: ${C.border}; }
.t2048-banner {
  font-size: 0.72rem;
  color: ${C.muted};
  margin-bottom: 0.75rem;
  padding: 0.3rem 0.6rem;
  background: ${C.card};
  border-radius: 8px;
  display: inline-block;
  border: 1px solid ${C.border};
}
.t2048-bottom-nav {
  display: flex;
  border-top: 1px solid ${C.border};
  background: ${C.surface};
  position: sticky;
  bottom: 0;
  margin: 1rem -1.25rem -1.5rem;
}
.t2048-tab {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.82rem;
  border: none;
  background: transparent;
  color: ${C.muted};
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-top: 2px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.t2048-tab.active { color: ${C.accent}; border-top-color: ${C.accent}; }
.t2048-history-list { overflow-y: auto; max-height: 60vh; padding: 0.5rem 0; }
.t2048-history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0;
  font-size: 0.82rem;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.t2048-outcome-chip {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.t2048-outcome-chip.win  { background: ${ca('emerald','22')}; color: ${C.emerald}; border: 1px solid ${ca('emerald','44')}; }
.t2048-outcome-chip.loss { background: ${ca('rose','22')};    color: ${C.rose};    border: 1px solid ${ca('rose','44')}; }
.t2048-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  padding: 0.5rem 0;
}
.t2048-stat-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
}
.t2048-stat-card .t2048-stat-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${C.gold};
}
.t2048-stat-card .t2048-stat-lbl {
  font-size: 0.62rem;
  color: ${C.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 0.15rem;
}
.t2048-empty-state {
  color: ${C.muted};
  text-align: center;
  padding: 2rem 0;
  font-size: 0.9rem;
}
.t2048-overlay {
  position: absolute;
  inset: 0;
  background: ${ca('bg','ee')};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  z-index: 5;
  padding: 1rem;
}
.t2048-overlay h3 { font-size: 1.35rem; font-weight: 700; }
.t2048-overlay-score {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.6rem;
  font-weight: 700;
  color: ${C.gold};
}
.t2048-overlay-btns {
  display: flex;
  gap: 0.6rem;
  width: 100%;
  max-width: 280px;
  margin-top: 0.3rem;
}
.t2048-overlay-btns button {
  flex: 1;
  border-radius: 10px;
  padding: 0.65rem 0.4rem;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;
}
.t2048-keep-btn   { background: ${C.accent}; color: #fff; border: none; }
.t2048-keep-btn:hover   { opacity: 0.88; }
.t2048-finish-btn { background: ${C.card}; color: ${C.text}; border: 1px solid ${C.border}; }
.t2048-finish-btn:hover { border-color: ${C.accent}; }

/* ---- Snake ---- */
.snake-board-wrap {
  position: relative;
  display: inline-block;
  margin: 0 auto;
  width: 100%;
}
.snake-grid {
  display: grid;
  width: 100%;
  height: 100%;
  background: ${C.card};
  border: 2px solid ${C.border};
  border-radius: 12px;
  padding: 6px;
  gap: 1px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.snake-cell {
  border-radius: 2px;
  background: ${C.bg};
}
.snake-cell.snake-body { background: ${C.emerald}; border-radius: 3px; }
.snake-cell.snake-head { background: ${C.emerald}; border-radius: 4px; box-shadow: 0 0 8px ${ca('emerald','aa')}; }
.snake-cell.snake-food { background: ${C.gold}; border-radius: 50%; box-shadow: 0 0 8px ${ca('gold','aa')}; }
.snake-controls {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0.8rem auto 0;
}
.snake-controls button {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.5rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  transition: border-color 0.12s;
  white-space: nowrap;
}
.snake-controls button:hover { border-color: ${C.accent}; }
.snake-dpad {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  grid-template-rows: repeat(2, 56px);
  gap: 0.4rem;
  justify-content: center;
  margin: 0.9rem auto 0;
}
.snake-dpad button {
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  font-size: 1.2rem;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s;
}
.snake-dpad button:active { background: ${C.accent}; border-color: ${C.accent}; }
.snake-dpad .snake-dpad-up    { grid-column: 2; grid-row: 1; }
.snake-dpad .snake-dpad-left  { grid-column: 1; grid-row: 2; }
.snake-dpad .snake-dpad-down  { grid-column: 2; grid-row: 2; }
.snake-dpad .snake-dpad-right { grid-column: 3; grid-row: 2; }
.snake-start-overlay {
  position: absolute;
  inset: 0;
  background: ${ca('bg','cc')};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 5;
  cursor: pointer;
  color: ${C.text};
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}
.snake-lb-list { overflow-y: auto; max-height: 60vh; padding: 0.5rem 0; }
.snake-lb-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0.3rem;
  font-size: 0.85rem;
}
.snake-lb-row.snake-lb-me { background: ${ca('accent','1a')}; border-radius: 8px; }
.snake-lb-row .snake-lb-rank {
  font-family: 'JetBrains Mono', monospace;
  color: ${C.muted};
  width: 2.2rem;
  flex-shrink: 0;
  text-align: right;
}
.snake-lb-row .snake-lb-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snake-lb-row .snake-lb-score { font-family: 'JetBrains Mono', monospace; color: ${C.gold}; font-weight: 600; }
.snake-lb-divider { text-align: center; color: ${C.muted}; padding: 0.4rem 0; font-size: 0.8rem; letter-spacing: 0.2em; }
.snake-lb-empty { color: ${C.muted}; text-align: center; padding: 2rem 0; font-size: 0.9rem; }
.snake-pause-overlay {
  position: absolute;
  inset: 0;
  background: ${ca('bg','cc')};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.snake-pause-text {
  font-size: 2rem;
  font-weight: 700;
  color: ${C.gold};
  letter-spacing: 0.1em;
}

/* ---- Bounce (Breakout) ---- */
.bounce-board-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 3 / 4;
}
.bounce-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: ${C.bg};
  border: 2px solid ${C.border};
  border-radius: 12px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}
.bounce-start-overlay {
  position: absolute;
  inset: 0;
  background: ${ca('bg','cc')};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 5;
  cursor: pointer;
  color: ${C.text};
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}
.bounce-controls {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0.8rem auto 0;
}
.bounce-controls button {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.5rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  transition: border-color 0.12s;
  white-space: nowrap;
}
.bounce-controls button:hover { border-color: ${C.accent}; }
.bounce-audio-row {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0.7rem auto 0;
}
.bounce-audio-row button {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.4rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  transition: border-color 0.12s;
  white-space: nowrap;
}
.bounce-audio-row button:hover:not(:disabled) { border-color: ${C.accent}; }
.bounce-audio-row button:disabled { opacity: 0.4; cursor: default; }
.bounce-dpad {
  display: grid;
  grid-template-columns: repeat(2, 72px);
  gap: 0.6rem;
  justify-content: center;
  margin: 0.9rem auto 0;
}
.bounce-dpad button {
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  font-size: 1.3rem;
  height: 56px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s;
}
.bounce-dpad button:active { background: ${C.accent}; border-color: ${C.accent}; }

/* ---- Zuma ---- */
.zuma-wrap {
  position: relative;
  max-width: 300px;
  margin: 0 auto;
  aspect-ratio: 3 / 4;
}
.zuma-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: ${C.bg};
  border: 2px solid ${C.border};
  border-radius: 12px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: crosshair;
}

/* ---- Block Blast ---- */
.bb-board-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
}
.bb-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  background: ${C.border};
  border: 2px solid ${C.border};
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.bb-cell {
  aspect-ratio: 1;
  background: ${C.card};
  transition: background 0.08s ease;
}
.bb-cell.occupied { background: var(--bb-color); }
.bb-cell.ghost-valid { background: ${ca('accent','66')}; }
.bb-cell.ghost-invalid { background: ${ca('rose','44')}; }
.bb-score-delta {
  position: absolute;
  top: -1.4rem;
  right: 0.1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${C.emerald};
  pointer-events: none;
  animation: bb-float-up 700ms ease-out forwards;
  white-space: nowrap;
}
@keyframes bb-float-up {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-28px); }
}
.bb-tray {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  max-width: 360px;
  margin: 0.9rem auto 0;
  flex-wrap: wrap;
}
.bb-piece-btn {
  cursor: pointer;
  padding: 0.5rem;
  border: 2px solid ${C.border};
  border-radius: 10px;
  background: ${C.card};
  transition: border-color 0.12s, opacity 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 56px;
}
.bb-piece-btn:hover { border-color: ${C.accent}; }
.bb-piece-btn.selected { border-color: ${C.accent}; background: ${ca('accent','1a')}; }
.bb-piece-btn.used { opacity: 0.2; pointer-events: none; }
.bb-piece-grid {
  display: grid;
  gap: 2px;
}
.bb-piece-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--bb-color);
}
.bb-bottom-nav {
  display: flex;
  border-top: 1px solid ${C.border};
  background: ${C.surface};
  position: sticky;
  bottom: 0;
  margin: 1rem -1.25rem -1.5rem;
}
.bb-tab {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.82rem;
  border: none;
  background: transparent;
  color: ${C.muted};
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-top: 2px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.bb-tab.active { color: ${C.accent}; border-top-color: ${C.accent}; }
.bb-history-list { overflow-y: auto; max-height: 60vh; padding: 0.5rem 0; }
.bb-history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${C.border};
  padding: 0.55rem 0;
  font-size: 0.82rem;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.bb-best-row { color: ${C.gold}; font-weight: 600; }
.bb-empty-state {
  color: ${C.muted};
  text-align: center;
  padding: 2rem 0;
  font-size: 0.9rem;
}
/* ---- Tile Match ---- */
.tm-wrap { max-width: 400px; margin: 0 auto; }
.tm-wrap.fit-col { max-width: 520px; }
.tm-board-container {
  position: relative;
  margin: 0 auto;
  overflow: visible;
}
/* Today's layout + difficulty band (slice 8), so the shape and the weekly
   curve are legible before the first tap. */
.tm-daylabel {
  flex: 0 0 auto; text-align: center; color: ${C.muted};
  font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.tm-wrap.fit-col .tm-bar, .tm-wrap.fit-col .tm-bar-label,
.tm-wrap.fit-col .tm-boosters, .tm-wrap.fit-col .hint-bar { flex: 0 0 auto; }
.tm-tile {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.55rem;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.1s ease, opacity 0.12s ease, box-shadow 0.12s ease;
  border: 2px solid rgba(255,255,255,0.18);
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
}
.tm-tile.available:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
.tm-tile.locked { opacity: 0.35; cursor: default; pointer-events: none; filter: brightness(0.7); }
.tm-tile.flash {
  animation: tm-match-flash 0.35s ease forwards;
}
@keyframes tm-match-flash {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.25); opacity: 0.9; }
  100% { transform: scale(0);   opacity: 0; }
}
.tm-bar {
  display: flex;
  gap: 5px;
  justify-content: center;
  margin: 1rem auto 0;
  max-width: 360px;
  padding: 0.5rem;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 12px;
  transition: border-color 0.2s;
}
.tm-bar.bar-full { animation: tm-bar-flash 0.4s ease; border-color: ${C.rose}; }
@keyframes tm-bar-flash {
  0%, 100% { border-color: ${C.rose}; }
  50%  { border-color: ${C.rose}; box-shadow: 0 0 12px ${ca('rose','66')}; }
}
.tm-slot {
  width: 44px;
  height: 44px;
  border: 2px dashed ${C.dim};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.tm-slot.filled { border-style: solid; border-color: ${ca('accent','33')}; background: ${C.card}; }
.tm-slot.clear-target {
  cursor: pointer;
  border-color: ${C.rose};
  background: ${ca('rose','1a')};
  animation: tm-slot-pulse 0.7s ease infinite alternate;
}
.tm-slot.clear-target:hover { background: ${ca('rose','33')}; }
@keyframes tm-slot-pulse {
  from { box-shadow: 0 0 0 0 ${ca('rose','44')}; }
  to   { box-shadow: 0 0 0 4px ${ca('rose','00')}; }
}
.tm-bar-label {
  text-align: center;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
  margin-top: 0.3rem;
}
.tm-bar-label.full { color: ${C.rose}; font-weight: 600; }
.tm-boosters {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0.7rem auto 0;
}
.tm-booster-btn {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.45rem 0.3rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  transition: border-color 0.12s, background 0.12s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}
.tm-booster-btn:hover:not(:disabled) { border-color: ${C.accent}; background: ${ca('accent','10')}; }
.tm-booster-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.tm-booster-btn.active { border-color: ${C.rose}; background: ${ca('rose','15')}; }
.tm-booster-icon { font-size: 1rem; }
.tm-booster-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: ${C.muted};
}
.tm-level-select { max-width: 400px; margin: 0 auto; }
.tm-level-select h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.2rem; }
.tm-level-select p { font-size: 0.85rem; color: ${C.muted}; margin-bottom: 1rem; }
.tm-tier-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
  margin: 0.75rem 0 0.35rem;
  font-weight: 600;
}
.tm-level-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.25rem;
}
.tm-level-btn {
  aspect-ratio: 1;
  border-radius: 8px;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.muted};
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0;
}
.tm-level-btn:hover { border-color: ${C.accent}; color: ${C.text}; }
.tm-level-btn.selected { border-color: ${C.accent}; background: ${ca('accent','22')}; color: ${C.accent}; }
.tm-level-btn.done { border-color: ${ca('emerald','44')}; color: ${C.emerald}; }
.tm-level-btn.done.selected { border-color: ${C.emerald}; background: ${ca('emerald','22')}; }
.tm-level-btn .tm-check {
  position: absolute;
  top: 1px; right: 2px;
  font-size: 0.45rem;
  color: ${C.emerald};
}
.tm-play-btn {
  width: 100%;
  margin-top: 1rem;
  background: ${C.accent};
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.8rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
}
.tm-play-btn:hover { background: var(--c-accent-hover); }
.tm-level-won {
  background: ${C.card};
  border: 1px solid ${ca('emerald','55')};
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  max-width: 360px;
  margin: 0 auto;
}
.tm-level-won .trophy { font-size: 2.2rem; margin-bottom: 0.4rem; }
.tm-level-won h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.15rem; }
.tm-level-won .sub { color: ${C.muted}; font-size: 0.85rem; margin-bottom: 1rem; }
.tm-level-stats {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  border-top: 1px solid ${C.border};
  border-bottom: 1px solid ${C.border};
  padding: 0.75rem 0;
  margin-bottom: 1rem;
  text-align: left;
}
.tm-level-stat-row { display: flex; justify-content: space-between; padding: 0.15rem 0; }
.tm-level-stat-row .k { color: ${C.muted}; }
.tm-level-stat-row .v { color: ${C.gold}; font-weight: 600; }
.tm-level-won-btns { display: flex; gap: 0.6rem; }
.tm-next-btn {
  flex: 2;
  background: ${C.emerald};
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.7rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
}
.tm-next-btn:hover { background: var(--c-emerald-hover); }
.tm-end-btn {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.7rem;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.12s;
}
.tm-end-btn:hover { border-color: ${C.accent}; }
/* Timer pill */
.tm-timer-pill {
  transition: background 0.3s, color 0.3s;
}
.tm-timer-pill.warning {
  background: ${ca('rose','22')} !important;
  color: ${C.rose} !important;
  animation: tm-timer-pulse 0.9s ease infinite alternate;
}
@keyframes tm-timer-pulse {
  from { box-shadow: 0 0 0 0 ${ca('rose','33')}; }
  to   { box-shadow: 0 0 0 5px ${ca('rose','00')}; }
}
/* Tier overview */
.tm-tier-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tm-tier-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 12px;
  padding: 0.75rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  text-align: left;
}
.tm-tier-card:hover { border-color: ${C.accent}; background: ${ca('accent','0a')}; }
.tm-tier-card-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: ${C.text};
  margin-bottom: 0.15rem;
}
.tm-tier-card-range {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: ${C.muted};
  margin-bottom: 0.2rem;
}
.tm-tier-card-progress {
  font-size: 0.72rem;
  color: ${C.emerald};
  font-weight: 600;
}
/* Per-tier nav */
.tm-tier-back-btn {
  background: none;
  border: none;
  color: ${C.accent};
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0 0 0.5rem;
  display: inline-block;
}
.tm-tier-page-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
}
@media (max-width: 380px) {
  .tm-level-grid { grid-template-columns: repeat(10, 1fr); gap: 0.25rem; }
}

/* ============================================================
   Classic Games shared shell (.cg-*)
   ============================================================ */
.cg-shell {
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: ${C.bg};
  overflow: hidden;
  overscroll-behavior: none;
  z-index: 40;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  --cg-chrome: 3.6rem;
  --cg-board: min(94vw, calc(100dvh - var(--cg-chrome) - 5.5rem), 560px);
}
.cg-topbar {
  flex: 0 0 auto;
  height: var(--cg-chrome);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.7rem;
  border-bottom: 1px solid ${C.border};
  background: ${C.surface};
}
.cg-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: clamp(0.95rem, 3.5vw, 1.15rem);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cg-btn {
  flex: 0 0 auto;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  min-width: 2.4rem;
  height: 2.4rem;
  padding: 0 0.6rem;
  font-family: inherit;
  font-size: 1.05rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.cg-btn:hover { border-color: ${C.accent}; }
.cg-btn:active { background: ${ca('accent','22')}; }
.cg-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.5rem, 2vh, 1rem);
  padding: clamp(0.5rem, 2vh, 1rem) 0.6rem;
  overflow: hidden;
}
.cg-stage.cg-scroll { overflow-y: auto; justify-content: flex-start; }
.cg-statusbar {
  display: flex;
  gap: 0.5rem;
  width: var(--cg-board);
  max-width: 94vw;
}
.cg-stat {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.4rem 0.5rem;
  text-align: center;
  min-width: 0;
}
.cg-stat .l { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.08em; color: ${C.muted}; }
.cg-stat .v { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: clamp(0.9rem, 3.5vw, 1.15rem); margin-top: 0.05rem; }

/* Bottom sheet */
.cg-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: var(--c-scrim);
  z-index: 45;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.cg-sheet-backdrop.open { opacity: 1; pointer-events: auto; }
.cg-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 46;
  background: ${C.surface};
  border-top: 1px solid ${C.border};
  border-radius: 18px 18px 0 0;
  padding: 0.5rem 1rem calc(1rem + env(safe-area-inset-bottom));
  max-height: 82dvh;
  overflow-y: auto;
  transform: translateY(110%);
  transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1);
}
.cg-sheet.open { transform: translateY(0); }
.cg-sheet-handle { width: 2.5rem; height: 0.28rem; border-radius: 999px; background: ${C.dim}; margin: 0.35rem auto 0.8rem; }
.cg-sheet-tabs { display: flex; gap: 0.35rem; margin-bottom: 0.8rem; }
.cg-sheet-tab {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.muted};
  border-radius: 10px;
  padding: 0.5rem 0.3rem;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.cg-sheet-tab.active { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.cg-sheet h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.6rem; }
.cg-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0;
  border-bottom: 1px solid ${C.border};
}
.cg-setting-row:last-child { border-bottom: none; }
.cg-setting-row .name { font-size: 0.9rem; }
.cg-settings-h4-spaced { margin-top: 1.15rem; }

/* ---- Theme picker (light / dark / system) ---- */
.theme-choice { margin: 0.35rem 0 0.2rem; }
.theme-seg {
  display: flex;
  gap: 0.35rem;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.25rem;
}
.theme-seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${C.muted};
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.45rem 0.3rem;
  cursor: pointer;
  white-space: nowrap;
}
.theme-seg-btn:hover { color: ${C.text}; }
.theme-seg-btn.active {
  background: ${C.card};
  border-color: ${C.accent};
  color: ${C.accent};
}
.theme-seg-icon { font-size: 0.95rem; line-height: 1; }
.theme-caption {
  margin-top: 0.5rem;
  font-size: 0.74rem;
  color: ${C.muted};
  line-height: 1.35;
}

/* ---- Global Settings sheet ---- */
.settings-panel { height: min(58vh, 460px); }
.settings-list { padding: 0.9rem 1.1rem 1.4rem; }
.settings-list h4 {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${C.muted};
  margin-bottom: 0.5rem;
}
/* Icon-only nav gear. Deliberately NOT in the mobile-hide rule that hides
   .nav-friends-btn — the theme control must stay reachable on phones. */
.nav-settings-btn {
  background: transparent;
  border: 1px solid ${C.border};
  color: ${C.muted};
  border-radius: 8px;
  padding: 0.3rem 0.5rem;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}
.nav-settings-btn:hover { color: ${C.text}; border-color: ${C.accent}; }
.cg-toggle {
  width: 2.8rem;
  height: 1.5rem;
  border-radius: 999px;
  background: ${C.dim};
  border: none;
  position: relative;
  cursor: pointer;
  transition: background 0.15s ease;
  flex: 0 0 auto;
}
.cg-toggle.on { background: ${C.emerald}; }
.cg-toggle::after {
  content: '';
  position: absolute;
  top: 0.18rem;
  left: 0.18rem;
  width: 1.14rem;
  height: 1.14rem;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}
.cg-toggle.on::after { transform: translateX(1.3rem); }
.cg-sheet-list { max-height: 50dvh; overflow-y: auto; }
.cg-sheet-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${C.border};
  font-size: 0.82rem;
}
.cg-sheet-empty { color: ${C.muted}; text-align: center; padding: 1.5rem 0; font-size: 0.9rem; }
.cg-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.cg-stat-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px; padding: 0.7rem; text-align: center; }
.cg-stat-card .val { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 700; color: ${C.gold}; }
.cg-stat-card .lbl { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; color: ${C.muted}; margin-top: 0.15rem; }
.cg-rules { font-size: 0.86rem; line-height: 1.5; color: ${C.text}; }
.cg-rules li { margin: 0.3rem 0 0.3rem 1rem; }
.cg-sheet-action {
  width: 100%;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.7rem;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 0.5rem;
}
.cg-sheet-action:hover { border-color: ${C.accent}; }

/* Game Menu (Menu tab) */
.cg-menu-section { display: flex; flex-direction: column; gap: 0.4rem; }
.cg-menu-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: ${C.muted}; }
.cg-mode-pill {
  flex: 0 0 auto;
  font-size: 0.62rem;
  font-weight: 600;
  background: ${ca('accent','22')};
  color: ${C.accent};
  border: 1px solid ${ca('accent','55')};
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  margin-left: 0.4rem;
  white-space: nowrap;
}
.cg-resume-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: var(--cg-board);
  max-width: 94vw;
  background: ${ca('gold','14')};
  border: 1px solid ${ca('gold','55')};
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  color: ${C.text};
}
.cg-resume-actions { display: flex; gap: 0.4rem; flex: 0 0 auto; }
.cg-resume-actions button {
  background: ${C.gold};
  color: #1a1205;
  border: none;
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
.cg-resume-actions button.ghost { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; }
.cg-onchain-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-left: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${C.accent};
  text-decoration: none;
  opacity: 0.85;
}
.cg-onchain-badge:hover { opacity: 1; text-decoration: underline; }

/* Keep existing classic boards fitting inside the shell stage */
.cg-stage .ms-grid, .cg-stage .t2048-board-wrap { max-width: min(360px, var(--cg-board)) !important; }
.cg-stage .mnc-board { max-width: min(480px, var(--cg-board)) !important; }
.cg-stage .ms-bottom-nav, .cg-stage .mnc-bottom-nav, .cg-stage .t2048-bottom-nav { display: none; }
/* PHASE 3 — the five phase-5 board games hardcoded width: min(92vw, 340–380px)
   and ignored --cg-board, so board + status + legend + leaderboard was always
   taller than a phone and you had to scroll to see whose turn it was. Same
   pattern the three older classics above already used. */
.cg-stage .ck-board, .cg-stage .rv-board, .cg-stage .gmk-board,
.cg-stage .ludo-board { max-width: min(380px, var(--cg-board)) !important; }
.cg-stage .fir-board { max-width: min(340px, var(--cg-board)) !important; }
/* The board-game rooms stack status + board + legend + leaderboard, so cap the
   text chrome too — the board fitting is only half of "no scrolling to see
   whose turn it is". */
.brg-legend { font-size: 0.74rem; }

/* ---- Snake ---- */
.snake-board {
  width: var(--cg-board);
  height: var(--cg-board);
  max-width: 94vw;
  max-height: 94vw;
  display: grid;
  background: ${C.surface};
  border: 2px solid ${C.border};
  border-radius: 12px;
  overflow: hidden;
  touch-action: none;
  position: relative;
}
.snake-cell { width: 100%; height: 100%; }
.snake-cell.body { background: ${C.emerald}; border-radius: 3px; }
.snake-cell.head { background: ${C.accent}; border-radius: 4px; }
.snake-cell.food { background: ${C.rose}; border-radius: 50%; transform: scale(0.8); }
.snake-hint { color: ${C.muted}; font-size: 0.8rem; text-align: center; }

/* ---- Block Blast ---- */
.bb-grid {
  width: var(--cg-board);
  height: var(--cg-board);
  max-width: 94vw;
  max-height: 94vw;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  background: ${C.surface};
  border: 2px solid ${C.border};
  border-radius: 12px;
  padding: 4px;
  touch-action: none;
}
.bb-cell { background: ${C.bg}; border-radius: 4px; aspect-ratio: 1; transition: background 0.1s ease; }
.bb-cell.filled { background: ${C.accent}; }
.bb-cell.preview { background: ${ca('accent','66')}; }
.bb-cell.invalid { background: ${ca('rose','55')}; }
.bb-tray {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  align-items: center;
  width: var(--cg-board);
  max-width: 94vw;
  min-height: 5rem;
}
.bb-piece {
  display: grid;
  gap: 2px;
  cursor: grab;
  touch-action: none;
  padding: 0.3rem;
}
.bb-piece.dragging { opacity: 0.3; }
.bb-piece.used { opacity: 0; pointer-events: none; }
.bb-pcell { width: clamp(0.7rem, 3.5vw, 1.1rem); height: clamp(0.7rem, 3.5vw, 1.1rem); border-radius: 3px; }
.bb-pcell.on { background: ${C.accent}; }
.bb-drag-ghost { position: fixed; z-index: 60; pointer-events: none; display: grid; gap: 2px; opacity: 0.9; }
.bb-drag-ghost .bb-pcell.on { background: ${C.gold}; }

/* ---- Match 3 (PHASE 8) ----
   These rules existed under a .tm-grid prefix and were DEAD — nothing in the
   app ever rendered that class. Match 3 was the only game in the registry with
   no design system at all: hand-written inline styles, plain coloured blocks,
   a bare Bar: label. Renamed to .m3-* and actually wired up, which also earns
   it the Phase 2 touch-action/press rules and the Phase 3 fit sizing. */
.m3-grid {
  width: var(--cg-board);
  max-width: 94vw;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(3px, 1vw, 6px);
  touch-action: manipulation;
}
.m3-tile {
  aspect-ratio: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1.1rem, 5vw, 1.8rem);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  padding: 0;
  font-family: inherit;
  transition: transform 0.1s ease, background 0.1s ease, opacity 0.18s ease;
}
.m3-tile.sel { background: ${ca('accent','44')}; border-color: ${C.accent}; transform: scale(0.92); }
.m3-tile.gone { opacity: 0.22; pointer-events: none; cursor: default; }
.m3-bar {
  width: var(--cg-board);
  max-width: 94vw;
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.7rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 12px;
}
.m3-bar.full { border-color: ${C.rose}; }
.m3-bar-label {
  font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: ${C.muted}; font-weight: 700; margin-right: 0.2rem;
}
.m3-bar-label.full { color: ${C.rose}; }
.m3-bar-tile {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.05rem;
}
.m3-bar-empty { color: ${C.muted}; font-size: 0.82rem; }
.m3-level {
  padding: 0.85rem 0.6rem; min-height: 62px;
  background: ${C.card}; color: ${C.text};
  border: 1px solid ${C.border}; border-radius: 12px;
  font-family: inherit; cursor: pointer; text-align: center;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.m3-level:active { transform: scale(0.98); }
.m3-level.solved { border-color: ${C.emerald}; color: ${C.emerald}; }
.m3-level.locked { opacity: 0.45; cursor: not-allowed; color: ${C.muted}; }
.m3-level.locked:active { transform: none; }
.m3-level-id { font-weight: 700; font-size: 1rem; }
.m3-level-name { font-size: 0.72rem; margin-top: 0.2rem; color: ${C.muted}; }

/* ---- Diamond Rush ---- */
.dr-grid {
  width: var(--cg-board);
  height: var(--cg-board);
  max-width: 94vw;
  max-height: 94vw;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  background: ${C.surface};
  border: 2px solid ${C.border};
  border-radius: 12px;
  padding: 4px;
  touch-action: none;
}
.dr-gem {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.9rem, 4vw, 1.5rem);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  aspect-ratio: 1;
  transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
}
.dr-gem.sel { outline: 2px solid #fff; transform: scale(0.86); }
.dr-gem.clearing { opacity: 0; transform: scale(0.4); }
.dr-gem.bomb {
  background: rgba(255, 193, 7, 0.15);
  box-shadow: 0 0 12px rgba(255, 193, 7, 0.4);
  animation: dr-glow-bomb 1.5s ease-in-out infinite;
}
.dr-gem.lightning {
  background: rgba(100, 200, 255, 0.15);
  box-shadow: 0 0 12px rgba(100, 200, 255, 0.6);
  animation: dr-glow-lightning 1.2s ease-in-out infinite;
}
.dr-gem.rainbow {
  background: linear-gradient(45deg, rgba(255, 0, 127, 0.15), rgba(0, 200, 255, 0.15));
  box-shadow: 0 0 15px rgba(200, 100, 255, 0.5);
  animation: dr-glow-rainbow 1.8s ease-in-out infinite;
}
@keyframes dr-glow-bomb { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
@keyframes dr-glow-lightning { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
@keyframes dr-glow-rainbow { 0%, 100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(60deg); } }
.dr-gem.hint-target { outline: 3px solid ${C.gold}; animation: hintPulse 0.6s ease-in-out; }
@keyframes hintPulse { 0%, 100% { box-shadow: 0 0 8px ${C.gold}; } 50% { box-shadow: 0 0 16px ${C.gold}; } }
.dr-powerups-bar {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  width: var(--cg-board);
  max-width: 94vw;
  margin-top: 0.8rem;
}
.dr-powerup-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.5rem 0.6rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  flex: 1;
  max-width: 90px;
}
.dr-powerup-btn.owned:not(:disabled) { border-color: ${C.accent}; background: ${ca('accent','14')}; }
.dr-powerup-btn.owned:not(:disabled):hover { border-color: ${C.gold}; background: ${ca('gold','22')}; }
.dr-powerup-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.dr-powerup-btn .icon { font-size: 1.4rem; line-height: 1; }
.dr-powerup-btn .count { font-size: 0.65rem; color: ${C.muted}; }
.dr-time-boost {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.8rem;
  font-weight: 700;
  color: ${C.gold};
  animation: timeBounce 1s ease-out;
  pointer-events: none;
  z-index: 50;
}
@keyframes timeBounce { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); } 100% { opacity: 0; transform: translate(-50%, -150%) scale(1); } }

@media (orientation: landscape) and (max-height: 560px) {
  .cg-shell { --cg-board: min(70vh, 44vw, 460px); }
  .cg-stage { flex-direction: row; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .cg-sheet, .m3-tile, .dr-gem, .snake-cell { transition: none !important; }
  .badge-strip-body, .badge-chevron { transition: none !important; }
  /* PHASE 6 — the block used to cover four selectors, one of which (.tm-grid)
     was dead CSS. A player who asks their phone to calm animations down now
     actually gets that everywhere, including the two animations this phase
     adds (the 2048 tile slide and the Marble Loop insertion, which falls back
     to the old instant splice). */
  .t2048-tile, .t2048-tile.is-new, .t2048-tile.is-merged,
  .tm-tile, .tm-tile.flash, .cw-row.shake,
  .mnc-pit.mnc-flash, .mnc-pit.mnc-capture-flash,
  .tm-bar.bar-full, .mj-tile, .mj-tile.nudge, .ce-card,
  .cnl-roll-btn, .gm-mode-btn, .ng-mode-btn, .mf-mode-btn {
    animation: none !important;
    transition: none !important;
  }
  /* Keep the colour half of a press (the affordance) and drop the movement. */
  .tappable:active, .tappable[data-pressed],
  .mj-tile:active, .wspr-tile:active, .ce-card:active, .scell:active,
  .numkey:active, .wcell:active, .cw-key:active, .ms-cell:active,
  .mnc-pit:active, .kt-cell:active, .ck-cell:active, .rv-cell:active,
  .fir-cell:active, .gmk-cell:active, .ludo-token:active, .an-tile:active,
  .an-slot:active, .tm-tile:active, .m3-tile:active { transform: none !important; }
  .ce-card.selected { transform: none !important; }
}

/* ---- Knight's Tour ---- */
.kt-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.kt-board {
  display: grid;
  /* #176 — the board is 5x5 to 8x8 now, so the column count comes from the
     component via --kt-size rather than being baked in at 8. */
  grid-template-columns: repeat(var(--kt-size, 8), 1fr);
  max-width: 480px;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid ${C.border};
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
}
/* A square the knight may not enter. Reads as part of the board rather than as
   a missing cell, so a blocked-square board still looks like a chessboard. */
.kt-cell.kt-blocked {
  background: ${C.well};
  background-image: repeating-linear-gradient(45deg,
    transparent 0 4px, ${ca('muted', '33')} 4px 8px);
  cursor: not-allowed;
}
.kt-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.1s ease;
  font-family: 'JetBrains Mono', monospace;
}
.kt-cell.kt-light { background: ${C.surface}; }
.kt-cell.kt-dark  { background: ${C.card}; }
.kt-cell.kt-valid { background: ${ca('accent','33')}; cursor: pointer; }
.kt-cell.kt-valid:hover { background: ${ca('accent','55')}; }
.kt-cell.kt-current { background: ${ca('accent','22')}; outline: 2px solid ${C.accent}; outline-offset: -2px; }
.kt-cell.kt-visited { cursor: default; }
.kt-knight { font-size: 1.35rem; line-height: 1; user-select: none; }
.kt-num { font-size: 0.58rem; color: ${C.muted}; font-weight: 600; line-height: 1; }
.kt-actions { display: flex; gap: 0.75rem; width: 100%; max-width: 480px; }
.kt-undo-btn {
  flex: 1;
  padding: 0.7rem;
  background: ${C.surface};
  color: ${C.text};
  border: 1px solid ${C.border};
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.kt-undo-btn:hover:not(:disabled) { border-color: ${C.accent}; }
.kt-undo-btn:disabled { opacity: 0.35; cursor: default; }
.kt-new-btn {
  flex: 1;
  padding: 0.7rem;
  background: ${C.surface};
  color: ${C.rose};
  border: 1px solid ${ca('rose','44')};
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.kt-new-btn:hover { border-color: ${C.rose}; }
.kt-stuck-banner { color: ${C.rose}; font-size: 0.85rem; font-weight: 600; text-align: center; }
.kt-hint { color: ${C.muted}; font-size: 0.82rem; text-align: center; margin-top: 0.25rem; }
.kt-history-list { overflow-y: auto; max-height: 60vh; padding: 0.5rem 0; }
.kt-history-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid ${ca('border','22')};
}
.kt-history-row.kt-row-new { background: ${ca('accent','11')}; border-radius: 6px; }
.kt-rank { font-size: 0.75rem; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; min-width: 2rem; }
.kt-best { font-size: 0.82rem; color: ${C.gold}; margin-bottom: 0.75rem; text-align: center; font-weight: 600; }
.kt-empty { color: ${C.muted}; text-align: center; padding: 2.5rem 0; font-size: 0.9rem; }
.kt-bottom-nav { display: flex; border-top: 1px solid ${C.border}; margin-top: 0.75rem; }
.kt-tab {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  color: ${C.muted};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.12s ease;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.kt-tab.active { color: ${C.accent}; border-top: 2px solid ${C.accent}; margin-top: -1px; }
/* ---- Diamond Rush ---- */
.dr-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.dr-select { width: 100%; max-width: 520px; text-align: center; }
.dr-select h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.35rem; }
.dr-select p { color: ${C.muted}; font-size: 0.9rem; margin-bottom: 1.2rem; }
.dr-level-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 0.7rem; margin-bottom: 1.3rem;
}
.dr-level-btn {
  position: relative; aspect-ratio: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.15rem;
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  color: ${C.text}; font-weight: 700; font-size: 1.1rem; cursor: pointer;
  transition: border-color 0.12s ease, transform 0.08s ease;
}
.dr-level-btn:not(.locked):hover { border-color: ${C.gold}; transform: translateY(-2px); }
.dr-level-btn.selected { border-color: ${C.gold}; box-shadow: 0 0 0 2px ${ca('gold','55')}; }
.dr-level-btn.locked { opacity: 0.4; cursor: not-allowed; }
.dr-level-btn.done { border-color: ${C.emerald}; }
.dr-level-meta { font-size: 0.62rem; font-weight: 500; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; }
.dr-check { color: ${C.emerald}; font-size: 0.7rem; }
.dr-lock-icon { font-size: 0.85rem; }
.dr-play-btn {
  width: 100%; padding: 0.85rem; background: ${C.gold}; color: #1a1206;
  border: none; border-radius: 12px; font-weight: 700; font-size: 1rem;
  cursor: pointer; transition: filter 0.12s ease;
}
.dr-play-btn:hover { filter: brightness(1.08); }
.dr-play-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dr-toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.dr-tool-btn {
  padding: 0.5rem 0.9rem; background: ${C.surface}; color: ${C.text};
  border: 1px solid ${C.border}; border-radius: 10px; font-weight: 600;
  font-size: 0.85rem; cursor: pointer; transition: border-color 0.12s ease;
}
.dr-tool-btn:hover { border-color: ${C.accent}; }
.dr-board {
  display: grid; gap: 2px; background: ${C.border}; padding: 4px;
  border-radius: 12px; touch-action: none; user-select: none;
  max-width: 92vw;
}
.dr-cell {
  display: flex; align-items: center; justify-content: center;
  background: ${C.surface}; border-radius: 4px; position: relative;
  font-size: clamp(14px, 5vw, 26px); line-height: 1;
}
.dr-cell.wall { background: ${C.dim}; }
.dr-cell.exit { background: ${ca('accent','33')}; }
.dr-cell.trap { background: ${ca('rose','22')}; }
.dr-cell.floor { background: ${C.surface}; }
.dr-sprite { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.dr-hero { z-index: 3; }
.dr-enemy { z-index: 2; }
.dr-dpad {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  grid-template-rows: repeat(3, 56px);
  gap: 0.35rem; justify-content: center;
}
.dr-dbtn {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px;
  color: ${C.text}; font-size: 1.3rem; cursor: pointer; display: flex;
  align-items: center; justify-content: center; touch-action: manipulation;
}
.dr-dbtn:active { background: ${C.accent}; }
.dr-dpad .up { grid-column: 2; grid-row: 1; }
.dr-dpad .left { grid-column: 1; grid-row: 2; }
.dr-dpad .right { grid-column: 3; grid-row: 2; }
.dr-dpad .down { grid-column: 2; grid-row: 3; }
.dr-overlay-panel {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.8rem;
  background: ${ca('bg','cc')}; border-radius: 12px; z-index: 5;
}
.dr-board-shell { position: relative; }
.dr-paused-msg { font-weight: 700; font-size: 1.1rem; color: ${C.gold}; }
.dr-end {
  text-align: center; display: flex; flex-direction: column; align-items: center;
  gap: 0.6rem; padding: 1.5rem 0; width: 100%; max-width: 420px;
}
.dr-end .dr-emoji { font-size: 3rem; }
.dr-end h3 { font-size: 1.4rem; font-weight: 700; }
.dr-end .dr-stats { color: ${C.muted}; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
.dr-end-btns { display: flex; flex-direction: column; gap: 0.55rem; width: 100%; margin-top: 0.5rem; }
.dr-hint { color: ${C.muted}; font-size: 0.8rem; }

/* ---- Tile Match Puzzle menu & competitive tabs ---- */
.tm-menu { display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; width: 100%; }
.tm-menu-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0 0.6rem; gap: 0.5rem;
}
.tm-menu-header h2 { font-size: 1rem; font-weight: 700; margin: 0; flex: 1; }
.tm-menu-tabs {
  display: flex; gap: 0.15rem;
  border-bottom: 1px solid ${C.border};
  margin-bottom: 0.9rem; overflow-x: auto;
}
.tm-menu-tab {
  background: none; border: none; border-bottom: 2px solid transparent;
  padding: 0.45rem 0.75rem; font-family: inherit; font-size: 0.85rem;
  font-weight: 500; color: ${C.muted}; cursor: pointer;
  transition: color 0.12s, border-color 0.12s; white-space: nowrap;
  margin-bottom: -1px;
}
.tm-menu-tab:hover { color: ${C.text}; }
.tm-menu-tab.active { color: ${C.accent}; border-bottom-color: ${C.accent}; font-weight: 600; }

/* Leaderboard */
.tm-lb-tabs { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; }
.tm-lb-sub-tab {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 8px;
  padding: 0.3rem 0.7rem; font-family: inherit; font-size: 0.8rem;
  font-weight: 500; color: ${C.muted}; cursor: pointer; transition: all 0.12s;
}
.tm-lb-sub-tab.active { background: ${ca('accent','18')}; border-color: ${C.accent}; color: ${C.accent}; font-weight: 600; }
.tm-lb-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.45rem 0.5rem; border-radius: 8px;
  font-size: 0.84rem; transition: background 0.1s;
}
.tm-lb-row:hover { background: ${C.surface}; }
.tm-lb-row.me { background: ${ca('accent','12')}; border: 1px solid ${ca('accent','30')}; margin-top: 0.4rem; }
.tm-lb-rank { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: ${C.gold}; min-width: 1.8rem; font-size: 0.78rem; }
.tm-lb-name { flex: 1; color: ${C.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-lb-stat { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: ${C.accent}; font-weight: 600; }
.tm-lb-empty { color: ${C.muted}; font-size: 0.85rem; text-align: center; padding: 1.5rem 0; }

/* Duel Arena */
.tm-duel-tiers { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
.tm-duel-tier-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;
}
.tm-duel-tier-card .tm-duel-stake { font-size: 1.1rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: ${C.gold}; min-width: 5rem; }
.tm-duel-tier-card .tm-duel-payout { flex: 1; font-size: 0.82rem; color: ${C.muted}; }
.tm-duel-tier-card .tm-duel-payout strong { color: ${C.emerald}; }
.tm-duel-find-btn {
  background: ${C.accent}; color: #fff; border: none; border-radius: 8px;
  padding: 0.45rem 0.85rem; font-family: inherit; font-size: 0.83rem;
  font-weight: 600; cursor: pointer; transition: background 0.12s;
}
.tm-duel-find-btn:hover:not(:disabled) { background: var(--c-accent-hover); }
.tm-duel-find-btn:disabled { opacity: 0.35; cursor: not-allowed; background: ${C.muted}; }
.tm-duel-matchmaking {
  text-align: center; padding: 2rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.tm-duel-pulse {
  width: 3rem; height: 3rem; border-radius: 50%;
  background: ${ca('accent','33')}; border: 2px solid ${C.accent};
  animation: tm-duel-pulse-anim 1.2s ease-in-out infinite;
}
@keyframes tm-duel-pulse-anim {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.6; }
}
.tm-duel-timer { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; color: ${C.accent}; }
.tm-duel-result {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px;
  padding: 1.25rem; text-align: center;
}
.tm-duel-result .tm-duel-outcome { font-size: 1.6rem; margin-bottom: 0.2rem; }
.tm-duel-result h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; }
.tm-duel-result .tm-duel-balance { font-family: 'JetBrains Mono', monospace; color: ${C.gold}; font-size: 0.9rem; margin-bottom: 0.5rem; }
.tm-duel-back-btn {
  margin-top: 0.75rem; background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 8px; padding: 0.5rem 1rem; font-family: inherit;
  font-size: 0.85rem; color: ${C.text}; cursor: pointer; transition: border-color 0.12s;
}
.tm-duel-back-btn:hover { border-color: ${C.accent}; }

/* Daily Tasks */
.tm-task-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  padding: 0.85rem 1rem; margin-bottom: 0.6rem;
}
.tm-task-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }
.tm-task-label { font-weight: 600; font-size: 0.9rem; }
.tm-task-reward { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: ${C.gold}; font-weight: 600; }
.tm-task-desc { font-size: 0.8rem; color: ${C.muted}; margin-bottom: 0.55rem; }
.tm-task-bar-wrap { background: ${C.surface}; border-radius: 4px; height: 5px; margin-bottom: 0.5rem; }
.tm-task-bar-fill { height: 5px; border-radius: 4px; background: ${C.accent}; transition: width 0.3s; }
.tm-task-footer { display: flex; align-items: center; justify-content: space-between; }
.tm-task-progress-lbl { font-size: 0.76rem; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; }
.tm-task-claim-btn {
  background: ${C.emerald}; color: #fff; border: none; border-radius: 7px;
  padding: 0.3rem 0.75rem; font-family: inherit; font-size: 0.8rem;
  font-weight: 600; cursor: pointer; transition: background 0.12s;
}
.tm-task-claim-btn:hover:not(:disabled) { background: var(--c-emerald-hover); }
.tm-task-claim-btn:disabled { opacity: 0.4; cursor: not-allowed; background: ${C.muted}; }
.tm-task-claimed { font-size: 0.8rem; color: ${C.emerald}; font-weight: 600; }
.tm-tasks-all-done {
  text-align: center; padding: 1.5rem 0;
  color: ${C.muted}; font-size: 0.88rem;
}

/* ---- Wallet screen ---- */
.wallet-screen {
  max-width: 540px; margin: 0 auto; padding: 1.5rem 1.25rem;
}
.wallet-screen h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1.25rem; }
.wallet-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px;
  padding: 1.25rem; margin-bottom: 1rem;
}
.wallet-card-title {
  font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em;
  color: ${C.muted}; margin-bottom: 0.6rem;
}
.wallet-addr {
  font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
  color: ${C.text}; word-break: break-all; flex: 1;
}
.wallet-addr-row {
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
}
.wallet-no-wallet {
  text-align: center; padding: 2rem 1rem; color: ${C.muted}; font-size: 0.9rem;
}
.wallet-btn-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }
/* ---- DApp Mode ---- */
.dapp-badge {
  display: inline-flex; align-items: center; gap: 0.4rem; width: 100%;
  justify-content: center; margin: 0.6rem 0; padding: 0.5rem 0.7rem;
  background: ${ca('emerald','1a')}; border: 1px solid ${ca('emerald','66')}; color: ${C.emerald};
  border-radius: 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.dapp-badge.disputed { background: ${ca('rose','1a')}; border-color: ${ca('rose','66')}; color: ${C.rose}; }
.dapp-badge-arrow { margin-left: auto; opacity: 0.7; }
.dapp-badge-dot { font-size: 0.9rem; }
.dapp-verified-pill {
  font-size: 0.62rem; font-weight: 600; color: ${C.emerald};
  background: ${ca('emerald','1a')}; border: 1px solid ${ca('emerald','55')}; border-radius: 999px;
  padding: 0.05rem 0.45rem; margin-left: 0.4rem; vertical-align: middle;
}
.dapp-verdict { border-radius: 0.6rem; padding: 0.7rem 0.85rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.85rem; }
.dapp-verdict.ok  { background: ${ca('emerald','1a')}; border: 1px solid ${ca('emerald','66')}; color: ${C.emerald}; }
.dapp-verdict.bad { background: ${ca('rose','1a')}; border: 1px solid ${ca('rose','66')}; color: ${C.rose}; }
.dapp-verdict-reason { font-weight: 400; font-size: 0.76rem; color: ${C.muted}; margin-top: 0.35rem; }
.dapp-kv { display: flex; justify-content: space-between; gap: 0.6rem; font-size: 0.82rem; padding: 0.2rem 0; color: ${C.text}; }
.dapp-kv span:first-child { color: ${C.muted}; }
.dapp-hash { font-size: 0.72rem; color: ${C.text}; word-break: break-all; line-height: 1.45; }
.dapp-ledger { display: flex; flex-direction: column; gap: 0.25rem; max-height: 9rem; overflow-y: auto; }
.dapp-ledger-row { display: flex; gap: 0.6rem; font-size: 0.72rem; }
.dapp-ledger-seq { color: ${C.muted}; min-width: 2.5rem; }
.dapp-ledger-hash { color: ${C.accent}; }
.dapp-lrow { width: 100%; background: none; border: none; cursor: pointer; text-align: left; }
.dapp-identity-badge {
  display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 600;
  color: ${C.emerald}; background: ${ca('emerald','1a')}; border: 1px solid ${ca('emerald','55')};
  border-radius: 999px; padding: 0.15rem 0.55rem; margin-left: 0.5rem;
}
.dapp-identity-badge.unproven { color: ${C.muted}; background: ${ca('dim','33')}; border-color: ${C.dim}; }
.dapp-wallet-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.6rem; }

/* ---- Badge progress pills (profile BadgeStrip + win overlay) ---- */
.badge-progress { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 0.7rem; }
.badge-progress-pill {
  font-size: 0.72rem; font-weight: 600; color: ${C.muted};
  background: ${ca('gold','0d')}; border: 1px solid ${ca('gold','33')};
  border-radius: 999px; padding: 0.2rem 0.55rem;
  display: inline-flex; gap: 0.3rem; align-items: center; white-space: nowrap;
}
/* Win overlay next-milestone progress. */
.win-progress { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; margin: 0.6rem 0; }
/* ---- Phase 5 board games (Checkers / Reversi / Four in a Row / Gomoku / Ludo) ---- */
.brg-intro {
  font-size: 0.85rem; color: ${C.text}; background: ${ca('accent','14')};
  border: 1px solid ${ca('accent','44')}; border-radius: 10px;
  padding: 0.6rem 0.8rem; margin-bottom: 0.9rem; text-align: center;
}
.brg-note {
  text-align: center; font-size: 0.8rem; color: ${C.gold}; margin: 0.4rem 0;
  display: flex; gap: 0.8rem; justify-content: center; align-items: center; flex-wrap: wrap;
}
.brg-legend {
  display: flex; gap: 0.9rem; justify-content: center; align-items: center;
  font-size: 0.72rem; color: ${C.muted}; margin-top: 0.6rem; flex-wrap: wrap;
}
.brg-legend > span { display: inline-flex; align-items: center; gap: 0.3rem; }

.ck-board {
  display: grid; grid-template-columns: repeat(8, 1fr);
  width: min(92vw, 360px); aspect-ratio: 1; margin: 0 auto;
  border: 2px solid ${C.border}; border-radius: 8px; overflow: hidden;
}
.ck-cell { background: #d8c49a; display: flex; align-items: center; justify-content: center; }
.ck-cell.dark { background: #7a5a3a; cursor: pointer; }
.ck-cell.sel { box-shadow: inset 0 0 0 3px ${C.gold}; }
.ck-piece {
  width: 74%; height: 74%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; color: #ffffffcc;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.35);
}
.ck-piece.p1 { background: ${C.accent}; }
.ck-piece.p2 { background: #2b2f3d; border: 1px solid #555; }
.ck-piece-mini { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 50%; }
.ck-piece-mini.p1 { background: ${C.accent}; }
.ck-piece-mini.p2 { background: #2b2f3d; border: 1px solid #555; }

.rv-board {
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;
  width: min(92vw, 360px); aspect-ratio: 1; margin: 0 auto;
  background: ${C.border}; border: 2px solid ${C.border}; border-radius: 8px; overflow: hidden;
}
.rv-cell { background: #1d5c3a; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.rv-disc { width: 76%; height: 76%; border-radius: 50%; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.3); }
.rv-disc.d1, .rv-disc-mini.d1 { background: #171a24; border: 1px solid #444; }
.rv-disc.d2, .rv-disc-mini.d2 { background: #f2f0e8; }
.rv-disc-mini { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 50%; }
.rv-count { display: inline-flex; align-items: center; gap: 0.3rem; color: ${C.text}; font-weight: 600; }

.fir-board {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
  width: min(92vw, 340px); margin: 0 auto; padding: 8px;
  background: #22335e; border-radius: 12px;
}
.fir-cell {
  aspect-ratio: 1; background: ${C.bg}; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.fir-cell.last { box-shadow: 0 0 0 2px ${C.gold}; }
.fir-disc { width: 86%; height: 86%; border-radius: 50%; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.3); }
.fir-disc.d1, .fir-disc-mini.d1 { background: ${C.rose}; }
.fir-disc.d2, .fir-disc-mini.d2 { background: ${C.gold}; }
.fir-disc-mini { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 50%; }

.gmk-scroll { overflow-x: auto; }
.gmk-board {
  display: grid; grid-template-columns: repeat(15, 1fr); gap: 1px;
  width: min(92vw, 380px); aspect-ratio: 1; margin: 0 auto;
  background: ${C.border}; border: 2px solid ${C.border}; border-radius: 6px; overflow: hidden;
}
.gmk-cell { background: #b08b4f; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.gmk-cell.last { box-shadow: inset 0 0 0 2px ${C.gold}; }
.gmk-stone { width: 78%; height: 78%; border-radius: 50%; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.3); }
.gmk-stone.s1 { background: #171a24; }
.gmk-stone.s2 { background: #f2f0e8; }

.ludo-board {
  display: grid; grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr);
  width: min(92vw, 380px); aspect-ratio: 1; margin: 0 auto;
  background: ${C.surface}; border: 2px solid ${C.border}; border-radius: 10px;
  position: relative; padding: 2px; gap: 1px;
}
.ludo-cell {
  border-radius: 3px; display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; color: ${C.muted};
}
.ludo-cell.ring { background: ${C.card}; border: 1px solid ${C.border}; }
.ludo-cell.ring.safe { color: ${C.gold}; }
.ludo-cell.ring.start1 { background: ${ca('accent','33')}; border-color: ${C.accent}; }
.ludo-cell.ring.start2 { background: ${ca('rose','33')}; border-color: ${C.rose}; }
.ludo-cell.home1 { background: ${ca('accent','22')}; border: 1px dashed ${ca('accent','66')}; }
.ludo-cell.home2 { background: ${ca('rose','22')}; border: 1px dashed ${ca('rose','66')}; }
.ludo-cell.base1 { background: ${ca('accent','18')}; border: 1px solid ${ca('accent','55')}; border-radius: 50%; }
.ludo-cell.base2 { background: ${ca('rose','18')}; border: 1px solid ${ca('rose','55')}; border-radius: 50%; }
.ludo-cell.center { background: ${ca('gold','22')}; border: 1px solid ${C.gold}; font-size: 0.8rem; }
.ludo-token {
  z-index: 2; width: 85%; height: 85%; border-radius: 50%; align-self: center; justify-self: center;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.ludo-token.p1 { background: ${C.accent}; }
.ludo-token.p2 { background: ${C.rose}; }
.ludo-token.movable { cursor: pointer; box-shadow: 0 0 0 2px ${C.gold}, 0 1px 3px rgba(0,0,0,0.5); animation: ludoPulse 0.9s ease-in-out infinite; }
/* PHASE 2 — a 15x15 board puts each Ludo token inside a ~25px cell, and tokens
   sharing a square overlap almost completely (5px offset). The board tap stays
   as a shortcut; this pad is the unambiguous, full-size way to move. */
.ludo-token::after {
  content: ''; position: absolute; inset: -8px; /* hit slop, no layout change */
}
.brd-movelist {
  display: flex; flex-direction: column; gap: 0.4rem;
  width: min(92vw, 380px); margin: 0.7rem auto 0;
}
.brd-movelist-label {
  font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: ${C.muted}; font-weight: 700;
}
.brd-move-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  min-height: 48px; padding: 0.5rem 0.85rem;
  background: ${C.card}; border: 1.5px solid ${C.border}; border-radius: 12px;
  color: ${C.text}; font-family: inherit; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; text-align: left; width: 100%;
}
.brd-move-btn .brd-move-sub { font-size: 0.74rem; color: ${C.muted}; font-weight: 500; }
.brd-move-btn.primary { border-color: ${C.accent}; background: ${ca('accent', '14')}; }
/* PHASE 2 — Gomoku ghost-confirm. 15x15 in 380px is ~24px per intersection and
   a mis-tap used to place a stone permanently. */
.gmk-cell .gmk-ghost {
  width: 62%; height: 62%; border-radius: 50%;
  border: 2px dashed ${C.gold}; box-sizing: border-box;
}
.brd-confirm-bar {
  display: flex; gap: 0.5rem; width: min(92vw, 380px); margin: 0.6rem auto 0;
}
.brd-confirm-bar button {
  flex: 1 1 auto; min-height: 48px; border-radius: 12px;
  font-family: inherit; font-size: 0.92rem; font-weight: 700; cursor: pointer;
  border: 1.5px solid ${C.border}; background: ${C.card}; color: ${C.text};
}
.brd-confirm-bar button.go { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.brd-confirm-bar button:disabled { opacity: 0.4; cursor: not-allowed; }
/* PHASE 7 — "Your rooms": a room you hosted was invisible once you left it. */
.brd-myrooms { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 0.9rem; }
.brd-myrooms-label {
  font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: ${C.muted}; font-weight: 700;
}
.brd-myroom {
  display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
  padding: 0.55rem 0.7rem; background: ${C.card};
  border: 1px solid ${C.border}; border-radius: 12px;
}
.brd-myroom-meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.brd-myroom-code { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.92rem; }
.brd-myroom-sub { font-size: 0.72rem; color: ${C.muted}; }
.brd-myroom-sub.yourturn { color: ${C.emerald}; font-weight: 600; }
.brd-myroom button {
  min-height: 40px; padding: 0 0.85rem; border-radius: 10px; flex: 0 0 auto;
  background: ${C.accent}; border: none; color: #fff;
  font-family: inherit; font-size: 0.82rem; font-weight: 700; cursor: pointer;
}
.brd-myroom button.ghost { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; }
.brd-endgame {
  min-height: 44px; padding: 0 1rem; margin: 0.7rem auto 0; display: block;
  background: transparent; border: 1px solid ${C.rose}; border-radius: 12px;
  color: ${C.rose}; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
}
/* PHASE 8 — Mahjong controls (undo / hint / shuffle) + Daily Bounce effects. */
.mj-controls, .wspr-actions {
  display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;
}
.mj-controls button {
  min-height: 44px; min-width: 84px; padding: 0 0.8rem; border-radius: 12px;
  background: ${C.card}; border: 1.5px solid ${C.border}; color: ${C.text};
  font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.mj-controls button:active { transform: scale(0.98); }
.mj-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
.mj-warn { color: ${C.rose}; font-size: 0.82rem; font-weight: 600; text-align: center; }
.dbnc-effects { display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap; }
.dbnc-effect {
  font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem;
  border-radius: 999px; background: ${ca('gold', '22')}; color: ${C.gold};
  text-transform: capitalize;
}
/* PHASE 5 — card drag ghost, modelled on Block Fit's existing .bb-drag-ghost. */
.ce-drag-ghost {
  position: fixed; z-index: 70; pointer-events: none; opacity: 0.92;
  transform: translate(-50%, -50%); display: flex; flex-direction: column;
}
.ce-drag-ghost .ce-card { box-shadow: 0 6px 18px var(--c-shadow-lg); }
.kl-empty-hint {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; font-family: 'JetBrains Mono', monospace;
  font-size: 20px; font-weight: 700; color: ${C.dim}; pointer-events: none;
}
.kl-note {
  text-align: center; font-size: 0.8rem; font-weight: 600; color: ${C.rose};
  min-height: 1.1rem;
}
/* PHASE 4 — practice replay ribbon (#133). */
.practice-ribbon {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.35rem 0.7rem; border-radius: 999px;
  background: ${ca('violet', '1f')}; color: ${C.violet};
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.02em;
  text-transform: uppercase;
}
.reset-line {
  text-align: center; font-size: 0.8rem; color: ${C.muted}; margin-top: 0.5rem;
}
.practice-note { font-weight: 500; opacity: 0.75; font-size: 0.82em; }
@keyframes ludoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }

/* ---- Chutes & Ladders ---- */
.cnl-banner {
  text-align: center; font-size: 0.82rem; font-weight: 600;
  border-radius: 999px; padding: 0.32rem 0.8rem;
  max-width: 480px; margin: 0 auto 0.65rem; display: block;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.cnl-board-wrap {
  position: relative; max-width: 480px; margin: 0 auto;
  aspect-ratio: 1; width: 100%;
}
.cnl-board {
  position: absolute; inset: 0;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 2px;
  background: ${C.border};
  border: 2px solid ${C.border};
  border-radius: 12px;
  padding: 2px;
  overflow: hidden;
}
.cnl-cell {
  position: relative;
  display: flex; align-items: flex-start; justify-content: flex-start;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  font-weight: 600;
  color: ${C.muted};
  background: ${C.card};
  padding: 1px 2px;
  user-select: none;
}
.cnl-cell.alt { background: ${C.surface}; }
.cnl-cell.cnl-goal { background: ${ca('gold','22')}; color: ${C.gold}; }
.cnl-cell-mark {
  position: absolute; bottom: 0; right: 1px;
  font-size: 0.72rem; line-height: 1;
}
/* ---- Moksha Patam variant (slice 7) ---- */
.cnl-cell-name {
  position: absolute; left: 1px; right: 1px; bottom: 0;
  font-size: 0.36rem; line-height: 1.05; font-weight: 700; letter-spacing: 0.01em;
  text-align: center; text-transform: uppercase; overflow: hidden; white-space: nowrap;
  text-overflow: ellipsis; pointer-events: none;
}
.cnl-cell-name.up { color: ${C.emerald}; }
.cnl-cell-name.down { color: ${C.rose}; }
.cnl-glossary-btn { margin-left: auto; font-size: 0.75rem; }
.cnl-variant-block { margin-top: 0.5rem; }
.cnl-variant-label {
  font-family: 'JetBrains Mono', monospace; font-size: 0.66rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: ${C.muted}; margin-bottom: 0.4rem;
}
.cnl-variant-note {
  color: ${C.muted}; font-size: 0.78rem; line-height: 1.4; margin-top: 0.5rem;
}
.cnl-variant-link {
  background: none; border: none; padding: 0; color: ${C.accent};
  font-family: inherit; font-size: 0.78rem; font-weight: 600; cursor: pointer;
  text-decoration: underline;
}
.mok-intro { color: ${C.muted}; font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.9rem; }
.mok-section {
  font-family: 'JetBrains Mono', monospace; font-size: 0.66rem; letter-spacing: 0.09em;
  text-transform: uppercase; color: ${C.muted};
  border-bottom: 1px solid ${C.border}; padding-bottom: 0.25rem; margin: 0.9rem 0 0.55rem;
}
.mok-row { display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.55rem; }
.mok-sq {
  flex: 0 0 auto; min-width: 1.8rem; text-align: center; border-radius: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; font-weight: 700;
  padding: 0.15rem 0.3rem;
}
.mok-sq.up { background: rgba(30,143,99,.14); color: ${C.emerald}; }
.mok-sq.down { background: rgba(205,75,58,.14); color: ${C.rose}; }
.mok-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.mok-name { font-size: 0.86rem; font-weight: 600; }
.mok-name em { color: ${C.muted}; font-weight: 400; }
.mok-dest { color: ${C.muted}; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; margin-left: 0.4rem; }
.mok-blurb { color: ${C.muted}; font-size: 0.78rem; line-height: 1.4; }
.cnl-svg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 2;
}
.cnl-pawn {
  position: absolute; z-index: 3;
  width: 7%; height: 7%;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%);
  transition: left 0.13s ease, top 0.13s ease;
}
.cnl-die {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  margin: 0.9rem auto 0.2rem; max-width: 480px;
}
.cnl-die-face {
  width: 3.4rem; height: 3.4rem; border-radius: 14px;
  background: ${C.card}; border: 2px solid ${C.border};
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; font-weight: 700;
  font-size: 1.7rem; color: ${C.text};
  transition: transform 0.1s ease, border-color 0.2s;
}
/* Tumbling spin: ~3 full turns that decelerate and settle on the result. */
.cnl-die-face.rolling { animation: cnl-spin 0.72s cubic-bezier(0.22, 0.61, 0.36, 1); }
@keyframes cnl-spin {
  0%   { transform: rotate(0deg) scale(1); }
  20%  { transform: rotate(230deg) scale(1.14); }
  45%  { transform: rotate(560deg) scale(1.1); }
  72%  { transform: rotate(880deg) scale(1.12); }
  100% { transform: rotate(1080deg) scale(1); }
}
.cnl-roll-buttons {
  display: flex; gap: 0.5rem;
  max-width: 480px; margin: 0 auto;
}
.cnl-roll-btn {
  flex: 1; min-width: 0;
  border: none; cursor: pointer;
  border-radius: 12px; padding: 0.8rem 0.6rem;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.95rem;
  color: #fff; transition: opacity 0.15s, transform 0.1s;
}
.cnl-roll-btn:active:not(:disabled) { transform: scale(0.98); }
.cnl-roll-btn:disabled { opacity: 0.4; cursor: default; }

/* ---- Pre-launch Game Mode Modal ---- */
.gm-modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: var(--c-scrim); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
  animation: gmFade 0.18s ease-out;
}
@keyframes gmFade { from { opacity: 0; } to { opacity: 1; } }
.gm-modal {
  position: relative; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 18px; padding: 1.4rem 1.2rem 1.2rem; box-shadow: 0 20px 50px var(--c-shadow-lg);
}
.gm-modal-close {
  position: absolute; top: 0.75rem; right: 0.75rem; width: 2rem; height: 2rem;
  border: none; border-radius: 50%; background: ${C.bg}; color: ${C.muted};
  font-size: 1rem; cursor: pointer;
}
.gm-modal-head { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem; }
.gm-modal-icon { font-size: 2.4rem; }
.gm-modal-title { font-size: 1.3rem; font-weight: 700; }
.gm-modal-desc { font-size: 0.82rem; color: ${C.muted}; margin-top: 0.15rem; }
.gm-modal-label { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.muted}; margin-bottom: 0.5rem; }
.gm-modes { display: flex; flex-direction: column; gap: 0.6rem; }
.gm-mode-btn {
  display: flex; align-items: center; gap: 0.8rem; text-align: left;
  padding: 0.8rem 0.9rem; border-radius: 12px; cursor: pointer;
  background: ${C.bg}; border: 2px solid ${C.border}; color: ${C.text};
  transition: border-color 0.15s, transform 0.1s;
}
.gm-mode-btn:active { transform: scale(0.99); }
.gm-mode-btn.active { border-color: var(--accent, ${C.accent}); background: ${C.bg}; }
.gm-mode-icon { font-size: 1.6rem; }
.gm-mode-text { display: flex; flex-direction: column; }
.gm-mode-name { font-weight: 700; font-size: 0.95rem; }
.gm-mode-desc { font-size: 0.78rem; color: ${C.muted}; }
.gm-online { margin-top: 0.7rem; display: flex; flex-direction: column; gap: 0.5rem; }
.gm-online-actions { display: flex; gap: 0.5rem; }
.gm-online-hint { font-size: 0.76rem; color: ${C.muted}; }
.gm-play-btn {
  width: 100%; margin-top: 1rem; padding: 0.8rem; border: none; border-radius: 12px;
  background: var(--accent, ${C.accent}); color: #fff; font-weight: 700; font-size: 1rem;
  cursor: pointer; font-family: 'Space Grotesk', sans-serif;
}
.gm-play-btn:disabled { opacity: 0.4; cursor: default; }
.gm-link-btn { background: none; border: none; color: ${C.muted}; cursor: pointer; margin-top: 0.6rem; text-decoration: underline; font-size: 0.82rem; }
.gm-modal-lb { margin-top: 1.1rem; border-top: 1px solid ${C.border}; padding-top: 0.8rem; }

/* ---- Online race common ---- */
.gm-race-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; text-align: center; padding: 2rem 1rem; min-height: 50vh; }
.gm-race-title { font-size: 1.3rem; font-weight: 700; }
.gm-race-sub { font-size: 0.9rem; color: ${C.muted}; }
.gm-race-code { font-size: 0.85rem; color: ${C.text}; }
.gm-countdown { font-size: 4rem; font-weight: 800; color: ${C.accent}; font-family: 'JetBrains Mono', monospace; }
.gm-opp-chip { display: inline-block; margin: 0.4rem auto; padding: 0.35rem 0.7rem; background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 999px; font-size: 0.82rem; }
.gm-race-scores { display: flex; gap: 1.5rem; margin: 0.6rem 0; }
.gm-race-scores > div { display: flex; flex-direction: column; gap: 0.2rem; }
.gm-race-scores span { font-size: 0.75rem; color: ${C.muted}; }
.gm-race-scores b { font-size: 1.6rem; font-family: 'JetBrains Mono', monospace; color: ${C.gold}; }
.snake-lb { display: flex; flex-direction: column; gap: 0.2rem; }

/* ---- Hash Rush ---- */
.hr-wrap { position: relative; width: 100%; height: 62vh; max-height: 560px; border-radius: 14px; overflow: hidden; background: linear-gradient(180deg, #0c1020, #131a30); border: 1px solid ${C.border}; }
.hr-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.hr-boost-badge { position: absolute; top: 0.6rem; left: 50%; transform: translateX(-50%); background: rgba(34,211,238,0.18); border: 1px solid #22d3ee; color: #67e8f9; padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; }
.hr-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; background: rgba(8,10,18,0.6); text-align: center; padding: 1rem; }
.hr-overlay-title { font-size: 1.6rem; font-weight: 800; }
.hr-overlay-sub { font-size: 0.85rem; color: ${C.muted}; }
.hr-overlay-score { font-size: 2.2rem; font-weight: 800; color: ${C.gold}; font-family: 'JetBrains Mono', monospace; }

/* ---- Phase 6: shared card/tile engine + Lane A dailies ---- */
.p6-btn {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.text};
  border-radius: 10px; padding: 8px 12px; font-family: inherit; font-size: 13px;
  font-weight: 600; cursor: pointer; transition: border-color .15s;
}
.p6-btn:hover { border-color: ${C.accent}; }
.p6-btn:disabled { opacity: .4; cursor: default; }
.p6-btn.on, .p6-btn.primary { border-color: ${C.accent}; background: rgb(var(--c-accent-rgb) / 14%); }
.p6-hint { color: ${C.muted}; font-size: 12px; text-align: center; margin-top: 14px; line-height: 1.5; }
.p6-banner {
  background: rgb(var(--c-gold-rgb) / 12%); border: 1px solid rgb(var(--c-gold-rgb) / 40%); color: ${C.gold};
  border-radius: 10px; padding: 8px 12px; font-size: 13px; text-align: center; margin: 0 0 10px;
}

.ce-card {
  width: 44px; height: 62px; border-radius: 6px; box-sizing: border-box;
  background: #F4F6FB; border: 1px solid #C9D2E4; cursor: pointer; user-select: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; line-height: 1; flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,.4);
}
.ce-card .ce-rank { font-size: 15px; font-weight: 700; }
.ce-card .ce-suit { font-size: 15px; margin-top: 2px; }
.ce-card.red { color: #DC2626; }
.ce-card.black { color: #1E293B; }
.ce-card.down {
  background: repeating-linear-gradient(135deg, #3730A3, #3730A3 4px, #4338CA 4px, #4338CA 8px);
  border-color: #312E81;
}
.ce-card.sel { outline: 2px solid ${C.gold}; outline-offset: 1px; }
.ce-card.dim { opacity: .5; }
.ce-card.ce-slot {
  background: var(--c-well); border: 1.5px dashed ${C.dim}; box-shadow: none;
  color: ${C.dim}; font-size: 18px;
}

.kl-game { max-width: 400px; margin: 0 auto; }
.kl-top { display: flex; gap: 6px; justify-content: center; margin-bottom: 14px; }
.kl-gap { width: 14px; }
.kl-tab { display: flex; gap: 6px; justify-content: center; }
/* PHASE 2/5 (#123) — 44px columns exposing a 14–20px sliver of each buried
   card was the "cards are tiny" complaint. Wider column, and KL_STACK_STEP
   (JS) raises the exposed strip so the whole strip is aimable. */
.kl-col { position: relative; width: 52px; }
.kl-col .ce-card { width: 52px; }

.sp-game { max-width: 420px; margin: 0 auto; }
.sp-game .status-bar { flex-wrap: wrap; align-items: center; gap: 8px; }
.sp-tab { display: flex; gap: 3px; justify-content: center; }
.sp-col { position: relative; width: 44px; }
.sp-col .ce-card { width: 44px; height: 54px; border-radius: 5px; }
.sp-col .ce-card .ce-rank { font-size: 13px; }
.sp-col .ce-card .ce-suit { font-size: 11px; margin-top: 1px; }
.sp-col .ce-card.ce-slot.sm { font-size: 13px; }

.mj-game { display: flex; flex-direction: column; align-items: center; }
.mj-game .status-bar { align-items: center; gap: 8px; }
.mj-board { position: relative; margin: 4px auto 0; }
/* PHASE 2 (#120) — 36×46 was well under a fingertip, and FitScale shrank it
   further. 44×56 with the shared press state; the layout offsets below scale
   from MJ_TW/MJ_TH so the whole board stays inside FitScale. */
.mj-tile {
  position: absolute; width: 44px; height: 56px; border-radius: 6px; cursor: pointer;
  background: linear-gradient(180deg, #F8FAFF, #DDE4F2); border: 1px solid #B7C2D8;
  border-bottom-width: 3px; display: flex; align-items: center; justify-content: center;
  font-size: 23px; user-select: none; box-shadow: 2px 3px 4px rgba(0,0,0,.45);
  transition: transform 0.1s ease, filter 0.1s ease;
}
.mj-tile.hinted { box-shadow: 0 0 0 3px ${C.gold}, 2px 3px 4px rgba(0,0,0,.45); }
.mj-tile.blocked { filter: brightness(.62); cursor: default; }
.mj-tile.sel { outline: 2px solid ${C.gold}; outline-offset: 1px; filter: brightness(1.08); }
.mj-tile.up1 { border-color: #A3B0CB; }
.mj-tile.up2, .mj-tile.up3 { border-color: #8E9DBD; }

/* Nonogram — canvas board (slice 5). The clue gutters are drawn inside the
   canvas so grid + clues scale together off one useFitBox measurement. */
.ng-game { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.5rem; }
.ng-boardbox {
  flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center;
}
.ng-canvas {
  border-radius: 8px; cursor: pointer;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
}
.ng-modes { flex: 0 0 auto; display: flex; gap: 8px; justify-content: center; }
.ng-mode-btn {
  flex: 1 1 auto; max-width: 170px; min-height: 48px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: ${C.card}; border: 1.5px solid ${C.border}; border-radius: 12px;
  color: ${C.text}; font-family: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.ng-mode-btn.on { border-color: ${C.accent}; background: rgba(45,95,174,.12); }
.ng-mode-btn:active { transform: scale(0.98); }

.mf-game { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.5rem; }
.mf-game .status-bar { align-items: center; gap: 8px; }
/* Canvas board (slice 3). The wrapper is the measured box — useFitBox reads
   its rect and the canvas is sized to an exact multiple of the cell, so the
   9×9 field is always centred and never clipped. */
.mf-boardbox {
  flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center;
}
.mf-canvas {
  border-radius: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none; -webkit-user-select: none;
}
.mf-controls {
  flex: 0 0 auto; display: flex; gap: 8px; align-items: center; justify-content: center;
}
.mf-mode-btn {
  flex: 1 1 auto; max-width: 260px; min-height: 48px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: ${C.card}; border: 1.5px solid ${C.border}; border-radius: 12px;
  color: ${C.text}; font-family: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.mf-mode-btn .mf-mode-label { font-size: 12px; color: ${C.muted}; font-weight: 500; }
.mf-mode-btn.flag { border-color: ${C.rose}; background: rgba(205,75,58,.10); }
.mf-mode-btn.dig  { border-color: ${C.accent}; background: rgba(45,95,174,.10); }
.mf-mode-btn:active { transform: scale(0.98); }

.an-game { max-width: 420px; margin: 0 auto; text-align: center; }
.an-dots { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.an-dot {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.muted}; border-radius: 999px;
  padding: 3px 10px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
}
.an-dot.solved { border-color: ${C.emerald}; color: ${C.emerald}; }
.an-dot.cur { border-color: ${C.accent}; color: ${C.text}; }
.an-slots { display: flex; gap: 5px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
/* PHASE 2 (#129) — up from 40×48 / 44×52; both had hover-only feedback. */
.an-slot {
  width: 48px; height: 54px; border-radius: 8px; border: 1.5px dashed ${C.dim};
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: ${C.text};
}
.an-slot.has { border-style: solid; border-color: ${C.accent}; background: rgb(var(--c-accent-rgb) / 10%); }
.an-slots.bad .an-slot.has { border-color: ${C.rose}; background: rgb(var(--c-rose-rgb) / 12%); animation: an-shake .4s; }
@keyframes an-shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.an-rack { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.an-tile {
  width: 44px; height: 52px; border-radius: 8px; border: 1px solid ${C.border}; cursor: pointer;
  background: ${C.card}; color: ${C.text}; font-family: 'JetBrains Mono', monospace;
  font-size: 20px; font-weight: 700;
}
.an-tile:hover { border-color: ${C.accent}; }
.an-tile.used { opacity: .25; cursor: default; }
.an-actions { display: flex; gap: 8px; justify-content: center; margin-top: 4px; }

.cp-game { display: flex; flex-direction: column; align-items: center; }
.cp-grid { display: grid; grid-auto-rows: 34px; gap: 2px; margin-bottom: 14px; }
.cp-cell {
  background: ${C.card}; border-radius: 4px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; user-select: none;
}
.cp-cell.wall { background: ${C.dim}; border-radius: 2px; }
.cp-cell.goal { background: rgb(var(--c-emerald-rgb) / 14%); box-shadow: inset 0 0 0 2px rgb(var(--c-emerald-rgb) / 45%); }
.cp-crate.ongoal { filter: hue-rotate(60deg) brightness(1.2); }
.cp-pad {
  display: grid; grid-template-columns: repeat(3, 52px); gap: 6px; justify-content: center; margin-bottom: 10px;
}
.cp-pad .p6-btn { padding: 10px 0; }

/* Drop Stack — real-time well + side panel (slice 6). The well is a canvas
   sized by useFitBox; Next/Hold sit beside it so everything fits one screen. */
.ds-main { flex: 1 1 auto; min-height: 0; display: flex; gap: 10px; align-items: stretch; }
.ds-boardbox {
  position: relative; flex: 1 1 auto; min-height: 0; min-width: 0;
  display: flex; align-items: center; justify-content: center;
}
.ds-canvas {
  border-radius: 8px; background: rgba(0,0,0,.03);
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
}
.ds-side { flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; justify-content: flex-start; }
.ds-panel {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px;
  padding: 6px 8px; min-width: 62px; text-align: center;
  font-family: inherit; color: ${C.text};
}
.ds-panel-label {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em;
  text-transform: uppercase; color: ${C.muted}; margin-bottom: 4px;
}
.ds-queue { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.ds-mini-piece { position: relative; display: block; }
.ds-mini-cell { position: absolute; width: 8px; height: 8px; border-radius: 2px; }
.ds-mini-empty { color: ${C.dim}; font-size: 12px; }
.ds-hold { cursor: pointer; touch-action: manipulation; }
.ds-hold:disabled, .ds-hold.used { opacity: .45; cursor: default; }
.ds-level-flash {
  position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%);
  font-size: 1.5rem; font-weight: 800; color: ${C.gold};
  text-shadow: 0 2px 10px rgba(0,0,0,.35); pointer-events: none;
  animation: ds-flash .9s ease forwards;
}
@keyframes ds-flash {
  0% { opacity: 0; transform: translate(-50%, -30%) scale(.8); }
  25% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -70%) scale(1); }
}
.ds-pad { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.ds-pad .p6-btn { min-height: 44px; min-width: 58px; }


/* ---- Phase 7: GotD hero, home reorg, chat ---- */
.gotd-hero {
  border: 1px solid ${C.border}; border-top: 3px solid var(--accent, ${C.accent});
  background: linear-gradient(160deg, ${C.card}, ${C.surface});
  border-radius: 16px; padding: 16px 18px; margin-bottom: 1.4rem;
}
.gotd-label { color: var(--accent, ${C.accent}); font-size: 11px; letter-spacing: 0.12em; margin-bottom: 10px; }
.gotd-main { display: flex; align-items: center; gap: 14px; cursor: pointer; }
.gotd-icon { font-size: 44px; line-height: 1; }
.gotd-info { flex: 1; min-width: 0; }
.gotd-name { font-size: 20px; font-weight: 700; }
.gotd-desc { color: ${C.muted}; font-size: 13px; margin-top: 2px; }
.gotd-meta { color: ${C.muted}; font-size: 11.5px; margin-top: 6px; }
.gotd-play { padding: 10px 18px; white-space: nowrap; flex-shrink: 0; width: auto; margin: 0; }
@media (max-width: 560px) {
  .gotd-main { flex-wrap: wrap; }
  .gotd-play { width: 100%; margin-top: 4px; }
}
.gotd-play:disabled { opacity: 0.75; }
.gotd-signedout { color: ${C.muted}; font-size: 12.5px; margin-top: 12px; }

/* Phase 8 — anonymous play + "make it count" */
.guest-cta {
  border: 1px solid ${ca('accent','66')}; background: rgb(var(--c-accent-rgb) / 8%);
  border-radius: 12px; padding: 12px 14px; margin-bottom: 0.9rem; text-align: left;
}
.guest-rank { font-size: 15px; margin-bottom: 6px; }
.guest-rank strong { color: ${C.gold}; }
.guest-note { color: ${C.muted}; font-size: 12.5px; line-height: 1.5; }
.guest-note strong { color: ${C.text}; }
.commit-notice {
  border: 1px solid ${ca('emerald','66')}; background: rgb(var(--c-emerald-rgb) / 9%); color: ${C.text};
  border-radius: 12px; padding: 10px 14px; margin-bottom: 1rem; font-size: 13.5px;
  cursor: pointer;
}

/* "New this week" strip + What's-new sheet (weekly changelog) */
.whatsnew-strip {
  display: flex; align-items: stretch; gap: 6px;
  border: 1px solid ${C.border}; background: ${C.card};
  border-left: 3px solid ${C.gold};
  border-radius: 12px; margin-bottom: 1rem; overflow: hidden;
  box-shadow: 0 1px 2px var(--c-shadow-sm);
}
.wn-strip-body {
  flex: 1; text-align: left; background: none; border: none; cursor: pointer;
  color: ${C.text}; font-family: inherit; font-size: 13px; line-height: 1.45;
  padding: 9px 4px 9px 12px;
}
.wn-strip-body strong { font-family: 'Fraunces', Georgia, serif; }
.wn-more { color: ${C.accent}; font-weight: 600; white-space: nowrap; }
.wn-strip-dismiss {
  background: none; border: none; color: ${C.muted}; cursor: pointer;
  font-size: 12px; padding: 0 12px;
}
.wn-strip-dismiss:hover { color: ${C.text}; }
.wn-panel { height: min(64vh, 560px); }
.wn-list { gap: 16px; }
.wn-week-title {
  font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: 14.5px;
  border-bottom: 1px solid ${C.border}; padding-bottom: 4px; margin-bottom: 6px;
}
.wn-items { margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 5px; }
.wn-items li { font-size: 13px; line-height: 1.5; color: ${C.text}; }

.home-section-title {
  font-size: 15px; font-weight: 700; margin: 1.4rem 0 0.7rem;
  color: ${C.text};
}
.home-back-btn {
  background: none; border: none; color: ${C.accent}; font-family: inherit;
  font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 0.8rem;
}

.inprog-row-wrap { margin-bottom: 0.4rem; }
.inprog-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.inprog-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  padding: 10px 14px; min-width: 150px; cursor: pointer; flex-shrink: 0;
}
.inprog-card:hover { border-color: ${C.accent}; }
.inprog-card .ip-icon { font-size: 22px; }
.inprog-card .ip-name { font-weight: 600; font-size: 13.5px; margin-top: 4px; white-space: nowrap; }
.inprog-card .ip-sub { font-size: 11.5px; color: ${C.muted}; margin-top: 3px; }
.inprog-card .ip-sub.resume { color: ${C.gold}; }
.inprog-card .ip-sub.turn { color: ${C.emerald}; font-weight: 700; }
.inprog-card .ip-sub.expiring { color: ${C.rose}; font-weight: 600; }

.chat-overlay {
  position: fixed; inset: 0; background: var(--c-scrim); z-index: 240;
  display: flex; align-items: flex-end; justify-content: center;
}
.chat-panel {
  background: ${C.surface}; border: 1px solid ${C.border}; border-bottom: none;
  border-radius: 18px 18px 0 0; width: 100%; max-width: 560px;
  height: min(72vh, 640px); display: flex; flex-direction: column;
}
.chat-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px; border-bottom: 1px solid ${C.border};
}
.chat-title { font-weight: 700; font-size: 15px; }
.chat-close {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.muted};
  border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 13px;
}
.chat-list { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.chat-empty { color: ${C.muted}; font-size: 13px; text-align: center; margin-top: 24px; }
.chat-msg { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px; padding: 8px 10px; max-width: 88%; }
.chat-msg.mine { align-self: flex-end; border-color: ${ca('accent','55')}; background: rgb(var(--c-accent-rgb) / 8%); }
.chat-msg.hidden-msg { background: none; border-style: dashed; }
.chat-tombstone { color: ${C.dim}; font-size: 12px; }
.chat-msg-top { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.chat-author { color: ${C.violet}; font-size: 12px; font-weight: 700; }
.chat-report {
  background: none; border: none; cursor: pointer; font-size: 11px; opacity: 0.35;
  margin-left: auto; padding: 0 2px;
}
.chat-report:hover { opacity: 1; }
.chat-body { font-size: 13.5px; line-height: 1.45; word-break: break-word; }
.chat-notice { color: ${C.gold}; font-size: 12px; text-align: center; padding: 4px 0; }
.chat-input-row { display: flex; gap: 8px; padding: 10px 14px 14px; border-top: 1px solid ${C.border}; }
.chat-input {
  flex: 1; background: ${C.card}; border: 1px solid ${C.border}; color: ${C.text};
  border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 13.5px; outline: none;
}
.chat-input:focus { border-color: ${C.accent}; }
.chat-send {
  background: ${C.accent}; border: none; color: white; border-radius: 10px;
  padding: 0 18px; font-family: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer;
}
.chat-send:disabled { opacity: 0.4; cursor: default; }
.chat-btn-inline {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.text};
  border-radius: 10px; padding: 8px 12px; font-family: inherit; font-size: 13px;
  font-weight: 600; cursor: pointer;
}
.chat-btn-inline:hover { border-color: ${C.accent}; }

/* ============================================================
   Appendix A — "The Daily Page, Warmed" editorial layer.
   Serif masthead + datelines, newsprint rules, card-weight white
   surfaces with soft warm shadows, brass reserved for streaks /
   wins / medals. Pure restyle: later rules of equal-or-greater
   specificity re-skin the same markup — no layout changes.
   ============================================================ */
.serif { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; }

/* Serif display type on the shell's headline moments. */
.nav-brand, .lobby-head h1, .home-section-title, .gotd-name,
.pregame-card h2, .win-card h2, .locked-card h2, .gm-modal h2,
.howto-head h3, .chat-title {
  font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
  letter-spacing: 0;
}
.nav-brand { font-weight: 700; }
.nav-brand .logo { color: ${C.gold}; }

/* Brass for streaks (spec: brass = streaks/wins/medals; green stays a
   live/success color elsewhere). */
.nav-stat .value.streak { color: ${C.gold}; }

/* ---- Home masthead: numbered edition + dateline over a double rule ---- */
.lobby-head.masthead { text-align: center; margin-bottom: 1.6rem; }
.lobby-head.masthead h1 {
  font-size: 2.1rem; font-weight: 900; letter-spacing: 0.005em; line-height: 1.1;
}
.masthead-dateline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.64rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.14em; color: ${C.muted};
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  margin-bottom: 0.55rem;
}
.masthead-dateline::before, .masthead-dateline::after {
  content: ''; flex: 1; max-width: 72px; height: 1px; background: ${C.border};
}
.lobby-head.masthead .masthead-rule {
  height: 4px; margin: 0.7rem auto 0; max-width: 460px;
  border-top: 2px solid ${C.text}; border-bottom: 1px solid ${C.text};
}
.lobby-head.masthead p { font-style: italic; font-family: 'Fraunces', Georgia, serif; }

/* Section headers as newspaper column rules. */
.home-section-title {
  font-size: 1.05rem; font-weight: 700;
  border-bottom: 1px solid ${C.border}; padding-bottom: 0.35rem;
}

/* Merged all-games grid (slice 2): the reset note, the filter chips and the
   per-card daily indicator that replaces the two section headings. */
.home-daily-note {
  color: ${C.muted}; font-size: 0.82rem; margin: 0.5rem 0 0.6rem;
}
.home-filter-chips { display: flex; gap: 0.45rem; margin-bottom: 0.9rem; flex-wrap: wrap; }
.home-chip {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 999px;
  padding: 0.35rem 0.95rem; font-family: inherit; font-size: 0.82rem; font-weight: 600;
  color: ${C.muted}; cursor: pointer; touch-action: manipulation;
}
.home-chip.on { border-color: ${C.accent}; color: ${C.accent}; background: rgba(45,95,174,.10); }
.card-daily-badge {
  position: absolute; top: 0.65rem; right: 0.65rem; z-index: 1;
  font-family: 'JetBrains Mono', monospace; font-size: 0.56rem; font-weight: 600;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding: 0.2rem 0.45rem; border-radius: 999px; border: 1px solid transparent;
}
.card-daily-badge.fresh  { background: rgba(45,95,174,.14); color: ${C.accent};  border-color: rgba(45,95,174,.30); }
.card-daily-badge.resume { background: rgba(201,162,39,.16); color: #8A6F14;     border-color: rgba(201,162,39,.35); }
.card-daily-badge.done   { background: rgba(30,143,99,.14);  color: ${C.emerald}; border-color: rgba(30,143,99,.30); }

/* Card-weight white surfaces: soft warm shadow at rest, lift on hover. */
.card, .gotd-hero, .inprog-card, .pregame-card, .win-card, .locked-card,
.lboard, .howto-card, .gm-modal {
  box-shadow: 0 1px 2px var(--c-shadow-sm), 0 6px 18px var(--c-shadow-sm);
}
.win-card, .howto-card, .gm-modal { box-shadow: 0 20px 50px var(--c-shadow-lg); }

/* GotD hero reads as the front-page lead story. */
.gotd-hero { background: ${C.card}; }
.gotd-label {
  font-family: 'JetBrains Mono', monospace; font-weight: 600;
  text-transform: uppercase;
}
.gotd-name { font-size: 22px; font-weight: 900; }
/* GotD description stays serif but upright — the masthead tagline is the
   home screen's single italic moment. */
.gotd-desc { font-family: 'Fraunces', Georgia, serif; }

/* Per-game chrome picks up the game's accent (set as --accent inline on
   the lobby card, hero, and modal): accent Play buttons + tag pills. */
.gotd-play, .gm-modal .primary-btn, .pregame-card .pregame-play {
  background: var(--accent, ${C.accent});
}
.gotd-play:hover, .gm-modal .primary-btn:hover, .pregame-card .pregame-play:hover {
  background: var(--accent, ${C.accent}); filter: brightness(0.88);
}
.pregame-card { border-top: 3px solid var(--accent, ${C.accent}); }

/* Buttons: crisp editorial edges. */
.primary-btn { box-shadow: 0 1px 2px var(--c-shadow-md); }

/* Wins are brass moments. */
.win-card .trophy { filter: none; }
.win-card h2 { color: ${C.text}; }
.score-row.total .v { color: ${C.gold}; }

/* AppErrorBoundary fallback (#150). The stylesheet is mounted OUTSIDE the
   boundary precisely so this panel can be styled when App's tree is gone. */
.err-fallback {
  max-width: 420px; margin: 4rem auto; padding: 2rem 1.5rem;
  text-align: center; background: ${C.card};
  border: 1px solid ${C.border}; border-radius: 16px;
  box-shadow: 0 2px 10px var(--c-shadow-md);
}
.err-fallback .err-icon { font-size: 2.4rem; margin-bottom: 0.6rem; }
.err-fallback h2 { margin: 0 0 0.6rem; font-size: 1.2rem; }
.err-fallback p {
  color: ${C.muted}; font-size: 0.9rem; line-height: 1.5; margin: 0 0 1.4rem;
}
`;