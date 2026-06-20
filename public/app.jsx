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
    return t === 'classic' ? 'classic' : 'daily';
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
    // Classic games skip the server entirely
    if (game.category === 'classic') {
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
            <h1>{lobbyTab === 'daily' ? 'Daily Puzzles' : 'Classic Games'}</h1>
            <p>{lobbyTab === 'daily'
              ? 'One attempt each, per day. Resets at midnight UTC.'
              : 'Play anytime — track your best scores.'}
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
          </div>
          <div className="grid">
            {GAMES.filter(g => g.category === lobbyTab).map(g => {
              const isClassic = g.category === 'classic';
              const a = attempts[g.id];
              const locked = !isClassic && !!a;
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
            <h2>{winData.cashOut ? 'Cashed Out! 💰' : 'Solved!'}</h2>
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
