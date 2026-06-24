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
.badge-chip.active { border-color: ${C.emerald}; color: ${C.emerald}; background: ${C.emerald}14; }
/* Win-overlay "milestone unlocked" flourish */
.badge-unlock {
  margin: 0.4rem 0 0.9rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, ${C.emerald}22, ${C.gold}22);
  border: 1px solid ${C.emerald}55;
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
.account-chip.on { cursor: pointer; font-family: inherit; color: ${C.text}; transition: border-color 0.12s ease; }
.account-chip.on:hover { border-color: ${C.accent}; }
.account-chip .avatar { position: relative; }
.account-chip .avatar-tick {
  position: absolute; right: -0.2rem; bottom: -0.2rem;
  width: 0.85rem; height: 0.85rem; border-radius: 50%;
  background: ${C.emerald}; color: white; font-size: 0.55rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid ${C.bg};
}

/* ---- Account screen ---- */
.account-screen { max-width: 540px; margin: 0 auto; padding: 1.5rem 1.25rem; }
.account-head { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1.25rem; }
.account-head h2 { font-size: 1.4rem; font-weight: 700; }
.account-id-row { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1rem; }
.account-avatar {
  width: 2.6rem; height: 2.6rem; border-radius: 50%; background: ${C.accent};
  color: white; font-size: 1.1rem; font-weight: 700; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
}
.account-uname { font-size: 1.05rem; font-weight: 700; }
.account-sub { font-size: 0.78rem; color: ${C.emerald}; }
.account-field { margin-top: 0.5rem; }
.account-signed-out { color: ${C.muted}; font-size: 0.9rem; line-height: 1.5; }
.account-status {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem;
}
.account-status-dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; flex: 0 0 auto; }
.account-status-verified { color: ${C.emerald}; }
.account-status-verified .account-status-dot { background: ${C.emerald}; }
.account-status-linked { color: ${C.gold}; }
.account-status-linked .account-status-dot { background: ${C.gold}; }
.account-status-none { color: ${C.muted}; }
.account-status-none .account-status-dot { background: ${C.muted}; }
.account-wallet-addr {
  font-size: 0.85rem; color: ${C.text}; margin-bottom: 0.5rem;
}
.account-status-desc { font-size: 0.83rem; color: ${C.muted}; line-height: 1.5; }
.account-danger { color: ${C.rose}; border-color: ${C.rose}; }
.account-msg { margin-top: 0.75rem; font-size: 0.83rem; line-height: 1.45; }
.account-msg.ok { color: ${C.emerald}; }
.account-msg.err { color: ${C.rose}; }

@media (max-width: 560px) {
  .account-chip .who { display: none; }
  .account-chip { padding: 0.35rem; }
  .nav-right { gap: 0.8rem; }
  .lobby { padding: 1rem 0.75rem; }
  .lobby-head h1 { font-size: 1.3rem; }
  .lobby-head p { font-size: 0.85rem; }
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
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
.lrow.me { background: ${C.accent}22; }
.lrow.me .lrank, .lrow.me .lname { color: ${C.accent}; font-weight: 600; }
.lrow.pinned { margin-top: 0.3rem; border-top: 1px dashed ${C.border}; padding-top: 0.5rem; }

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
.snake-pause-overlay {
  position: absolute;
  inset: 0;
  background: ${C.bg}cc;
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
.cg-btn:active { background: ${C.accent}22; }
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
  background: rgba(10,14,26,0.6);
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

/* Keep existing classic boards fitting inside the shell stage */
.cg-stage .ms-grid, .cg-stage .t2048-board-wrap { max-width: min(360px, var(--cg-board)) !important; }
.cg-stage .mnc-board { max-width: min(480px, var(--cg-board)) !important; }
.cg-stage .ms-bottom-nav, .cg-stage .mnc-bottom-nav, .cg-stage .t2048-bottom-nav { display: none; }

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
.bb-cell.preview { background: ${C.accent}66; }
.bb-cell.invalid { background: ${C.rose}55; }
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

/* ---- Tile Match ---- */
.tm-grid {
  width: var(--cg-board);
  max-width: 94vw;
  display: grid;
  gap: clamp(3px, 1vw, 6px);
  touch-action: manipulation;
}
.tm-grid .tm-tile {
  aspect-ratio: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1rem, 5vw, 1.7rem);
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s ease, background 0.1s ease, opacity 0.18s ease;
}
.tm-grid .tm-tile.sel { background: ${C.accent}44; border-color: ${C.accent}; transform: scale(0.92); }
.tm-grid .tm-tile.gone { opacity: 0; pointer-events: none; }

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
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.dr-gem.sel { outline: 2px solid #fff; transform: scale(0.86); }
.dr-gem.clearing { opacity: 0; transform: scale(0.4); }

/* ---- Texas Hold 'Em ---- */
.th-felt {
  width: var(--cg-board);
  max-width: 94vw;
  background: radial-gradient(ellipse at center, #155e3a, #0c3d26);
  border: 2px solid ${C.gold}66;
  border-radius: 18px;
  padding: clamp(0.6rem, 2.5vw, 1.1rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.5rem, 2vh, 0.9rem);
}
.th-seat { text-align: center; }
.th-seat .who { font-size: 0.72rem; color: #d6e8d6; letter-spacing: 0.04em; }
.th-seat .chips { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: ${C.gold}; font-weight: 600; }
.th-cards { display: flex; gap: 0.35rem; justify-content: center; }
.th-card {
  width: clamp(2rem, 9vw, 3rem);
  height: clamp(2.8rem, 12.5vw, 4.2rem);
  border-radius: 7px;
  background: #fbfbfb;
  color: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: clamp(0.85rem, 4vw, 1.25rem);
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  line-height: 1;
}
.th-card.red { color: ${C.rose}; }
.th-card.back { background: repeating-linear-gradient(45deg, ${C.accent}, ${C.accent} 6px, ${C.border} 6px, ${C.border} 12px); color: transparent; }
.th-pot { font-family: 'JetBrains Mono', monospace; color: ${C.gold}; font-weight: 600; font-size: 0.95rem; }
.th-msg { color: #d6e8d6; font-size: 0.82rem; min-height: 1.2rem; text-align: center; }
.th-community { display: flex; gap: 0.3rem; min-height: clamp(2.8rem, 12.5vw, 4.2rem); align-items: center; }
.th-actions {
  display: flex;
  gap: 0.5rem;
  width: var(--cg-board);
  max-width: 94vw;
}
.th-actions button {
  flex: 1;
  background: ${C.card};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 0.7rem 0.3rem;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.th-actions button:hover:not(:disabled) { border-color: ${C.gold}; }
.th-actions button:disabled { opacity: 0.35; cursor: not-allowed; }
.th-actions button.bet { background: ${C.gold}; color: #000; border-color: ${C.gold}; }
.th-betsizer { display: flex; align-items: center; gap: 0.5rem; width: var(--cg-board); max-width: 94vw; }
.th-betsizer input { flex: 1; }
.th-betsizer .amt { font-family: 'JetBrains Mono', monospace; color: ${C.gold}; font-weight: 600; min-width: 3rem; text-align: right; }

@media (orientation: landscape) and (max-height: 560px) {
  .cg-shell { --cg-board: min(70vh, 44vw, 460px); }
  .cg-stage { flex-direction: row; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .cg-sheet, .tm-grid .tm-tile, .dr-gem, .snake-cell { transition: none !important; }
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

/* ---- Knight's Tour ---- */
.kt-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.kt-board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  max-width: 480px;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid ${C.border};
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
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
.kt-cell.kt-valid { background: ${C.accent}33; cursor: pointer; }
.kt-cell.kt-valid:hover { background: ${C.accent}55; }
.kt-cell.kt-current { background: ${C.accent}22; outline: 2px solid ${C.accent}; outline-offset: -2px; }
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
  border: 1px solid ${C.rose}44;
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
  border-bottom: 1px solid ${C.border}22;
}
.kt-history-row.kt-row-new { background: ${C.accent}11; border-radius: 6px; }
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

/* ---- PvP Arena ---- */
.pvp-lobby { max-width: 680px; margin: 0 auto; padding: 0.25rem 0; }
.pvp-header { margin-bottom: 1.5rem; text-align: center; }
.pvp-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
.pvp-subtitle { color: ${C.muted}; font-size: 0.9rem; }
.pvp-balance {
  margin-top: 0.7rem; display: inline-block;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 999px; padding: 0.3rem 0.9rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
  color: ${C.gold};
}
.pvp-how {
  display: flex; flex-direction: column; gap: 0.4rem;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 12px; padding: 0.9rem 1.1rem; margin-bottom: 1.5rem;
}
.pvp-how-step { font-size: 0.85rem; color: ${C.muted}; }
.pvp-tiers { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.9rem; }
.pvp-tier-card {
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 14px; padding: 1.1rem;
  display: flex; flex-direction: column; gap: 0.4rem;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.pvp-tier-card:hover { border-color: var(--pvp-color); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
.pvp-tier-label { font-size: 1.15rem; font-weight: 700; color: var(--pvp-color); }
.pvp-tier-desc { font-size: 0.82rem; color: ${C.muted}; }
.pvp-tier-payout { font-size: 0.78rem; color: ${C.text}; font-family: 'JetBrains Mono', monospace; }
.pvp-tier-btn {
  margin-top: 0.5rem; border: none; border-radius: 10px; color: #fff;
  font-family: inherit; font-size: 0.9rem; font-weight: 600;
  padding: 0.65rem; cursor: pointer; transition: opacity 0.12s;
}
.pvp-tier-btn:disabled { opacity: 0.5; cursor: default; }
.pvp-tier-btn:not(:disabled):hover { opacity: 0.85; }
.pvp-matchmaking {
  max-width: 400px; margin: 2rem auto; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.pvp-mm-icon { font-size: 3rem; }
.pvp-mm-title { font-size: 1.25rem; font-weight: 700; }
.pvp-mm-code {
  font-family: 'JetBrains Mono', monospace; font-size: 1rem;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 10px; padding: 0.5rem 1.2rem; color: ${C.accent};
  letter-spacing: 0.08em;
}
.pvp-mm-hint { color: ${C.muted}; font-size: 0.85rem; }
.pvp-cancel-btn {
  margin-top: 0.5rem; background: transparent; border: 1px solid ${C.border};
  color: ${C.muted}; border-radius: 10px; padding: 0.5rem 1.2rem;
  font-family: inherit; font-size: 0.875rem; cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.pvp-cancel-btn:hover { border-color: ${C.rose}; color: ${C.rose}; }
.pvp-mm-pulse {
  width: 2.5rem; height: 2.5rem; border-radius: 50%;
  border: 3px solid ${C.accent}; border-top-color: transparent;
  animation: pvp-spin 0.8s linear infinite;
}
@keyframes pvp-spin { to { transform: rotate(360deg); } }
.pvp-deposit {
  max-width: 360px; margin: 2rem auto; text-align: center;
  display: flex; flex-direction: column; gap: 0.75rem; align-items: center;
}
.pvp-deposit-title { font-size: 1.2rem; font-weight: 700; }
.pvp-deposit-amount {
  font-family: 'JetBrains Mono', monospace; font-size: 1.6rem; font-weight: 700;
  color: ${C.gold};
}
.pvp-deposit-hint { color: ${C.muted}; font-size: 0.82rem; }
.pvp-waiting {
  max-width: 360px; margin: 2rem auto; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem;
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px;
}
.pvp-waiting-title { font-size: 1.1rem; font-weight: 600; }
.pvp-waiting-hint { color: ${C.muted}; font-size: 0.85rem; }
.pvp-game-wrap .pvp-vs-bar {
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 12px; padding: 0.55rem 1rem; margin-bottom: 0.75rem;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.85rem;
}
.pvp-vs-bar .pvp-vs-opp { color: ${C.muted}; }
.pvp-vs-bar .pvp-vs-label {
  font-weight: 700; font-size: 0.75rem; letter-spacing: 0.08em;
  color: ${C.rose}; text-transform: uppercase;
}
.pvp-vs-bar .pvp-forfeit-btn {
  background: transparent; border: 1px solid ${C.border}; color: ${C.muted};
  border-radius: 8px; padding: 0.3rem 0.65rem; font-size: 0.78rem;
  font-family: inherit; cursor: pointer; transition: border-color 0.12s, color 0.12s;
}
.pvp-vs-bar .pvp-forfeit-btn:hover { border-color: ${C.rose}; color: ${C.rose}; }
.pvp-result {
  max-width: 360px; margin: 2rem auto; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem;
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}
.pvp-result-emoji { font-size: 3rem; }
.pvp-result-title { font-size: 1.4rem; font-weight: 700; }
.pvp-result .pvp-result-btns { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
.pvp-auth-msg {
  text-align: center; color: ${C.muted}; padding: 2rem;
  font-size: 0.95rem;
}
.pvp-mm-countdown {
  font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700;
  color: ${C.accent}; letter-spacing: 0.06em;
}
.pvp-mm-countdown-expired { color: ${C.rose}; }
.pvp-mm-btns { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; }
.pvp-reclaim-btn {
  background: ${C.rose}; border: none; border-radius: 10px; color: #fff;
  font-family: inherit; font-size: 0.9rem; font-weight: 600;
  padding: 0.6rem 1.4rem; cursor: pointer; transition: opacity 0.12s;
}
.pvp-reclaim-btn:disabled { opacity: 0.55; cursor: default; }
.pvp-reclaim-btn:not(:disabled):hover { opacity: 0.85; }
.pvp-opp-bar { flex: 1; margin: 0 0.75rem; }
.pvp-opp-bar-label { font-size: 0.72rem; color: ${C.muted}; margin-bottom: 0.2rem; }
.pvp-opp-bar-track {
  height: 6px; background: ${C.surface}; border-radius: 99px; overflow: hidden;
}
.pvp-opp-bar-fill {
  height: 100%; background: ${C.violet}; border-radius: 99px;
  transition: width 0.5s ease;
}
.pvp-telem-summary {
  width: 100%; background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 10px; padding: 0.65rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.pvp-telem-row {
  display: flex; justify-content: space-between; font-size: 0.82rem; color: ${C.muted};
}
.pvp-telem-row .mono { color: ${C.text}; }
.pvp-prize-anim {
  width: 100%; background: ${C.surface}; border: 1px solid ${C.emerald};
  border-radius: 10px; padding: 0.65rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.35rem;
  animation: pvp-prize-fade 0.5s ease;
}
@keyframes pvp-prize-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pvp-prize-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: ${C.emerald}; margin-bottom: 0.15rem; }
.pvp-prize-row {
  display: flex; justify-content: space-between; font-size: 0.82rem; color: ${C.muted};
}
.pvp-prize-row .mono { color: ${C.text}; }
.pvp-prize-winner { color: ${C.emerald}; font-weight: 600; }
.pvp-prize-winner .mono { color: ${C.emerald}; }

/* ---- Tile Match Puzzle menu & competitive tabs ---- */
.tm-menu { display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; width: 100%; }
.tm-menu-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0 0.6rem; gap: 0.5rem;
}
.tm-menu-header h2 { font-size: 1rem; font-weight: 700; margin: 0; flex: 1; }
.tm-wallet-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 20px; padding: 0.25rem 0.65rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;
  font-weight: 600; color: ${C.gold}; white-space: nowrap;
}
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
.tm-lb-sub-tab.active { background: ${C.accent}18; border-color: ${C.accent}; color: ${C.accent}; font-weight: 600; }
.tm-lb-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.45rem 0.5rem; border-radius: 8px;
  font-size: 0.84rem; transition: background 0.1s;
}
.tm-lb-row:hover { background: ${C.surface}; }
.tm-lb-row.me { background: ${C.accent}12; border: 1px solid ${C.accent}30; margin-top: 0.4rem; }
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
.tm-duel-find-btn:hover:not(:disabled) { background: #2f6fe0; }
.tm-duel-find-btn:disabled { opacity: 0.35; cursor: not-allowed; background: ${C.muted}; }
.tm-duel-matchmaking {
  text-align: center; padding: 2rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.tm-duel-pulse {
  width: 3rem; height: 3rem; border-radius: 50%;
  background: ${C.accent}33; border: 2px solid ${C.accent};
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
.tm-task-claim-btn:hover:not(:disabled) { background: #059669; }
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
.wallet-balance-big {
  font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700;
  color: ${C.emerald};
}
.wallet-balance-sub { font-size: 0.8rem; color: ${C.muted}; margin-top: 0.2rem; }
.wallet-pending-big {
  font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; font-weight: 700;
  color: ${C.gold};
}
.wallet-mock-badge {
  display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px;
  background: ${C.dim}; border: 1px solid ${C.border};
  font-size: 0.68rem; color: ${C.muted}; margin-bottom: 1rem;
}
.wallet-activity-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.45rem 0; border-bottom: 1px solid ${C.border}40;
  font-size: 0.83rem;
}
.wallet-activity-row:last-child { border-bottom: none; }
.wallet-activity-kind { color: ${C.muted}; }
.wallet-activity-amt { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
.wallet-activity-earned { color: ${C.emerald}; }
.wallet-activity-tip-recv { color: ${C.gold}; }
.wallet-activity-tip-sent { color: ${C.rose}; }
.wallet-no-wallet {
  text-align: center; padding: 2rem 1rem; color: ${C.muted}; font-size: 0.9rem;
}
.wallet-btn-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }
.wallet-freeze-info {
  font-size: 0.8rem; color: ${C.muted}; margin-top: 0.35rem;
}
/* ---- Nav wallet chip ---- */
.nav-wallet-chip {
  display: flex; align-items: center; gap: 0.35rem;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 999px; padding: 0.3rem 0.7rem;
  cursor: pointer; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace;
  color: ${C.emerald}; transition: border-color 0.15s;
}
.nav-wallet-chip:hover { border-color: ${C.emerald}; }
.nav-integration-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 999px; padding: 0.3rem 0.7rem;
  font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;
  color: ${C.accent};
}
/* ---- Tip modal ---- */
.tip-modal-backdrop {
  position: fixed; inset: 0; background: #00000099; z-index: 50;
  display: flex; align-items: center; justify-content: center;
}
.tip-modal {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px;
  padding: 1.5rem; width: min(95vw, 380px);
}
.tip-modal h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; }
.tip-presets { display: flex; gap: 0.5rem; margin-bottom: 0.85rem; flex-wrap: wrap; }
.tip-preset-btn {
  padding: 0.35rem 0.8rem; border-radius: 8px; border: 1px solid ${C.border};
  background: ${C.surface}; color: ${C.text}; font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem; cursor: pointer; transition: border-color 0.12s;
}
.tip-preset-btn.active { border-color: ${C.accent}; background: ${C.accent}22; color: ${C.accent}; }
.tip-input {
  width: 100%; padding: 0.55rem 0.75rem; border-radius: 8px;
  border: 1px solid ${C.border}; background: ${C.surface}; color: ${C.text};
  font-family: 'JetBrains Mono', monospace; font-size: 1rem;
  margin-bottom: 0.85rem;
}
.tip-input:focus { outline: none; border-color: ${C.accent}; }
/* ---- Win overlay reward line ---- */
.win-reward-row {
  display: flex; justify-content: space-between; padding: 0.4rem 0;
  border-top: 1px solid ${C.border}40; margin-top: 0.4rem;
}
.win-reward-row .k { color: ${C.muted}; font-size: 0.88rem; }
.win-reward-row .v { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: ${C.gold}; }

/* ---- DApp Mode ---- */
.dapp-badge {
  display: inline-flex; align-items: center; gap: 0.4rem; width: 100%;
  justify-content: center; margin: 0.6rem 0; padding: 0.5rem 0.7rem;
  background: ${C.emerald}1a; border: 1px solid ${C.emerald}66; color: ${C.emerald};
  border-radius: 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.dapp-badge.disputed { background: ${C.rose}1a; border-color: ${C.rose}66; color: ${C.rose}; }
.dapp-badge-arrow { margin-left: auto; opacity: 0.7; }
.dapp-badge-dot { font-size: 0.9rem; }
.dapp-verified-pill {
  font-size: 0.62rem; font-weight: 600; color: ${C.emerald};
  background: ${C.emerald}1a; border: 1px solid ${C.emerald}55; border-radius: 999px;
  padding: 0.05rem 0.45rem; margin-left: 0.4rem; vertical-align: middle;
}
.dapp-verdict { border-radius: 0.6rem; padding: 0.7rem 0.85rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.85rem; }
.dapp-verdict.ok  { background: ${C.emerald}1a; border: 1px solid ${C.emerald}66; color: ${C.emerald}; }
.dapp-verdict.bad { background: ${C.rose}1a; border: 1px solid ${C.rose}66; color: ${C.rose}; }
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
  color: ${C.emerald}; background: ${C.emerald}1a; border: 1px solid ${C.emerald}55;
  border-radius: 999px; padding: 0.15rem 0.55rem; margin-left: 0.5rem;
}
.dapp-identity-badge.unproven { color: ${C.muted}; background: ${C.dim}33; border-color: ${C.dim}; }
.dapp-wallet-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.6rem; }
`;
