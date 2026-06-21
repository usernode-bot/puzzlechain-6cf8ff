const { useState, useEffect, useRef } = React;

/* ============================================================
   Design system — color palette
   ============================================================ */
const C = {
  bg:      '#0A0E1A',
  surface: '#111827',
  card:    '#1a2235',
  border:  '#1e3a5f',
  accent:  '#3b82f6',
  gold:    '#f59e0b',
  emerald: '#10b981',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  text:    '#e2e8f0',
  muted:   '#64748b',
  dim:     '#334155',
};

/* ============================================================
   Global stylesheet (injected via <style>)
   ============================================================ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: ${C.bg};
  color: ${C.text};
  -webkit-font-smoothing: antialiased;
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
  background: ${C.gold}1f;
  border: 1px solid ${C.gold}40;
  border-radius: 999px;
  padding: 0.05rem 0.35rem;
  vertical-align: middle;
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
.account-chip .who { display: flex; flex-direction: column; line-height: 1.1; }
.account-chip .uname { font-size: 0.82rem; font-weight: 600; }
.account-chip .status { font-size: 0.6rem; color: ${C.emerald}; letter-spacing: 0.02em; }
.account-chip .dot {
  width: 0.5rem; height: 0.5rem; border-radius: 50%; flex: 0 0 auto;
}
.account-chip.loading .dot { background: ${C.muted}; }
.account-chip.loading { color: ${C.muted}; }
.account-chip.loading .who { font-size: 0.82rem; }
.account-chip.off { border-color: ${C.rose}; }
.account-chip.off .dot { background: ${C.rose}; }
.account-chip.off .who { color: ${C.rose}; font-size: 0.82rem; font-weight: 600; }

@media (max-width: 560px) {
  .account-chip .who { display: none; }
  .account-chip { padding: 0.35rem; }
  .nav-right { gap: 0.8rem; }
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
.lobby-head .lobby-hint {
  margin-top: 0.5rem;
  color: ${C.emerald};
  font-size: 0.85rem;
  font-weight: 500;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
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
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}
.card.done {
  opacity: 0.55;
  cursor: default;
}
.card.done:hover { transform: none; border-color: ${C.border}; box-shadow: none; }

.card-icon { font-size: 1.9rem; line-height: 1; margin-bottom: 0.6rem; }
.card-name { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.2rem; }
.card-desc { font-size: 0.85rem; color: ${C.muted}; line-height: 1.35; min-height: 2.3em; }

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
  border: 2px solid ${C.border};
  border-radius: 10px;
  overflow: hidden;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
}
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
.scell.sel { background: ${C.accent}33; }
.scell.hl { background: ${C.accent}0a; }
.scell.err { color: ${C.rose}; background: ${C.rose}1a; }

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
.numkey:hover { border-color: ${C.accent}; background: ${C.accent}1a; }
.numkey.erase { color: ${C.rose}; font-size: 1rem; }

/* ---- Win overlay ---- */
.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,14,26,0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1.25rem;
}
.win-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 2rem 1.75rem;
  text-align: center;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
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
.primary-btn:hover { background: #2f6fe0; }

/* ---- Locked screen ---- */
.locked-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 2rem 1.75rem;
  text-align: center;
  max-width: 420px;
  margin: 1rem auto 0;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
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

/* ---- Word Hunt ---- */
.wordsearch {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  background: ${C.border};
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
.wcell.found { background: ${C.emerald}33; color: ${C.emerald}; cursor: default; }
.wcell.sel { background: ${C.accent}55; color: #fff; }

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
  background: ${C.emerald}1a;
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
.cw-board {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  gap: 0.4rem;
  max-width: 330px;
  margin: 0 auto;
}
.cw-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
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
.cw-kbd-row { display: flex; gap: 0.35rem; justify-content: center; }
.cw-key {
  flex: 1 1 auto;
  min-width: 1.5rem;
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
.lobby-tabs { display: flex; gap: 0.35rem; margin-bottom: 1.1rem; }
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
.ms-cell.ms-hidden:hover { background: ${C.accent}26; }
.ms-cell.ms-revealed { background: ${C.surface}; cursor: default; }
.ms-cell.ms-flagged { background: ${C.card}; cursor: default; }
.ms-cell.ms-mine-dead { background: ${C.rose}40; cursor: default; }
.ms-cell.ms-exploded { background: ${C.rose}99; cursor: default; }
.ms-n1 { color: ${C.accent}; }
.ms-n2 { color: ${C.emerald}; }
.ms-n3 { color: ${C.rose}; }
.ms-n4 { color: ${C.violet}; }
.ms-n5 { color: ${C.gold}; }
.ms-n6 { color: #06b6d4; }
.ms-n7 { color: #be123c; }
.ms-n8 { color: ${C.muted}; }
@keyframes ms-pulse {
  0%, 100% { box-shadow: 0 0 0 0 ${C.emerald}40; }
  50% { box-shadow: 0 0 0 6px ${C.emerald}00; }
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
.ms-cashout-btn:hover { background: #059669; }
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
.ms-usernode-banner {
  display: inline-block;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid ${C.border};
  font-size: 0.75rem;
  color: ${C.muted};
  margin-bottom: 0.75rem;
}
.ms-game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.ms-theme-btn {
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.12s;
}
.ms-theme-btn:hover { border-color: ${C.accent}; }
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
.ms-outcome-chip.win { background: ${C.emerald}22; color: ${C.emerald}; border: 1px solid ${C.emerald}44; }
.ms-outcome-chip.loss { background: ${C.rose}22; color: ${C.rose}; border: 1px solid ${C.rose}44; }
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
  40%  { background: ${C.rose}22; border-color: ${C.rose}; }
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
  background: ${C.gold}1a;
  border: 1px solid ${C.gold}33;
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
.mnc-outcome-chip.p1win { background: ${C.accent}22; color: ${C.accent}; border: 1px solid ${C.accent}44; }
.mnc-outcome-chip.p2win { background: ${C.rose}22; color: ${C.rose}; border: 1px solid ${C.rose}44; }
.mnc-outcome-chip.draw { background: ${C.muted}22; color: ${C.muted}; border: 1px solid ${C.muted}44; }
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
.mnc-mode-btn:hover { border-color: ${C.gold}; background: ${C.gold}08; }
.mnc-mode-btn.active { border-color: ${C.gold}; background: ${C.gold}14; }
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
.mnc-difficulty-pill.active { border-color: ${C.gold}; color: ${C.gold}; background: ${C.gold}14; font-weight: 600; }
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
.mnc-mode-start-btn:hover { background: #d97706; }
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
.mnc-online-actions button:hover { border-color: ${C.gold}; background: ${C.gold}0d; }

/* ---- Mancala online waiting / join screen ---- */
.mnc-room-waiting { max-width: 480px; margin: 0 auto; text-align: center; }
.mnc-room-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: ${C.gold};
  background: ${C.gold}14;
  border: 2px solid ${C.gold}44;
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
  border: 1px solid ${C.border}44;
}
.t2048-tile {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}
.t2048-tile.is-new {
  animation: t2048-pop-in 120ms ease both;
}
.t2048-tile.is-merged {
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
.t2048-outcome-chip.win  { background: ${C.emerald}22; color: ${C.emerald}; border: 1px solid ${C.emerald}44; }
.t2048-outcome-chip.loss { background: ${C.rose}22;    color: ${C.rose};    border: 1px solid ${C.rose}44; }
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
  background: ${C.bg}ee;
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

/* ---- Texas Hold 'Em ---- */
.poker-wrap { max-width: 620px; margin: 0 auto; width: 100%; }
.poker-mode-screen {
  display: flex; flex-direction: column; align-items: center;
  gap: 1.25rem; padding: 1.5rem 1rem; text-align: center;
}
.poker-mode-title { font-size: 1.3rem; font-weight: 700; }
.poker-mode-note { color: ${C.muted}; font-size: 0.88rem; font-family: 'JetBrains Mono', monospace; }
.poker-diff-row { display: flex; gap: 0.6rem; }
.poker-diff-btn {
  padding: 0.55rem 1.1rem; border-radius: 10px; cursor: pointer; font-family: inherit;
  font-size: 0.9rem; font-weight: 600; border: 1px solid ${C.border};
  background: ${C.card}; color: ${C.text}; transition: border-color 0.12s, background 0.12s;
}
.poker-diff-btn:hover { border-color: ${C.accent}; }
.poker-diff-btn.sel { background: ${C.accent}22; border-color: ${C.accent}; color: ${C.accent}; }
.poker-deal-btn {
  padding: 0.7rem 2rem; border-radius: 10px; cursor: pointer; font-family: inherit;
  font-size: 1rem; font-weight: 700; border: none; background: ${C.accent}; color: #fff;
  transition: opacity 0.12s;
}
.poker-deal-btn:hover { opacity: 0.88; }

.poker-table { display: flex; flex-direction: column; gap: 0.9rem; padding: 0.5rem 0; }
.poker-ai-row { display: flex; gap: 0.75rem; }
.poker-ai-panel {
  flex: 1; background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  padding: 0.7rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;
}
.poker-ai-panel.dealer-btn { border-color: ${C.gold}; }
.poker-ai-label {
  font-size: 0.75rem; font-weight: 600; color: ${C.muted};
  display: flex; align-items: center; gap: 0.4rem;
}
.poker-ai-stack { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: ${C.text}; }
.poker-ai-cards { display: flex; gap: 0.35rem; }
.poker-ai-badge {
  font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px;
  background: ${C.accent}22; color: ${C.accent}; border: 1px solid ${C.accent}44;
  align-self: flex-start;
}
.poker-ai-badge.fold { background: ${C.rose}22; color: ${C.rose}; border-color: ${C.rose}44; }
.poker-ai-badge.raise { background: ${C.gold}22; color: ${C.gold}; border-color: ${C.gold}44; }
.poker-ai-badge.allin { background: ${C.violet}22; color: ${C.violet}; border-color: ${C.violet}44; }
.poker-ai-thinking { font-size: 0.72rem; color: ${C.muted}; font-style: italic; }

.poker-community {
  background: #0d2a15; border: 1px solid #1a4a25; border-radius: 14px;
  padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; align-items: center;
}
.poker-community-cards { display: flex; gap: 0.5rem; justify-content: center; }
.poker-phase-row {
  display: flex; gap: 1rem; font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
}
.poker-phase-label { color: ${C.emerald}; font-weight: 600; }
.poker-pot-label { color: ${C.gold}; }

.poker-card {
  width: 42px; height: 62px; border-radius: 7px; background: #fff; color: #111;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 3px 4px; font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem; font-weight: 700; border: 1px solid rgba(0,0,0,0.15);
  position: relative; flex-shrink: 0; user-select: none;
  animation: poker-card-deal 200ms ease both;
}
.poker-card.back {
  background: ${C.accent}; border-color: ${C.accent}; color: transparent;
  background-image: repeating-linear-gradient(
    45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 2px, transparent 2px, transparent 8px
  );
}
.poker-card.empty {
  background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.15);
}
.poker-card .cr { font-size: 0.7rem; line-height: 1; }
.poker-card .cs { font-size: 0.8rem; line-height: 1; }
.poker-card .cs-bot { transform: rotate(180deg); align-self: flex-end; }
.poker-card.red .cr, .poker-card.red .cs { color: ${C.rose}; }
.poker-card.black .cr, .poker-card.black .cs { color: #1a1a1a; }
.poker-card.lg { width: 52px; height: 76px; border-radius: 9px; font-size: 1rem; }
.poker-card.lg .cr { font-size: 0.82rem; }
.poker-card.lg .cs { font-size: 1rem; }
@keyframes poker-card-deal {
  from { opacity: 0; transform: scale(0.7) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.poker-player-panel {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px;
  padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.7rem;
}
.poker-player-top {
  display: flex; align-items: center; gap: 0.75rem;
}
.poker-player-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.poker-player-label { font-size: 0.75rem; font-weight: 600; color: ${C.muted}; }
.poker-player-stack { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.1rem; }
.poker-player-cards { display: flex; gap: 0.4rem; }
.poker-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.poker-action-btn {
  flex: 1; min-width: 70px; padding: 0.55rem 0.5rem; border-radius: 10px; cursor: pointer;
  font-family: inherit; font-size: 0.88rem; font-weight: 600; border: 1px solid ${C.border};
  background: ${C.surface}; color: ${C.text}; transition: border-color 0.12s, opacity 0.12s;
}
.poker-action-btn:hover:not(:disabled) { border-color: ${C.accent}; }
.poker-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.poker-action-btn.fold { border-color: ${C.rose}44; color: ${C.rose}; }
.poker-action-btn.fold:hover { border-color: ${C.rose}; }
.poker-action-btn.call { background: ${C.accent}; color: #fff; border-color: ${C.accent}; }
.poker-action-btn.call:hover { opacity: 0.88; }
.poker-action-btn.raise { background: ${C.gold}22; border-color: ${C.gold}44; color: ${C.gold}; }
.poker-action-btn.raise:hover { border-color: ${C.gold}; }
.poker-raise-picker {
  background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 10px;
  padding: 0.7rem; display: flex; flex-direction: column; gap: 0.5rem;
}
.poker-raise-presets { display: flex; gap: 0.4rem; }
.poker-raise-preset-btn {
  flex: 1; padding: 0.4rem; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-size: 0.78rem; font-weight: 600; border: 1px solid ${C.border};
  background: ${C.card}; color: ${C.text}; transition: border-color 0.12s;
}
.poker-raise-preset-btn:hover { border-color: ${C.gold}; color: ${C.gold}; }
.poker-raise-preset-btn.sel { border-color: ${C.gold}; color: ${C.gold}; background: ${C.gold}15; }
.poker-raise-confirm-btn {
  padding: 0.45rem; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-size: 0.88rem; font-weight: 700; border: none; background: ${C.gold}; color: #000;
}
.poker-hand-result {
  border-radius: 12px; padding: 0.8rem 1rem; text-align: center;
  font-weight: 700; font-size: 0.95rem; background: ${C.surface};
  border: 1px solid ${C.border}; animation: poker-card-deal 200ms ease both;
}
.poker-hand-result.win { background: ${C.emerald}22; border-color: ${C.emerald}; color: ${C.emerald}; }
.poker-hand-result.lose { background: ${C.rose}15; border-color: ${C.rose}44; color: ${C.muted}; }
.poker-showdown-hands {
  display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;
}
.poker-showdown-player {
  display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem;
}
.poker-showdown-player .name { min-width: 5rem; color: ${C.muted}; }
.poker-showdown-player .hand-name { font-weight: 600; }
.poker-showdown-player.winner .hand-name { color: ${C.emerald}; }
.poker-showdown-player.loser .hand-name { color: ${C.dim}; }
.poker-ai-folded-label { font-size: 0.78rem; color: ${C.dim}; font-style: italic; }

.poker-auth-notice {
  font-size: 0.75rem; color: ${C.muted}; text-align: center; padding: 0.4rem;
  border-radius: 8px; background: ${C.surface}; border: 1px solid ${C.border};
}

@media (max-width: 480px) {
  .poker-ai-row { flex-direction: column; }
  .poker-diff-row { flex-wrap: wrap; justify-content: center; }
  .poker-actions { gap: 0.4rem; }
  .poker-action-btn { min-width: 60px; font-size: 0.8rem; }
  .poker-raise-presets { flex-direction: column; }
}

/* ---- Snake ---- */
.snake-board-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
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
.snake-cell.snake-head { background: ${C.emerald}; border-radius: 4px; box-shadow: 0 0 8px ${C.emerald}aa; }
.snake-cell.snake-food { background: ${C.gold}; border-radius: 50%; box-shadow: 0 0 8px ${C.gold}aa; }
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
  background: ${C.bg}cc;
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
.snake-lb-row.snake-lb-me { background: ${C.accent}1a; border-radius: 8px; }
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
.bb-cell.ghost-valid { background: ${C.accent}66; }
.bb-cell.ghost-invalid { background: ${C.rose}44; }
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
.bb-piece-btn.selected { border-color: ${C.accent}; background: ${C.accent}1a; }
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
.tm-board-container {
  position: relative;
  margin: 0 auto;
  overflow: visible;
}
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
  50%  { border-color: ${C.rose}; box-shadow: 0 0 12px ${C.rose}66; }
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
.tm-slot.filled { border-style: solid; border-color: ${C.accent}33; background: ${C.card}; }
.tm-slot.clear-target {
  cursor: pointer;
  border-color: ${C.rose};
  background: ${C.rose}1a;
  animation: tm-slot-pulse 0.7s ease infinite alternate;
}
.tm-slot.clear-target:hover { background: ${C.rose}33; }
@keyframes tm-slot-pulse {
  from { box-shadow: 0 0 0 0 ${C.rose}44; }
  to   { box-shadow: 0 0 0 4px ${C.rose}00; }
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
.tm-booster-btn:hover:not(:disabled) { border-color: ${C.accent}; background: ${C.accent}10; }
.tm-booster-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.tm-booster-btn.active { border-color: ${C.rose}; background: ${C.rose}15; }
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
.tm-level-btn.selected { border-color: ${C.accent}; background: ${C.accent}22; color: ${C.accent}; }
.tm-level-btn.done { border-color: ${C.emerald}44; color: ${C.emerald}; }
.tm-level-btn.done.selected { border-color: ${C.emerald}; background: ${C.emerald}22; }
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
.tm-play-btn:hover { background: #2f6fe0; }
.tm-level-won {
  background: ${C.card};
  border: 1px solid ${C.emerald}55;
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
.tm-next-btn:hover { background: #059669; }
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
  background: ${C.rose}22 !important;
  color: ${C.rose} !important;
  animation: tm-timer-pulse 0.9s ease infinite alternate;
}
@keyframes tm-timer-pulse {
  from { box-shadow: 0 0 0 0 ${C.rose}33; }
  to   { box-shadow: 0 0 0 5px ${C.rose}00; }
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
.tm-tier-card:hover { border-color: ${C.accent}; background: ${C.accent}0a; }
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

/* ---- Idle Clicker ---- */
.idle-container { display: flex; flex-direction: column; height: 100%; }
.idle-main { flex: 1; padding: 1.5rem 1.25rem; max-width: 800px; margin: 0 auto; width: 100%; }
.idle-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 1.5rem; }
.idle-stat-box {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 0.8rem;
  text-align: center;
}
.idle-stat-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: ${C.muted}; }
.idle-stat-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 1.2rem; margin-top: 0.2rem; }
.idle-stat-value.currency { color: ${C.gold}; }
.idle-stat-value.prestige { color: ${C.accent}; }
.idle-stat-value.income { color: ${C.emerald}; }

.idle-tap-section { text-align: center; margin-bottom: 2rem; }
.idle-tap-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${C.gold}, ${C.accent});
  border: 3px solid ${C.border};
  color: white;
  font-size: 2.5rem;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  font-weight: 700;
}
.idle-tap-btn:active { transform: scale(0.95); box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
.idle-tap-label { font-size: 0.85rem; color: ${C.muted}; margin-top: 0.5rem; }

.idle-shop { margin-top: 1rem; }
.idle-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid ${C.border};
}
.idle-tab {
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  color: ${C.muted};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  position: relative;
  transition: color 0.12s ease;
}
.idle-tab.active {
  color: ${C.accent};
  font-weight: 700;
}
.idle-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: ${C.accent};
}

.idle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.idle-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.12s ease, transform 0.12s ease;
}
.idle-card:hover { border-color: ${C.accent}; transform: translateY(-2px); }
.idle-card-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.idle-card-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.3rem; }
.idle-card-desc { font-size: 0.75rem; color: ${C.muted}; margin-bottom: 0.5rem; }
.idle-card-stats { font-size: 0.7rem; color: ${C.muted}; margin-bottom: 0.5rem; }
.idle-card-btn {
  width: 100%;
  padding: 0.5rem;
  background: ${C.accent};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;
}
.idle-card-btn:hover { background: #2f6fe0; }
.idle-card-btn:disabled { background: ${C.muted}; cursor: not-allowed; }

.idle-coin-popup {
  position: fixed;
  pointer-events: none;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: ${C.gold};
  font-size: 1.2rem;
  animation: float-up 1s ease-out forwards;
}
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
}

.prestige-modal {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1.25rem;
}
.prestige-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 2rem;
  text-align: center;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.prestige-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
.prestige-card .sub { color: ${C.muted}; font-size: 0.9rem; margin-bottom: 1.25rem; }
.prestige-rows {
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  border-top: 1px solid ${C.border};
  border-bottom: 1px solid ${C.border};
  padding: 1rem 0;
  margin-bottom: 1.25rem;
}
.prestige-row { display: flex; justify-content: space-between; padding: 0.3rem 0; }
.prestige-row .k { color: ${C.muted}; }
.prestige-row .v { color: ${C.gold}; font-weight: 600; }
.prestige-buttons { display: flex; gap: 0.8rem; }
.prestige-confirm {
  flex: 1;
  padding: 0.8rem;
  background: ${C.accent};
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;
}
.prestige-confirm:hover { background: #2f6fe0; }
.prestige-cancel {
  flex: 1;
  padding: 0.8rem;
  background: ${C.surface};
  color: ${C.text};
  border: 1px solid ${C.border};
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease;
}
.prestige-cancel:hover { border-color: ${C.accent}; }

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
.dr-level-btn.selected { border-color: ${C.gold}; box-shadow: 0 0 0 2px ${C.gold}55; }
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
.dr-cell.exit { background: ${C.accent}33; }
.dr-cell.trap { background: ${C.rose}22; }
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
  background: ${C.bg}cc; border-radius: 12px; z-index: 5;
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
`;

/* ============================================================
   Shared timer hook
   ============================================================ */
function useTimer(running) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { secs, fmt: fmt(secs) };
}

/* ============================================================
   Platform API helpers — forward the iframe JWT
   ============================================================ */
// The shell injects ?token=… on the initial iframe load; capture it once
// and forward it on every API call via the x-usernode-token header.
const USERNODE_TOKEN = new URLSearchParams(window.location.search).get('token') || '';

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(USERNODE_TOKEN ? { 'x-usernode-token': USERNODE_TOKEN } : {}),
      ...(opts.headers || {}),
    },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, body };
}

// HH:MM:SS for a millisecond remainder.
function fmtCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// "12h 45m" for a millisecond remainder — hours + minutes only.
function fmtHoursMins(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${h}h ${m}m`;
}

/* ============================================================
   Streak → score multiplier tiers
   ============================================================ */
// Loyal daily players earn more on every win. Tiers are listed high→low;
// the first whose `min` the streak meets wins. Centralized here so the
// breakpoints/multipliers are a one-line balance change. The 5-day→1.2x and
// 10-day→1.5x breakpoints are the headline; 3-day and 20-day fill the ramp.
const STREAK_TIERS = [
  { min: 20, mult: 2.0 },
  { min: 10, mult: 1.5 },
  { min: 5,  mult: 1.2 },
  { min: 3,  mult: 1.1 },
  { min: 0,  mult: 1.0 },
];

// Multiplier for a streak length (consecutive days, including the current win).
function streakMultiplier(streak) {
  for (const t of STREAK_TIERS) if (streak >= t.min) return t.mult;
  return 1.0;
}

// The next higher tier above the current streak: { daysAway, mult }, or null
// when already at the top tier.
function nextTierInfo(streak) {
  const above = STREAK_TIERS
    .filter(t => t.min > streak)
    .sort((a, b) => a.min - b.min);
  if (above.length === 0) return null;
  return { daysAway: above[0].min - streak, mult: above[0].mult };
}

// Live countdown to `nextResetUtc`, driven by server time (Date.now()+offset)
// so a wrong device clock can't unlock early. Calls onExpire once at zero.
function useCountdown(nextResetUtc, offset, onExpire) {
  const [now, setNow] = useState(() => Date.now() + offset);
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    setNow(Date.now() + offset);
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [nextResetUtc, offset]);
  const target = nextResetUtc ? new Date(nextResetUtc).getTime() : 0;
  const remaining = target - now;
  useEffect(() => {
    if (nextResetUtc && remaining <= 0 && !fired.current) {
      fired.current = true;
      onExpire && onExpire();
    }
  }, [remaining, nextResetUtc]);
  return fmtCountdown(remaining);
}

/* ============================================================
   Game 1 — Mini Sudoku (6×6)
   ============================================================ */
const SUDOKU6_SOLUTION = [
  [1, 2, 3, 4, 5, 6],
  [4, 5, 6, 1, 2, 3],
  [2, 3, 1, 5, 6, 4],
  [5, 6, 4, 2, 3, 1],
  [3, 1, 2, 6, 4, 5],
  [6, 4, 5, 3, 1, 2],
];

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function generateSudoku6() {
  // 1. start from the hardcoded valid solution
  let sol = SUDOKU6_SOLUTION.map(row => row.slice());

  // 2. random digit permutation (remap 1..6)
  const perm = shuffle([1, 2, 3, 4, 5, 6]);
  const map = {};
  for (let i = 0; i < 6; i++) map[i + 1] = perm[i];
  sol = sol.map(row => row.map(v => map[v]));

  // 3. swap rows within each horizontal band (rows 0-1, 2-3, 4-5)
  for (let band = 0; band < 3; band++) {
    if (Math.random() < 0.5) {
      const r0 = band * 2, r1 = band * 2 + 1;
      [sol[r0], sol[r1]] = [sol[r1], sol[r0]];
    }
  }

  // 4. blank out 14 random cells
  const puzzle = sol.map(row => row.slice());
  const positions = shuffle(Array.from({ length: 36 }, (_, i) => i)).slice(0, 14);
  positions.forEach(p => { puzzle[Math.floor(p / 6)][p % 6] = 0; });

  return { solution: sol, puzzle };
}

const boxAt = (r, c) => Math.floor(r / 2) * 2 + Math.floor(c / 3);

function SudokuGame({ onWin, onStepChange }) {
  const init = useRef(generateSudoku6()).current;
  const { solution, puzzle } = init;
  const [grid, setGrid] = useState(() => puzzle.map(row => row.slice()));
  const [selected, setSelected] = useState(null); // [r, c]
  const [errors, setErrors] = useState(() => new Set());
  const [steps, setSteps] = useState(0);
  const [done, setDone] = useState(false);
  const { secs, fmt } = useTimer(!done);

  const isGiven = (r, c) => puzzle[r][c] !== 0;

  const place = (val) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (isGiven(r, c)) return;

    const ng = grid.map(row => row.slice());
    ng[r][c] = val;
    setGrid(ng);

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    // track errors
    const ne = new Set(errors);
    const key = `${r},${c}`;
    if (val !== 0 && val !== solution[r][c]) ne.add(key);
    else ne.delete(key);
    setErrors(ne);

    // win check
    const solved = ng.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
    if (solved) {
      setDone(true);
      const score = Math.max(1200 - newSteps * 15 - secs * 2, 200);
      onWin(score, newSteps, secs);
    }
  };

  const selKey = selected ? `${selected[0]},${selected[1]}` : null;
  const selBox = selected ? boxAt(selected[0], selected[1]) : -1;

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Steps</div>
          <div className="pvalue">{steps}</div>
        </div>
        <div className="pill">
          <div className="plabel">Filled</div>
          <div className="pvalue">
            {grid.flat().filter(v => v !== 0).length}/36
          </div>
        </div>
      </div>

      <div className="sudoku">
        {grid.map((row, r) =>
          row.map((v, c) => {
            const key = `${r},${c}`;
            const given = isGiven(r, c);
            const isSel = selKey === key;
            const isHl = !isSel && selected &&
              (selected[0] === r || selected[1] === c || boxAt(r, c) === selBox);
            const isErr = errors.has(key);
            const cls = ['scell'];
            if (given) cls.push('given'); else if (v !== 0) cls.push('user');
            if (isSel) cls.push('sel'); else if (isHl) cls.push('hl');
            if (isErr) cls.push('err');
            return (
              <div
                key={key}
                className={cls.join(' ')}
                style={{
                  borderRight: c === 2 ? `2px solid ${C.border}` : undefined,
                  borderBottom: (r === 1 || r === 3) ? `2px solid ${C.border}` : undefined,
                }}
                onClick={() => !given && !done && setSelected([r, c])}
              >
                {v !== 0 ? v : ''}
              </div>
            );
          })
        )}
      </div>

      <div className="numpad">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button key={n} className="numkey" onClick={() => place(n)}>{n}</button>
        ))}
      </div>
      <div className="numpad" style={{ gridTemplateColumns: '1fr', marginTop: '0.5rem' }}>
        <button className="numkey erase" onClick={() => place(0)}>Erase</button>
      </div>
    </div>
  );
}

/* ============================================================
   Account indicator — confirms the signed-in Usernode account so the
   player knows their progress is being saved (not just session state).
   ============================================================ */
function AccountChip({ loading, authOk, user }) {
  if (loading) {
    return (
      <div className="account-chip loading" title="Checking your account…">
        <span className="dot" /> <span className="who">Connecting…</span>
      </div>
    );
  }
  if (!authOk || !user) {
    return (
      <div className="account-chip off" title="Not signed in — progress won't be saved. Open this app inside Usernode.">
        <span className="dot" /> <span className="who">Signed out</span>
      </div>
    );
  }
  const name = user.username || 'Linked account';
  const initial = (user.username || '?').charAt(0).toUpperCase();
  return (
    <div className="account-chip on" title={`Signed in as ${name} — your daily progress is saved to your account.`}>
      <span className="avatar mono">{initial}</span>
      <span className="who">
        <span className="uname">{name}</span>
        <span className="status">● Progress saved</span>
      </span>
    </div>
  );
}

/* ============================================================
   Locked screen — shown when today's attempt is already used
   ============================================================ */
function LockedScreen({ game, attempt, nextResetUtc, offset, onReset, onBack }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const hasResult = attempt && attempt.score != null;
  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="locked-card">
      <div className="lock-icon">🔒</div>
      <h2>You've played today</h2>
      <div className="sub">{game.name} — one attempt per day</div>
      <div className="countdown-block">
        <div className="clabel">Next puzzle in</div>
        <div className="ctime mono">{countdown}</div>
      </div>
      {hasResult && (
        <div className="locked-result">
          <div className="score-row"><span className="k">Score</span><span className="v">+{attempt.score}</span></div>
          {attempt.steps != null && (
            <div className="score-row"><span className="k">Steps</span><span className="v">{attempt.steps}</span></div>
          )}
          {attempt.timeSecs != null && (
            <div className="score-row"><span className="k">Time</span><span className="v">{fmtTime(attempt.timeSecs)}</span></div>
          )}
        </div>
      )}
      <button className="primary-btn" onClick={onBack}>Back to Lobby</button>
    </div>
  );
}

/* ============================================================
   Game 2 — Word Hunt (8×8 word search)
   ============================================================ */
const WS_SIZE = 8;

// 8 directions: horizontal, vertical, and both diagonals (forwards + backwards).
const WS_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// Themed word sets. Words are <= 6 letters so they always place on an 8×8 grid.
const WORD_SETS = [
  { theme: 'Space',   words: ['COMET', 'ORBIT', 'PLANET', 'GALAXY', 'NEBULA', 'ROCKET', 'STAR', 'MARS'] },
  { theme: 'Ocean',   words: ['CORAL', 'WHALE', 'SHARK', 'TIDE', 'PEARL', 'SQUID', 'WAVE', 'REEF'] },
  { theme: 'Kitchen', words: ['SPOON', 'WHISK', 'KNIFE', 'PLATE', 'KETTLE', 'GRATER', 'OVEN', 'BOWL'] },
  { theme: 'Forest',  words: ['CEDAR', 'MAPLE', 'BIRCH', 'WILLOW', 'ACORN', 'FERN', 'MOSS', 'PINE'] },
  { theme: 'Music',   words: ['TEMPO', 'CHORD', 'PIANO', 'VIOLIN', 'MELODY', 'FLUTE', 'DRUM', 'BANJO'] },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const wsRandLetter = () => ALPHABET[Math.floor(Math.random() * 26)];

// Try to place every word into a fresh grid. Returns the filled letter grid,
// or null if any word couldn't be placed (caller retries with a new grid).
function placeWords(words) {
  const grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 250 && !placed; attempt++) {
      const [dr, dc] = WS_DIRS[Math.floor(Math.random() * WS_DIRS.length)];
      const r0 = Math.floor(Math.random() * WS_SIZE);
      const c0 = Math.floor(Math.random() * WS_SIZE);
      const rEnd = r0 + dr * (word.length - 1);
      const cEnd = c0 + dc * (word.length - 1);
      if (rEnd < 0 || rEnd >= WS_SIZE || cEnd < 0 || cEnd >= WS_SIZE) continue;
      // Overlap is allowed only where the existing letter already matches.
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const ch = grid[r0 + dr * i][c0 + dc * i];
        if (ch !== null && ch !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) grid[r0 + dr * i][c0 + dc * i] = word[i];
      placed = true;
    }
    if (!placed) return null;
  }
  return grid;
}

function generateWordSearch() {
  const set = WORD_SETS[Math.floor(Math.random() * WORD_SETS.length)];
  const words = set.words.slice();
  let grid = null;
  for (let attempt = 0; attempt < 60 && !grid; attempt++) grid = placeWords(words);
  if (!grid) grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  // Fill the empty cells with random filler letters.
  const letters = grid.map(row => row.map(ch => ch || wsRandLetter()));
  return { theme: set.theme, words, letters };
}

function WordHuntGame({ onWin, onStepChange }) {
  const board = useRef(generateWordSearch()).current;
  const { theme, words, letters } = board;
  const total = words.length;

  const [found, setFound] = useState(() => new Set());       // found word strings
  const [foundCells, setFoundCells] = useState(() => new Set()); // locked cell indices
  const [anchor, setAnchor] = useState(null);                // [r, c] drag start
  const [sel, setSel] = useState([]);                        // cell indices in current drag
  const [steps, setSteps] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const { secs, fmt } = useTimer(!done);

  // Keep the latest elapsed seconds reachable inside event-handler closures.
  const secsRef = useRef(0);
  secsRef.current = secs;

  const idx = (r, c) => r * WS_SIZE + c;

  // Straight-line path of cell indices from the anchor to (r, c), or null if
  // the target isn't on a horizontal / vertical / 45° diagonal from the anchor.
  const linePath = (a, r, c) => {
    const dr0 = r - a[0], dc0 = c - a[1];
    if (dr0 === 0 && dc0 === 0) return [idx(a[0], a[1])];
    const adr = Math.abs(dr0), adc = Math.abs(dc0);
    if (!(dr0 === 0 || dc0 === 0 || adr === adc)) return null;
    const len = Math.max(adr, adc);
    const sr = Math.sign(dr0), sc = Math.sign(dc0);
    const path = [];
    for (let i = 0; i <= len; i++) path.push(idx(a[0] + sr * i, a[1] + sc * i));
    return path;
  };

  const startSel = (r, c) => {
    if (done) return;
    setAnchor([r, c]);
    setSel([idx(r, c)]);
  };

  const moveSel = (r, c) => {
    if (done || !anchor) return;
    const path = linePath(anchor, r, c);
    if (path) setSel(path);
  };

  const endSel = () => {
    if (done || !anchor || sel.length === 0) { setAnchor(null); setSel([]); return; }

    const word = sel.map(i => letters[Math.floor(i / WS_SIZE)][i % WS_SIZE]).join('');
    const rev = word.split('').reverse().join('');
    const match = words.find(w => (w === word || w === rev) && !found.has(w));

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    if (match) {
      const nf = new Set(found); nf.add(match);
      const nc = new Set(foundCells); sel.forEach(i => nc.add(i));
      setFound(nf);
      setFoundCells(nc);

      const newScore = score + match.length * match.length * 10;
      setScore(newScore);

      if (nf.size === total) {
        setDone(true);
        const finalScore = Math.max(newScore - secsRef.current * 2, 100);
        onWin(finalScore, newSteps, secsRef.current);
      }
    }

    setAnchor(null);
    setSel([]);
  };

  const selSet = new Set(sel);

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Found</div>
          <div className="pvalue">{found.size}/{total}</div>
        </div>
        <div className="pill">
          <div className="plabel">Steps</div>
          <div className="pvalue">{steps}</div>
        </div>
      </div>

      <div className="word-theme">Theme: <b>{theme}</b> · drag across letters to find each word</div>

      <div className="wordsearch" onPointerUp={endSel} onPointerLeave={endSel}>
        {letters.map((row, r) =>
          row.map((ch, c) => {
            const i = idx(r, c);
            const cls = ['wcell'];
            if (foundCells.has(i)) cls.push('found');
            if (selSet.has(i)) cls.push('sel');
            return (
              <div
                key={i}
                className={cls.join(' ')}
                onPointerDown={(e) => {
                  e.preventDefault();
                  // Release implicit touch pointer-capture so pointerenter
                  // fires on sibling cells as the finger drags across them.
                  if (e.target.releasePointerCapture && e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
                    e.target.releasePointerCapture(e.pointerId);
                  }
                  startSel(r, c);
                }}
                onPointerEnter={() => moveSel(r, c)}
              >
                {ch}
              </div>
            );
          })
        )}
      </div>

      <div className="word-list">
        {words.map(w => (
          <span key={w} className={`word-chip${found.has(w) ? ' found' : ''}`}>{w}</span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 3 — Crypto Wordle (daily 5-letter Web3 term)
   ============================================================ */
const CW_LEN = 5;
const CW_MAX = 6;

// Curated, well-known 5-letter Web3 / crypto terms. The daily answer is
// chosen deterministically from this list, so everyone gets the same word
// on the same UTC day (shareable, comparable). No dictionary validates the
// guesses — any 5 letters are accepted — but the answer is always from here.
const CW_ANSWERS = [
  'TOKEN', 'BLOCK', 'CHAIN', 'MINER', 'NONCE', 'STAKE', 'VAULT', 'TRADE',
  'WHALE', 'PROOF', 'AUDIT', 'ETHER', 'YIELD', 'LAYER', 'NODES', 'MOONS',
  'DEGEN', 'ALPHA', 'FLOOR', 'MINTS', 'ASSET', 'BYTES', 'PEERS', 'SHARD',
  'BASED', 'VYPER', 'BLOBS', 'WAGMI', 'PUMPS', 'DUMPS',
];

const CW_EMOJI = { green: '🟩', yellow: '🟨', gray: '⬛' };
const CW_KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// UTC day number, anchored to server time (offset = serverNow − clientNow),
// so the daily word can't desync from the lock countdown on a skewed clock.
function cwDayNum(offset) {
  const d = new Date(Date.now() + (offset || 0));
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000
  );
}

// Standard two-pass Wordle coloring (handles duplicate letters): greens
// first, consuming a tally of the answer's letters; then yellows only while
// an unconsumed copy of the letter remains, else gray.
function cwScoreGuess(guess, answer) {
  const res = Array(CW_LEN).fill('gray');
  const counts = {};
  for (let i = 0; i < CW_LEN; i++) counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  for (let i = 0; i < CW_LEN; i++) {
    if (guess[i] === answer[i]) { res[i] = 'green'; counts[guess[i]]--; }
  }
  for (let i = 0; i < CW_LEN; i++) {
    if (res[i] === 'green') continue;
    if (counts[guess[i]] > 0) { res[i] = 'yellow'; counts[guess[i]]--; }
  }
  return res;
}

function CryptoWordleGame({ onWin, onLose, onStepChange, offset }) {
  const dayNum = useRef(cwDayNum(offset)).current;
  const answer = useRef(
    CW_ANSWERS[((dayNum % CW_ANSWERS.length) + CW_ANSWERS.length) % CW_ANSWERS.length]
  ).current;

  const [guesses, setGuesses] = useState([]); // [{ word, result: ['green'|'yellow'|'gray', …] }]
  const [cur, setCur] = useState('');          // in-progress letters for the active row
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const { secs, fmt } = useTimer(!done);

  // Best color seen per letter, for the on-screen keyboard tinting.
  const keyState = {};
  const rank = { gray: 0, yellow: 1, green: 2 };
  for (const g of guesses) {
    for (let i = 0; i < CW_LEN; i++) {
      const ch = g.word[i], c = g.result[i];
      if (!(ch in keyState) || rank[c] > rank[keyState[ch]]) keyState[ch] = c;
    }
  }

  const buildShare = (rows, solved) =>
    `Crypto Wordle #${dayNum} ${solved ? rows.length : 'X'}/${CW_MAX}\n` +
    rows.map(r => r.result.map(c => CW_EMOJI[c]).join('')).join('\n');

  const submit = () => {
    if (done) return;
    if (cur.length !== CW_LEN) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const result = cwScoreGuess(cur, answer);
    const rows = [...guesses, { word: cur, result }];
    setGuesses(rows);
    setCur('');
    onStepChange(rows.length);

    if (cur === answer) {
      setDone(true);
      const score = Math.max((7 - rows.length) * 180 - secs * 2, 100);
      onWin(score, rows.length, secs, { share: buildShare(rows, true) });
    } else if (rows.length >= CW_MAX) {
      setDone(true);
      onLose(rows.length, secs, { share: buildShare(rows, false), answer });
    }
  };

  const typeLetter = (ch) => { if (!done && cur.length < CW_LEN) setCur(cur + ch); };
  const backspace = () => { if (!done) setCur(cur.slice(0, -1)); };

  // Physical keyboard. The window listener is registered once; it dispatches
  // through a ref so each keypress runs the latest closure (fresh cur/secs).
  const apiRef = useRef({});
  apiRef.current = { submit, typeLetter, backspace };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apiRef.current.submit(); return; }
      if (e.key === 'Backspace') { apiRef.current.backspace(); return; }
      const ch = (e.key || '').toUpperCase();
      if (ch.length === 1 && ch >= 'A' && ch <= 'Z') apiRef.current.typeLetter(ch);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rowsLeft = Math.max(CW_MAX - guesses.length, 0);

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Guesses</div>
          <div className="pvalue">{Math.min(guesses.length, CW_MAX)}/{CW_MAX}</div>
        </div>
        <div className="pill">
          <div className="plabel">Left</div>
          <div className="pvalue">{rowsLeft}</div>
        </div>
      </div>

      <div className="cw-board">
        {Array.from({ length: CW_MAX }).map((_, r) => {
          const g = guesses[r];
          const isCurrent = !g && r === guesses.length && !done;
          const letters = g ? g.word : (isCurrent ? cur : '');
          return (
            <div key={r} className={`cw-row${isCurrent && shake ? ' shake' : ''}`}>
              {Array.from({ length: CW_LEN }).map((__, c) => {
                const ch = letters[c] || '';
                const cls = ['cw-tile'];
                if (g) cls.push(g.result[c]);
                else if (ch) cls.push('filled');
                return <div key={c} className={cls.join(' ')}>{ch}</div>;
              })}
            </div>
          );
        })}
      </div>

      <div className="cw-kbd">
        {CW_KEYS.map((row, ri) => (
          <div key={ri} className="cw-kbd-row">
            {ri === 2 && <button className="cw-key wide" onClick={submit}>Enter</button>}
            {row.split('').map(ch => (
              <button
                key={ch}
                className={`cw-key${keyState[ch] ? ' ' + keyState[ch] : ''}`}
                onClick={() => typeLetter(ch)}
              >
                {ch}
              </button>
            ))}
            {ri === 2 && <button className="cw-key wide" onClick={backspace}>⌫</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 4 — Minesweeper (8×8, 10 mines, classic game)
   ============================================================ */
const MS_ROWS = 8, MS_COLS = 8, MS_MINES = 10, MS_SAFE = MS_ROWS * MS_COLS - MS_MINES; // 54

const MS_HISTORY_KEY = 'puzzlechain_minesweeper_history';
const MS_HISTORY_MAX = 50;

function msLoadHistory() {
  try { return JSON.parse(localStorage.getItem(MS_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function msSaveEntry(entry) {
  const h = msLoadHistory();
  h.unshift(entry);
  if (h.length > MS_HISTORY_MAX) h.length = MS_HISTORY_MAX;
  try { localStorage.setItem(MS_HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function generateMines(firstR, firstC) {
  const protected_ = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = firstR + dr, c = firstC + dc;
      if (r >= 0 && r < MS_ROWS && c >= 0 && c < MS_COLS)
        protected_.add(r * MS_COLS + c);
    }
  }
  const indices = [];
  for (let i = 0; i < MS_ROWS * MS_COLS; i++) if (!protected_.has(i)) indices.push(i);
  // Fisher-Yates on eligible indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, MS_MINES));
}

function computeAdjacency(mineSet) {
  const adj = new Int8Array(MS_ROWS * MS_COLS);
  for (let r = 0; r < MS_ROWS; r++) {
    for (let c = 0; c < MS_COLS; c++) {
      const idx = r * MS_COLS + c;
      if (mineSet.has(idx)) { adj[idx] = -1; continue; }
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS && mineSet.has(nr * MS_COLS + nc)) count++;
      }
      adj[idx] = count;
    }
  }
  return adj;
}

function floodReveal(startIdx, adjacency, mineSet, prevRevealed, flagged) {
  const next = new Set(prevRevealed);
  const queue = [startIdx];
  while (queue.length) {
    const idx = queue.shift();
    if (next.has(idx) || mineSet.has(idx) || flagged.has(idx)) continue;
    next.add(idx);
    if (adjacency[idx] === 0) {
      const r = Math.floor(idx / MS_COLS), c = idx % MS_COLS;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS) queue.push(nr * MS_COLS + nc);
      }
    }
  }
  return next;
}

function MinesweeperGame({ onWin, onLose, onStepChange, resetKey }) {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('game');
  const [mineSet, setMineSet] = useState(null);
  const [adjacency, setAdjacency] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [flagged, setFlagged] = useState(() => new Set());
  const [done, setDone] = useState(false);
  const [gameOverMine, setGameOverMine] = useState(null);
  const [steps, setSteps] = useState(0);
  const [isMock, setIsMock] = useState(false);
  const [gameHistory, setGameHistory] = useState(() => msLoadHistory());
  const flagTimerRef = useRef(null);
  const { secs, fmt: timeFmt } = useTimer(!done && mineSet !== null);

  // Reset when parent increments resetKey
  useEffect(() => {
    setMineSet(null);
    setAdjacency(null);
    setRevealed(new Set());
    setFlagged(new Set());
    setDone(false);
    setGameOverMine(null);
    setSteps(0);
    setActiveTab('game');
  }, [resetKey]);

  // Bridge: detect mock mode
  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  const safeRevealed = mineSet
    ? Array.from(revealed).filter(i => !mineSet.has(i)).length
    : 0;
  const cashOutActive = safeRevealed >= 10 && !done;
  const cashoutMultiplier = parseFloat((1.0 + safeRevealed / MS_SAFE).toFixed(2));

  const handleReveal = (idx) => {
    if (done || revealed.has(idx) || flagged.has(idx)) return;
    const r = Math.floor(idx / MS_COLS), c = idx % MS_COLS;

    let mines = mineSet, adj = adjacency;
    if (!mines) {
      mines = generateMines(r, c);
      adj = computeAdjacency(mines);
      setMineSet(mines);
      setAdjacency(adj);
    }

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    if (mines.has(idx)) {
      setGameOverMine(idx);
      setDone(true);
      const baseScore = 0;
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss', score: 0, steps: newSteps, secs, safeRevealed, cashOut: false, cashoutMultiplier: null,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Minesweeper ${entry.date} — 💥 Game Over · ${safeRevealed}/54 safe · ${secs}s · +0 pts`;
      onLose(newSteps, secs, { share: shareText });
      return;
    }

    const newRevealed = floodReveal(idx, adj, mines, revealed, flagged);
    setRevealed(newRevealed);

    const newSafeRevealed = Array.from(newRevealed).filter(i => !mines.has(i)).length;
    if (newSafeRevealed >= MS_SAFE) {
      // Full board clear
      setDone(true);
      const baseScore = Math.max(newSafeRevealed * 30 - secs * 2, 100) + 200;
      const dateStr = new Date().toISOString().slice(0, 10);
      const entry = {
        id: String(Date.now()),
        date: dateStr,
        outcome: 'win', score: baseScore, steps: newSteps, secs, safeRevealed: newSafeRevealed, cashOut: false, cashoutMultiplier: 1.0,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Minesweeper ${dateStr} — ✅ Full Clear · ${newSafeRevealed}/54 safe · ${secs}s · +${baseScore} pts`;
      onWin(baseScore, newSteps, secs, { share: shareText, cashOut: false });
    }
  };

  const handleCashOut = () => {
    if (!cashOutActive || !mineSet) return;
    setDone(true);
    const baseScore = Math.max(safeRevealed * 30 - secs * 2, 100);
    const finalScore = Math.round(baseScore * cashoutMultiplier);
    const dateStr = new Date().toISOString().slice(0, 10);
    const entry = {
      id: String(Date.now()),
      date: dateStr,
      outcome: 'win', score: finalScore, steps, secs, safeRevealed, cashOut: true, cashoutMultiplier,
    };
    msSaveEntry(entry);
    setGameHistory(msLoadHistory());
    const shareText = `Minesweeper ${dateStr} — 💰×${cashoutMultiplier} · ${safeRevealed}/54 safe · ${secs}s · +${finalScore} pts`;
    onWin(finalScore, steps, secs, { share: shareText, cashOut: true, cashoutMultiplier });
  };

  const handleFlag = (idx) => {
    if (done || revealed.has(idx)) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Long-press flagging
  const onPointerDown = (idx) => {
    flagTimerRef.current = setTimeout(() => { handleFlag(idx); flagTimerRef.current = null; }, 500);
  };
  const onPointerUp = () => { if (flagTimerRef.current) { clearTimeout(flagTimerRef.current); flagTimerRef.current = null; } };

  const minesLeft = MS_MINES - flagged.size;

  const bannerText = isMock
    ? '🔧 Developer Mode — mock wallet active'
    : (window.usernode ? '🔗 Usernode connected' : null);

  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>
      <div className="ms-game-header">
        {bannerText && <span className="ms-usernode-banner">{bannerText}</span>}
        <button className="ms-theme-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{timeFmt}</div>
            </div>
            <div className="pill">
              <div className="plabel">Mines Left</div>
              <div className="pvalue">{minesLeft}</div>
            </div>
            <div className="pill">
              <div className="plabel">Safe Revealed</div>
              <div className="pvalue">{safeRevealed}/{MS_SAFE}</div>
            </div>
          </div>

          <div
            className="ms-grid"
            data-ms-theme={theme}
            onContextMenu={e => e.preventDefault()}
          >
            {Array.from({ length: MS_ROWS * MS_COLS }, (_, idx) => {
              const isRevealed = revealed.has(idx);
              const isFlagged = flagged.has(idx);
              const isMine = mineSet && mineSet.has(idx);
              const isExploded = gameOverMine === idx;
              const isMineVisible = done && mineSet && mineSet.has(idx) && !isRevealed;
              const adjVal = adjacency && adjacency[idx];

              let cls = 'ms-cell';
              if (isExploded) cls += ' ms-exploded';
              else if (isMineVisible) cls += ' ms-mine-dead';
              else if (isRevealed) { cls += ' ms-revealed'; if (adjVal > 0) cls += ` ms-n${adjVal}`; }
              else if (isFlagged) cls += ' ms-flagged';
              else cls += ' ms-hidden';

              let content = '';
              if (isExploded) content = '💥';
              else if (isMineVisible) content = '💣';
              else if (isRevealed && adjVal > 0) content = adjVal;
              else if (isRevealed && adjVal === 0) content = '';
              else if (isFlagged) content = '🚩';

              return (
                <div
                  key={idx}
                  className={cls}
                  onClick={() => !done && !isFlagged && handleReveal(idx)}
                  onContextMenu={e => { e.preventDefault(); handleFlag(idx); }}
                  onPointerDown={() => onPointerDown(idx)}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                >
                  {content}
                </div>
              );
            })}
          </div>

          <div className="ms-action-row">
            <div className="ms-cashout-wrap">
              <button
                className={'ms-cashout-btn' + (cashOutActive ? '' : ' disabled')}
                onClick={handleCashOut}
                disabled={!cashOutActive}
              >
                Cash Out 💰 ×{cashoutMultiplier}
              </button>
              {isMock && <div className="ms-dev-badge">Dev — simulated</div>}
            </div>
            <button className="ms-newgame-btn" onClick={() => {
              setMineSet(null); setAdjacency(null); setRevealed(new Set());
              setFlagged(new Set()); setDone(false); setGameOverMine(null); setSteps(0);
            }}>↺ New</button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {isMock && <div className="ms-dev-label">Local storage — will sync to chain when live</div>}
          <div className="ms-history-list">
            {gameHistory.length === 0
              ? <div className="ms-empty-state">No games recorded yet</div>
              : gameHistory.map(h => (
                <div key={h.id} className="ms-history-row">
                  <span className={`ms-outcome-chip ${h.outcome}`}>{h.outcome === 'win' ? 'Win' : 'Loss'}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>+{h.score}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.safeRevealed}/54 · {h.secs}s</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {isMock && <div className="ms-dev-label">Local leaderboard — dev mode</div>}
          {gameHistory.length === 0
            ? <div className="ms-empty-state">No games recorded yet</div>
            : gameHistory
                .filter(h => h.outcome === 'win')
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((h, i) => (
                  <div key={h.id} className="ms-leaderboard-row">
                    <span className="ms-rank">#{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>You</span>
                    <span className="mono" style={{ color: C.gold }}>+{h.score}</span>
                    <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  </div>
                ))}
        </div>
      )}

      <div className="ms-bottom-nav">
        {['game', 'history', 'leaderboard'].map(tab => (
          <button
            key={tab}
            className={'ms-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setGameHistory(msLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Mancala helpers
   ============================================================ */
const MNC_HISTORY_KEY = 'puzzlechain_mancala_history';

// Stone rendering helpers
const MNC_STONE_COLORS = ['#C8A87A', '#A07845', '#D4B896', '#8B5E3C', '#BF9E5A'];

// Deterministic float in [0,1) from two integer seeds — sin hash (stable, well-distributed).
function mncRandVal(pitSeed, i) {
  const x = Math.sin(pitSeed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Stone diameter as a fraction of the pit/store element's smaller dimension.
function mncStoneSizeFactor(count, isStore) {
  if (isStore) {
    if (count <= 3)  return 0.20;
    if (count <= 6)  return 0.17;
    if (count <= 12) return 0.14;
    if (count <= 18) return 0.11;
    return 0.09;
  }
  if (count <= 4)  return 0.26;
  if (count <= 8)  return 0.21;
  if (count <= 16) return 0.17;
  return 0.13;
}

// Renders count pebble divs absolutely-positioned inside the pit/store container.
// pitSeed: pit array index (stable random layout per pit).
// entering: true → newest stone (index count-1) plays pop-in animation.
// capturing: true → whole stone layer plays scatter-out animation.
// isStore: adjusts stone sizing for the taller pill-shaped store.
function MncPitStones({ count, pitSeed, entering, capturing, isStore }) {
  const stones = [];
  const sf = mncStoneSizeFactor(count, isStore);
  // Max center offset as fraction of element size; sqrt ensures uniform-disk distribution.
  const maxR = (0.5 - sf / 2) * 0.82;

  for (let i = 0; i < count; i++) {
    const r     = Math.sqrt(mncRandVal(pitSeed, i * 3))        * maxR;
    const theta = mncRandVal(pitSeed, i * 3 + 1) * 2 * Math.PI;
    const sVar  = 0.85 + mncRandVal(pitSeed, i * 3 + 2) * 0.30; // ±15% size variance

    const cx   = 0.5 + r * Math.cos(theta);
    const cy   = 0.5 + r * Math.sin(theta);
    const sz   = sf * sVar * 100;
    const left = (cx - (sf * sVar) / 2) * 100;
    const top  = (cy - (sf * sVar) / 2) * 100;

    stones.push(
      React.createElement('div', {
        key: i,
        className: 'mnc-stone' + (entering && i === count - 1 ? ' mnc-stone-entering' : ''),
        style: {
          left:       `${left}%`,
          top:        `${top}%`,
          width:      `${sz}%`,
          height:     `${sz}%`,
          background: MNC_STONE_COLORS[i % MNC_STONE_COLORS.length],
        },
      })
    );
  }

  return React.createElement(
    'div',
    { className: 'mnc-pit-stones' + (capturing ? ' mnc-stones-capturing' : '') },
    ...stones
  );
}
const MNC_HISTORY_MAX = 50;
const MNC_SOUND_KEY = 'puzzlechain_mancala_sound';

function mncLoadHistory() {
  try { return JSON.parse(localStorage.getItem(MNC_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function mncSaveEntry(entry) {
  const h = mncLoadHistory();
  h.unshift(entry);
  if (h.length > MNC_HISTORY_MAX) h.length = MNC_HISTORY_MAX;
  try { localStorage.setItem(MNC_HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function mncInitBoard() {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

// Pit directly across the board from pit i. Formula: 12 - i works for both sides:
// P1 pit 0 ↔ P2 pit 12, P1 pit 5 ↔ P2 pit 7, etc.
function mncOpposite(i) { return 12 - i; }

// Shared AudioContext for stone-click sounds (lazy, satisfies browser autoplay policy).
let _mncAudioCtx = null;
function mncPlayClick() {
  try {
    if (!_mncAudioCtx) _mncAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _mncAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 360 + Math.floor(Math.random() * 120);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// Pure distribution function: picks up stones from pitIdx for player and sows them.
// Returns { sequence, pits, lastIdx, extraTurn, captureFrom, captureAmount }.
// sequence = ordered list of pit indices that received a stone (for animation).
function mncDistribute(pits, pitIdx, player) {
  const p = pits.slice();
  const stones = p[pitIdx];
  p[pitIdx] = 0;
  const skipStore = player === 1 ? 13 : 6; // never place in opponent's store
  const ownStore  = player === 1 ? 6  : 13;
  const ownMin    = player === 1 ? 0  : 7;
  const ownMax    = player === 1 ? 5  : 12;
  const sequence  = [];
  let cur = pitIdx;

  for (let i = 0; i < stones; i++) {
    do { cur = (cur + 1) % 14; } while (cur === skipStore);
    p[cur]++;
    sequence.push(cur);
  }

  const lastIdx  = sequence[sequence.length - 1];
  const extraTurn = lastIdx === ownStore;

  // Capture: last stone lands in player's own previously-empty pit and opposite has stones.
  let captureFrom = -1, captureAmount = 0;
  if (!extraTurn && lastIdx >= ownMin && lastIdx <= ownMax && p[lastIdx] === 1) {
    const opp = mncOpposite(lastIdx);
    if (p[opp] > 0) {
      captureAmount = p[opp] + 1; // opposite stones + landing stone
      captureFrom   = opp;
      p[ownStore] += captureAmount;
      p[lastIdx]   = 0;
      p[opp]       = 0;
    }
  }

  return { sequence, pits: p, lastIdx, extraTurn, captureFrom, captureAmount };
}

/* ============================================================
   Mancala — AI Engine (pure functions, no side effects)
   ============================================================ */
const MNC_AI_DIFF_KEY = 'puzzlechain_mancala_ai_difficulty';

function mncGetValidMoves(pits, player) {
  const min = player === 1 ? 0 : 7;
  const max = player === 1 ? 5 : 12;
  const moves = [];
  for (let i = min; i <= max; i++) if (pits[i] > 0) moves.push(i);
  return moves;
}

function mncEval(pits) { return pits[6] - pits[13]; }

// Minimax with alpha-beta pruning. player = whose turn it currently is.
function mncMinimax(pits, player, depth, alpha, beta) {
  const p1Empty = pits.slice(0, 6).every(v => v === 0);
  const p2Empty = pits.slice(7, 13).every(v => v === 0);
  if (p1Empty || p2Empty) {
    const p = pits.slice();
    for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    return mncEval(p);
  }
  if (depth === 0) return mncEval(pits);
  const moves = mncGetValidMoves(pits, player);
  if (moves.length === 0) return mncEval(pits);
  if (player === 1) {
    let best = -Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = mncDistribute(pits, idx, 1);
      const score = mncMinimax(np, extraTurn ? 1 : 2, depth - 1, alpha, beta);
      if (score > best) best = score;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) {
      const { pits: np, extraTurn } = mncDistribute(pits, idx, 2);
      const score = mncMinimax(np, extraTurn ? 2 : 1, depth - 1, alpha, beta);
      if (score < best) best = score;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Return the best pit index for P2 at the given difficulty, or -1 if no moves.
function mncAIMove(pits, difficulty) {
  const moves = mncGetValidMoves(pits, 2);
  if (moves.length === 0) return -1;
  if (difficulty === 'easy') return shuffle(moves)[0];
  // Medium: greedy single-ply
  if (difficulty === 'medium') {
    let bestIdx = moves[0], bestScore = Infinity;
    for (const idx of moves) {
      const { pits: np } = mncDistribute(pits, idx, 2);
      const s = mncEval(np);
      if (s < bestScore) { bestScore = s; bestIdx = idx; }
    }
    return bestIdx;
  }
  // Hard: minimax depth 7 (AI's own move is at depth 0; 6 additional plies)
  let bestIdx = moves[0], bestScore = Infinity;
  for (const idx of moves) {
    const { pits: np, extraTurn } = mncDistribute(pits, idx, 2);
    const s = mncMinimax(np, extraTurn ? 2 : 1, 6, -Infinity, Infinity);
    if (s < bestScore) { bestScore = s; bestIdx = idx; }
  }
  return bestIdx;
}

/* ============================================================
   Mancala — Networking (polling hook for online multiplayer)
   ============================================================ */
const MNC_ONLINE_SESSION_KEY = 'puzzlechain_mancala_online_session';

function useMancalaRoom(roomId) {
  const [room, setRoom]                         = useState(null);
  const [pollingError, setPollingError]         = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const consecutiveErrors = useRef(0);
  const intervalRef       = useRef(null);

  const fetchRoom = async () => {
    if (!roomId) return;
    try {
      const { ok, status, body } = await api('/api/mancala/rooms/' + roomId);
      if (ok && body) {
        setRoom(body);
        setPollingError(null);
        consecutiveErrors.current = 0;
        setOpponentDisconnected(false);
      } else if (status === 404) {
        setPollingError('room_not_found');
        consecutiveErrors.current++;
      } else {
        consecutiveErrors.current++;
        if (consecutiveErrors.current >= 3) {
          setOpponentDisconnected(true);
          setPollingError('connection_error');
        }
      }
    } catch {
      consecutiveErrors.current++;
      if (consecutiveErrors.current >= 3) {
        setOpponentDisconnected(true);
        setPollingError('connection_error');
      }
    }
  };

  useEffect(() => {
    if (!roomId) { setRoom(null); setPollingError(null); return; }
    consecutiveErrors.current = 0;
    fetchRoom();
    intervalRef.current = setInterval(() => {
      setRoom(r => {
        if (r && r.status === 'finished') {
          clearInterval(intervalRef.current);
          return r;
        }
        return r;
      });
      fetchRoom();
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [roomId]);

  const submitMove = async (pitIdx) => {
    if (!room || room.status !== 'active') return;
    const player = pitIdx <= 5 ? 1 : 2;
    const moveSeq = room.moveSeq + 1;
    // Optimistic update
    try {
      const { pits: afterPits, extraTurn } = mncDistribute(room.pits, pitIdx, player);
      const p1Empty = afterPits.slice(0, 6).every(v => v === 0);
      const p2Empty = afterPits.slice(7, 13).every(v => v === 0);
      let finalPits = afterPits.slice();
      let gameOver = false, winner = null;
      if (p1Empty || p2Empty) {
        for (let i = 0; i < 6;  i++) { finalPits[6]  += finalPits[i]; finalPits[i] = 0; }
        for (let i = 7; i < 13; i++) { finalPits[13] += finalPits[i]; finalPits[i] = 0; }
        winner = finalPits[6] > finalPits[13] ? '1' : finalPits[13] > finalPits[6] ? '2' : 'draw';
        gameOver = true;
      }
      const nextPlayer = gameOver ? null : (extraTurn ? player : (player === 1 ? 2 : 1));
      setRoom(r => ({ ...r, pits: finalPits, currentPlayer: nextPlayer, status: gameOver ? 'finished' : 'active', winner, moveSeq }));
    } catch {}
    // Confirm with server
    try {
      const { ok, body } = await api('/api/mancala/rooms/' + roomId + '/move', {
        method: 'POST',
        body: JSON.stringify({ pitIdx, moveSeq }),
      });
      if (ok && body) { setRoom(body); }
      else { fetchRoom(); }
    } catch { fetchRoom(); }
  };

  return { room, pollingError, opponentDisconnected, submitMove };
}

/* ============================================================
   Game 5 — Mancala (Kalah variant, pass-and-play)
   ============================================================ */
function MancalaLocalGame({ onWin, onStepChange, resetKey }) {
  const [pits, setPits]           = useState(mncInitBoard);
  const [player, setPlayer]       = useState(1);
  const [done, setDone]           = useState(false);
  const [winner, setWinner]       = useState(null);
  const [moves, setMoves]         = useState(0);
  const [flashPits, setFlashPits] = useState(() => new Set());
  const [captureFlash, setCaptureFlash] = useState(() => new Set());
  const [bannerMsg, setBannerMsg] = useState('');
  const [moveStack, setMoveStack] = useState([]);
  const [activeTab, setActiveTab] = useState('game');
  const [history, setHistory]     = useState(() => mncLoadHistory());
  const [isMock, setIsMock]       = useState(false);
  const [soundOn, setSoundOn]     = useState(() => localStorage.getItem(MNC_SOUND_KEY) !== '0');

  const animatingRef  = useRef(false);
  const soundOnRef    = useRef(soundOn);
  const winTimerRef   = useRef(null);
  soundOnRef.current  = soundOn;

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  const resetGame = () => {
    // Cancel any in-flight win callback and animation
    animatingRef.current = false;
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
    setPits(mncInitBoard());
    setPlayer(1);
    setDone(false);
    setWinner(null);
    setMoves(0);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
    setMoveStack([]);
  };

  // Reset when parent increments resetKey (Play Again)
  useEffect(() => { resetGame(); }, [resetKey]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    try { localStorage.setItem(MNC_SOUND_KEY, next ? '1' : '0'); } catch {}
  };

  const handleUndo = () => {
    if (moveStack.length === 0 || done || animatingRef.current) return;
    const prev = moveStack[moveStack.length - 1];
    setMoveStack(ms => ms.slice(0, -1));
    setPits(prev.pits.slice());
    setPlayer(prev.player);
    setMoves(prev.moves);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
  };

  const finishMove = (newPits, currentPlayer, extraTurn, captureFrom, newMoves) => {
    const p = newPits.slice();

    // Sweep any remaining stones when one side is emptied
    const p1Empty = p.slice(0, 6).every(v => v === 0);
    const p2Empty = p.slice(7, 13).every(v => v === 0);
    const isGameOver = p1Empty || p2Empty;

    if (isGameOver) {
      for (let i = 0; i < 6; i++) { p[6] += p[i]; p[i] = 0; }
      for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    }

    setPits(p);
    setMoves(newMoves);
    onStepChange(newMoves);

    if (isGameOver) {
      const w = p[6] > p[13] ? 1 : p[13] > p[6] ? 2 : 'draw';
      setWinner(w);
      setDone(true);
      const wLabel = w === 1 ? 'Player 1 wins! 🎉' : w === 2 ? 'Player 2 wins! 🎉' : "It's a draw! 🤝";
      setBannerMsg(wLabel);

      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        winner: w,
        p1Score: p[6],
        p2Score: p[13],
        moves: newMoves,
        secs: secsRef.current,
      };
      mncSaveEntry(entry);
      setHistory(mncLoadHistory());

      winTimerRef.current = setTimeout(() => {
        winTimerRef.current = null;
        setBannerMsg('');
        const score = Math.max(Math.abs(p[6] - p[13]) * 15 - secsRef.current, 50);
        const share = `Mancala ${entry.date} — 🫘 P1 ${p[6]} · P2 ${p[13]} · ${newMoves} moves · ${secsRef.current}s`;
        onWin(score, newMoves, secsRef.current, { winner: w, share, winnerLabel: wLabel });
      }, 1500);

    } else if (extraTurn) {
      setBannerMsg('Extra turn! 🔄');
      setTimeout(() => setBannerMsg(msg => msg === 'Extra turn! 🔄' ? '' : msg), 1200);
    } else {
      setPlayer(currentPlayer === 1 ? 2 : 1);
      setBannerMsg('');
    }
  };

  const handlePitClick = (idx) => {
    if (animatingRef.current || done) return;
    const ownMin = player === 1 ? 0 : 7;
    const ownMax = player === 1 ? 5 : 12;
    if (idx < ownMin || idx > ownMax || pits[idx] === 0) return;

    // Snapshot for undo
    setMoveStack(ms => [...ms, { pits: pits.slice(), player, moves }]);

    const { sequence, pits: newPits, extraTurn, captureFrom } = mncDistribute(pits, idx, player);
    const newMoves = moves + 1;

    animatingRef.current = true;
    const working = pits.slice();
    working[idx] = 0;
    setPits(working.slice());
    setFlashPits(new Set());

    let step = 0;
    const animate = () => {
      if (!animatingRef.current) { setFlashPits(new Set()); return; }
      if (step >= sequence.length) {
        // All stones placed — show capture flash if any, then finish
        setFlashPits(new Set());
        if (captureFrom >= 0) {
          setCaptureFlash(new Set([captureFrom]));
          setTimeout(() => {
            if (!animatingRef.current) return;
            setCaptureFlash(new Set());
            animatingRef.current = false;
            finishMove(newPits, player, extraTurn, captureFrom, newMoves);
          }, 350);
        } else {
          animatingRef.current = false;
          finishMove(newPits, player, extraTurn, captureFrom, newMoves);
        }
        return;
      }
      const pitIdx = sequence[step];
      working[pitIdx]++;
      setPits(working.slice());
      setFlashPits(new Set([pitIdx]));
      if (soundOnRef.current) mncPlayClick();
      step++;
      setTimeout(animate, 80);
    };
    setTimeout(animate, 0);
  };

  // Board display order: P2 pits shown right-to-left (pit 12 at left, pit 7 at right)
  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];

  const pitClass = (idx) => {
    const ownMin = player === 1 ? 0 : 7;
    const ownMax = player === 1 ? 5 : 12;
    const isOwn = idx >= ownMin && idx <= ownMax;
    const canClick = !done && !animatingRef.current && isOwn && pits[idx] > 0;
    const cls = ['mnc-pit'];
    if (canClick) cls.push('mnc-clickable');
    else cls.push('mnc-dim');
    if (flashPits.has(idx)) cls.push('mnc-flash');
    if (captureFlash.has(idx)) cls.push('mnc-capture-flash');
    return cls.join(' ');
  };

  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = player === 1 ? p1Color : p2Color;

  // Aggregate stats
  const stats = history.reduce((acc, h) => {
    acc.total++;
    if (h.winner === 1) acc.p1++;
    else if (h.winner === 2) acc.p2++;
    else acc.draws++;
    if (h.moves > acc.longest) acc.longest = h.moves;
    return acc;
  }, { total: 0, p1: 0, p2: 0, draws: 0, longest: 0 });

  const fmtDate = (d) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y.slice(2)}`;
  };

  return (
    <div>
      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmt}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue">{moves}</div>
            </div>
            <div className="pill">
              <div className="plabel">Turn</div>
              <div className="pvalue" style={{ color: done ? C.muted : activeColor, fontSize: '0.9rem' }}>
                {done ? (winner === 'draw' ? 'Draw' : `P${winner}`) : `P${player}`}
              </div>
            </div>
          </div>

          {/* Active-player indicator */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: done ? C.muted : activeColor,
            background: (done ? C.dim : activeColor) + '22',
            border: `1px solid ${(done ? C.dim : activeColor)}44`,
            borderRadius: '999px',
            padding: '0.32rem 0.8rem',
            maxWidth: 480,
            margin: '0 auto 0.65rem',
            display: 'block',
          }}>
            {done
              ? (winner === 'draw' ? "Game over — It's a draw! 🤝" : `Game over — Player ${winner} wins! 🎉`)
              : `Player ${player}'s turn`}
          </div>

          {/* Board */}
          <div className="mnc-board">
            {/* P2 Store — col 1, spans both rows */}
            <div className="mnc-store" style={{
              gridColumn: 1, gridRow: '1 / 3',
              borderColor: !done && player === 2 ? p2Color + '99' : '#3A1206',
            }}>
              <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={flashPits.has(13)} capturing={false} />
              <div className="mnc-store-label">P2</div>
              <div className="mnc-store-score" style={{ color: !done && player === 2 ? p2Color : '#C8A87A' }}>
                {pits[13]}
              </div>
              <div className="mnc-store-label">store</div>
            </div>

            {/* P2 pits — row 1, cols 2–7 */}
            {p2Display.map((idx, i) => (
              <div
                key={idx}
                className={pitClass(idx)}
                style={{ gridRow: 1, gridColumn: i + 2 }}
                onClick={() => handlePitClick(idx)}
                aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}
              >
                <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
              </div>
            ))}

            {/* P1 Store — col 8, spans both rows */}
            <div className="mnc-store" style={{
              gridColumn: 8, gridRow: '1 / 3',
              borderColor: !done && player === 1 ? p1Color + '99' : '#3A1206',
            }}>
              <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={flashPits.has(6)} capturing={false} />
              <div className="mnc-store-label">P1</div>
              <div className="mnc-store-score" style={{ color: !done && player === 1 ? p1Color : '#C8A87A' }}>
                {pits[6]}
              </div>
              <div className="mnc-store-label">store</div>
            </div>

            {/* P1 pits — row 2, cols 2–7 */}
            {p1Display.map((idx, i) => (
              <div
                key={idx}
                className={pitClass(idx)}
                style={{ gridRow: 2, gridColumn: i + 2 }}
                onClick={() => handlePitClick(idx)}
                aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}
              >
                <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
              </div>
            ))}
          </div>

          {bannerMsg && <div className="mnc-banner">{bannerMsg}</div>}

          <div className="mnc-controls">
            <button onClick={resetGame}>↺ New Game</button>
            <button onClick={resetGame}>⟳ Restart</button>
            {isMock && (
              <button onClick={handleUndo} disabled={moveStack.length === 0 || done}>
                ↩ Undo
              </button>
            )}
            <button onClick={toggleSound} title={soundOn ? 'Sound on' : 'Sound off'}>
              {soundOn ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="mnc-history-list">
            {history.length === 0
              ? <div className="mnc-empty-state">No games recorded yet</div>
              : history.map(h => (
                <div key={h.id} className="mnc-history-row">
                  <span className={`mnc-outcome-chip ${h.winner === 1 ? 'p1win' : h.winner === 2 ? 'p2win' : 'draw'}`}>
                    {h.winner === 1 ? 'P1 Win' : h.winner === 2 ? 'P2 Win' : 'Draw'}
                  </span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>{h.p1Score}–{h.p2Score}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.moves} moves</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          {history.length === 0
            ? <div className="mnc-empty-state">No games recorded yet</div>
            : (
              <div className="mnc-stats-grid">
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val">{stats.total}</div>
                  <div className="mnc-stat-lbl">Games Played</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: p1Color }}>{stats.p1}</div>
                  <div className="mnc-stat-lbl">P1 Wins</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: p2Color }}>{stats.p2}</div>
                  <div className="mnc-stat-lbl">P2 Wins</div>
                </div>
                <div className="mnc-stat-card">
                  <div className="mnc-stat-val" style={{ color: C.muted }}>{stats.draws}</div>
                  <div className="mnc-stat-lbl">Draws</div>
                </div>
                <div className="mnc-stat-card" style={{ gridColumn: '1 / 3' }}>
                  <div className="mnc-stat-val">{stats.longest || '—'}</div>
                  <div className="mnc-stat-lbl">Longest Game (moves)</div>
                </div>
              </div>
            )}
        </div>
      )}

      <div className="mnc-bottom-nav">
        {['game', 'history', 'stats'].map(tab => (
          <button
            key={tab}
            className={'mnc-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setHistory(mncLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 5b — Mancala AI variant (human P1 vs AI P2)
   ============================================================ */
function MancalaAIGame({ onWin, onStepChange, resetKey, difficulty }) {
  const [pits, setPits]                 = useState(mncInitBoard);
  const [player, setPlayer]             = useState(1);
  const [done, setDone]                 = useState(false);
  const [winner, setWinner]             = useState(null);
  const [moves, setMoves]               = useState(0);
  const [flashPits, setFlashPits]       = useState(() => new Set());
  const [captureFlash, setCaptureFlash] = useState(() => new Set());
  const [bannerMsg, setBannerMsg]       = useState('');
  const [aiThinking, setAiThinking]     = useState(false);
  const [history, setHistory]           = useState(() => mncLoadHistory());
  const [soundOn, setSoundOn]           = useState(() => localStorage.getItem(MNC_SOUND_KEY) !== '0');

  const animatingRef  = useRef(false);
  const soundOnRef    = useRef(soundOn);
  const winTimerRef   = useRef(null);
  const applyMoveRef  = useRef(null);
  const pitsRef       = useRef(pits);
  const movesRef      = useRef(moves);
  soundOnRef.current  = soundOn;
  pitsRef.current     = pits;
  movesRef.current    = moves;

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;

  useEffect(() => { resetGame(); }, [resetKey]);

  const resetGame = () => {
    animatingRef.current = false;
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
    setPits(mncInitBoard());
    setPlayer(1);
    setDone(false);
    setWinner(null);
    setMoves(0);
    setFlashPits(new Set());
    setCaptureFlash(new Set());
    setBannerMsg('');
    setAiThinking(false);
  };

  const finishMove = (newPits, currentPlayer, extraTurn, captureFrom, newMoves) => {
    const p = newPits.slice();
    const p1Empty = p.slice(0, 6).every(v => v === 0);
    const p2Empty = p.slice(7, 13).every(v => v === 0);
    const isGameOver = p1Empty || p2Empty;
    if (isGameOver) {
      for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i]  = 0; }
      for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i]  = 0; }
    }
    setPits(p);
    setMoves(newMoves);
    onStepChange(newMoves);
    if (isGameOver) {
      const w = p[6] > p[13] ? 1 : p[13] > p[6] ? 2 : 'draw';
      setWinner(w);
      setDone(true);
      setAiThinking(false);
      const wLabel = w === 1 ? 'You win! 🎉' : w === 2 ? 'AI wins! 🤖' : "It's a draw! 🤝";
      setBannerMsg(wLabel);
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        winner: w,
        p1Score: p[6],
        p2Score: p[13],
        moves: newMoves,
        secs: secsRef.current,
        mode: 'ai',
        difficulty,
      };
      mncSaveEntry(entry);
      setHistory(mncLoadHistory());
      winTimerRef.current = setTimeout(() => {
        winTimerRef.current = null;
        setBannerMsg('');
        const base = Math.max(Math.abs(p[6] - p[13]) * 15 - secsRef.current, 50);
        const share = `Mancala vs AI (${difficulty}) — 🫘 You ${p[6]} · AI ${p[13]} · ${newMoves} moves · ${secsRef.current}s`;
        onWin(w === 1 ? base : w === 'draw' ? 50 : 0, newMoves, secsRef.current, { winner: w, share });
      }, 1500);
    } else if (extraTurn) {
      setBannerMsg(currentPlayer === 2 ? 'AI gets another turn! 🔄' : 'Extra turn! 🔄');
      setTimeout(() => setBannerMsg(m => (m === 'Extra turn! 🔄' || m === 'AI gets another turn! 🔄') ? '' : m), 1200);
    } else {
      setPlayer(currentPlayer === 1 ? 2 : 1);
      setBannerMsg('');
    }
  };

  const applyMove = (idx, currentPlayer) => {
    if (animatingRef.current) return;
    const curPits = pitsRef.current;
    if (curPits[idx] === 0) return;
    const { sequence, pits: newPits, extraTurn, captureFrom } = mncDistribute(curPits, idx, currentPlayer);
    const newMoves = movesRef.current + 1;
    animatingRef.current = true;
    const working = curPits.slice();
    working[idx] = 0;
    setPits(working.slice());
    setFlashPits(new Set());
    let step = 0;
    const animate = () => {
      if (!animatingRef.current) { setFlashPits(new Set()); return; }
      if (step >= sequence.length) {
        setFlashPits(new Set());
        if (captureFrom >= 0) {
          setCaptureFlash(new Set([captureFrom]));
          setTimeout(() => {
            if (!animatingRef.current) return;
            setCaptureFlash(new Set());
            animatingRef.current = false;
            finishMove(newPits, currentPlayer, extraTurn, captureFrom, newMoves);
          }, 350);
        } else {
          animatingRef.current = false;
          finishMove(newPits, currentPlayer, extraTurn, captureFrom, newMoves);
        }
        return;
      }
      working[sequence[step]]++;
      setPits(working.slice());
      setFlashPits(new Set([sequence[step]]));
      if (soundOnRef.current) mncPlayClick();
      step++;
      setTimeout(animate, 80);
    };
    setTimeout(animate, 0);
  };
  applyMoveRef.current = applyMove;

  // Trigger AI when it's P2's turn
  useEffect(() => {
    if (player !== 2 || done) return;
    setAiThinking(true);
    const delay = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 700 : 1100;
    const t = setTimeout(() => {
      setAiThinking(false);
      const idx = mncAIMove(pitsRef.current, difficulty);
      if (idx >= 0) applyMoveRef.current(idx, 2);
    }, delay);
    return () => clearTimeout(t);
  }, [player, done]);

  const handlePitClick = (idx) => {
    if (player !== 1 || done || animatingRef.current) return;
    if (idx < 0 || idx > 5 || pits[idx] === 0) return;
    applyMove(idx, 1);
  };

  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];
  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = player === 1 ? p1Color : p2Color;

  const pitClass = (idx) => {
    const isP1Pit = idx <= 5;
    const canClick = !done && player === 1 && isP1Pit && pits[idx] > 0 && !animatingRef.current;
    const cls = ['mnc-pit'];
    cls.push(canClick ? 'mnc-clickable' : 'mnc-dim');
    if (flashPits.has(idx)) cls.push('mnc-flash');
    if (captureFlash.has(idx)) cls.push('mnc-capture-flash');
    return cls.join(' ');
  };

  const aiHistory = history.filter(h => h.mode === 'ai');
  const stats = aiHistory.reduce(
    (acc, h) => { acc.total++; if (h.winner === 1) acc.wins++; else if (h.winner === 2) acc.losses++; else acc.draws++; return acc; },
    { total: 0, wins: 0, losses: 0, draws: 0 },
  );
  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill">
          <div className="plabel">Diff</div>
          <div className="pvalue" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{difficulty}</div>
        </div>
      </div>

      <div style={{
        textAlign: 'center', fontSize: '0.82rem', fontWeight: 600,
        color: done ? C.muted : activeColor,
        background: (done ? C.dim : activeColor) + '22',
        border: `1px solid ${(done ? C.dim : activeColor)}44`,
        borderRadius: '999px', padding: '0.32rem 0.8rem',
        maxWidth: 480, margin: '0 auto 0.65rem',
      }}>
        {done
          ? (winner === 'draw' ? "Game over — It's a draw! 🤝" : winner === 1 ? 'Game over — You win! 🎉' : 'Game over — AI wins! 🤖')
          : player === 2 ? 'AI is thinking… 🤖' : 'Your turn'}
      </div>

      <div className="mnc-board">
        <div className="mnc-store" style={{ gridColumn: 1, gridRow: '1 / 3', borderColor: !done && player === 2 ? p2Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={flashPits.has(13)} capturing={false} />
          <div className="mnc-store-label">AI</div>
          <div className="mnc-store-score" style={{ color: !done && player === 2 ? p2Color : '#C8A87A' }}>{pits[13]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p2Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 1, gridColumn: i + 2 }}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
          </div>
        ))}
        <div className="mnc-store" style={{ gridColumn: 8, gridRow: '1 / 3', borderColor: !done && player === 1 ? p1Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={flashPits.has(6)} capturing={false} />
          <div className="mnc-store-label">You</div>
          <div className="mnc-store-score" style={{ color: !done && player === 1 ? p1Color : '#C8A87A' }}>{pits[6]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p1Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 2, gridColumn: i + 2 }} onClick={() => handlePitClick(idx)}
            aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={flashPits.has(idx)} capturing={captureFlash.has(idx)} />
          </div>
        ))}
      </div>

      {bannerMsg && <div className="mnc-banner">{bannerMsg}</div>}

      <div className="mnc-controls">
        <button onClick={resetGame}>↺ New Game</button>
        <button onClick={() => { const next = !soundOn; setSoundOn(next); soundOnRef.current = next; try { localStorage.setItem(MNC_SOUND_KEY, next ? '1' : '0'); } catch {} }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {aiHistory.length > 0 && (
        <div className="mnc-stats-grid" style={{ marginTop: '1rem' }}>
          <div className="mnc-stat-card"><div className="mnc-stat-val">{stats.total}</div><div className="mnc-stat-lbl">Games</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p1Color }}>{stats.wins}</div><div className="mnc-stat-lbl">Wins</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p2Color }}>{stats.losses}</div><div className="mnc-stat-lbl">Losses</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: C.muted }}>{stats.draws}</div><div className="mnc-stat-lbl">Draws</div></div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Game 5c — Mancala Online variant (polling multiplayer)
   ============================================================ */
function MancalaOnlineGame({ onWin, onStepChange, roomId, myPlayerNum }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useMancalaRoom(roomId);
  const [myMoves, setMyMoves] = useState(0);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0);
  secsRef.current = secs;

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const p = room.pits;
    const w = room.winner;
    const youWin = (w === String(myPlayerNum));
    const isDraw  = (w === 'draw');
    const base = Math.max(Math.abs(p[6] - p[13]) * 15 - secsRef.current, 50);
    const date = new Date().toISOString().slice(0, 10);
    const share = `Mancala Online ${date} — 🫘 P1 ${p[6]} · P2 ${p[13]} · ${secsRef.current}s`;
    onWin(youWin ? base : isDraw ? 50 : 0, myMoves, secsRef.current, { winner: w, share });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div>
      </div>
    );
  }

  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }

  const pits = room ? room.pits : Array(14).fill(0);
  const status = room ? room.status : 'waiting';
  const currentPlayer = room ? room.currentPlayer : null;
  const isMyTurn = status === 'active' && currentPlayer === myPlayerNum;
  const p1Color = C.accent;
  const p2Color = C.rose;
  const myColor = myPlayerNum === 1 ? p1Color : p2Color;

  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ color: C.muted, marginBottom: '0.6rem', fontSize: '0.85rem' }}>Waiting for opponent to join…</div>
        <div className="mnc-room-code">{roomId}</div>
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.4rem' }}>Share this room code</div>
        <div className="mnc-spinner" style={{ margin: '1rem auto 0' }} />
      </div>
    );
  }

  const handleClick = (idx) => {
    if (!isMyTurn) return;
    const ownMin = myPlayerNum === 1 ? 0 : 7;
    const ownMax = myPlayerNum === 1 ? 5 : 12;
    if (idx < ownMin || idx > ownMax || pits[idx] === 0) return;
    const next = myMoves + 1;
    setMyMoves(next);
    onStepChange(next);
    submitMove(idx);
  };

  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];

  const pitClass = (idx) => {
    const isP1Pit = idx <= 5;
    const isMyPit = myPlayerNum === 1 ? isP1Pit : !isP1Pit;
    const canClick = isMyTurn && isMyPit && pits[idx] > 0;
    const cls = ['mnc-pit'];
    cls.push(canClick ? 'mnc-clickable' : 'mnc-dim');
    return cls.join(' ');
  };

  const p1Name = room && room.player1Name ? room.player1Name : 'P1';
  const p2Name = room && room.player2Name ? room.player2Name : 'P2';
  const myName  = myPlayerNum === 1 ? p1Name : p2Name;
  const oppName = myPlayerNum === 1 ? p2Name : p1Name;

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : room.winner === 'draw' ? "Draw! 🤝" : `${oppName} wins!`)
    : isMyTurn ? 'Your turn' : `${oppName}'s turn`;

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} />
          <div className="plabel">Online</div>
        </div>
      </div>

      {opponentDisconnected && (
        <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          Opponent connection lost — waiting for reconnect…
        </div>
      )}

      <div className="mnc-board">
        <div className="mnc-store" style={{ gridColumn: 1, gridRow: '1 / 3', borderColor: currentPlayer === 2 && status === 'active' ? p2Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[13]} pitSeed={13} isStore={true} entering={false} capturing={false} />
          <div className="mnc-store-label">{myPlayerNum === 2 ? 'You' : oppName}</div>
          <div className="mnc-store-score" style={{ color: currentPlayer === 2 && status === 'active' ? p2Color : '#C8A87A' }}>{pits[13]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p2Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 1, gridColumn: i + 2 }} onClick={() => handleClick(idx)}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={false} capturing={false} />
          </div>
        ))}
        <div className="mnc-store" style={{ gridColumn: 8, gridRow: '1 / 3', borderColor: currentPlayer === 1 && status === 'active' ? p1Color + '99' : '#3A1206' }}>
          <MncPitStones count={pits[6]} pitSeed={6} isStore={true} entering={false} capturing={false} />
          <div className="mnc-store-label">{myPlayerNum === 1 ? 'You' : oppName}</div>
          <div className="mnc-store-score" style={{ color: currentPlayer === 1 && status === 'active' ? p1Color : '#C8A87A' }}>{pits[6]}</div>
          <div className="mnc-store-label">store</div>
        </div>
        {p1Display.map((idx, i) => (
          <div key={idx} className={pitClass(idx)} style={{ gridRow: 2, gridColumn: i + 2 }} onClick={() => handleClick(idx)}
            aria-label={`${pits[idx]} stone${pits[idx] !== 1 ? 's' : ''}`}>
            <MncPitStones count={pits[idx]} pitSeed={idx} entering={false} capturing={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 5d — Mancala Mode Selector
   ============================================================ */
function MancalaModeSelect({ onSelectLocal, onSelectAI, onSelectOnline }) {
  const [mode, setMode]             = useState(null);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem(MNC_AI_DIFF_KEY) || 'medium');
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode]     = useState('');
  const [joinError, setJoinError]   = useState('');
  const [busy, setBusy]             = useState(false);

  const handleStart = async () => {
    if (!mode) return;
    if (mode === 'local') { onSelectLocal(); return; }
    if (mode === 'ai') {
      try { localStorage.setItem(MNC_AI_DIFF_KEY, difficulty); } catch {}
      onSelectAI(difficulty);
      return;
    }
    if (mode === 'online') {
      if (onlineAction === 'create') {
        setBusy(true);
        const { ok, body } = await api('/api/mancala/rooms', { method: 'POST' });
        setBusy(false);
        if (ok && body) { onSelectOnline(1, body.roomId); }
        else { setJoinError('Could not create room. Try again.'); }
      } else if (onlineAction === 'join') {
        const code = joinCode.trim().toUpperCase();
        if (code.length < 4) { setJoinError('Enter a valid room code.'); return; }
        setBusy(true);
        const { ok, status, body } = await api('/api/mancala/rooms/' + code + '/join', { method: 'POST' });
        setBusy(false);
        if (ok && body)        { onSelectOnline(2, code); }
        else if (status === 404) { setJoinError('Room not found. Check the code.'); }
        else if (status === 409) { setJoinError('Room is full or you created it.'); }
        else                     { setJoinError('Could not join. Try again.'); }
      }
    }
  };

  const modes = [
    { id: 'local',  icon: '👥', name: 'Local 2-Player', desc: 'Pass and play on this device' },
    { id: 'ai',     icon: '🤖', name: 'vs AI Bot',       desc: 'Challenge the computer' },
    { id: 'online', icon: '🌐', name: 'Online',          desc: 'Play with a friend via room code' },
  ];

  const canStart = mode && (
    mode !== 'online' ||
    (onlineAction === 'create') ||
    (onlineAction === 'join' && joinCode.trim().length >= 4)
  );

  return (
    <div className="mnc-mode-select">
      {modes.map(m => (
        <button key={m.id} className={'mnc-mode-btn' + (mode === m.id ? ' active' : '')} onClick={() => { setMode(m.id); setJoinError(''); }}>
          <span className="mnc-mode-icon">{m.icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">{m.name}</span>
            <span className="mnc-mode-desc">{m.desc}</span>
          </span>
        </button>
      ))}

      {mode === 'ai' && (
        <div className="mnc-difficulty-row">
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} className={'mnc-difficulty-pill' + (difficulty === d ? ' active' : '')} onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      )}

      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')}
              onClick={() => { setOnlineAction('create'); setJoinError(''); }}>
              Create Room
            </button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')}
              onClick={() => { setOnlineAction('join'); setJoinError(''); }}>
              Join Room
            </button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input
                className="mnc-join-input"
                placeholder="Room code (e.g. AB3K7P)"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                maxLength={8}
              />
            </div>
          )}
          {joinError && <div className="mnc-join-error">{joinError}</div>}
        </div>
      )}

      {mode && (
        <button className="mnc-mode-start-btn" onClick={handleStart} disabled={!canStart || busy}>
          {busy ? 'Please wait…' : 'Play'}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Game 5 — Mancala wrapper (delegates to mode sub-components)
   ============================================================ */
function MancalaGame({ onWin, onStepChange, resetKey }) {
  const [mode, setMode]               = useState(null);
  const [difficulty, setDifficulty]   = useState(null);
  const [roomId, setRoomId]           = useState(null);
  const [myPlayerNum, setMyPlayerNum] = useState(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // When "Play Again" fires, keep mode for local/ai but reset online (needs new room).
  useEffect(() => {
    if (modeRef.current === 'online') {
      setMode(null);
      setRoomId(null);
      setMyPlayerNum(null);
    }
  }, [resetKey]);

  if (!mode) {
    return (
      <MancalaModeSelect
        onSelectLocal={() => setMode('local')}
        onSelectAI={(diff) => { setDifficulty(diff); setMode('ai'); }}
        onSelectOnline={(playerNum, rId) => { setMyPlayerNum(playerNum); setRoomId(rId); setMode('online'); }}
      />
    );
  }

  if (mode === 'local') return React.createElement(MancalaLocalGame, { onWin, onStepChange, resetKey });
  if (mode === 'ai')    return React.createElement(MancalaAIGame,    { onWin, onStepChange, resetKey, difficulty });
  if (mode === 'online') return React.createElement(MancalaOnlineGame, { onWin, onStepChange, roomId, myPlayerNum });
  return null;
}

/* ============================================================
   2048 helpers
   ============================================================ */
const T2048_BOARD_KEY   = 'puzzlechain_2048_board';
const T2048_BEST_KEY    = 'puzzlechain_2048_best';
const T2048_UNDO_KEY    = 'puzzlechain_2048_undo';
const T2048_HISTORY_KEY = 'puzzlechain_2048_history';
const T2048_HISTORY_MAX = 50;

let t2048TileCounter = 0;

const T2048_COLORS = {
  2:    { bg: '#2E3038', color: '#8B9196' },
  4:    { bg: '#363B45', color: '#A0A7B0' },
  8:    { bg: '#B5630A', color: '#FFF' },
  16:   { bg: '#D4720E', color: '#FFF' },
  32:   { bg: '#C2410C', color: '#FFF' },
  64:   { bg: '#9D174D', color: '#FFF' },
  128:  { bg: '#5B21B6', color: '#FFF' },
  256:  { bg: '#1D4ED8', color: '#FFF' },
  512:  { bg: '#0369A1', color: '#FFF' },
  1024: { bg: '#0F766E', color: '#FFF' },
  2048: { bg: '#92400E', color: '#FEF3C7' },
};

function t2048_tileStyle(value) {
  if (T2048_COLORS[value]) return T2048_COLORS[value];
  const palette = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];
  return { bg: palette[Math.floor(Math.log2(value)) % palette.length], color: '#FFF' };
}

function t2048_tileFontSize(v) {
  if (v < 100)   return '1.4rem';
  if (v < 1000)  return '1.15rem';
  if (v < 10000) return '0.92rem';
  return '0.72rem';
}

function t2048_newTile(value, isNew, isMerged) {
  return { value, id: ++t2048TileCounter, isNew: !!isNew, isMerged: !!isMerged };
}

function t2048_emptyCells(grid) {
  const out = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!grid[r][c]) out.push([r, c]);
  return out;
}

function t2048_addRandom(grid) {
  const empties = t2048_emptyCells(grid);
  if (!empties.length) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = t2048_newTile(Math.random() < 0.9 ? 2 : 4, true, false);
  return next;
}

function t2048_initGrid() {
  let g = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  g = t2048_addRandom(g);
  g = t2048_addRandom(g);
  return g;
}

function t2048_slideRowLeft(row) {
  const tiles = row.filter(Boolean);
  let delta = 0;
  const out = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      const val = tiles[i].value * 2;
      delta += val;
      out.push(t2048_newTile(val, false, true));
      i += 2;
    } else {
      out.push({ ...tiles[i], isNew: false, isMerged: false });
      i++;
    }
  }
  const newRow = [...out, null, null, null, null].slice(0, 4);
  let moved = false;
  for (let j = 0; j < 4; j++) {
    const ov = row[j] ? row[j].value : 0;
    const nv = newRow[j] ? newRow[j].value : 0;
    if (ov !== nv) { moved = true; break; }
  }
  return { row: newRow, delta, moved };
}

function t2048_rotateCW(g) {
  return Array.from({length:4},(_,c)=>Array.from({length:4},(_,r)=>g[3-r][c]));
}
function t2048_rotateCCW(g) {
  return Array.from({length:4},(_,c)=>Array.from({length:4},(_,r)=>g[r][3-c]));
}
function t2048_rot180(g) { return t2048_rotateCW(t2048_rotateCW(g)); }

function t2048_move(grid, dir) {
  let g = grid;
  if (dir === 'right') g = t2048_rot180(g);
  else if (dir === 'up')   g = t2048_rotateCW(g);
  else if (dir === 'down') g = t2048_rotateCCW(g);
  let totalDelta = 0, anyMoved = false;
  const next = g.map(row => {
    const { row: nr, delta, moved } = t2048_slideRowLeft(row);
    totalDelta += delta;
    if (moved) anyMoved = true;
    return nr;
  });
  let result = next;
  if (dir === 'right') result = t2048_rot180(next);
  else if (dir === 'up')   result = t2048_rotateCCW(next);
  else if (dir === 'down') result = t2048_rotateCW(next);
  return { grid: result, delta: totalDelta, moved: anyMoved };
}

function t2048_hasMove(grid) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      const v = grid[r][c].value;
      if (c + 1 < 4 && grid[r][c+1] && grid[r][c+1].value === v) return true;
      if (r + 1 < 4 && grid[r+1][c] && grid[r+1][c].value === v) return true;
    }
  return false;
}

function t2048_maxTile(grid) {
  let max = 0;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] && grid[r][c].value > max) max = grid[r][c].value;
  return max;
}

function t2048_toShareText(score, moves, secs, highTile) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return '2048 🔢 Score: ' + score.toLocaleString() + '\nHighest tile: ' + highTile + ' 🏆\nMoves: ' + moves + ' | Time: ' + mm + ':' + ss + '\nPlay at PuzzleChain';
}

function t2048_stripAnim(grid) {
  return grid.map(row => row.map(cell =>
    cell ? { value: cell.value, id: cell.id, isNew: false, isMerged: false } : null
  ));
}

function t2048LoadHistory() {
  try { return JSON.parse(localStorage.getItem(T2048_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function t2048SaveEntry(entry) {
  const h = t2048LoadHistory();
  h.unshift(entry);
  if (h.length > T2048_HISTORY_MAX) h.length = T2048_HISTORY_MAX;
  try { localStorage.setItem(T2048_HISTORY_KEY, JSON.stringify(h)); } catch {}
}
function t2048LoadSavedBoard() {
  try {
    const raw = localStorage.getItem(T2048_BOARD_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { ...p, grid: t2048_stripAnim(p.grid) };
  } catch { return null; }
}
function t2048SaveBoard(grid, score, elapsed, won, moves) {
  try {
    localStorage.setItem(T2048_BOARD_KEY, JSON.stringify({
      grid: t2048_stripAnim(grid), score, elapsed, won, moves: moves || 0
    }));
  } catch {}
}
function t2048ClearBoard() {
  try { localStorage.removeItem(T2048_BOARD_KEY); } catch {}
}
function t2048LoadBest() {
  try { return parseInt(localStorage.getItem(T2048_BEST_KEY) || '0', 10) || 0; }
  catch { return 0; }
}
function t2048SaveBest(v) {
  try { localStorage.setItem(T2048_BEST_KEY, String(v)); } catch {}
}

/* ============================================================
   T2048Game component
   ============================================================ */
function T2048Game({ onWin, onLose, onStepChange, resetKey }) {
  const _saved = t2048LoadSavedBoard();

  const [grid, setGrid]               = useState(() => _saved ? _saved.grid : t2048_initGrid());
  const [score, setScore]             = useState(() => _saved ? _saved.score || 0 : 0);
  const [moves, setMoves]             = useState(() => _saved ? _saved.moves || 0 : 0);
  const [elapsedSecs, setElapsedSecs] = useState(() => _saved ? _saved.elapsed || 0 : 0);
  const [done, setDone]               = useState(false);
  const [hasWon, setHasWon]           = useState(() => _saved ? _saved.won || false : false);
  const [victoryVisible, setVictoryVisible] = useState(false);
  const [isMock, setIsMock]           = useState(false);
  const [activeTab, setActiveTab]     = useState('game');
  const [history, setHistory]         = useState(() => t2048LoadHistory());
  const [bestScore, setBestScore]     = useState(() => t2048LoadBest());
  const [undoStack, setUndoStack]     = useState([]);
  const [scoreDelta, setScoreDelta]   = useState(null);

  const touchStartRef  = useRef(null);
  const deltaTimerRef  = useRef(null);
  const executeMoveRef = useRef(null);

  const gameRunning = !done && !victoryVisible && activeTab === 'game';

  useEffect(() => {
    if (!gameRunning) return;
    const id = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameRunning]);

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  // Clear animation flags after 200ms
  useEffect(() => {
    const hasTmp = grid.some(row => row.some(c => c && (c.isNew || c.isMerged)));
    if (!hasTmp) return;
    const id = setTimeout(() => {
      setGrid(g => g.map(row => row.map(c =>
        c && (c.isNew || c.isMerged) ? { ...c, isNew: false, isMerged: false } : c
      )));
    }, 200);
    return () => clearTimeout(id);
  }, [grid]);

  // Keyboard handler — always reads fresh executeMove via ref
  useEffect(() => {
    const handler = (e) => {
      const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (dirs[e.key]) {
        e.preventDefault();
        if (executeMoveRef.current) executeMoveRef.current(dirs[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const fmtDate = d => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return m + '/' + day + '/' + y.slice(2);
  };

  const handleNewGame = () => {
    t2048ClearBoard();
    try { localStorage.removeItem(T2048_UNDO_KEY); } catch {}
    setGrid(t2048_initGrid());
    setScore(0);
    setMoves(0);
    setElapsedSecs(0);
    setDone(false);
    setHasWon(false);
    setVictoryVisible(false);
    setUndoStack([]);
    setScoreDelta(null);
  };

  const executeMove = (dir) => {
    if (done || victoryVisible || activeTab !== 'game') return;
    const { grid: movedGrid, delta, moved } = t2048_move(grid, dir);
    if (!moved) return;

    const newUndo = isMock
      ? [{ grid: t2048_stripAnim(grid), score, moves }, ...undoStack].slice(0, 10)
      : undoStack;

    const withTile  = t2048_addRandom(movedGrid);
    const newScore  = score + delta;
    const newMoves  = moves + 1;

    setGrid(withTile);
    setScore(newScore);
    setMoves(newMoves);
    setUndoStack(newUndo);

    if (delta > 0) {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
      setScoreDelta(delta);
      deltaTimerRef.current = setTimeout(() => setScoreDelta(null), 600);
    }

    if (newScore > bestScore) { setBestScore(newScore); t2048SaveBest(newScore); }
    t2048SaveBoard(withTile, newScore, elapsedSecs, hasWon, newMoves);
    if (isMock) {
      try { localStorage.setItem(T2048_UNDO_KEY, JSON.stringify(newUndo)); } catch {}
    }
    onStepChange && onStepChange(newMoves);

    const maxT = t2048_maxTile(withTile);
    if (maxT >= 2048 && !hasWon) {
      setHasWon(true);
      setVictoryVisible(true);
      return;
    }
    if (!t2048_hasMove(withTile)) {
      setDone(true);
      const entry = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss',
        score: newScore,
        moves: newMoves,
        secs: elapsedSecs,
        highTile: maxT,
      };
      t2048SaveEntry(entry);
      t2048ClearBoard();
      onLose && onLose(newMoves, elapsedSecs, {
        share: t2048_toShareText(newScore, newMoves, elapsedSecs, maxT),
        answer: String(maxT),
      });
    }
  };

  // Keep ref fresh on every render so the keyboard handler always calls the latest closure
  executeMoveRef.current = executeMove;

  const handleUndo = () => {
    if (!undoStack.length || done) return;
    const [prev, ...rest] = undoStack;
    setGrid(prev.grid);
    setScore(prev.score);
    setMoves(prev.moves);
    setUndoStack(rest);
    try { if (isMock) localStorage.setItem(T2048_UNDO_KEY, JSON.stringify(rest)); } catch {}
  };

  const handleFinish = () => {
    const maxT = t2048_maxTile(grid);
    t2048SaveEntry({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      outcome: 'win',
      score,
      moves,
      secs: elapsedSecs,
      highTile: maxT,
    });
    t2048ClearBoard();
    onWin && onWin(score, moves, elapsedSecs, {
      share: t2048_toShareText(score, moves, elapsedSecs, maxT),
    });
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    executeMove(dir);
  };

  const maxTile = t2048_maxTile(grid);

  // Inline stats computation (same pattern as Mancala)
  const histStats = history.length ? (() => {
    const gp = history.length;
    const gw = history.filter(h => h.outcome === 'win').length;
    const hs = Math.max(0, ...history.map(h => h.score));
    const ht = Math.max(0, ...history.map(h => h.highTile));
    const avg = Math.round(history.reduce((a, h) => a + h.score, 0) / gp);
    const tm  = history.reduce((a, h) => a + h.moves, 0);
    const ls  = Math.max(0, ...history.map(h => h.secs));
    const fmtDur = s => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return h > 0 ? h + 'h ' + m + 'm' : m + 'm ' + sec + 's';
    };
    return { gp, gw, hs, ht, avg, tm, ls: fmtDur(ls) };
  })() : null;

  return (
    <div>
      {isMock && <div className="t2048-banner">Local storage — will sync to chain when live</div>}

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill" style={{ position: 'relative' }}>
              <div className="plabel">Score</div>
              <div className="pvalue mono">
                {score.toLocaleString()}
                {scoreDelta !== null && <span className="t2048-score-delta">+{scoreDelta}</span>}
              </div>
            </div>
            <div className="pill">
              <div className="plabel">Best</div>
              <div className="pvalue mono">{bestScore.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Tile</div>
              <div className="pvalue mono">{maxTile || '—'}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue">{moves}</div>
            </div>
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
            </div>
          </div>

          <div
            className="t2048-board-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="t2048-grid">
              {grid.flat().map((cell, i) => {
                if (!cell) return <div key={'c' + i} className="t2048-cell" />;
                const { bg, color } = t2048_tileStyle(cell.value);
                return (
                  <div
                    key={'t' + cell.id}
                    className={'t2048-tile' + (cell.isNew ? ' is-new' : '') + (cell.isMerged ? ' is-merged' : '')}
                    style={{
                      background: bg,
                      color,
                      fontSize: t2048_tileFontSize(cell.value),
                      boxShadow: cell.value === 2048 ? '0 0 14px #F59E0B88' : 'none',
                    }}
                  >
                    {cell.value}
                  </div>
                );
              })}
            </div>

            {victoryVisible && (
              <div className="t2048-overlay">
                <div style={{ fontSize: '2rem' }}>🎉</div>
                <h3 style={{ color: C.gold }}>You did it!</h3>
                <div className="t2048-overlay-score">{score.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: C.muted }}>Keep playing for a higher score</div>
                <div className="t2048-overlay-btns">
                  <button className="t2048-keep-btn" onClick={() => setVictoryVisible(false)}>Keep Going</button>
                  <button className="t2048-finish-btn" onClick={handleFinish}>Finish</button>
                </div>
              </div>
            )}
          </div>

          <div className="t2048-controls">
            <button onClick={handleNewGame}>↺ New Game</button>
            {isMock && (
              <button onClick={handleUndo} disabled={undoStack.length === 0 || done}>↩ Undo</button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="t2048-history-list">
            {history.length === 0
              ? <div className="t2048-empty-state">No games recorded yet</div>
              : history.map(h => (
                <div key={h.id} className="t2048-history-row">
                  <span className={'t2048-outcome-chip ' + h.outcome}>{h.outcome === 'win' ? 'Win' : 'Loss'}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>{h.score.toLocaleString()}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>×{h.highTile}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.moves}mv · {fmtSecs(h.secs)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          {!histStats
            ? <div className="t2048-empty-state">No games recorded yet</div>
            : (
              <div className="t2048-stats-grid">
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.gp}</div>
                  <div className="t2048-stat-lbl">Played</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val" style={{ color: C.emerald }}>{histStats.gw}</div>
                  <div className="t2048-stat-lbl">Won</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.hs.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Best Score</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val" style={{ color: C.gold }}>{histStats.ht}</div>
                  <div className="t2048-stat-lbl">Best Tile</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.avg.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Avg Score</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.tm.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Total Moves</div>
                </div>
                <div className="t2048-stat-card" style={{ gridColumn: '1 / 3' }}>
                  <div className="t2048-stat-val">{histStats.ls}</div>
                  <div className="t2048-stat-lbl">Longest Session</div>
                </div>
              </div>
            )
          }
        </div>
      )}

      <div className="t2048-bottom-nav">
        {['game', 'history', 'stats'].map(tab => (
          <button
            key={tab}
            className={'t2048-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setHistory(t2048LoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Texas Hold 'Em — card primitives + game component
   ============================================================ */

const POKER_SUITS = ['♠', '♥', '♦', '♣'];
const POKER_RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14]; // 11=J,12=Q,13=K,14=A
const POKER_RANK_NAMES = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
const POKER_SUIT_COLOR = { '♠':'black', '♣':'black', '♥':'red', '♦':'red' };
const POKER_DIFF_KEY = 'puzzlechain_poker_difficulty';
const POKER_CHIPS_LOCAL_KEY = 'puzzlechain_poker_chips_local';

function makeDeck() {
  const deck = [];
  for (const suit of POKER_SUITS) {
    for (const rank of POKER_RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function evaluateHand(five) {
  const ranks = five.map(c => c.rank).sort((a,b) => b - a);
  const suits = five.map(c => c.suit);
  const flush = suits.every(s => s === suits[0]);
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const counts = Object.values(freq).sort((a,b) => b-a);
  const uniqueRanks = Object.keys(freq).map(Number).sort((a,b) => b-a);

  // Check straight
  let straight = false;
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) { straight = true; straightHigh = uniqueRanks[0]; }
    // Wheel: A-2-3-4-5
    if (uniqueRanks[0] === 14 && uniqueRanks[1] === 5 && uniqueRanks[2] === 4 && uniqueRanks[3] === 3 && uniqueRanks[4] === 2) {
      straight = true; straightHigh = 5;
    }
  }

  // Tiebreaker: sorted by frequency desc, then rank desc
  const tb = Object.entries(freq)
    .sort((a,b) => b[1]-a[1] || Number(b[0])-Number(a[0]))
    .map(([r]) => Number(r));

  if (flush && straight) {
    const name = straightHigh === 14 ? 'Royal Flush' : 'Straight Flush';
    return { rank: straightHigh === 14 ? 8 : 7, name, tiebreakers: [straightHigh] };
  }
  if (counts[0] === 4) return { rank: 6, name: 'Four of a Kind', tiebreakers: tb };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 5, name: 'Full House', tiebreakers: tb };
  if (flush) return { rank: 4, name: 'Flush', tiebreakers: ranks };
  if (straight) return { rank: 3, name: 'Straight', tiebreakers: [straightHigh] };
  if (counts[0] === 3) return { rank: 2, name: 'Three of a Kind', tiebreakers: tb };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 1, name: 'Two Pair', tiebreakers: tb };
  if (counts[0] === 2) return { rank: 0.5, name: 'One Pair', tiebreakers: tb };
  return { rank: 0, name: 'High Card', tiebreakers: ranks };
}

function best5of7(hole, community) {
  const all = [...hole, ...community];
  let best = null;
  for (let i = 0; i < all.length; i++) {
    for (let j = i+1; j < all.length; j++) {
      const five = all.filter((_, k) => k !== i && k !== j);
      if (five.length !== 5) continue;
      const ev = evaluateHand(five);
      if (!best || ev.rank > best.rank || (ev.rank === best.rank &&
        ev.tiebreakers.some((t,idx) => t > (best.tiebreakers[idx]||0)))) {
        best = ev;
      }
    }
  }
  return best || evaluateHand(all.slice(0,5));
}

function handStrengthCategory(hole, community) {
  const ev = best5of7(hole, community.length >= 3 ? community : []);
  if (ev.rank >= 4) return 'strong';
  if (ev.rank >= 1) return 'medium';
  return 'weak';
}

// Pre-flop strength estimate based on hole cards only
function preFlopStrength(hole) {
  const [a, b] = hole;
  const maxR = Math.max(a.rank, b.rank);
  const minR = Math.min(a.rank, b.rank);
  const isPair = a.rank === b.rank;
  const isSuited = a.suit === b.suit;
  if (isPair && maxR >= 10) return 'strong';
  if (isPair) return 'medium';
  if (maxR === 14) return 'strong';
  if (maxR >= 12 && minR >= 10) return 'strong';
  if (maxR >= 11 && isSuited) return 'medium';
  if (maxR >= 10) return 'medium';
  return 'weak';
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const av = a.tiebreakers[i] || 0, bv = b.tiebreakers[i] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function pokerAIDecide({ holeCards, communityCards, toCall, potSize, myStack, difficulty }) {
  const rng = Math.random();
  if (difficulty === 'easy') {
    if (toCall === 0) {
      return rng < 0.20 ? { action: 'raise', amount: potSize } : { action: 'check', amount: 0 };
    }
    if (toCall >= myStack) return { action: 'call', amount: myStack };
    if (rng < 0.15) return { action: 'fold', amount: 0 };
    if (rng < 0.80) return { action: 'call', amount: toCall };
    return { action: 'raise', amount: potSize };
  }

  const str = communityCards.length >= 3
    ? handStrengthCategory(holeCards, communityCards)
    : preFlopStrength(holeCards);
  const isPreflop = communityCards.length === 0;

  if (difficulty === 'medium') {
    if (toCall === 0) {
      if (str === 'weak') return rng < 0.85 ? { action: 'check', amount: 0 } : { action: 'raise', amount: 40 };
      if (str === 'medium') return rng < 0.80 ? { action: 'check', amount: 0 } : { action: 'raise', amount: 40 };
      return rng < 0.30 ? { action: 'check', amount: 0 } : { action: 'raise', amount: potSize };
    }
    if (toCall >= myStack) {
      if (str === 'strong') return { action: 'call', amount: myStack };
      return rng < 0.5 ? { action: 'fold', amount: 0 } : { action: 'call', amount: myStack };
    }
    if (str === 'weak') {
      if (isPreflop) return rng < 0.4 ? { action: 'fold', amount: 0 } : { action: 'call', amount: toCall };
      return rng < 0.60 ? { action: 'fold', amount: 0 } : { action: 'call', amount: toCall };
    }
    if (str === 'medium') return rng < 0.20 ? { action: 'raise', amount: 40 } : { action: 'call', amount: toCall };
    return rng < 0.70 ? { action: 'raise', amount: potSize } : { action: 'call', amount: toCall };
  }

  // Hard
  const potOdds = toCall > 0 ? toCall / (potSize + toCall) : 0;
  const strengthThreshold = str === 'strong' ? 0.2 : str === 'medium' ? 0.4 : 0.65;
  if (toCall === 0) {
    if (str === 'weak') {
      const bluff = rng < 0.12;
      return bluff ? { action: 'raise', amount: potSize } : { action: 'check', amount: 0 };
    }
    if (str === 'medium') return rng < 0.25 ? { action: 'raise', amount: potSize } : { action: 'check', amount: 0 };
    return rng < 0.65 ? { action: 'raise', amount: potSize } : { action: 'check', amount: 0 };
  }
  if (toCall >= myStack) {
    if (str === 'strong') return { action: 'call', amount: myStack };
    if (str === 'medium') return rng < 0.4 ? { action: 'call', amount: myStack } : { action: 'fold', amount: 0 };
    return { action: 'fold', amount: 0 };
  }
  if (potOdds < strengthThreshold) return { action: 'call', amount: toCall };
  return rng < 0.3 ? { action: 'raise', amount: potSize } : { action: 'fold', amount: 0 };
}

function PokerCard({ card, faceDown, large, empty }) {
  if (empty) return <div className={'poker-card empty' + (large ? ' lg' : '')} />;
  if (faceDown || !card) return <div className={'poker-card back' + (large ? ' lg' : '')} />;
  const col = POKER_SUIT_COLOR[card.suit];
  const rn = POKER_RANK_NAMES[card.rank];
  return (
    <div className={`poker-card ${col}${large ? ' lg' : ''}`}>
      <div><div className="cr">{rn}</div><div className="cs">{card.suit}</div></div>
      <div className="cs-bot cs">{card.suit}</div>
    </div>
  );
}

const POKER_START_CHIPS = 1000;
const BB = 20;
const SB = 10;
const AI_DELAY = { easy: 500, medium: 700, hard: 900 };

function TexasHoldemGame({ onWin, onLose, onStepChange, resetKey }) {
  const [mode, setMode] = useState('select');
  const [difficulty, setDifficulty] = useState(() =>
    localStorage.getItem(POKER_DIFF_KEY) || 'medium'
  );

  const [playerChips, setPlayerChips] = useState(POKER_START_CHIPS);
  const [authOk, setAuthOk] = useState(true);
  const [chipsLoaded, setChipsLoaded] = useState(false);

  // Display state (updated synchronously during game logic)
  const [playerHole, setPlayerHole] = useState([]);
  const [aiHoles, setAiHoles] = useState([[], []]);
  const [community, setCommunity] = useState([]);
  const [phase, setPhase] = useState('preflop');
  const [pot, setPot] = useState(0);
  const [bets, setBets] = useState([0, 0, 0]);
  const [stacks, setStacks] = useState([POKER_START_CHIPS, POKER_START_CHIPS, POKER_START_CHIPS]);
  const [folded, setFolded] = useState([false, false, false]);
  const [allIn, setAllIn] = useState([false, false, false]);
  const [currentBet, setCurrentBet] = useState(0);
  const [toAct, setToAct] = useState(-1);
  const [actionBadges, setActionBadges] = useState([null, null, null]);
  const [aiThinking, setAiThinking] = useState([false, false]);
  const [handResult, setHandResult] = useState(null);
  const [handNum, setHandNum] = useState(0);
  const [dealerIdx, setDealerIdx] = useState(0);
  const [showRaisePicker, setShowRaisePicker] = useState(false);
  const [raisePreset, setRaisePreset] = useState(null);
  const [showdown, setShowdown] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);

  // Refs: game logic context for player action and session net tracking
  const playerActionCtx = useRef(null);
  const sessionStartChipsRef = useRef(POKER_START_CHIPS);

  const { secs } = useTimer(mode === 'playing' && !sessionDone);

  useEffect(() => {
    (async () => {
      const { ok, body } = await api('/api/poker/chips');
      if (ok && body && typeof body.chips === 'number') {
        setPlayerChips(body.chips);
        setAuthOk(true);
      } else {
        const local = localStorage.getItem(POKER_CHIPS_LOCAL_KEY);
        if (local) setPlayerChips(parseInt(local, 10) || POKER_START_CHIPS);
        setAuthOk(false);
      }
      setChipsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (mode !== 'select') setMode('select');
  }, [resetKey]);

  async function saveChips(n) {
    if (authOk) {
      await api('/api/poker/chips', { method: 'POST', body: JSON.stringify({ chips: n }) });
    } else {
      localStorage.setItem(POKER_CHIPS_LOCAL_KEY, String(n));
    }
  }

  function startGame() {
    localStorage.setItem(POKER_DIFF_KEY, difficulty);
    sessionStartChipsRef.current = playerChips;
    const initStacks = [playerChips, POKER_START_CHIPS, POKER_START_CHIPS];
    setStacks(initStacks);
    setHandNum(0);
    setSessionDone(false);
    playerActionCtx.current = null;
    setMode('playing');
    dealHand(0, 0, initStacks);
  }

  function dealHand(handIndex, dealer, curStacks) {
    const d = shuffle(makeDeck());
    const ph   = [d[0], d[2]];
    const ai0h = [d[1], d[3]];
    const ai1h = [d[4], d[5]];
    const comm = d.slice(6, 11);

    const sbIdx = (dealer + 1) % 3;
    const bbIdx = (dealer + 2) % 3;
    const utg   = dealer;

    const ns = curStacks.slice();
    const nb = [0, 0, 0];
    const sbAmt = Math.min(SB, ns[sbIdx]);
    const bbAmt = Math.min(BB, ns[bbIdx]);
    nb[sbIdx] = sbAmt; ns[sbIdx] -= sbAmt;
    nb[bbIdx] = bbAmt; ns[bbIdx] -= bbAmt;

    const initAllIn = ns.map(s => s === 0);
    const initPot   = nb.reduce((s, b) => s + b, 0);
    const initCurBet = bbAmt;

    playerActionCtx.current = null;
    setPlayerHole(ph);
    setAiHoles([ai0h, ai1h]);
    setCommunity([]);
    setPhase('preflop');
    setPot(initPot);
    setBets(nb.slice());
    setStacks(ns.slice());
    setFolded([false, false, false]);
    setAllIn(initAllIn.slice());
    setCurrentBet(initCurBet);
    setDealerIdx(dealer);
    setActionBadges([null, null, null]);
    setAiThinking([false, false]);
    setHandResult(null);
    setShowRaisePicker(false);
    setRaisePreset(null);
    setShowdown(null);
    setToAct(-1);
    setHandNum(handIndex + 1);
    onStepChange(handIndex + 1);

    // actedArr: no voluntary actions yet this round
    const actedArr = [false, false, false];
    setTimeout(() => beginAction(
      utg, [false,false,false], initAllIn, nb, ns,
      initCurBet, initPot, comm, ph, [ai0h, ai1h],
      dealer, handIndex + 1, 'preflop', actedArr
    ), 150);
  }

  function beginAction(who, foldedArr, allInArr, betsArr, stacksArr, curBet, potVal,
                       comm, phArr, aiHolesArr, dealer, handIdx, curPhase, actedArr) {
    const activeAll    = [0,1,2].filter(i => !foldedArr[i]);
    const activeMovers = [0,1,2].filter(i => !foldedArr[i] && !allInArr[i]);

    if (activeAll.length <= 1 || activeMovers.length === 0) {
      awardPot(foldedArr, allInArr, stacksArr, potVal, comm, phArr, aiHolesArr, dealer, handIdx);
      return;
    }

    setToAct(who);

    if (who === 0) {
      // Store snapshot for action buttons to read
      playerActionCtx.current = {
        foldedArr, allInArr, betsArr, stacksArr, curBet, potVal,
        comm, phArr, aiHolesArr, dealer, handIdx, curPhase, actedArr,
      };
      return;
    }

    const aiIdx = who - 1;
    setAiThinking(prev => { const a = [...prev]; a[aiIdx] = true; return a; });

    setTimeout(() => {
      setAiThinking(prev => { const a = [...prev]; a[aiIdx] = false; return a; });
      const revCount = { preflop: 0, flop: 3, turn: 4, river: 5 }[curPhase] || 0;
      const toCall   = Math.max(0, curBet - betsArr[who]);
      const decision = pokerAIDecide({
        holeCards:      aiHolesArr[aiIdx],
        communityCards: comm.slice(0, revCount),
        toCall,
        potSize:  potVal,
        myStack:  stacksArr[who],
        difficulty,
      });
      handleAction(
        decision.action, decision.amount, who,
        foldedArr, allInArr, betsArr, stacksArr, curBet, potVal,
        comm, phArr, aiHolesArr, dealer, handIdx, curPhase, actedArr
      );
    }, AI_DELAY[difficulty] || 700);
  }

  function handleAction(action, raiseAmount, who,
                        foldedArr, allInArr, betsArr, stacksArr, curBet, potVal,
                        comm, phArr, aiHolesArr, dealer, handIdx, curPhase, actedArr) {
    const nf = foldedArr.slice();
    const na = allInArr.slice();
    const nb = betsArr.slice();
    const ns = stacksArr.slice();
    let newCurBet = curBet;
    let newPot    = potVal;
    const newActed = actedArr.slice();

    function addToPot(idx, targetTotal) {
      const add = Math.min(targetTotal - nb[idx], ns[idx]);
      ns[idx] -= add; nb[idx] += add; newPot += add;
      if (ns[idx] === 0) na[idx] = true;
    }

    if (action === 'fold') {
      nf[who] = true;
    } else if (action === 'check') {
      // no chips change
    } else if (action === 'call') {
      addToPot(who, Math.min(curBet, nb[who] + ns[who]));
    } else if (action === 'raise') {
      const minRaise = curBet + Math.max(BB, curBet);
      const raiseTo  = Math.min(Math.max(raiseAmount, minRaise), nb[who] + ns[who]);
      addToPot(who, raiseTo);
      newCurBet = nb[who];
      // Raise forces everyone else to act again
      for (let i = 0; i < 3; i++) newActed[i] = false;
    }
    newActed[who] = true;

    const badge = (() => {
      if (action === 'fold')  return 'fold';
      if (action === 'check') return 'check';
      if (na[who])            return 'allin';
      if (action === 'call')  return 'call:' + nb[who];
      if (action === 'raise') return 'raise:' + nb[who];
      return null;
    })();
    setActionBadges(prev => { const a = [...prev]; a[who] = badge; return a; });
    setBets(nb.slice());
    setStacks(ns.slice());
    setPot(newPot);
    setFolded(nf.slice());
    setAllIn(na.slice());
    if (action === 'raise') setCurrentBet(newCurBet);

    const activeAll    = [0,1,2].filter(i => !nf[i]);
    const activeMovers = [0,1,2].filter(i => !nf[i] && !na[i]);

    if (activeAll.length <= 1 || activeMovers.length === 0) {
      awardPot(nf, na, ns, newPot, comm, phArr, aiHolesArr, dealer, handIdx);
      return;
    }

    const next = nextPlayer(who, nf, na, nb, newCurBet, newActed);
    if (next === -1) {
      advanceStreet(nf, na, ns, newPot, comm, phArr, aiHolesArr, dealer, handIdx, curPhase);
    } else {
      beginAction(next, nf, na, nb, ns, newCurBet, newPot, comm, phArr, aiHolesArr,
                  dealer, handIdx, curPhase, newActed);
    }
  }

  // nextPlayer: find next player who still needs to act, or -1 if round is over.
  // A player needs to act if: they haven't acted yet this round, OR their bet
  // is below the current bet (including after a raise that reset actedArr).
  function nextPlayer(current, foldedArr, allInArr, betsArr, curBet, actedArr) {
    for (let step = 1; step <= 3; step++) {
      const idx = (current + step) % 3;
      if (foldedArr[idx] || allInArr[idx]) continue;
      if (!actedArr[idx] || betsArr[idx] < curBet) return idx;
    }
    return -1;
  }

  function advanceStreet(foldedArr, allInArr, stacksArr, potVal,
                         comm, phArr, aiHolesArr, dealer, handIdx, curPhase) {
    const phases    = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const nextPhase = phases[phases.indexOf(curPhase) + 1] || 'showdown';
    const newActed  = [false, false, false];

    playerActionCtx.current = null;
    setBets([0, 0, 0]);
    setCurrentBet(0);
    setActionBadges([null, null, null]);
    setPhase(nextPhase);

    if (nextPhase === 'showdown') {
      setCommunity(comm.slice(0, 5));
      awardPot(foldedArr, allInArr, stacksArr, potVal, comm, phArr, aiHolesArr, dealer, handIdx);
      return;
    }

    const revCount = { flop: 3, turn: 4, river: 5 }[nextPhase] || 0;
    setCommunity(comm.slice(0, revCount));

    const first = firstActiveAfter(dealer, foldedArr, allInArr);
    setTimeout(() => beginAction(
      first, foldedArr, allInArr, [0,0,0], stacksArr, 0, potVal,
      comm, phArr, aiHolesArr, dealer, handIdx, nextPhase, newActed
    ), 250);
  }

  function firstActiveAfter(dealer, foldedArr, allInArr) {
    for (let step = 1; step <= 3; step++) {
      const idx = (dealer + step) % 3;
      if (!foldedArr[idx] && !allInArr[idx]) return idx;
    }
    for (let step = 1; step <= 3; step++) {
      const idx = (dealer + step) % 3;
      if (!foldedArr[idx]) return idx;
    }
    return dealer;
  }

  function awardPot(foldedArr, allInArr, stacksArr, potVal,
                    comm, phArr, aiHolesArr, dealer, handIdx) {
    const allComm = comm.slice(0, 5);
    const evals   = [0,1,2].map(i => {
      if (foldedArr[i]) return null;
      return best5of7(i === 0 ? phArr : aiHolesArr[i - 1], allComm);
    });

    let bestEval = null;
    for (const ev of evals) {
      if (ev && (!bestEval || compareHands(ev, bestEval) > 0)) bestEval = ev;
    }
    const winners = [0,1,2].filter(i => evals[i] && bestEval && compareHands(evals[i], bestEval) === 0);

    const share = Math.floor(potVal / (winners.length || 1));
    const ns    = stacksArr.slice();
    for (const w of winners) ns[w] += share;
    if (winners.length > 0) ns[winners[0]] += potVal - share * winners.length;

    const playerWon  = winners.includes(0);
    const winnerLabel = playerWon
      ? '+' + share + ' chips · ' + (evals[0] ? evals[0].name : '')
      : (winners.map(w => w === 0 ? 'You' : 'AI ' + w).join(', ')) + ' won · ' + ((bestEval || {}).name || '');

    playerActionCtx.current = null;
    setStacks(ns.slice());
    setCommunity(allComm);
    setPhase('showdown');
    setPot(0);
    setBets([0,0,0]);
    setToAct(-1);
    setAiThinking([false, false]);
    setShowdown([0,1,2].map(i => ({
      idx: i,
      name: i === 0 ? 'You' : 'AI ' + i + ' · ' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      folded: foldedArr[i],
      hole:   i === 0 ? phArr : aiHolesArr[i - 1],
      ev:     evals[i],
      winner: winners.includes(i),
    })));
    setHandResult({ playerWon, winnerLabel, winners });

    const finalChips = ns[0];
    setPlayerChips(finalChips);
    saveChips(finalChips);

    const aiDead     = ns[1] <= 0 && ns[2] <= 0;
    const playerDead = ns[0] <= 0;

    if (aiDead || playerDead) {
      setSessionDone(true);
      const sessionNet = finalChips - sessionStartChipsRef.current;
      const fmtT = s => String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
      setTimeout(() => {
        if (aiDead) {
          onWin(Math.max(1, sessionNet), handIdx, secs, {
            share: "Texas Hold 'Em — 🃏 Champion in " + handIdx + " hands · +" + Math.max(0, sessionNet) + " chips · " + fmtT(secs),
            winnerLabel: '🏆 Table Champion!',
          });
        } else {
          onLose(handIdx, secs, {
            share: "Texas Hold 'Em — 🃏 Busted after " + handIdx + " hands · " + fmtT(secs),
          });
        }
      }, 2200);
      return;
    }

    const nextDealer = (() => {
      for (let step = 1; step <= 3; step++) {
        const d = (dealer + step) % 3;
        if (ns[d] > 0) return d;
      }
      return (dealer + 1) % 3;
    })();
    setTimeout(() => dealHand(handIdx, nextDealer, ns), 2200);
  }

  function onPlayerAction(action, raiseAmt) {
    if (toAct !== 0 || sessionDone || !playerActionCtx.current) return;
    setShowRaisePicker(false);
    setToAct(-1);
    const ctx = playerActionCtx.current;
    playerActionCtx.current = null;

    let finalAmount = 0;
    if (action === 'call') {
      finalAmount = Math.min(ctx.curBet - ctx.betsArr[0], ctx.stacksArr[0]);
    } else if (action === 'raise') {
      finalAmount = raiseAmt || Math.min(Math.max(ctx.curBet * 2, BB * 2), ctx.stacksArr[0] + ctx.betsArr[0]);
    }

    handleAction(
      action, finalAmount, 0,
      ctx.foldedArr, ctx.allInArr, ctx.betsArr, ctx.stacksArr,
      ctx.curBet, ctx.potVal, ctx.comm, ctx.phArr, ctx.aiHolesArr,
      ctx.dealer, ctx.handIdx, ctx.curPhase, ctx.actedArr
    );
  }

  const ctxNow     = playerActionCtx.current;
  const toCallAmt  = ctxNow ? Math.max(0, ctxNow.curBet - ctxNow.betsArr[0]) : 0;
  const canCheck   = toCallAmt === 0;
  const aiNames    = [1, 2].map(n => 'AI ' + n + ' · ' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1));
  const phaseLabel = { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[phase] || phase;

  function badgeClass(b) {
    if (!b) return '';
    if (b === 'fold') return ' fold';
    if (b === 'allin' || (b && b.startsWith('raise'))) return ' raise';
    return '';
  }
  function badgeText(b) {
    if (!b) return '';
    if (b === 'fold')  return 'Folded';
    if (b === 'allin') return 'All-In';
    if (b === 'check') return 'Checked';
    if (b.startsWith('call:'))  return 'Called '    + b.slice(5);
    if (b.startsWith('raise:')) return 'Raised → ' + b.slice(6);
    return b;
  }

  const raisePresets = ctxNow ? [
    { label: '2× BB',   amount: Math.min(BB * 2,                        ctxNow.stacksArr[0] + ctxNow.betsArr[0]) },
    { label: 'Pot',     amount: Math.min(ctxNow.potVal + ctxNow.curBet, ctxNow.stacksArr[0] + ctxNow.betsArr[0]) },
    { label: 'All-In',  amount: ctxNow.stacksArr[0] + ctxNow.betsArr[0] },
  ] : [];

  if (mode === 'select') {
    return (
      <div className="poker-wrap">
        <div className="poker-mode-screen">
          <div className="poker-mode-title">🃏 Texas Hold 'Em</div>
          <div className="poker-mode-note">
            3 players · {chipsLoaded ? playerChips.toLocaleString() : '…'} chips · Blinds {SB}/{BB}
          </div>
          {!authOk && <div className="poker-auth-notice">Progress not saved — sign in via Usernode</div>}
          <div className="poker-diff-row">
            {['easy','medium','hard'].map(d => (
              <button key={d}
                className={'poker-diff-btn' + (difficulty === d ? ' sel' : '')}
                onClick={() => setDifficulty(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <button className="poker-deal-btn" onClick={startGame} disabled={!chipsLoaded}>
            Deal Cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="poker-wrap">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Hand</div><div className="pvalue">{handNum}</div></div>
        <div className="pill"><div className="plabel">Pot</div><div className="pvalue">{pot}</div></div>
        <div className="pill"><div className="plabel">Your Chips</div><div className="pvalue">{stacks[0]}</div></div>
      </div>

      <div className="poker-table">
        <div className="poker-ai-row">
          {[0,1].map(aiIdx => {
            const pIdx     = aiIdx + 1;
            const isFolded = folded[pIdx];
            const isDealer = dealerIdx === pIdx;
            return (
              <div key={aiIdx} className={'poker-ai-panel' + (isDealer ? ' dealer-btn' : '')}>
                <div className="poker-ai-label">
                  {isDealer && <span style={{color: C.gold}}>🔘 </span>}
                  {aiNames[aiIdx]}
                  {stacks[pIdx] === 0 && <span style={{color: C.rose, marginLeft: 4}}>Bust</span>}
                </div>
                <div className="poker-ai-stack">{stacks[pIdx].toLocaleString()} chips</div>
                <div className="poker-ai-cards">
                  {phase === 'showdown' && showdown && !isFolded
                    ? (showdown[pIdx] || {hole:[]}).hole.map((c,ci) => <PokerCard key={ci} card={c} />)
                    : [0,1].map(ci => <PokerCard key={ci} faceDown />)
                  }
                </div>
                {isFolded && <div className="poker-ai-folded-label">Folded</div>}
                {!isFolded && actionBadges[pIdx] && !aiThinking[aiIdx] && (
                  <div className={'poker-ai-badge' + badgeClass(actionBadges[pIdx])}>
                    {badgeText(actionBadges[pIdx])}
                  </div>
                )}
                {aiThinking[aiIdx] && <div className="poker-ai-thinking">thinking…</div>}
              </div>
            );
          })}
        </div>

        <div className="poker-community">
          <div className="poker-community-cards">
            {[0,1,2,3,4].map(i => (
              <PokerCard key={i} card={community[i] || null} empty={!community[i]} />
            ))}
          </div>
          <div className="poker-phase-row">
            <span className="poker-phase-label">{phaseLabel}</span>
            {pot > 0 && <span className="poker-pot-label">Pot: {pot}</span>}
          </div>
        </div>

        <div className="poker-player-panel">
          <div className="poker-player-top">
            <div className="poker-player-cards">
              {playerHole.map((c,i) => <PokerCard key={i} card={c} large />)}
            </div>
            <div className="poker-player-info">
              <div className="poker-player-label">
                {dealerIdx === 0 && <span style={{color: C.gold}}>🔘 </span>}You
              </div>
              <div className="poker-player-stack">{stacks[0].toLocaleString()} chips</div>
              {bets[0] > 0 && <div style={{fontSize:'0.75rem',color:C.muted}}>Bet: {bets[0]}</div>}
            </div>
          </div>

          {phase === 'showdown' && handResult && (
            <div className={'poker-hand-result' + (handResult.playerWon ? ' win' : ' lose')}>
              {handResult.winnerLabel}
            </div>
          )}

          {toAct === 0 && !sessionDone && phase !== 'showdown' && (
            showRaisePicker ? (
              <div className="poker-raise-picker">
                <div className="poker-raise-presets">
                  {raisePresets.map((p,i) => (
                    <button key={i}
                      className={'poker-raise-preset-btn' + (raisePreset === i ? ' sel' : '')}
                      onClick={() => setRaisePreset(i)}
                    >
                      {p.label}
                      <div style={{fontSize:'0.68rem',color:C.muted}}>{p.amount}</div>
                    </button>
                  ))}
                </div>
                <button className="poker-raise-confirm-btn"
                  disabled={raisePreset === null}
                  onClick={() => {
                    if (raisePreset !== null) {
                      onPlayerAction('raise', raisePresets[raisePreset].amount);
                      setRaisePreset(null);
                    }
                  }}
                >Confirm Raise</button>
              </div>
            ) : (
              <div className="poker-actions">
                <button className="poker-action-btn fold"  onClick={() => onPlayerAction('fold')}>Fold</button>
                <button className="poker-action-btn" disabled={!canCheck} onClick={() => onPlayerAction('check')}>Check</button>
                <button className="poker-action-btn call"  onClick={() => onPlayerAction('call')}>
                  {toCallAmt >= stacks[0] ? 'All-In' : 'Call ' + toCallAmt}
                </button>
                <button className="poker-action-btn raise"
                  onClick={() => { setShowRaisePicker(true); setRaisePreset(null); }}
                >Raise</button>
              </div>
            )
          )}
          {toAct !== 0 && !sessionDone && phase !== 'showdown' && (
            <div className="poker-ai-thinking" style={{textAlign:'center'}}>AI thinking…</div>
          )}
        </div>

        {phase === 'showdown' && showdown && (
          <div className="poker-showdown-hands">
            {showdown.filter(p => !p.folded).map(p => (
              <div key={p.idx} className={'poker-showdown-player' + (p.winner ? ' winner' : ' loser')}>
                <span className="name">{p.name}</span>
                <span className="hand-name">{p.ev ? p.ev.name : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Block Blast helpers + component
   ============================================================ */

const BB_COLORS = [
  '#3b82f6', // accent blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#f59e0b', // gold
  '#06b6d4', // cyan
];

// Each piece: array of [row, col] offsets from top-left anchor [0,0]
const BB_PIECES = [
  [[0,0]],                                          // 1×1
  [[0,0],[0,1]],                                    // 1×2 h
  [[0,0],[1,0]],                                    // 2×1 v
  [[0,0],[0,1],[0,2]],                              // 1×3 h
  [[0,0],[1,0],[2,0]],                              // 3×1 v
  [[0,0],[0,1],[1,0],[1,1]],                        // 2×2 square
  [[0,0],[1,0],[1,1]],                              // L bottom-right
  [[0,0],[0,1],[1,0]],                              // L bottom-left (mirror)
  [[0,1],[1,0],[1,1]],                              // L top-left
  [[0,0],[0,1],[1,1]],                              // L top-right (mirror)
  [[0,1],[1,0],[1,1],[1,2]],                        // T pointing up
  [[0,0],[0,1],[1,1],[0,2]],                        // S-shape
  [[0,1],[0,2],[1,0],[1,1]],                        // Z-shape
  [[0,0],[0,1],[0,2],[0,3]],                        // 1×4 h
  [[0,0],[1,0],[2,0],[3,0]],                        // 4×1 v
];

function bbNewTray() {
  const tray = [];
  while (tray.length < 3) {
    const idx = Math.floor(Math.random() * BB_PIECES.length);
    const colorIdx = Math.floor(Math.random() * BB_COLORS.length);
    tray.push({ cells: BB_PIECES[idx], color: BB_COLORS[colorIdx] });
  }
  return tray;
}

function bbEmptyGrid() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function bbCanPlace(grid, cells, row, col) {
  for (const [dr, dc] of cells) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

function bbHasAnyMove(grid, tray) {
  for (const piece of tray) {
    if (!piece) continue;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (bbCanPlace(grid, piece.cells, r, c)) return true;
      }
    }
  }
  return false;
}

function bbPlace(grid, cells, row, col, color) {
  const next = grid.map(r => r.slice());
  for (const [dr, dc] of cells) next[row + dr][col + dc] = color;
  return next;
}

function bbClearLines(grid) {
  const fullRows = [];
  const fullCols = [];
  for (let r = 0; r < 8; r++) {
    if (grid[r].every(c => c !== null)) fullRows.push(r);
  }
  for (let c = 0; c < 8; c++) {
    if (grid.every(row => row[c] !== null)) fullCols.push(c);
  }
  const linesCleared = fullRows.length + fullCols.length;
  if (linesCleared === 0) return { newGrid: grid, linesCleared: 0 };
  const next = grid.map(r => r.slice());
  for (const r of fullRows) for (let c = 0; c < 8; c++) next[r][c] = null;
  for (const c of fullCols) for (let r = 0; r < 8; r++) next[r][c] = null;
  return { newGrid: next, linesCleared };
}

function bbScorePlacement(cellCount, linesCleared) {
  return cellCount + linesCleared * 80 + (linesCleared > 1 ? linesCleared * 10 : 0);
}

function bbShareText(score, pieces, secs) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `Block Blast 🧩\nScore: ${score.toLocaleString()} | Pieces: ${pieces} | Time: ${mm}:${ss}`;
}

// Bounding box dimensions for a piece (for rendering the mini-grid)
function bbBounds(cells) {
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) { if (r > maxR) maxR = r; if (c > maxC) maxC = c; }
  return { rows: maxR + 1, cols: maxC + 1 };
}

const BB_HISTORY_KEY = 'puzzlechain_blockblast_history';
const BB_BEST_KEY    = 'puzzlechain_blockblast_best';

function bbLoadHistory() {
  try { return JSON.parse(localStorage.getItem(BB_HISTORY_KEY) || '[]'); } catch { return []; }
}
function bbSaveEntry(entry) {
  try {
    const h = bbLoadHistory();
    h.unshift(entry);
    localStorage.setItem(BB_HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
  } catch {}
}
function bbLoadBest() {
  try { return parseInt(localStorage.getItem(BB_BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}
function bbSaveBest(v) {
  try { localStorage.setItem(BB_BEST_KEY, String(v)); } catch {}
}

function BlockBlastGame({ onWin, onStepChange, resetKey }) {
  const [grid, setGrid]           = useState(() => bbEmptyGrid());
  const [tray, setTray]           = useState(() => bbNewTray());
  const [selected, setSelected]   = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [score, setScore]         = useState(0);
  const [pieces, setPieces]       = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [done, setDone]           = useState(false);
  const [scoreDelta, setScoreDelta] = useState(null);
  const [activeTab, setActiveTab] = useState('game');
  const [history, setHistory]     = useState(() => bbLoadHistory());
  const [bestScore, setBestScore] = useState(() => bbLoadBest());
  const deltaTimerRef = useRef(null);
  const lastTouchCell = useRef(null);

  const gameRunning = !done && activeTab === 'game';

  useEffect(() => {
    if (!gameRunning) return;
    const id = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameRunning]);

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const fmtDate = d => { if (!d) return ''; const [y, m, day] = d.split('-'); return m + '/' + day + '/' + y.slice(2); };

  const handleNewGame = () => {
    setGrid(bbEmptyGrid());
    setTray(bbNewTray());
    setSelected(null);
    setHoverCell(null);
    setScore(0);
    setPieces(0);
    setElapsedSecs(0);
    setDone(false);
    setScoreDelta(null);
  };

  const handlePlace = (row, col) => {
    if (done || selected === null) return;
    const piece = tray[selected];
    if (!piece) return;
    if (!bbCanPlace(grid, piece.cells, row, col)) return;

    const placed = bbPlace(grid, piece.cells, row, col, piece.color);
    const { newGrid, linesCleared } = bbClearLines(placed);
    const delta = bbScorePlacement(piece.cells.length, linesCleared);
    const newScore = score + delta;
    const newPieces = pieces + 1;

    const newTray = tray.slice();
    newTray[selected] = null;
    const allUsed = newTray.every(p => p === null);
    const nextTray = allUsed ? bbNewTray() : newTray;

    setGrid(newGrid);
    setTray(nextTray);
    setSelected(null);
    setHoverCell(null);
    setScore(newScore);
    setPieces(newPieces);
    onStepChange && onStepChange(newPieces);

    if (delta > 0) {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
      setScoreDelta('+' + delta);
      deltaTimerRef.current = setTimeout(() => setScoreDelta(null), 700);
    }

    if (newScore > bestScore) { setBestScore(newScore); bbSaveBest(newScore); }

    if (!bbHasAnyMove(newGrid, nextTray)) {
      setDone(true);
      const entry = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        score: newScore,
        pieces: newPieces,
        secs: elapsedSecs,
      };
      bbSaveEntry(entry);
      setHistory(bbLoadHistory());
      onWin && onWin(newScore, newPieces, elapsedSecs, { share: bbShareText(newScore, newPieces, elapsedSecs) });
    }
  };

  // Compute ghost cells for the current hover position
  const ghostCells = {};
  if (selected !== null && hoverCell !== null && tray[selected]) {
    const piece = tray[selected];
    const [hr, hc] = hoverCell;
    const valid = bbCanPlace(grid, piece.cells, hr, hc);
    for (const [dr, dc] of piece.cells) {
      const r = hr + dr, c = hc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        ghostCells[r + ',' + c] = valid ? 'ghost-valid' : 'ghost-invalid';
      }
    }
  }

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.dataset.row !== undefined) {
      const r = parseInt(el.dataset.row, 10);
      const c = parseInt(el.dataset.col, 10);
      lastTouchCell.current = [r, c];
      setHoverCell([r, c]);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (lastTouchCell.current) {
      handlePlace(lastTouchCell.current[0], lastTouchCell.current[1]);
      lastTouchCell.current = null;
    }
    setHoverCell(null);
  };

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Score</div>
          <div className="pvalue" style={{ color: C.gold }}>{score}</div>
        </div>
        <div className="pill">
          <div className="plabel">Pieces</div>
          <div className="pvalue">{pieces}</div>
        </div>
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
        </div>
      </div>

      {activeTab === 'game' && (
        <div>
          <div className="bb-board-wrap">
            {scoreDelta && <div className="bb-score-delta">{scoreDelta}</div>}
            <div
              className="bb-grid"
              onMouseLeave={() => setHoverCell(null)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {Array.from({ length: 8 }, (_, r) =>
                Array.from({ length: 8 }, (_, c) => {
                  const key = r + ',' + c;
                  const ghost = ghostCells[key];
                  const color = grid[r][c];
                  let cls = 'bb-cell';
                  if (ghost) cls += ' ' + ghost;
                  else if (color) cls += ' occupied';
                  return (
                    <div
                      key={key}
                      className={cls}
                      data-row={r}
                      data-col={c}
                      style={color && !ghost ? { '--bb-color': color } : undefined}
                      onMouseEnter={() => setHoverCell([r, c])}
                      onClick={() => handlePlace(r, c)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="bb-tray">
            {tray.map((piece, i) => {
              if (!piece) {
                return (
                  <div key={i} className="bb-piece-btn used">
                    <div style={{ width: 30, height: 30 }} />
                  </div>
                );
              }
              const { rows, cols } = bbBounds(piece.cells);
              const cellSet = new Set(piece.cells.map(([r, c]) => r + ',' + c));
              return (
                <div
                  key={i}
                  className={'bb-piece-btn' + (selected === i ? ' selected' : '')}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  <div
                    className="bb-piece-grid"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 10px)`,
                      gridTemplateRows: `repeat(${rows}, 10px)`,
                    }}
                  >
                    {Array.from({ length: rows }, (_, r) =>
                      Array.from({ length: cols }, (_, c) => (
                        <div
                          key={r + ',' + c}
                          className="bb-piece-cell"
                          style={{
                            '--bb-color': cellSet.has(r + ',' + c) ? piece.color : 'transparent',
                            opacity: cellSet.has(r + ',' + c) ? 1 : 0,
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {selected === null && !done && (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: '0.8rem', marginTop: '0.6rem' }}>
              Tap a piece to select it, then tap the grid to place it
            </p>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bb-history-list">
          {bestScore > 0 && (
            <div className="bb-history-row bb-best-row">
              <span>All-time best</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{bestScore.toLocaleString()} pts</span>
            </div>
          )}
          {history.length === 0
            ? <div className="bb-empty-state">No games yet — play your first round!</div>
            : history.map(h => (
              <div key={h.id} className="bb-history-row">
                <span style={{ color: C.muted }}>{fmtDate(h.date)}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.gold }}>{h.score.toLocaleString()}</span>
                <span style={{ color: C.muted }}>{h.pieces} pcs · {fmtSecs(h.secs)}</span>
              </div>
            ))
          }
        </div>
      )}

      <div className="bb-bottom-nav">
        {['game', 'history'].map(tab => (
          <button
            key={tab}
            className={'bb-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab === 'history') setHistory(bbLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game 7 — Tile Match (3-Tiles style)
   ============================================================ */

// Seeded PRNG (mulberry32) — deterministic layouts per level number.
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TM_TILE_TYPES = [
  { icon: '🌸', color: '#f43f5e' },
  { icon: '🔥', color: '#f97316' },
  { icon: '💎', color: '#3b82f6' },
  { icon: '🌊', color: '#06b6d4' },
  { icon: '⚡', color: '#f59e0b' },
  { icon: '🌿', color: '#10b981' },
  { icon: '🍄', color: '#e11d48' },
  { icon: '🎵', color: '#8b5cf6' },
  { icon: '🌙', color: '#7c3aed' },
  { icon: '⭐', color: '#eab308' },
  { icon: '🎮', color: '#0891b2' },
  { icon: '🦋', color: '#c026d3' },
];

// 1000-level config computed from a smooth difficulty curve.
function tmGetLevelConfig(level) {
  const t = (level - 1) / 999;
  const tileTypes   = Math.min(12, 3 + Math.floor(t * 9));
  const setsPerType = 2 + Math.floor(t * 3);
  const boardCols   = Math.min(10, 5 + Math.floor(t * 5));
  const boardRows   = Math.min(8,  3 + Math.floor(t * 5));
  const maxLayer    = Math.min(6,  2 + Math.floor(t * 4));
  const undo        = t < 0.333 ? 3 : t < 0.667 ? 2 : 1;
  const shuffle     = t < 0.667 ? 2 : 1;
  return { tileTypes, setsPerType, boardCols, boardRows, maxLayer,
           boosters: { undo, shuffle, clear: 1 } };
}

// Time limit scales with board size and difficulty.
function tmLevelTimeLimit(level, cfg) {
  const totalTiles  = cfg.tileTypes * cfg.setsPerType * 3;
  const t           = (level - 1) / 999;
  const secsPerTile = 3.5 - 2.0 * t;
  return Math.round(totalTiles * secsPerTile);
}

// MM:SS formatter for tile countdown (named to avoid collision with fmtCountdown(ms) at lobby).
function tmFmtSecs(secs) {
  const s = Math.max(0, Math.floor(secs));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

const TM_TIER_LABELS = [
  { label: 'Starter',  start: 0,   end: 99  },
  { label: 'Beginner', start: 100, end: 199 },
  { label: 'Easy',     start: 200, end: 299 },
  { label: 'Normal',   start: 300, end: 399 },
  { label: 'Medium',   start: 400, end: 499 },
  { label: 'Hard',     start: 500, end: 599 },
  { label: 'Harder',   start: 600, end: 699 },
  { label: 'Expert',   start: 700, end: 799 },
  { label: 'Master',   start: 800, end: 899 },
  { label: 'Legend',   start: 900, end: 999 },
];

const TM_TILE_STEP = 50; // px per grid unit (48px tile + 2px gap)

function tmGenerateLevel(cfg, seed) {
  const rng = mulberry32(seed);
  const { tileTypes, setsPerType, boardCols, boardRows, maxLayer } = cfg;
  // Build tile list: tileTypes × setsPerType copies of each type (3 tiles per copy)
  const typeList = [];
  for (let t = 0; t < tileTypes; t++) {
    for (let s = 0; s < setsPerType; s++) {
      typeList.push(t, t, t);
    }
  }
  // Fisher-Yates shuffle
  for (let i = typeList.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [typeList[i], typeList[j]] = [typeList[j], typeList[i]];
  }

  const tiles = [];
  let idx = 0;
  let tileId = 0;

  for (let layer = 0; layer <= maxLayer && idx < typeList.length; layer++) {
    const offset = layer * 0.5;
    const cols = boardCols - layer;
    const rows = boardRows - layer;
    if (cols <= 0 || rows <= 0) break;
    for (let r = 0; r < rows && idx < typeList.length; r++) {
      for (let c = 0; c < cols && idx < typeList.length; c++) {
        tiles.push({
          id: tileId++,
          type: typeList[idx++],
          col: c + offset,
          row: r + offset,
          layer,
          removed: false,
          inBar: false,
        });
      }
    }
  }
  return tiles;
}

function tmIsLocked(tile, allTiles) {
  for (let i = 0; i < allTiles.length; i++) {
    const a = allTiles[i];
    if (a.removed || a.inBar) continue;
    if (a.layer <= tile.layer) continue;
    if (Math.abs(a.col - tile.col) < 1.0 && Math.abs(a.row - tile.row) < 1.0) return true;
  }
  return false;
}

function tmSortBar(bar, tilesMap) {
  return bar.slice().sort((a, b) => tilesMap[a].type - tilesMap[b].type);
}

function TileMatchingGame({ onWin, onLose, onStepChange, resetKey }) {
  const [phase, setPhase] = useState('select'); // 'select' | 'playing' | 'levelWon'
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [tierPage, setTierPage] = useState(null); // null = overview, 0-9 = tier index
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [done, setDone] = useState(false);
  const [boosters, setBoosters] = useState({ undo: 3, shuffle: 2, clear: 1 });
  const [lastBarEntry, setLastBarEntry] = useState(null);
  const [clearSlotMode, setClearSlotMode] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  const [levelScore, setLevelScore] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const { secs } = useTimer(!done && phase === 'playing');
  const secsRef = useRef(0);
  const totalSecsRef = useRef(0);
  const levelStartSecsRef = useRef(0);

  useEffect(() => { secsRef.current = secs; }, [secs]);

  // Derived countdown values
  const levelElapsed = secs - levelStartSecsRef.current;
  const timeRemaining = timeLimit > 0 ? timeLimit - levelElapsed : Infinity;
  const timeUp = phase === 'playing' && !done && timeLimit > 0 && timeRemaining <= 0;
  const timeLow = phase === 'playing' && !done && timeLimit > 0 && timeRemaining > 0 && timeRemaining <= 30;

  // Timeout triggers loss
  useEffect(() => {
    if (!timeUp) return;
    setDone(true);
    const totalS = totalSecsRef.current + secsRef.current;
    const newTotalMoves = totalMoves + moves;
    onLose(newTotalMoves, totalS, { share: `Tile Match ⏱ Level ${selectedLevel} | time's up` });
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset everything when Play Again is triggered from App overlay
  useEffect(() => {
    setPhase('select');
    setTierPage(null);
    setTiles([]);
    setBar([]);
    setMoves(0);
    setTotalMoves(0);
    setSessionScore(0);
    setDone(false);
    setBoosters({ undo: 3, shuffle: 2, clear: 1 });
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    setLevelScore(0);
    setTimeLimit(0);
    setCompletedLevels(new Set());
    totalSecsRef.current = 0;
    levelStartSecsRef.current = 0;
  }, [resetKey]);

  const startLevel = (lvl) => {
    const cfg = tmGetLevelConfig(lvl);
    const newTiles = tmGenerateLevel(cfg, lvl * 17 + 3);
    const ls = Math.min(50 + Math.floor((lvl - 1) / 10) * 2, 200);
    const limit = tmLevelTimeLimit(lvl, cfg);
    setSelectedLevel(lvl);
    setTiles(newTiles);
    setBar([]);
    setMoves(0);
    setDone(false);
    setBoosters({ ...cfg.boosters });
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    setLevelScore(ls);
    setTimeLimit(limit);
    levelStartSecsRef.current = secsRef.current;
    setPhase('playing');
  };

  const selectTile = (tileId) => {
    if (clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[tileId];
    if (!tile || tile.removed || tile.inBar) return;
    if (tmIsLocked(tile, tilesCopy)) return;

    // Game over: bar is already full with no match
    if (bar.length >= 7) {
      setDone(true);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      const totalS = totalSecsRef.current + secsRef.current;
      const newTotal = totalMoves + moves + 1;
      onLose(newTotal, totalS, { share: `Tile Match 💥 Level ${selectedLevel} | ${newTotal} moves` });
      return;
    }

    tile.inBar = true;
    const newBar = [...bar, tileId];
    const newMoves = moves + 1;

    // Sort bar
    const sortedBar = tmSortBar(newBar, tilesMap);

    // Check for match-3
    let matchedIds = null;
    for (let i = 0; i <= sortedBar.length - 3; i++) {
      const a = tilesMap[sortedBar[i]];
      const b = tilesMap[sortedBar[i + 1]];
      const cc = tilesMap[sortedBar[i + 2]];
      if (a && b && cc && a.type === b.type && b.type === cc.type) {
        matchedIds = [sortedBar[i], sortedBar[i + 1], sortedBar[i + 2]];
        break;
      }
    }

    let finalBar = sortedBar;
    if (matchedIds) {
      // Flash animation then remove
      const matchSet = new Set(matchedIds);
      setFlashIds(matchSet);
      matchedIds.forEach(id => {
        tilesMap[id].removed = true;
        tilesMap[id].inBar = false;
      });
      finalBar = sortedBar.filter(id => !matchSet.has(id));
      setTimeout(() => setFlashIds(new Set()), 400);
    }

    const updatedTiles = tilesCopy;
    const newTotalMoves = totalMoves + newMoves;

    // Check game-over: bar full after placement, no match
    if (!matchedIds && finalBar.length >= 7) {
      setTiles(updatedTiles);
      setBar(finalBar);
      setMoves(newMoves);
      setDone(true);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      const totalS = totalSecsRef.current + secsRef.current;
      onLose(newTotalMoves, totalS, { share: `Tile Match 💥 Level ${selectedLevel} | ${newTotalMoves} moves` });
      return;
    }

    setTiles(updatedTiles);
    setBar(finalBar);
    setMoves(newMoves);
    setLastBarEntry(tileId);
    onStepChange(newTotalMoves);

    // Check win: no active board tiles
    const remaining = updatedTiles.filter(t => !t.removed && !t.inBar);
    const inBarNow = finalBar.length;
    if (remaining.length === 0 && inBarNow === 0) {
      setDone(true);
      const s = secsRef.current;
      setPhase('levelWon');
      totalSecsRef.current += s;
    }
  };

  const doUndo = () => {
    if (boosters.undo <= 0 || !lastBarEntry) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[lastBarEntry];
    if (!tile || !tile.inBar) return;
    tile.inBar = false;
    const newBar = bar.filter(id => id !== lastBarEntry);
    setTiles(tilesCopy);
    setBar(newBar);
    setLastBarEntry(null);
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
    setBarFull(false);
  };

  const doShuffle = () => {
    if (boosters.shuffle <= 0) return;
    const active = tiles.filter(t => !t.removed && !t.inBar);
    if (active.length < 2) return;
    const positions = active.map(t => ({ col: t.col, row: t.row, layer: t.layer }));
    // Fisher-Yates with time-based seed (non-deterministic for shuffle)
    const rng = mulberry32((Date.now() & 0xFFFF) + 1);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const tilesCopy = tiles.map(t => ({ ...t }));
    active.forEach((t, i) => {
      const tc = tilesCopy.find(x => x.id === t.id);
      if (tc) { tc.col = positions[i].col; tc.row = positions[i].row; tc.layer = positions[i].layer; }
    });
    setTiles(tilesCopy);
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const doClearMode = () => {
    if (boosters.clear <= 0 || bar.length === 0) return;
    setClearSlotMode(true);
  };

  const clearSlotTile = (tileId) => {
    if (!clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tilesMap = {};
    tilesCopy.forEach(t => { tilesMap[t.id] = t; });
    const tile = tilesMap[tileId];
    if (!tile || !tile.inBar) return;
    tile.removed = true;
    tile.inBar = false;
    const newBar = bar.filter(id => id !== tileId);
    setTiles(tilesCopy);
    setBar(newBar);
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
    setClearSlotMode(false);
    setBarFull(false);
  };

  const handleNextLevel = () => {
    const ns = sessionScore + levelScore;
    setSessionScore(ns);
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    const nextLvl = selectedLevel < 1000 ? selectedLevel + 1 : null;
    if (nextLvl) {
      startLevel(nextLvl);
    }
  };

  const handleEndSession = () => {
    const ns = sessionScore + levelScore;
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    const totalS = totalSecsRef.current;
    const newTotalMoves = totalMoves + moves;
    const share = `Tile Match ⬢ L${completedLevels.size + 1} cleared | ${ns} pts 🀄✨`;
    onWin(ns, newTotalMoves, totalS, { share });
  };

  // ---- Level selector screen ----
  if (phase === 'select') {
    // Tier overview
    if (tierPage === null) {
      return (
        <div className="tm-level-select">
          <h2>Tile Match Puzzle</h2>
          <p>Click tiles off the layered board into your 7-slot bar — match three to clear them.</p>
          <div className="tm-tier-overview">
            {TM_TIER_LABELS.map((tier, idx) => {
              const doneCount = Array.from(completedLevels).filter(l => l >= tier.start + 1 && l <= tier.end + 1).length;
              return (
                <div key={tier.label} className="tm-tier-card" onClick={() => { setTierPage(idx); setSelectedLevel(tier.start + 1); }}>
                  <div className="tm-tier-card-name">{tier.label}</div>
                  <div className="tm-tier-card-range">L{tier.start + 1}–{tier.end + 1}</div>
                  {doneCount > 0 && <div className="tm-tier-card-progress">{doneCount}/100 cleared</div>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    // Per-tier grid
    const tier = TM_TIER_LABELS[tierPage];
    return (
      <div className="tm-level-select">
        <button className="tm-tier-back-btn" onClick={() => setTierPage(null)}>← Tiers</button>
        <div className="tm-tier-page-title">{tier.label} <span style={{color:'var(--c-muted,#888)',fontWeight:400,fontSize:'0.85rem'}}>L{tier.start+1}–{tier.end+1}</span></div>
        <div className="tm-level-grid">
          {Array.from({ length: 100 }, (_, i) => {
            const lvl = tier.start + i + 1;
            const isDone = completedLevels.has(lvl);
            const isSel = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                className={`tm-level-btn${isSel ? ' selected' : ''}${isDone ? ' done' : ''}`}
                onClick={() => setSelectedLevel(lvl)}
              >
                {lvl}
                {isDone && <span className="tm-check">✓</span>}
              </button>
            );
          })}
        </div>
        <button className="tm-play-btn" onClick={() => startLevel(selectedLevel)}>
          Play Level {selectedLevel}
        </button>
      </div>
    );
  }

  // ---- Level won screen ----
  if (phase === 'levelWon') {
    const isLast = selectedLevel >= 1000;
    return (
      <div className="tm-level-won">
        <div className="trophy">🏆</div>
        <h3>Level {selectedLevel} Cleared!</h3>
        <div className="sub">Board cleared — well played</div>
        <div className="tm-level-stats">
          <div className="tm-level-stat-row"><span className="k">Moves</span><span className="v">{moves}</span></div>
          <div className="tm-level-stat-row"><span className="k">Level score</span><span className="v">+{levelScore}</span></div>
          <div className="tm-level-stat-row"><span className="k">Session total</span><span className="v">{sessionScore + levelScore}</span></div>
        </div>
        <div className="tm-level-won-btns">
          {!isLast && (
            <button className="tm-next-btn" onClick={handleNextLevel}>Next Level →</button>
          )}
          <button className="tm-end-btn" onClick={handleEndSession}>End Session</button>
        </div>
      </div>
    );
  }

  // ---- Playing screen ----
  const cfg = tmGetLevelConfig(selectedLevel);
  const tilesMap = {};
  tiles.forEach(t => { tilesMap[t.id] = t; });

  const boardW = (cfg.boardCols) * TM_TILE_STEP;
  const boardH = (cfg.boardRows + cfg.maxLayer * 0.5) * TM_TILE_STEP + 48;

  const activeTiles = tiles.filter(t => !t.removed);
  const boardTiles = activeTiles.filter(t => !t.inBar);
  const tilesLeft = boardTiles.length;

  return (
    <div className="tm-wrap">
      <div className="status-bar">
        <div className={`pill tm-timer-pill${timeLow ? ' warning' : ''}`}>
          <div className="plabel">Time</div>
          <div className="pvalue">{tmFmtSecs(timeRemaining === Infinity ? 0 : timeRemaining)}</div>
        </div>
        <div className="pill">
          <div className="plabel">Moves</div>
          <div className="pvalue">{moves}</div>
        </div>
        <div className="pill">
          <div className="plabel">Tiles Left</div>
          <div className="pvalue">{tilesLeft}</div>
        </div>
      </div>

      <div
        className="tm-board-container"
        style={{ width: boardW, height: boardH, maxWidth: '100%' }}
      >
        {boardTiles.map(tile => {
          const locked = tmIsLocked(tile, tiles);
          const isFlash = flashIds.has(tile.id);
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}`}
              style={{
                left: tile.col * TM_TILE_STEP,
                top: tile.row * TM_TILE_STEP,
                zIndex: tile.layer * 10 + 1,
                background: tt.color,
              }}
              onClick={() => selectTile(tile.id)}
            >
              {tt.icon}
            </div>
          );
        })}
      </div>

      <div className={`tm-bar${barFull ? ' bar-full' : ''}`}>
        {Array.from({ length: 7 }, (_, i) => {
          const tid = bar[i];
          const t = tid != null ? tilesMap[tid] : null;
          const tt = t ? TM_TILE_TYPES[t.type % TM_TILE_TYPES.length] : null;
          const isClear = clearSlotMode && t != null;
          return (
            <div
              key={i}
              className={`tm-slot${t ? ' filled' : ''}${isClear ? ' clear-target' : ''}`}
              onClick={isClear ? () => clearSlotTile(tid) : undefined}
            >
              {tt ? tt.icon : ''}
            </div>
          );
        })}
      </div>
      <div className={`tm-bar-label${barFull ? ' full' : ''}`}>
        {barFull ? '⚠ Bar Full! Use a booster.' : `${bar.length}/7 slots used`}
      </div>

      <div className="tm-boosters">
        <button
          className="tm-booster-btn"
          disabled={boosters.undo <= 0 || !lastBarEntry}
          onClick={doUndo}
          title="Return last tile to board"
        >
          <span className="tm-booster-icon">↩</span>
          <span>Undo</span>
          <span className="tm-booster-count">{boosters.undo} left</span>
        </button>
        <button
          className="tm-booster-btn"
          disabled={boosters.shuffle <= 0}
          onClick={doShuffle}
          title="Shuffle board tiles"
        >
          <span className="tm-booster-icon">🔀</span>
          <span>Shuffle</span>
          <span className="tm-booster-count">{boosters.shuffle} left</span>
        </button>
        <button
          className={`tm-booster-btn${clearSlotMode ? ' active' : ''}`}
          disabled={boosters.clear <= 0 || bar.length === 0}
          onClick={clearSlotMode ? () => setClearSlotMode(false) : doClearMode}
          title="Remove a tile from bar"
        >
          <span className="tm-booster-icon">✕</span>
          <span>{clearSlotMode ? 'Cancel' : 'Clear'}</span>
          <span className="tm-booster-count">{boosters.clear} left</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Daily Tile Match
   ============================================================ */
const TM_DAILY_CONFIG = {
  tileTypes: 8, setsPerType: 3, boardCols: 8, boardRows: 5, maxLayer: 3,
  boosters: { undo: 3, shuffle: 2, clear: 1 },
};
const TM_DAILY_TIME_LIMIT = 180; // 3 minutes fixed

function TileMatchingDailyGame({ onWin, onLose, onStepChange, resetKey, offset }) {
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [boosters, setBoosters] = useState({ ...TM_DAILY_CONFIG.boosters });
  const [lastBarEntry, setLastBarEntry] = useState(null);
  const [clearSlotMode, setClearSlotMode] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const [flashIds, setFlashIds] = useState(new Set());
  const [secs, setSecs] = useState(0);
  const secsRef = useRef(0);
  const movesRef = useRef(0);

  useEffect(() => { secsRef.current = secs; }, [secs]);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  // Self-managed timer so setSecs(0) on reset works correctly
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [done]);

  const remaining = TM_DAILY_TIME_LIMIT - secs;
  const timeUp = !done && remaining <= 0;
  const timeLow = !done && remaining > 0 && remaining <= 30;

  useEffect(() => {
    if (!timeUp) return;
    setDone(true);
    onLose(movesRef.current, secsRef.current, { share: 'Daily Tile Match ⏱ time\'s up' });
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise board from day seed
  useEffect(() => {
    const dayNum = cwDayNum(offset || 0);
    const seed = dayNum * 31 + 7;
    setTiles(tmGenerateLevel(TM_DAILY_CONFIG, seed));
    setBar([]);
    setMoves(0);
    setSecs(0);
    setDone(false);
    setBoosters({ ...TM_DAILY_CONFIG.boosters });
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
  }, [resetKey, offset]);

  const tilesMap = {};
  tiles.forEach(t => { tilesMap[t.id] = t; });

  const selectTile = (tileId) => {
    if (clearSlotMode || done) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[tileId];
    if (!tile || tile.removed || tile.inBar) return;
    if (tmIsLocked(tile, tilesCopy)) return;

    if (bar.length >= 7) {
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      setDone(true);
      onLose(movesRef.current + 1, secsRef.current, { share: `Daily Tile Match 💥 ${movesRef.current + 1} moves` });
      return;
    }

    tile.inBar = true;
    const newBar = [...bar, tileId];
    const newMoves = moves + 1;
    const sortedBar = tmSortBar(newBar, tm);

    let matchedIds = null;
    for (let i = 0; i <= sortedBar.length - 3; i++) {
      const a = tm[sortedBar[i]], b = tm[sortedBar[i+1]], c = tm[sortedBar[i+2]];
      if (a && b && c && a.type === b.type && b.type === c.type) {
        matchedIds = [sortedBar[i], sortedBar[i+1], sortedBar[i+2]];
        break;
      }
    }

    let finalBar = sortedBar;
    if (matchedIds) {
      const matchSet = new Set(matchedIds);
      setFlashIds(matchSet);
      matchedIds.forEach(id => { tm[id].removed = true; tm[id].inBar = false; });
      finalBar = sortedBar.filter(id => !matchSet.has(id));
      setTimeout(() => setFlashIds(new Set()), 400);
    }

    if (!matchedIds && finalBar.length >= 7) {
      setTiles(tilesCopy);
      setBar(finalBar);
      setMoves(newMoves);
      setBarFull(true);
      setTimeout(() => setBarFull(false), 600);
      setDone(true);
      onLose(newMoves, secsRef.current, { share: `Daily Tile Match 💥 ${newMoves} moves` });
      return;
    }

    setTiles(tilesCopy);
    setBar(finalBar);
    setMoves(newMoves);
    setLastBarEntry(tileId);
    onStepChange(newMoves);

    const boardRemaining = tilesCopy.filter(t => !t.removed && !t.inBar);
    if (boardRemaining.length === 0 && finalBar.length === 0) {
      setDone(true);
      onWin(150, newMoves, secsRef.current, { share: `Daily Tile Match ⬢ cleared in ${newMoves} moves! 🀄✨` });
    }
  };

  const doUndo = () => {
    if (boosters.undo <= 0 || !lastBarEntry) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[lastBarEntry];
    if (!tile || !tile.inBar) return;
    tile.inBar = false;
    setTiles(tilesCopy);
    setBar(bar.filter(id => id !== lastBarEntry));
    setLastBarEntry(null);
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
    setBarFull(false);
  };

  const doShuffle = () => {
    if (boosters.shuffle <= 0) return;
    const active = tiles.filter(t => !t.removed && !t.inBar);
    if (active.length < 2) return;
    const positions = active.map(t => ({ col: t.col, row: t.row, layer: t.layer }));
    const rng = mulberry32((secs * 1000 & 0xFFFF) + 1);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const tilesCopy = tiles.map(t => ({ ...t }));
    active.forEach((t, i) => {
      const tc = tilesCopy.find(x => x.id === t.id);
      if (tc) { tc.col = positions[i].col; tc.row = positions[i].row; tc.layer = positions[i].layer; }
    });
    setTiles(tilesCopy);
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const doClearMode = () => {
    if (boosters.clear <= 0 || bar.length === 0) return;
    setClearSlotMode(true);
  };

  const clearSlotTile = (tileId) => {
    if (!clearSlotMode) return;
    const tilesCopy = tiles.map(t => ({ ...t }));
    const tm = {};
    tilesCopy.forEach(t => { tm[t.id] = t; });
    const tile = tm[tileId];
    if (!tile || !tile.inBar) return;
    tile.removed = true;
    tile.inBar = false;
    setTiles(tilesCopy);
    setBar(bar.filter(id => id !== tileId));
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
    setClearSlotMode(false);
    setBarFull(false);
  };

  const cfg = TM_DAILY_CONFIG;
  const boardW = cfg.boardCols * TM_TILE_STEP;
  const boardH = (cfg.boardRows + cfg.maxLayer * 0.5) * TM_TILE_STEP + 48;
  const activeTiles = tiles.filter(t => !t.removed);
  const boardTiles = activeTiles.filter(t => !t.inBar);

  return (
    <div className="tm-wrap">
      <div className="status-bar">
        <div className={`pill tm-timer-pill${timeLow ? ' warning' : ''}`}>
          <div className="plabel">Time</div>
          <div className="pvalue">{tmFmtSecs(remaining)}</div>
        </div>
        <div className="pill">
          <div className="plabel">Moves</div>
          <div className="pvalue">{moves}</div>
        </div>
        <div className="pill">
          <div className="plabel">Tiles Left</div>
          <div className="pvalue">{boardTiles.length}</div>
        </div>
      </div>

      <div className="tm-board-container" style={{ width: boardW, height: boardH, maxWidth: '100%' }}>
        {boardTiles.map(tile => {
          const locked = tmIsLocked(tile, tiles);
          const isFlash = flashIds.has(tile.id);
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}`}
              style={{ left: tile.col * TM_TILE_STEP, top: tile.row * TM_TILE_STEP, zIndex: tile.layer * 10 + 1, background: tt.color }}
              onClick={() => selectTile(tile.id)}
            >
              {tt.icon}
            </div>
          );
        })}
      </div>

      <div className={`tm-bar${barFull ? ' bar-full' : ''}`}>
        {Array.from({ length: 7 }, (_, i) => {
          const tid = bar[i];
          const t = tid != null ? tilesMap[tid] : null;
          const tt = t ? TM_TILE_TYPES[t.type % TM_TILE_TYPES.length] : null;
          const isClear = clearSlotMode && t != null;
          return (
            <div
              key={i}
              className={`tm-slot${t ? ' filled' : ''}${isClear ? ' clear-target' : ''}`}
              onClick={isClear ? () => clearSlotTile(tid) : undefined}
            >
              {tt ? tt.icon : ''}
            </div>
          );
        })}
      </div>
      <div className={`tm-bar-label${barFull ? ' full' : ''}`}>
        {barFull ? '⚠ Bar Full! Use a booster.' : `${bar.length}/7 slots used`}
      </div>

      <div className="tm-boosters">
        <button className="tm-booster-btn" disabled={boosters.undo <= 0 || !lastBarEntry} onClick={doUndo} title="Return last tile to board">
          <span className="tm-booster-icon">↩</span>
          <span>Undo</span>
          <span className="tm-booster-count">{boosters.undo} left</span>
        </button>
        <button className="tm-booster-btn" disabled={boosters.shuffle <= 0} onClick={doShuffle} title="Shuffle board tiles">
          <span className="tm-booster-icon">🔀</span>
          <span>Shuffle</span>
          <span className="tm-booster-count">{boosters.shuffle} left</span>
        </button>
        <button className={`tm-booster-btn${clearSlotMode ? ' active' : ''}`} disabled={boosters.clear <= 0 || bar.length === 0} onClick={clearSlotMode ? () => setClearSlotMode(false) : doClearMode} title="Remove a tile from bar">
          <span className="tm-booster-icon">✕</span>
          <span>{clearSlotMode ? 'Cancel' : 'Clear'}</span>
          <span className="tm-booster-count">{boosters.clear} left</span>
        </button>
      </div>
    </div>
  );
}


/* ============================================================
   Idle clicker game constants & helpers
   ============================================================ */
const IDLE_UNITS = [
  { id: 'worker', name: 'Worker Hamster', icon: '🐹', baseCost: 10, incomePerSec: 0.1 },
  { id: 'coinpress', name: 'Coin Press', icon: '🏭', baseCost: 100, incomePerSec: 1 },
  { id: 'goldenwheel', name: 'Golden Wheel', icon: '✨', baseCost: 1000, incomePerSec: 10 },
  { id: 'vault', name: 'Treasure Vault', icon: '💰', baseCost: 10000, incomePerSec: 100 },
];

const IDLE_UPGRADES = [
  { id: 'iron_paws', name: 'Iron Paws', baseCost: 50, maxLevel: 10, effect: 'tap', multiplier: 1.1, desc: 'Boost tap power' },
  { id: 'worker_motivation', name: 'Worker Motivation', baseCost: 150, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'worker', desc: 'Worker +25%' },
  { id: 'coinpress_boost', name: 'Press Power', baseCost: 500, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'coinpress', desc: 'Press +25%' },
  { id: 'goldenwheel_boost', name: 'Wheel Speed', baseCost: 5000, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'goldenwheel', desc: 'Wheel +25%' },
  { id: 'vault_boost', name: 'Vault Depth', baseCost: 50000, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'vault', desc: 'Vault +25%' },
];

function idleUnitCost(unit, count) {
  return Math.ceil(unit.baseCost * Math.pow(1.15, count));
}

function idleUpgradeCost(upgrade, level) {
  return Math.ceil(upgrade.baseCost * Math.pow(1.1, level));
}

function computePassiveIncome(unitsOwned, upgrades) {
  let income = 0;
  for (const unit of IDLE_UNITS) {
    const count = unitsOwned[unit.id] || 0;
    let unitIncome = unit.incomePerSec * count;
    // Apply unit-specific upgrades (5 levels of 1.25x each = 3.05x at max)
    for (const upgrade of IDLE_UPGRADES) {
      if (upgrade.unitId === unit.id && upgrades[upgrade.id]) {
        unitIncome *= Math.pow(upgrade.multiplier, upgrades[upgrade.id]);
      }
    }
    income += unitIncome;
  }
  return income;
}

function computePrestigeMultiplier(prestigePoints) {
  return 1 + 0.05 * prestigePoints;
}

function IdleGame() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('units');
  const [pendingPrestige, setPendingPrestige] = useState(null);
  const [popups, setPopups] = useState([]);
  const [offlineAccum, setOfflineAccum] = useState(0);
  const tapPowerRef = useRef(1);

  const loadState = async () => {
    const { ok, body } = await api('/api/idle/state');
    if (ok && body) {
      setState(body);
      tapPowerRef.current = parseFloat(body.tapPower) || 1;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  // Passive income accumulation loop
  useEffect(() => {
    if (!state) return;
    const passiveIncome = computePassiveIncome(state.unitsOwned, state.upgrades);
    const multiplier = computePrestigeMultiplier(state.prestigePoints);
    const id = setInterval(() => {
      setState(prev => {
        const newCur = prev.currency + passiveIncome * multiplier;
        const newPeak = Math.max(prev.peakCurrency, newCur);
        return { ...prev, currency: newCur, peakCurrency: newPeak };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  // Sync offline accumulation periodically
  useEffect(() => {
    if (offlineAccum <= 0 || !state) return;
    const timer = setTimeout(async () => {
      const { ok } = await api('/api/idle/tap', { method: 'POST', body: JSON.stringify({ tapCount: offlineAccum }) });
      if (ok) setOfflineAccum(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [offlineAccum, state]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!state) return <div style={{ padding: '2rem', textAlign: 'center' }}>Failed to load game</div>;

  const passiveIncome = computePassiveIncome(state.unitsOwned, state.upgrades);
  const multiplier = computePrestigeMultiplier(state.prestigePoints);
  const displayCurrency = Math.floor(state.currency);

  const handleTap = async () => {
    const tapPower = tapPowerRef.current;
    const tapValue = tapPower * multiplier;
    const newCur = state.currency + tapValue;
    const newPeak = Math.max(state.peakCurrency, newCur);
    setState(prev => ({ ...prev, currency: newCur, peakCurrency: newPeak }));
    setOfflineAccum(offlineAccum + 1);

    // Coin popup
    const popupId = Math.random();
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 50;
    setPopups(prev => [...prev, { id: popupId, value: '+' + Math.ceil(tapValue), x, y }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popupId)), 1000);
  };

  const handleBuyUnit = async (unit) => {
    const count = state.unitsOwned[unit.id] || 0;
    const cost = idleUnitCost(unit, count);
    if (state.currency < cost) return alert('Insufficient currency');

    const { ok, status } = await api('/api/idle/buy-unit', {
      method: 'POST',
      body: JSON.stringify({ unitId: unit.id })
    });
    if (ok) loadState();
    else if (status === 409) alert('Insufficient currency');
  };

  const handleUpgrade = async (upgrade) => {
    const level = state.upgrades[upgrade.id] || 0;
    if (level >= upgrade.maxLevel) return alert('Already maxed');
    const cost = idleUpgradeCost(upgrade, level);
    if (state.currency < cost) return alert('Insufficient currency');

    const { ok, status } = await api('/api/idle/upgrade', {
      method: 'POST',
      body: JSON.stringify({ upgradeId: upgrade.id })
    });
    if (ok) loadState();
    else if (status === 409) alert('Insufficient currency');
  };

  const handlePrestige = async () => {
    const bonus = Math.floor(Math.sqrt(state.peakCurrency / 1000));
    const newPrestigePoints = state.prestigePoints + bonus;
    const multiplierGain = (0.05 * bonus).toFixed(1);
    setPendingPrestige({ bonus, newPoints: newPrestigePoints, multiplierGain });
  };

  const confirmPrestige = async () => {
    const { ok } = await api('/api/idle/prestige', { method: 'POST' });
    if (ok) {
      setPendingPrestige(null);
      loadState();
    }
  };

  return (
    <div className="idle-container">
      <div className="idle-main">
        <div className="idle-stats">
          <div className="idle-stat-box">
            <div className="idle-stat-label">Coins</div>
            <div className="idle-stat-value currency">{displayCurrency.toLocaleString()}</div>
          </div>
          <div className="idle-stat-box">
            <div className="idle-stat-label">Per Second</div>
            <div className="idle-stat-value income">{(passiveIncome * multiplier).toFixed(2)}</div>
          </div>
          <div className="idle-stat-box">
            <div className="idle-stat-label">Prestige Bonus</div>
            <div className="idle-stat-value prestige">+{Math.round(state.prestigePoints * 5)}%</div>
          </div>
        </div>

        <div className="idle-tap-section">
          <button className="idle-tap-btn" onClick={handleTap}>TAP</button>
          <div className="idle-tap-label">Tap Power: {tapPowerRef.current.toFixed(2)}×</div>
        </div>

        <div className="idle-shop">
          <div className="idle-tabs">
            <button
              className={`idle-tab ${activeTab === 'units' ? 'active' : ''}`}
              onClick={() => setActiveTab('units')}
            >
              Units ({Object.values(state.unitsOwned).reduce((a, b) => a + b, 0)})
            </button>
            <button
              className={`idle-tab ${activeTab === 'upgrades' ? 'active' : ''}`}
              onClick={() => setActiveTab('upgrades')}
            >
              Upgrades
            </button>
          </div>

          <div className="idle-grid">
            {activeTab === 'units' && IDLE_UNITS.map(unit => {
              const count = state.unitsOwned[unit.id] || 0;
              const cost = idleUnitCost(unit, count);
              const canAfford = state.currency >= cost;
              return (
                <div key={unit.id} className="idle-card">
                  <div className="idle-card-icon">{unit.icon}</div>
                  <div className="idle-card-name">{unit.name}</div>
                  <div className="idle-card-stats">Income: {unit.incomePerSec.toFixed(2)}/s</div>
                  <div className="idle-card-stats">Own: {count}</div>
                  <button
                    className="idle-card-btn"
                    disabled={!canAfford}
                    onClick={() => handleBuyUnit(unit)}
                  >
                    {cost.toLocaleString()}
                  </button>
                </div>
              );
            })}

            {activeTab === 'upgrades' && IDLE_UPGRADES.map(upgrade => {
              const level = state.upgrades[upgrade.id] || 0;
              const cost = idleUpgradeCost(upgrade, level);
              const canAfford = state.currency >= cost && level < upgrade.maxLevel;
              return (
                <div key={upgrade.id} className="idle-card">
                  <div className="idle-card-icon">⚡</div>
                  <div className="idle-card-name">{upgrade.name}</div>
                  <div className="idle-card-desc">{upgrade.desc}</div>
                  <div className="idle-card-stats">Level: {level}/{upgrade.maxLevel}</div>
                  <button
                    className="idle-card-btn"
                    disabled={!canAfford}
                    onClick={() => handleUpgrade(upgrade)}
                  >
                    {level >= upgrade.maxLevel ? 'MAXED' : cost.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {popups.map(p => (
        <div
          key={p.id}
          className="idle-coin-popup"
          style={{
            left: 'calc(50% + ' + p.x + 'px)',
            top: 'calc(50% + ' + p.y + 'px)',
          }}
        >
          {p.value}
        </div>
      ))}

      {pendingPrestige && (
        <div className="prestige-modal">
          <div className="prestige-card">
            <h2>✨ Prestige</h2>
            <div className="sub">Reset your progress and earn prestige points!</div>
            <div className="prestige-rows">
              <div className="prestige-row">
                <span className="k">Peak Currency:</span>
                <span className="v">{Math.floor(state.peakCurrency).toLocaleString()}</span>
              </div>
              <div className="prestige-row">
                <span className="k">Bonus Points:</span>
                <span className="v">+{pendingPrestige.bonus}</span>
              </div>
              <div className="prestige-row">
                <span className="k">New Total:</span>
                <span className="v">{pendingPrestige.newPoints}</span>
              </div>
              <div className="prestige-row">
                <span className="k">Multiplier Gain:</span>
                <span className="v">+{pendingPrestige.multiplierGain}%</span>
              </div>
            </div>
            <div className="prestige-buttons">
              <button className="prestige-confirm" onClick={confirmPrestige}>
                Prestige
              </button>
              <button className="prestige-cancel" onClick={() => setPendingPrestige(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Diamond Rush — original tile maze adventure (Classic, server-saved)
   ============================================================ */
// Tile legend: # wall, . floor, G gem, K key, D door, T trap, X exit, S start.
// Enemies are defined out-of-grid as a patrol path; they advance one step
// per player move (turn-based, fully deterministic — no soft-locks).
const DR_LEVELS = [
  {
    name: 'First Sparkle',
    grid: [
      '########',
      '#S.....#',
      '#.G.G..#',
      '#......#',
      '#..GG..#',
      '#......#',
      '#....GX#',
      '########',
    ],
    enemyPath: null,
  },
  {
    name: 'Mind the Spikes',
    grid: [
      '########',
      '#S...G.#',
      '#.TT##.#',
      '#.G..T.#',
      '#.##.#.#',
      '#G...G.#',
      '#.T#..X#',
      '########',
    ],
    enemyPath: null,
  },
  {
    name: 'Locked Vault',
    grid: [
      '########',
      '#S..K..#',
      '#.####.#',
      '#G.G.#.#',
      '#.##.#.#',
      '#.#GD..#',
      '#.#..#X#',
      '########',
    ],
    // The gem at (5,3) sits in a pocket sealed by the door at (5,4): the only
    // way to collect every gem (required to open the exit) is to grab the key.
    enemyPath: null,
  },
  {
    name: 'Patrol Run',
    grid: [
      '########',
      '#S.G...#',
      '#.####.#',
      '#.G..G.#',
      '#.####.#',
      '#...G..#',
      '#G....X#',
      '########',
    ],
    enemyPath: [[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,5],[3,4],[3,3],[3,2]],
  },
  {
    name: 'The Gauntlet',
    grid: [
      '########',
      '#S.G.K.#',
      '#.##.#.#',
      '#.G#.#.#',
      '#.#.#G.#',
      '#.T.#.D#',
      '#G..T#X#',
      '########',
    ],
    enemyPath: [[1,6],[2,6],[3,6],[4,6],[3,6],[2,6]],
  },
];

const DR_SOUND_KEY = 'puzzlechain_diamondrush_sound';
const DR_LIVES = 3;

function drKey(r, c) { return r + ',' + c; }
function drCountGems(grid) {
  let n = 0;
  for (const row of grid) for (const ch of row) if (ch === 'G') n++;
  return n;
}
function drFindStart(grid) {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf('S');
    if (c >= 0) return { r, c };
  }
  return { r: 1, c: 1 };
}
function drLevelScore(gems, timeSecs, lives) {
  return Math.max(0, 200 + gems * 100 + Math.max(0, 300 - timeSecs * 3) + lives * 50);
}

function DiamondRushGame({ onStepChange, resetKey }) {
  const { useState, useEffect, useRef } = React;
  const [phase, setPhase] = useState('select'); // 'select' | 'playing' | 'levelWon' | 'levelFailed'
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [progress, setProgress] = useState({ clearedLevels: [], bestResults: {}, totalGems: 0 });
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem(DR_SOUND_KEY) !== '0'; } catch { return true; }
  });
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  // Dynamic per-run state. Kept in a ref too so the keydown listener and the
  // enemy stepper read fresh values without re-binding every render.
  const [gs, setGs] = useState(null); // { heroR, heroC, collected:Set, hasKey, keyTaken, opened:Set, lives, enemyIdx, moves }
  const gsRef = useRef(null);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const levelDef = DR_LEVELS[selectedLevel - 1];
  const running = phase === 'playing' && !paused;
  const { secs, fmt } = useTimer(running);
  const secsRef = useRef(0);
  const startSecsRef = useRef(0);
  useEffect(() => { secsRef.current = secs; }, [secs]);

  const [lastResult, setLastResult] = useState(null);

  // ---- Audio (synthesized, lazy) ----
  const audioRef = useRef(null);
  const playSfx = (type) => {
    if (!soundOnRef.current) return;
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioRef.current = new Ctx();
      }
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const tones = {
        gem:   [880, 0.08, 'triangle'],
        key:   [660, 0.12, 'square'],
        door:  [330, 0.16, 'sawtooth'],
        hit:   [140, 0.22, 'sawtooth'],
        clear: [990, 0.30, 'triangle'],
        blocked: [200, 0.05, 'sine'],
      };
      const [freq, dur, wave] = tones[type] || tones.gem;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
      if (type === 'clear') {
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(660, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
        g2.gain.setValueAtTime(0.0001, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc2.connect(g2).connect(ctx.destination);
        osc2.start(); osc2.stop(ctx.currentTime + 0.32);
      }
    } catch {}
  };

  const toggleSound = () => {
    setSoundOn(prev => {
      const next = !prev;
      try { localStorage.setItem(DR_SOUND_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // ---- Load saved progress on mount (degrade gracefully on 401/error) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api('/api/diamond/progress');
      if (alive && ok && body) {
        setProgress({
          clearedLevels: Array.isArray(body.clearedLevels) ? body.clearedLevels : [],
          bestResults: body.bestResults || {},
          totalGems: body.totalGems || 0,
        });
      }
    })();
    return () => { alive = false; };
  }, []);

  // Parent "Play Again" hook — return to level select.
  useEffect(() => {
    setPhase('select');
    setPaused(false);
    setGs(null);
  }, [resetKey]);

  const isUnlocked = (lvl) => lvl === 1 || progress.clearedLevels.includes(lvl - 1);

  const startLevel = (lvl) => {
    const def = DR_LEVELS[lvl - 1];
    if (!def) return;
    const start = drFindStart(def.grid);
    setSelectedLevel(lvl);
    setGs({
      heroR: start.r, heroC: start.c,
      collected: new Set(), hasKey: false, keyTaken: false,
      opened: new Set(), lives: DR_LIVES, enemyIdx: 0, moves: 0,
    });
    setPaused(false);
    setPhase('playing');
    startSecsRef.current = secsRef.current;
    onStepChange && onStepChange(0);
  };

  const restartLevel = () => startLevel(selectedLevel);

  const finishWin = (state) => {
    const def = DR_LEVELS[selectedLevel - 1];
    const totalGems = drCountGems(def.grid);
    const timeSecs = Math.max(0, secsRef.current - startSecsRef.current);
    const gems = state.collected.size;
    const score = drLevelScore(gems, timeSecs, state.lives);
    playSfx('clear');
    setLastResult({ level: selectedLevel, gems, totalGems, timeSecs, score, lives: state.lives });
    setPhase('levelWon');

    // Optimistic local update so Level Select reflects the clear even offline.
    setProgress(prev => {
      const cleared = prev.clearedLevels.includes(selectedLevel)
        ? prev.clearedLevels
        : [...prev.clearedLevels, selectedLevel].sort((a, b) => a - b);
      const best = { ...prev.bestResults };
      const prior = best[String(selectedLevel)];
      if (!prior || score > prior.score) best[String(selectedLevel)] = { gems, timeSecs, score };
      return { ...prev, clearedLevels: cleared, bestResults: best };
    });

    (async () => {
      const { ok, body } = await api('/api/diamond/level-complete', {
        method: 'POST',
        body: JSON.stringify({ level: selectedLevel, gems, timeSecs, score }),
      });
      if (ok && body) {
        setProgress({
          clearedLevels: Array.isArray(body.clearedLevels) ? body.clearedLevels : [],
          bestResults: body.bestResults || {},
          totalGems: body.totalGems || 0,
        });
      }
    })();
  };

  // ---- Core move logic ----
  const move = (dr, dc) => {
    const state = gsRef.current;
    if (!state || phase !== 'playing' || paused) return;
    const def = DR_LEVELS[selectedLevel - 1];
    const grid = def.grid;
    const tr = state.heroR + dr;
    const tc = state.heroC + dc;
    if (tr < 0 || tc < 0 || tr >= grid.length || tc >= grid[0].length) return;
    let tile = grid[tr][tc];
    const cellId = drKey(tr, tc);

    if (tile === '#') { return; } // wall — no move
    if (tile === 'D' && !state.opened.has(cellId)) {
      if (!state.hasKey) { playSfx('blocked'); return; } // locked, no key
    }

    // Build the next state immutably.
    const next = {
      ...state,
      collected: new Set(state.collected),
      opened: new Set(state.opened),
    };
    next.heroR = tr;
    next.heroC = tc;
    next.moves = state.moves + 1;

    if (tile === 'D' && !next.opened.has(cellId)) {
      next.opened.add(cellId);
      next.hasKey = false;
      playSfx('door');
    } else if (tile === 'G' && !next.collected.has(cellId)) {
      next.collected.add(cellId);
      playSfx('gem');
    } else if (tile === 'K' && !next.keyTaken) {
      next.hasKey = true;
      next.keyTaken = true;
      playSfx('key');
    }

    let lostLife = false;
    if (tile === 'T') lostLife = true;

    // Advance the enemy one step, then check collision with the hero.
    let enemyPos = null;
    if (def.enemyPath && def.enemyPath.length) {
      next.enemyIdx = (state.enemyIdx + 1) % def.enemyPath.length;
      enemyPos = def.enemyPath[next.enemyIdx];
      if (enemyPos[0] === next.heroR && enemyPos[1] === next.heroC) lostLife = true;
    }

    if (lostLife) {
      playSfx('hit');
      next.lives = state.lives - 1;
      if (next.lives <= 0) {
        setGs(next);
        gsRef.current = next;
        setPhase('levelFailed');
        return;
      }
      // Respawn at start; keep gems/key/doors collected so far.
      const start = drFindStart(grid);
      next.heroR = start.r;
      next.heroC = start.c;
      next.enemyIdx = 0;
    }

    setGs(next);
    gsRef.current = next;
    onStepChange && onStepChange(next.moves);

    // Win check: standing on exit with every gem collected.
    if (!lostLife && tile === 'X') {
      const totalGems = drCountGems(grid);
      if (next.collected.size >= totalGems) finishWin(next);
    }
  };

  // Keep a stable ref to move() for the keyboard listener.
  const moveRef = useRef(move);
  moveRef.current = move;

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      let dir = null;
      if (k === 'arrowup' || k === 'w') dir = [-1, 0];
      else if (k === 'arrowdown' || k === 's') dir = [1, 0];
      else if (k === 'arrowleft' || k === 'a') dir = [0, -1];
      else if (k === 'arrowright' || k === 'd') dir = [0, 1];
      if (dir) { e.preventDefault(); moveRef.current(dir[0], dir[1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // ---- Touch swipe ----
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else move(dy > 0 ? 1 : -1, 0);
  };

  // ---- Level Select screen ----
  if (phase === 'select') {
    return (
      <div className="dr-wrap">
        <div className="dr-select">
          <h2>💎 Diamond Rush</h2>
          <p>Collect every gem, grab keys to open doors, dodge traps and the patrol — then reach the exit 🏁.</p>
          <div className="dr-level-grid">
            {DR_LEVELS.map((def, i) => {
              const lvl = i + 1;
              const unlocked = isUnlocked(lvl);
              const done = progress.clearedLevels.includes(lvl);
              const best = progress.bestResults[String(lvl)];
              const sel = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  className={`dr-level-btn${sel ? ' selected' : ''}${done ? ' done' : ''}${!unlocked ? ' locked' : ''}`}
                  onClick={() => unlocked && setSelectedLevel(lvl)}
                  disabled={!unlocked}
                >
                  {!unlocked ? <span className="dr-lock-icon">🔒</span> : <span>{lvl}</span>}
                  {done && <span className="dr-check">✓</span>}
                  {best && <span className="dr-level-meta">💎{best.gems} · {best.timeSecs}s</span>}
                </button>
              );
            })}
          </div>
          <button
            className="dr-play-btn"
            disabled={!isUnlocked(selectedLevel)}
            onClick={() => startLevel(selectedLevel)}
          >
            Play Level {selectedLevel} · {levelDef ? levelDef.name : ''}
          </button>
          <p className="dr-hint" style={{ marginTop: '0.8rem' }}>
            Arrow keys / WASD on desktop · swipe or D-pad on mobile.
          </p>
        </div>
      </div>
    );
  }

  // ---- Level Cleared screen ----
  if (phase === 'levelWon' && lastResult) {
    const isLast = lastResult.level >= DR_LEVELS.length;
    return (
      <div className="dr-end">
        <div className="dr-emoji">🏆</div>
        <h3>Level {lastResult.level} Cleared!</h3>
        <div className="dr-stats">
          💎 {lastResult.gems}/{lastResult.totalGems} · ⏱ {lastResult.timeSecs}s · ❤️ {lastResult.lives} left
        </div>
        <div className="dr-stats" style={{ color: C.gold }}>Score +{lastResult.score}</div>
        <div className="dr-end-btns">
          {!isLast && (
            <button className="dr-play-btn" onClick={() => startLevel(lastResult.level + 1)}>
              Next Level →
            </button>
          )}
          {isLast && <div className="dr-hint">🎉 You cleared every Phase 1 level!</div>}
          <button className="dr-tool-btn" onClick={() => startLevel(lastResult.level)}>Replay</button>
          <button className="dr-tool-btn" onClick={() => setPhase('select')}>Level Select</button>
        </div>
      </div>
    );
  }

  // ---- Level Failed screen ----
  if (phase === 'levelFailed') {
    return (
      <div className="dr-end">
        <div className="dr-emoji">💥</div>
        <h3>Level Failed</h3>
        <div className="dr-stats">Out of lives! Traps and the patrol got the better of you.</div>
        <div className="dr-end-btns">
          <button className="dr-play-btn" onClick={restartLevel}>Retry</button>
          <button className="dr-tool-btn" onClick={() => setPhase('select')}>Level Select</button>
        </div>
      </div>
    );
  }

  // ---- Playing screen ----
  const grid = levelDef.grid;
  const w = grid[0].length;
  const totalGems = drCountGems(grid);
  const enemyPos = (levelDef.enemyPath && gs) ? levelDef.enemyPath[gs.enemyIdx] : null;
  const levelSecs = Math.max(0, secs - startSecsRef.current);
  const levelFmt = `${String(Math.floor(levelSecs / 60)).padStart(2, '0')}:${String(levelSecs % 60).padStart(2, '0')}`;

  return (
    <div className="dr-wrap">
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Gems</div>
          <div className="pvalue">{gs ? gs.collected.size : 0}/{totalGems}</div>
        </div>
        <div className="pill">
          <div className="plabel">Keys</div>
          <div className="pvalue">{gs && gs.hasKey ? '🔑' : '—'}</div>
        </div>
        <div className="pill">
          <div className="plabel">Lives</div>
          <div className="pvalue">{'❤️'.repeat(gs ? gs.lives : 0) || '—'}</div>
        </div>
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{levelFmt}</div>
        </div>
      </div>

      <div className="dr-board-shell">
        <div
          className="dr-board"
          style={{ gridTemplateColumns: `repeat(${w}, clamp(30px, 11vw, 42px))`, gridAutoRows: 'clamp(30px, 11vw, 42px)' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {grid.map((row, r) => row.split('').map((ch, c) => {
            const cellId = drKey(r, c);
            const collected = gs && gs.collected.has(cellId);
            const opened = gs && gs.opened.has(cellId);
            const keyTaken = gs && gs.keyTaken;
            let cls = 'dr-cell floor';
            let glyph = '';
            if (ch === '#') cls = 'dr-cell wall';
            else if (ch === 'X') { cls = 'dr-cell exit'; glyph = '🏁'; }
            else if (ch === 'T') { cls = 'dr-cell trap'; glyph = '⚠️'; }
            else if (ch === 'G') { glyph = collected ? '' : '💎'; }
            else if (ch === 'K') { glyph = keyTaken ? '' : '🔑'; }
            else if (ch === 'D') { cls = 'dr-cell'; glyph = opened ? '' : '🚪'; }
            const isHero = gs && gs.heroR === r && gs.heroC === c;
            const isEnemy = enemyPos && enemyPos[0] === r && enemyPos[1] === c;
            return (
              <div key={cellId} className={cls}>
                {glyph && <span className="dr-sprite">{glyph}</span>}
                {isEnemy && <span className="dr-sprite dr-enemy">👾</span>}
                {isHero && <span className="dr-sprite dr-hero">🦸</span>}
              </div>
            );
          }))}
        </div>
        {paused && (
          <div className="dr-overlay-panel">
            <div className="dr-paused-msg">⏸ Paused</div>
            <button className="dr-play-btn" style={{ width: 'auto', padding: '0.7rem 1.6rem' }} onClick={() => setPaused(false)}>Resume</button>
          </div>
        )}
      </div>

      <div className="dr-toolbar">
        <button className="dr-tool-btn" onClick={() => setPaused(p => !p)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        <button className="dr-tool-btn" onClick={restartLevel}>↻ Restart</button>
        <button className="dr-tool-btn" onClick={toggleSound}>{soundOn ? '🔊 Sound' : '🔇 Muted'}</button>
        <button className="dr-tool-btn" onClick={() => setPhase('select')}>≡ Levels</button>
      </div>

      <div className="dr-dpad">
        <button className="dr-dbtn up" onPointerDown={(e) => { e.preventDefault(); move(-1, 0); }}>▲</button>
        <button className="dr-dbtn left" onPointerDown={(e) => { e.preventDefault(); move(0, -1); }}>◀</button>
        <button className="dr-dbtn right" onPointerDown={(e) => { e.preventDefault(); move(0, 1); }}>▶</button>
        <button className="dr-dbtn down" onPointerDown={(e) => { e.preventDefault(); move(1, 0); }}>▼</button>
      </div>
    </div>
  );
}

/* ============================================================
   Snake Xenzia helpers + component
   ============================================================ */

const SNAKE_GRID    = 17;          // square board, cells per side
const SNAKE_BASE_MS = 140;         // tick interval at length 0
const SNAKE_MIN_MS  = 70;          // floor for the speed-up curve
const SNAKE_FOOD_PTS = 10;         // points per food eaten
const SNAKE_BEST_KEY = 'puzzlechain_snake_best';

// Tick interval shrinks as the snake grows — caps out at SNAKE_MIN_MS.
function snakeTickMs(length) {
  const ms = SNAKE_BASE_MS - (length - 3) * 4;
  return Math.max(SNAKE_MIN_MS, ms);
}

function snakeLoadBest() {
  try { return parseInt(localStorage.getItem(SNAKE_BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}
function snakeSaveBest(v) {
  try { localStorage.setItem(SNAKE_BEST_KEY, String(v)); } catch {}
}

const SNAKE_DIRS = {
  up:    { dr: -1, dc: 0 },
  down:  { dr: 1,  dc: 0 },
  left:  { dr: 0,  dc: -1 },
  right: { dr: 0,  dc: 1 },
};
function snakeOpposite(a, b) {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') ||
         (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

// Pick a random cell not occupied by the snake. occupied is a Set of "r,c".
function snakeSpawnFood(occupied) {
  const free = [];
  for (let r = 0; r < SNAKE_GRID; r++) {
    for (let c = 0; c < SNAKE_GRID; c++) {
      if (!occupied.has(r + ',' + c)) free.push({ r, c });
    }
  }
  if (free.length === 0) return null; // board full — win-ish edge case
  return free[Math.floor(Math.random() * free.length)];
}

function snakeShareText(score, length, secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `Snake Xenzia 🐍 ${score} pts · length ${length} · ${m}:${s}`;
}

function SnakeGame({ onWin, onStepChange, resetKey }) {
  const startSnake = [
    { r: 8, c: 6 }, { r: 8, c: 5 }, { r: 8, c: 4 },
  ];
  const [snake, setSnake]   = useState(() => startSnake);
  const [food, setFood]     = useState(() => snakeSpawnFood(new Set(startSnake.map(p => p.r + ',' + p.c))));
  const [dir, setDir]       = useState('right');
  const [score, setScore]   = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone]     = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [bestScore, setBestScore] = useState(() => snakeLoadBest());
  const [isMock, setIsMock] = useState(false);

  // Leaderboard tab state
  const [lb, setLb]               = useState(null);   // { top: [...], me: {...} } or null
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError]     = useState(false);

  // Refs so the movement tick always reads fresh state without re-arming.
  const dirRef        = useRef('right');   // last *committed* direction
  const queuedDirRef  = useRef('right');   // next direction to apply on tick
  const snakeRef      = useRef(startSnake);
  const foodRef       = useRef(food);
  const scoreRef      = useRef(0);
  const elapsedRef    = useRef(0);
  const submittedRef  = useRef(false);
  const touchStartRef = useRef(null);

  snakeRef.current = snake;
  foodRef.current  = food;
  scoreRef.current = score;
  elapsedRef.current = elapsedSecs;

  const gameRunning = started && !done && activeTab === 'game';

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  // Elapsed-time clock (pauses when not actively playing).
  useEffect(() => {
    if (!gameRunning) return;
    const id = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameRunning]);

  // Movement tick — re-armed whenever speed (length) changes.
  useEffect(() => {
    if (!gameRunning) return;
    const id = setInterval(() => step(), snakeTickMs(snakeRef.current.length));
    return () => clearInterval(id);
  }, [gameRunning, snake.length]);

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  const handleNewGame = () => {
    const fresh = [{ r: 8, c: 6 }, { r: 8, c: 5 }, { r: 8, c: 4 }];
    dirRef.current = 'right';
    queuedDirRef.current = 'right';
    submittedRef.current = false;
    setSnake(fresh);
    setFood(snakeSpawnFood(new Set(fresh.map(p => p.r + ',' + p.c))));
    setDir('right');
    setScore(0);
    setElapsedSecs(0);
    setStarted(false);
    setDone(false);
  };

  // Steer: queue a direction unless it reverses the committed heading.
  const steer = (d) => {
    if (done) return;
    if (snakeOpposite(dirRef.current, d)) return;
    queuedDirRef.current = d;
    if (!started) { setStarted(true); }
  };

  const submitScore = async (finalScore, length, secs) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBestScore(prev => {
      if (finalScore > prev) { snakeSaveBest(finalScore); return finalScore; }
      return prev;
    });
    try {
      await api('/api/snake/score', {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, length, timeSecs: secs }),
      });
    } catch {}
  };

  const step = () => {
    const d = queuedDirRef.current;
    dirRef.current = d;
    setDir(d);
    const cur = snakeRef.current;
    const { dr, dc } = SNAKE_DIRS[d];
    const head = { r: cur[0].r + dr, c: cur[0].c + dc };

    // Wall collision.
    if (head.r < 0 || head.r >= SNAKE_GRID || head.c < 0 || head.c >= SNAKE_GRID) {
      return endGame();
    }
    // Self collision — checking against the body that will remain. The tail
    // cell vacates this tick (unless we're growing), so exclude it.
    const f = foodRef.current;
    const eating = f && head.r === f.r && head.c === f.c;
    const bodyToCheck = eating ? cur : cur.slice(0, cur.length - 1);
    if (bodyToCheck.some(p => p.r === head.r && p.c === head.c)) {
      return endGame();
    }

    let newSnake;
    if (eating) {
      newSnake = [head, ...cur];
      const newScore = scoreRef.current + SNAKE_FOOD_PTS;
      setScore(newScore);
      scoreRef.current = newScore;
      const occupied = new Set(newSnake.map(p => p.r + ',' + p.c));
      setFood(snakeSpawnFood(occupied));
      onStepChange && onStepChange(newSnake.length);
    } else {
      newSnake = [head, ...cur.slice(0, cur.length - 1)];
    }
    snakeRef.current = newSnake;
    setSnake(newSnake);
  };

  const endGame = () => {
    setDone(true);
    const length = snakeRef.current.length;
    const finalScore = scoreRef.current;
    const secs = elapsedRef.current;
    submitScore(finalScore, length, secs);
    onWin && onWin(finalScore, length, secs, { share: snakeShareText(finalScore, length, secs) });
  };

  // Keyboard — ref-to-latest-closure so the listener mounts once.
  const steerRef = useRef(steer);
  steerRef.current = steer;
  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir2 = map[e.key];
      if (dir2) { e.preventDefault(); steerRef.current(dir2); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const loadLeaderboard = async () => {
    setLbLoading(true);
    setLbError(false);
    const { ok, body } = await api('/api/snake/leaderboard');
    if (ok && body) setLb(body);
    else setLbError(true);
    setLbLoading(false);
  };

  // Build a quick lookup of snake/food cells for rendering.
  const headKey = snake.length ? snake[0].r + ',' + snake[0].c : null;
  const bodyKeys = new Set(snake.map(p => p.r + ',' + p.c));
  const foodKey = food ? food.r + ',' + food.c : null;

  return (
    <div>
      {isMock && <div className="t2048-banner">Local best score — leaderboard syncs to your account when live</div>}

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Score</div>
              <div className="pvalue mono">{score.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Best</div>
              <div className="pvalue mono">{bestScore.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Length</div>
              <div className="pvalue">{snake.length}</div>
            </div>
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
            </div>
          </div>

          <div
            className="snake-board-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="snake-grid"
              style={{ gridTemplateColumns: `repeat(${SNAKE_GRID}, 1fr)`, gridTemplateRows: `repeat(${SNAKE_GRID}, 1fr)` }}
            >
              {Array.from({ length: SNAKE_GRID * SNAKE_GRID }).map((_, i) => {
                const r = Math.floor(i / SNAKE_GRID);
                const c = i % SNAKE_GRID;
                const key = r + ',' + c;
                let cls = 'snake-cell';
                if (key === foodKey) cls += ' snake-food';
                else if (key === headKey) cls += ' snake-head';
                else if (bodyKeys.has(key)) cls += ' snake-body';
                return <div key={i} className={cls} />;
              })}
            </div>

            {!started && !done && (
              <div className="snake-start-overlay" onClick={() => steer('right')}>
                <div style={{ fontSize: '2rem' }}>🐍</div>
                <div>Swipe, tap a direction, or press an arrow / WASD key to start</div>
              </div>
            )}
          </div>

          <div className="snake-dpad">
            <button className="snake-dpad-up"    onClick={() => steer('up')}    aria-label="Up">▲</button>
            <button className="snake-dpad-left"  onClick={() => steer('left')}  aria-label="Left">◀</button>
            <button className="snake-dpad-down"  onClick={() => steer('down')}  aria-label="Down">▼</button>
            <button className="snake-dpad-right" onClick={() => steer('right')} aria-label="Right">▶</button>
          </div>

          <div className="snake-controls">
            <button onClick={handleNewGame}>↺ New Game</button>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {lbLoading && <div className="snake-lb-empty">Loading…</div>}
          {!lbLoading && lbError && (
            <div className="snake-lb-empty">Leaderboard unavailable — your score is still saved locally.</div>
          )}
          {!lbLoading && !lbError && lb && (
            (() => {
              const top = lb.top || [];
              const me = lb.me || null;
              const meInTop = me && top.some(row => row.rank === me.rank);
              if (top.length === 0) {
                return <div className="snake-lb-empty">No scores yet — be the first to play!</div>;
              }
              return (
                <div className="snake-lb-list">
                  {top.map(row => (
                    <div key={row.rank} className={'snake-lb-row' + (me && row.rank === me.rank ? ' snake-lb-me' : '')}>
                      <span className="snake-lb-rank">#{row.rank}</span>
                      <span className="snake-lb-name">{row.username || 'anon'}</span>
                      <span className="snake-lb-score">{Number(row.bestScore).toLocaleString()}</span>
                    </div>
                  ))}
                  {me && !meInTop && (
                    <div>
                      <div className="snake-lb-divider">···</div>
                      <div className="snake-lb-row snake-lb-me">
                        <span className="snake-lb-rank">#{me.rank}</span>
                        <span className="snake-lb-name">{me.username || 'You'}</span>
                        <span className="snake-lb-score">{Number(me.bestScore).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      <div className="t2048-bottom-nav">
        {['game', 'leaderboard'].map(tab => (
          <button
            key={tab}
            className={'t2048-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab === 'leaderboard') loadLeaderboard(); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Game registry
   (more games slot in here — lobby/lock/win/scoring auto-wire)
   ============================================================ */
const GAMES = [
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    category: 'daily',
    desc: 'Fill the 6×6 grid so every row, column, and box has 1–6.',
    tag: 'Logic',
    tagColor: C.accent,
    component: SudokuGame,
  },
  {
    id: 'wordhunt',
    name: 'Word Hunt',
    icon: '🔤',
    category: 'daily',
    desc: 'Find every hidden word in the letter grid.',
    tag: 'Word',
    tagColor: C.violet,
    component: WordHuntGame,
  },
  {
    id: 'cryptowordle',
    name: 'Crypto Wordle',
    icon: '🟩',
    category: 'daily',
    desc: 'Guess the daily 5-letter Web3 term in 6 tries.',
    tag: 'Web3',
    tagColor: C.emerald,
    component: CryptoWordleGame,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    category: 'classic',
    desc: 'Clear the 8×8 grid of mines. Cash Out early to lock in a risk multiplier.',
    tag: 'Risk',
    tagColor: C.rose,
    component: MinesweeperGame,
  },
  {
    id: 'mancala',
    name: 'Mancala',
    icon: '🫘',
    category: 'classic',
    desc: 'Classic stone-pit strategy. Outsmart your opponent by capturing more stones.',
    tag: 'Strategy',
    tagColor: C.gold,
    component: MancalaGame,
  },
  {
    id: '2048',
    name: '2048',
    icon: '🔢',
    category: 'classic',
    desc: 'Slide tiles to merge numbers and reach 2048.',
    tag: 'Numbers',
    tagColor: C.emerald,
    component: T2048Game,
  },
  {
    id: 'texasholdem',
    name: "Texas Hold 'Em",
    icon: '🃏',
    category: 'classic',
    desc: "Play no-limit Hold 'Em vs. two AI opponents. Grow your chip stack hand by hand.",
    tag: 'Poker',
    tagColor: C.gold,
    component: TexasHoldemGame,
  },
  {
    id: 'blockblast',
    name: 'Block Blast',
    icon: '🧩',
    category: 'classic',
    desc: 'Place blocks to fill rows and columns. Clear lines to score big.',
    tag: 'Puzzle',
    tagColor: C.violet,
    component: BlockBlastGame,
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    category: 'classic',
    desc: 'Eat to grow — don\'t hit the walls or yourself. Climb the leaderboard.',
    tag: 'Arcade',
    tagColor: C.emerald,
    component: SnakeGame,
  },
  {
    id: 'tilematching',
    name: 'Tile Match Puzzle',
    icon: '🀄',
    category: 'classic',
    desc: 'Click tiles off the layered board into your 7-slot bar — match three to clear them.',
    tag: 'Puzzle',
    tagColor: '#6366f1',
    component: TileMatchingGame,
  },
  {
    id: 'diamondrush',
    name: 'Diamond Rush',
    icon: '💎',
    category: 'classic',
    desc: 'Guide your hero through tile mazes — grab gems and keys, dodge traps and the patrol, reach the exit.',
    tag: 'Adventure',
    tagColor: C.gold,
    component: DiamondRushGame,
  },
  {
    id: 'tilematchingdaily',
    name: 'Daily Tile Match Puzzle',
    icon: '🀄',
    category: 'daily',
    desc: 'Today\'s layered tile board — 3 minutes to clear it.',
    tag: 'Puzzle',
    tagColor: '#6366f1',
    component: TileMatchingDailyGame,
  },
  {
    id: 'idle',
    name: 'Idle Empire',
    icon: '🐹',
    category: 'idle',
    desc: 'Tap, upgrade, and build your hamster empire with prestige rewards.',
    tag: 'Idle',
    tagColor: C.gold,
    component: IdleGame,
  },
];

/* ============================================================
   Root app
   ============================================================ */
function App() {
  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'game' | 'locked'
  const [currentGame, setCurrentGame] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [winData, setWinData] = useState(null);
  const [loseData, setLoseData] = useState(null);
  // Server-backed per-day attempt state, keyed by game id.
  // { [gameId]: { score, steps, timeSecs, startedAt, finishedAt } }
  const [attempts, setAttempts] = useState({});
  const [nextResetUtc, setNextResetUtc] = useState(null);
  const [offset, setOffset] = useState(0); // serverNow - clientNow (ms)
  const [loading, setLoading] = useState(true);
  const [stepCount, setStepCount] = useState(0);
  const [user, setUser] = useState(null);       // { username, id, usernodePubkey }
  const [authOk, setAuthOk] = useState(true);    // false → signed-out / DB unreachable
  const [, setTick] = useState(0); // 1s heartbeat to keep lobby countdowns live
  // Lobby tab: 'daily' or 'classic', initialized from ?tab= URL param
  const [lobbyTab, setLobbyTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'classic' ? 'classic' : t === 'idle' ? 'idle' : 'daily';
  });
  // Incremented to trigger MinesweeperGame reset on Play Again
  const [playAgainKey, setPlayAgainKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Hydrate today's locked/result state from the server on mount, and
  // recompute the score from finished attempts so it survives reloads.
  const loadDaily = async () => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const path = '/api/daily' + (demo ? `?demo=${encodeURIComponent(demo)}` : '');
    const { ok, body } = await api(path);
    if (ok && body) {
      setAuthOk(true);
      setUser(body.user || null);
      setAttempts(body.attempts || {});
      setNextResetUtc(body.nextResetUtc);
      setStreak(typeof body.streak === 'number' ? body.streak : 0);
      setOffset(new Date(body.serverNowUtc).getTime() - Date.now());
      const sum = Object.values(body.attempts || {})
        .reduce((acc, a) => acc + (a.score || 0), 0);
      setTotalScore(sum);
    } else {
      // 401 (no/expired token) or 5xx (DB down): can't confirm the account,
      // so persistence isn't guaranteed — reflect that in the nav.
      setAuthOk(false);
      setUser(null);
      setStreak(0);
    }
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, []);

  // Midnight UTC reached — reload state so everything unlocks.
  const onReset = () => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    loadDaily();
  };

  const launchGame = async (game) => {
    // Classic games and idle games skip the daily system
    if (game.category === 'classic' || game.category === 'idle') {
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
      return;
    }
    if (attempts[game.id]) {
      // Already used today — straight to the locked screen.
      setCurrentGame(game);
      setScreen('locked');
      return;
    }
    const { ok, status, body } = await api(`/api/daily/${game.id}/start`, { method: 'POST' });
    if (ok) {
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setScreen('game');
    } else if (status === 409) {
      // Lost the race / already locked — show the locked screen.
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      if (body && body.attempt) setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setScreen('locked');
    }
  };

  const handleWin = async (score, steps, timeSecs, meta) => {
    // Classic games skip server, streak, and totalScore nav update
    if (currentGame && currentGame.category === 'classic') {
      const cashoutMultiplier = (meta && meta.cashoutMultiplier) || 1;
      setWinData({
        score,
        bonus: 0,
        finalScore: score,
        steps,
        timeSecs,
        multiplier: cashoutMultiplier,
        effectiveStreak: 0,
        share: meta && meta.share,
        cashOut: meta && meta.cashOut,
        isClassic: true,
      });
      return;
    }
    // The streak this win lands in: the first finished game of the day extends
    // the consecutive-day streak by 1; a second game the same day reuses the
    // same day count (the multiplier is per-day, not per-game).
    const playedToday = Object.values(attempts).some(a => a && a.score != null);
    const effectiveStreak = playedToday ? streak : streak + 1;
    const multiplier = streakMultiplier(effectiveStreak);
    const finalScore = Math.round(score * multiplier);
    const bonus = finalScore - score;
    setStreak(effectiveStreak);
    setWinData({ score, bonus, finalScore, steps, timeSecs, multiplier, effectiveStreak, share: meta && meta.share });

    const gameId = currentGame.id;
    const { ok, body } = await api(`/api/daily/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify({ score: finalScore, steps, timeSecs }),
    });
    const stored = ok && body && body.attempt
      ? body.attempt
      : { score: finalScore, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
    setTotalScore(t => t + finalScore);
    // Reconcile against the server's authoritative streak (now that today is
    // finished) so a reload and the live nav badge agree.
    if (ok && body && typeof body.streak === 'number') setStreak(body.streak);
  };

  // Loss path (used by games that can be lost, e.g. Crypto Wordle). Records a
  // finished row with score 0 so the day stays locked, but does NOT touch the
  // streak. Existing win-only games never call this.
  const handleLose = async (steps, timeSecs, meta) => {
    // Classic games skip server entirely
    if (currentGame && currentGame.category === 'classic') {
      setLoseData({
        steps,
        timeSecs,
        share: meta && meta.share,
        answer: meta && meta.answer,
        isClassic: true,
      });
      return;
    }
    setLoseData({
      steps,
      timeSecs,
      share: meta && meta.share,
      answer: meta && meta.answer,
    });

    const gameId = currentGame.id;
    const { ok, body } = await api(`/api/daily/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify({ score: 0, steps, timeSecs }),
    });
    const stored = ok && body && body.attempt
      ? body.attempt
      : { score: 0, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
  };

  const backToLobby = (tab) => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    if (tab) setLobbyTab(tab);
  };

  const playAgain = () => {
    setWinData(null);
    setLoseData(null);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
  };

  // Copy-to-clipboard Share button for the win/loss overlays. Flips its label
  // to "Copied!" briefly; degrades to a no-op where clipboard is unavailable.
  function ShareButton({ text }) {
    const [copied, setCopied] = useState(false);
    if (!text) return null;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    };
    return (
      <button
        className="primary-btn"
        style={{ background: C.violet, marginBottom: '0.6rem' }}
        onClick={copy}
      >
        {copied ? 'Copied!' : 'Share result'}
      </button>
    );
  }

  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const GameComponent = currentGame ? currentGame.component : null;

  // Reward level surfaced in the nav + lobby. Suppressed when signed out so we
  // never show a multiplier the server can't back.
  const activeMult = authOk ? streakMultiplier(streak) : 1;
  const tierAhead = authOk && streak > 0 ? nextTierInfo(streak) : null;

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <div className="nav-brand"><span className="logo">⬢</span> PuzzleChain</div>
        <div className="nav-right">
          <div className="nav-stats">
            <div className="nav-stat">
              <div className="label">Score</div>
              <div className="value score mono">{totalScore}</div>
            </div>
            <div className="nav-stat">
              <div className="label">Streak</div>
              <div className="value streak mono">
                {streak}
                {activeMult > 1 && <span className="mult-badge">×{activeMult}</span>}
              </div>
            </div>
          </div>
          <AccountChip loading={loading} authOk={authOk} user={user} />
        </div>
      </nav>

      {screen === 'lobby' && (
        <div className="lobby">
          <div className="lobby-head">
            <h1>
              {lobbyTab === 'daily' ? 'Daily Puzzles' : lobbyTab === 'classic' ? 'Classic Games' : 'Idle Empire'}
            </h1>
            <p>
              {lobbyTab === 'daily'
                ? 'One attempt each, per day. Resets at midnight UTC.'
                : lobbyTab === 'classic'
                ? 'Play anytime — track your best scores.'
                : 'Tap, upgrade, and build your empire. Progress saved automatically.'}
            </p>
            {lobbyTab === 'daily' && authOk && streak > 0 && (
              <p className="lobby-hint">
                🔥 {streak}-day streak · {tierAhead
                  ? `${tierAhead.daysAway} more daily win${tierAhead.daysAway === 1 ? '' : 's'} → ×${tierAhead.mult} points`
                  : `max ×${activeMult} multiplier active`}
              </p>
            )}
            {lobbyTab === 'daily' && nextResetUtc && (
              <p className="reset-countdown mono">
                Next puzzle in {fmtHoursMins(
                  new Date(nextResetUtc).getTime() - (Date.now() + offset))}
              </p>
            )}
          </div>
          <div className="lobby-tabs">
            <button
              className={'lobby-tab' + (lobbyTab === 'daily' ? ' active' : '')}
              onClick={() => setLobbyTab('daily')}
            >Daily Puzzle</button>
            <button
              className={'lobby-tab' + (lobbyTab === 'classic' ? ' active' : '')}
              onClick={() => setLobbyTab('classic')}
            >Classic Games</button>
            <button
              className={'lobby-tab' + (lobbyTab === 'idle' ? ' active' : '')}
              onClick={() => setLobbyTab('idle')}
            >Idle Empire</button>
          </div>
          <div className="grid">
            {GAMES.filter(g => g.category === lobbyTab).map(g => {
              const isClassicOrIdle = g.category === 'classic' || g.category === 'idle';
              const a = attempts[g.id];
              const locked = !isClassicOrIdle && !!a;
              return (
                <div
                  key={g.id}
                  className={`card${locked ? ' done locked' : ''}`}
                  style={{ '--accent': g.tagColor }}
                  onClick={() => !loading && launchGame(g)}
                >
                  <div className="card-icon">{g.icon}</div>
                  <div className="card-name">{g.name}</div>
                  <div className="card-desc">{g.desc}</div>
                  {locked ? (
                    <div className="card-lock">
                      🔒 {a.score != null
                        ? <span>+{a.score} pts · resets in {fmtCountdown(
                            (nextResetUtc ? new Date(nextResetUtc).getTime() : 0) - (Date.now() + offset))}</span>
                        : <span>Played · locked until reset</span>}
                    </div>
                  ) : (
                    <span
                      className="tag mono"
                      style={{ background: g.tagColor + '22', color: g.tagColor }}
                    >
                      {g.tag}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'locked' && currentGame && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={backToLobby}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <LockedScreen
            game={currentGame}
            attempt={attempts[currentGame.id]}
            nextResetUtc={nextResetUtc}
            offset={offset}
            onReset={onReset}
            onBack={backToLobby}
          />
        </div>
      )}

      {screen === 'game' && currentGame && !winData && !loseData && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={backToLobby}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <GameComponent
            onWin={handleWin}
            onLose={handleLose}
            onStepChange={setStepCount}
            offset={offset}
            resetKey={playAgainKey}
          />
        </div>
      )}

      {screen === 'game' && winData && (
        <div className="win-overlay">
          <div className="win-card">
            <div className="trophy">{winData.cashOut ? '💰' : '🏆'}</div>
            <h2>{winData.winnerLabel || (winData.cashOut ? 'Cashed Out! 💰' : 'Solved!')}</h2>
            <div className="sub">{currentGame && currentGame.name}</div>
            <div className="score-rows">
              <div className="score-row">
                <span className="k">Base score</span>
                <span className="v mono">{winData.score}</span>
              </div>
              {winData.isClassic && winData.multiplier > 1 && (
                <div className="score-row bonus">
                  <span className="k">Cash Out ×{winData.multiplier}</span>
                  <span className="v mono">×{winData.multiplier}</span>
                </div>
              )}
              {!winData.isClassic && winData.multiplier > 1 && (
                <div className="score-row bonus">
                  <span className="k">Streak ×{winData.multiplier} · {winData.effectiveStreak}-day</span>
                  <span className="v mono">+{winData.bonus}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">Steps · Time</span>
                <span className="v mono">{winData.steps} · {fmtTime(winData.timeSecs)}</span>
              </div>
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+{winData.finalScore}</span>
              </div>
            </div>
            <ShareButton text={winData.share} />
            {winData.isClassic && (
              <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={playAgain}>
                Play Again
              </button>
            )}
            <button className="primary-btn" onClick={() => backToLobby(winData.isClassic ? 'classic' : null)}>Back to Lobby</button>
          </div>
        </div>
      )}

      {screen === 'game' && loseData && (
        <div className="win-overlay">
          <div className="win-card">
            <div className="trophy">{loseData.isClassic ? '💥' : '💀'}</div>
            <h2>{loseData.isClassic ? 'Game Over' : 'Out of guesses'}</h2>
            <div className="sub">{currentGame && currentGame.name}</div>
            <div className="score-rows">
              {loseData.answer && (
                <div className="score-row">
                  <span className="k">Answer</span>
                  <span className="v mono">{loseData.answer}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">{loseData.isClassic ? 'Steps' : 'Guesses'} · Time</span>
                <span className="v mono">{loseData.steps} · {fmtTime(loseData.timeSecs)}</span>
              </div>
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+0</span>
              </div>
            </div>
            <ShareButton text={loseData.share} />
            {loseData.isClassic && (
              <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={playAgain}>
                Play Again
              </button>
            )}
            <button className="primary-btn" onClick={() => backToLobby(loseData.isClassic ? 'classic' : null)}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
