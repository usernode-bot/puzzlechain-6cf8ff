const { useState, useEffect, useRef } = React;

/* ============================================================
   Design system — color palette
   ============================================================ */
const C = {
  bg:      '#0A0D14',
  surface: '#12161F',
  card:    '#181D29',
  border:  '#2A3342',
  accent:  '#6366F1',
  gold:    '#FBBF24',
  emerald: '#34D399',
  violet:  '#A78BFA',
  rose:    '#FB7185',
  text:    '#ECEFF6',
  muted:   '#8B95A8',
  dim:     '#39424F',
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
/* Today's Champions leaderboard tweaks (reuses .lboard) */
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
  background: ${C.gold}14;
  border: 1px solid ${C.gold}55;
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

/* Account "Connections" section — Friends + dApps relocated here on mobile. */
.account-connection-row {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  background: ${C.dim}; border: 1px solid ${C.border};
  border-radius: 10px; padding: 0.7rem 0.9rem;
  font-size: 0.9rem; font-weight: 600; color: ${C.text};
  cursor: pointer; text-align: left; transition: border-color 0.15s;
}
.account-connection-row:hover { border-color: ${C.accent}; }
.account-connection-row .chev { margin-left: auto; color: ${C.muted}; }
.account-dapps-row { margin-top: 1rem; }
.account-dapps-pubkey {
  font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
  color: ${C.text}; word-break: break-all; flex: 1;
}

/* The Connections section is only shown at narrow widths — above 560px the
   Friends button and dApps chip live in the top bar instead. */
@media (min-width: 561px) {
  .account-connections { display: none; }
}

@media (max-width: 560px) {
  .account-chip .who { display: none; }
  .account-chip { padding: 0.35rem; }
  .nav-right { gap: 0.8rem; }
  .lobby { padding: 1rem 0.75rem; }
  .lobby-head h1 { font-size: 1.3rem; }
  .lobby-head p { font-size: 0.85rem; }
  /* Friends + dApps move into the Account screen's Connections section.
     Scoped under .nav-right so they outrank the base chip rule defined
     later in this stylesheet regardless of source order. */
  .nav-right .nav-friends-btn { display: none; }
  .nav-right .nav-integration-chip { display: none; }
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
.primary-btn:hover { background: #4F52D9; }

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
.cw-board {
  display: grid;
  gap: 0.4rem;
  max-width: 330px;
  margin: 0 auto;
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
.ms-wallet-status {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: right;
}
.ms-wallet-status .ms-ws-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: ${C.emerald};
}
.ms-wallet-status .ms-ws-label.mock { color: ${C.gold}; }
.ms-wallet-status .ms-ws-label.unavail { color: ${C.muted}; }
.ms-wallet-status .ms-ws-addr {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: ${C.muted};
}
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
.ms-action-row .ms-music-btn.paused { color: ${C.gold}; border-color: ${C.gold}66; }
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
.mnc-daily-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; flex-wrap: wrap;
  max-width: 480px; margin: 0 auto 0.6rem;
}
.mnc-daily-title { font-weight: 700; font-size: 0.95rem; color: ${C.text}; }
.mnc-daily-pills { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.mnc-record-pill {
  font-size: 0.74rem; font-weight: 700;
  background: ${C.gold}14; color: ${C.gold};
  border: 1px solid ${C.gold}55;
  border-radius: 999px; padding: 0.18rem 0.55rem;
  white-space: nowrap;
}
.mnc-streak-chip {
  font-size: 0.74rem; font-weight: 700;
  background: ${C.rose}1f; color: ${C.rose};
  border: 1px solid ${C.rose}55;
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
.tm-play-btn:hover { background: #4F52D9; }
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

/* Game Menu (Menu tab) */
.cg-menu-section { display: flex; flex-direction: column; gap: 0.4rem; }
.cg-menu-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: ${C.muted}; }
.cg-mode-pill {
  flex: 0 0 auto;
  font-size: 0.62rem;
  font-weight: 600;
  background: ${C.accent}22;
  color: ${C.accent};
  border: 1px solid ${C.accent}55;
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
  background: ${C.gold}14;
  border: 1px solid ${C.gold}55;
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
.dr-powerup-btn.owned:not(:disabled) { border-color: ${C.accent}; background: ${C.accent}14; }
.dr-powerup-btn.owned:not(:disabled):hover { border-color: ${C.gold}; background: ${C.gold}22; }
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
.idle-card-btn:hover { background: #4F52D9; }
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
.prestige-confirm:hover { background: #4F52D9; }
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
.tm-duel-find-btn:hover:not(:disabled) { background: #4F52D9; }
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
.nav-match-chip {
  display: flex; align-items: center; gap: 0.35rem;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 999px; padding: 0.3rem 0.7rem;
  font-size: 0.8rem; font-family: 'JetBrains Mono', monospace;
  color: ${C.gold}; white-space: nowrap;
}
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

/* ---- Badges section ---- */
.badges-section { margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid ${C.border}; }
.badges-toggle {
  all: unset;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${C.muted};
  margin-bottom: 0.6rem;
  display: block;
  cursor: default;
}
.badges-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.badges-grid .badge-chip { transition: opacity 0.15s ease; }
.badges-grid .badge-chip.dim { opacity: 0.38; }
.badges-grid .badge-chip:not(.dim) {
  border-color: ${C.gold}55;
  background: ${C.gold}0d;
}
@media (max-width: 560px) {
  .badges-toggle {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.4rem 0;
    margin-bottom: 0;
  }
  .badges-toggle:hover { color: ${C.text}; }
  .badges-toggle-arrow { font-size: 0.7rem; transition: transform 0.15s ease; }
  .badges-grid { display: none; }
  .badges-grid.open { display: flex; margin-top: 0.6rem; }
}
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
.cnl-cell.cnl-goal { background: ${C.gold}22; color: ${C.gold}; }
.cnl-cell-mark {
  position: absolute; bottom: 0; right: 1px;
  font-size: 0.72rem; line-height: 1;
}
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
`;

/* ============================================================
   Classic Games shared subsystems — prefs, sound, haptics, gestures
   ============================================================ */
const CG_SOUND_KEY   = 'puzzlechain_cg_sound';
const CG_HAPTICS_KEY = 'puzzlechain_cg_haptics';
const CG_MOTION_KEY  = 'puzzlechain_cg_motion';

// Module-level prefs read by cgSound/cgHaptic without prop threading.
const cgPrefs = {
  sound:   (() => { try { return localStorage.getItem(CG_SOUND_KEY) !== '0'; } catch { return true; } })(),
  haptics: (() => { try { return localStorage.getItem(CG_HAPTICS_KEY) !== '0'; } catch { return true; } })(),
  motion:  (() => { try { return localStorage.getItem(CG_MOTION_KEY) === '1'; } catch { return false; } })(),
};
function cgSetPref(key, val) {
  cgPrefs[key] = val;
  try {
    localStorage.setItem(
      key === 'sound' ? CG_SOUND_KEY : key === 'haptics' ? CG_HAPTICS_KEY : CG_MOTION_KEY,
      val ? '1' : '0'
    );
  } catch {}
}

let _cgAudioCtx = null;
function cgAudio() {
  if (_cgAudioCtx) return _cgAudioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _cgAudioCtx = new AC();
  } catch {}
  return _cgAudioCtx;
}
// Short synthesized cues — no asset files needed.
const CG_TONES = {
  move:    { f: 320, d: 0.05, t: 'square',   g: 0.05 },
  click:   { f: 440, d: 0.04, t: 'triangle', g: 0.05 },
  merge:   { f: 540, d: 0.09, t: 'sine',     g: 0.07 },
  clear:   { f: 660, d: 0.10, t: 'sine',     g: 0.08 },
  capture: { f: 740, d: 0.12, t: 'triangle', g: 0.08 },
  deal:    { f: 380, d: 0.05, t: 'square',   g: 0.05 },
  chip:    { f: 500, d: 0.06, t: 'square',   g: 0.06 },
  win:     { f: 784, d: 0.22, t: 'sine',     g: 0.09 },
  lose:    { f: 150, d: 0.30, t: 'sawtooth', g: 0.08 },
};
function cgSound(name, pitch) {
  if (!cgPrefs.sound) return;
  const ctx = cgAudio();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const spec = CG_TONES[name] || CG_TONES.click;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.t;
    osc.frequency.value = spec.f * (pitch || 1);
    gain.gain.value = spec.g;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(spec.g, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.d);
    osc.start(now);
    osc.stop(now + spec.d + 0.02);
  } catch {}
}
function cgHaptic(ms) {
  if (!cgPrefs.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch {}
}

/* ============================================================
   Background-music manager — fetch / decode / loop an audio asset
   ------------------------------------------------------------
   Unlike the short synthesized cgSound cues, looping background music needs a
   real asset. We fetch the file once, decode it into an AudioBuffer with the
   Web Audio API, and play it on a looping BufferSource routed through a shared
   gain node (BG_MUSIC_GAIN keeps it at a moderate background level so it never
   drowns out the cgSound effects). decodeAudioData decodes from the raw bytes
   regardless of file extension / Content-Type, so the asset's container is not
   constrained by its `.mp3` name. All state is module-level so a single track
   plays at a time; calling start again with the same url reuses the decoded
   buffer instead of re-fetching.
   ============================================================ */
const BG_MUSIC_GAIN = 0.4;
let _bgAudioCtx = null;
let _bgMusicGainNode = null;
let _bgMusicSource = null;
let _bgMusicBuffer = null;
let _bgMusicUrl = null;
let _bgMusicLoading = false;
// True once the caller has asked to stop/pause — guards the async decode from
// auto-starting playback after a stop that raced the fetch.
let _bgMusicStopped = true;

function bgAudioContext() {
  if (_bgAudioCtx) return _bgAudioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _bgAudioCtx = new AC();
  } catch {}
  return _bgAudioCtx;
}

// (Re)create and start the looping source from the already-decoded buffer.
function _bgStartSource() {
  const ctx = bgAudioContext();
  if (!ctx || !_bgMusicBuffer) return;
  // Tear down any prior source first (start() can only be called once per node).
  if (_bgMusicSource) {
    try { _bgMusicSource.onended = null; _bgMusicSource.stop(); } catch {}
    _bgMusicSource = null;
  }
  if (!_bgMusicGainNode) {
    _bgMusicGainNode = ctx.createGain();
    _bgMusicGainNode.gain.value = BG_MUSIC_GAIN;
    _bgMusicGainNode.connect(ctx.destination);
  }
  const src = ctx.createBufferSource();
  src.buffer = _bgMusicBuffer;
  src.loop = true;
  src.connect(_bgMusicGainNode);
  try { src.start(0); } catch {}
  _bgMusicSource = src;
}

// Start (or resume) looping the track at `url`. Must be called from a user
// gesture the first time so the AudioContext is allowed to produce sound.
function startBackgroundMusic(url) {
  const ctx = bgAudioContext();
  if (!ctx) return;
  _bgMusicStopped = false;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch {}
  // Already decoded this track → just (re)start playback synchronously.
  if (_bgMusicBuffer && _bgMusicUrl === url) {
    if (!_bgMusicSource) _bgStartSource();
    return;
  }
  if (_bgMusicLoading && _bgMusicUrl === url) return; // fetch already in flight
  _bgMusicLoading = true;
  _bgMusicUrl = url;
  _bgMusicBuffer = null;
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => new Promise((resolve, reject) => {
      // decodeAudioData has both promise and legacy-callback forms — support both.
      let p;
      try { p = ctx.decodeAudioData(buf, resolve, reject); } catch (e) { reject(e); return; }
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    }))
    .then(decoded => {
      _bgMusicLoading = false;
      _bgMusicBuffer = decoded;
      // Only begin if no stop/pause arrived while we were decoding.
      if (!_bgMusicStopped) _bgStartSource();
    })
    .catch(() => { _bgMusicLoading = false; });
}

// Stop playback (used as pause too — resume restarts the loop from its start).
function stopBackgroundMusic() {
  _bgMusicStopped = true;
  if (_bgMusicSource) {
    try { _bgMusicSource.onended = null; _bgMusicSource.stop(); } catch {}
    _bgMusicSource = null;
  }
}

// Resume after a stop/pause. Reuses the decoded buffer when present; otherwise
// re-fetches the last url.
function resumeBackgroundMusic() {
  const ctx = bgAudioContext();
  if (!ctx) return;
  _bgMusicStopped = false;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch {}
  if (_bgMusicBuffer) {
    if (!_bgMusicSource) _bgStartSource();
  } else if (_bgMusicUrl) {
    startBackgroundMusic(_bgMusicUrl);
  }
}

// Discrete-gesture hook: tap / swipe / long-press / double-tap on an element.
function useGestures(ref, handlers) {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0, startY = 0, startT = 0, lpTimer = null, lastTap = 0, moved = false;
    const SWIPE = 30;
    const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY; startT = Date.now(); moved = false;
      clearLp();
      if (h.current.onLongPress) {
        lpTimer = setTimeout(() => {
          if (!moved) { h.current.onLongPress({ x: startX, y: startY, target: e.target }); lpTimer = null; }
        }, 480);
      }
    };
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      if (Math.abs(p.clientX - startX) > 8 || Math.abs(p.clientY - startY) > 8) { moved = true; clearLp(); }
    };
    const onUp = (e) => {
      clearLp();
      const p = e.changedTouches ? e.changedTouches[0] : e;
      const dx = p.clientX - startX, dy = p.clientY - startY;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) >= SWIPE) {
        if (h.current.onSwipe) {
          const dir = adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          h.current.onSwipe(dir, { x: startX, y: startY, target: e.target });
        }
        return;
      }
      // Treat as tap
      const now = Date.now();
      if (now - startT > 480) return; // was a long press
      if (h.current.onDoubleTap && now - lastTap < 280) {
        h.current.onDoubleTap({ x: startX, y: startY, target: e.target });
        lastTap = 0;
        return;
      }
      lastTap = now;
      if (h.current.onTap) h.current.onTap({ x: startX, y: startY, target: e.target });
    };
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onUp);
    return () => {
      clearLp();
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onUp);
    };
  }, [ref]);
}

// Drag tracking for Block Blast pieces / Diamond Rush swaps.
function pointerXY(e) {
  const p = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return { x: p.clientX, y: p.clientY };
}

/* ============================================================
   Classic Games shared shell component
   ============================================================ */
function CgToggle({ on, onClick }) {
  return <button className={'cg-toggle' + (on ? ' on' : '')} onClick={onClick} aria-pressed={on} />;
}

function CgSettings({ tick }) {
  const [, force] = useState(0);
  const flip = (key) => { cgSetPref(key, !cgPrefs[key]); force(n => n + 1); };
  return (
    <div>
      <h4>Settings</h4>
      <div className="cg-setting-row"><span className="name">Sound</span><CgToggle on={cgPrefs.sound} onClick={() => flip('sound')} /></div>
      <div className="cg-setting-row"><span className="name">Haptics</span><CgToggle on={cgPrefs.haptics} onClick={() => flip('haptics')} /></div>
      <div className="cg-setting-row"><span className="name">Reduced motion</span><CgToggle on={cgPrefs.motion} onClick={() => flip('motion')} /></div>
    </div>
  );
}

/* ============================================================
   Classic Games — Game Menu (New Game / Save / Post to Feed)
   ============================================================ */
// Module-level bridge so the in-shell Game Menu can read the active
// Versus-Bot game's current state for "Save Game" without threading a
// callback through every mode sub-component. The active bot game sets
// `getSnapshot` on mount and clears it on unmount.
const ClassicBridge = { getSnapshot: null };

// A Versus-Bot game registers its live-state snapshot provider here so the
// Game Menu's Save button can persist it. `active` should be true only while
// the game is in a saveable bot session.
function useClassicSaveSource(active, snapshotFn) {
  const ref = useRef(snapshotFn);
  ref.current = snapshotFn;
  useEffect(() => {
    if (!active) return;
    ClassicBridge.getSnapshot = () => (ref.current ? ref.current() : null);
    return () => { ClassicBridge.getSnapshot = null; };
  }, [active]);
}

// Save / load a Versus-Bot game's in-progress state via the generic
// user_game_state store (GET/PUT /api/state/:gameId).
function useClassicSave(gameId) {
  const [saving, setSaving] = useState(false);
  const saveState = async (stateObj) => {
    setSaving(true);
    const { ok } = await api(`/api/state/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify({ state: { mode: 'bot', savedAt: Date.now(), ...stateObj } }),
    });
    setSaving(false);
    return ok;
  };
  const loadState = async () => {
    const { ok, body } = await api(`/api/state/${gameId}`);
    if (ok && body && body.state && body.state.mode === 'bot') return body.state;
    return null;
  };
  const clearState = async () => {
    await api(`/api/state/${gameId}`, { method: 'PUT', body: JSON.stringify({ state: {} }) }).catch(() => {});
  };
  return { saveState, loadState, clearState, saving };
}

// Polling hook for the generic classic_rooms online multiplayer (mirrors
// useMancalaRoom). `applyMove` posts a server-authoritative move (e.g. a
// Chutes & Ladders roll) and reconciles against the returned room.
function useClassicRoom(gameId, roomId) {
  const [room, setRoom] = useState(null);
  const [pollingError, setPollingError] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const consecutiveErrors = useRef(0);
  const intervalRef = useRef(null);

  const fetchRoom = async () => {
    if (!roomId) return;
    try {
      const { ok, status, body } = await api(`/api/classic/${gameId}/rooms/${roomId}`);
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
        if (consecutiveErrors.current >= 3) { setOpponentDisconnected(true); setPollingError('connection_error'); }
      }
    } catch {
      consecutiveErrors.current++;
      if (consecutiveErrors.current >= 3) { setOpponentDisconnected(true); setPollingError('connection_error'); }
    }
  };

  useEffect(() => {
    if (!roomId) { setRoom(null); setPollingError(null); return; }
    consecutiveErrors.current = 0;
    fetchRoom();
    intervalRef.current = setInterval(fetchRoom, 1500);
    return () => clearInterval(intervalRef.current);
  }, [gameId, roomId]);

  const submitMove = async (payload) => {
    if (!room || room.status !== 'active') return;
    const moveSeq = room.moveSeq + 1;
    try {
      const { ok, body } = await api(`/api/classic/${gameId}/rooms/${roomId}/move`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, moveSeq }),
      });
      if (ok && body) setRoom(body);
      else fetchRoom();
    } catch { fetchRoom(); }
  };

  return { room, pollingError, opponentDisconnected, submitMove };
}

// Per-mode display metadata for the inline mode picker.
const CLASSIC_MODE_META = {
  bot:    { icon: '🤖', name: 'Versus Bot',        desc: 'Play against the computer' },
  '2p':   { icon: '👥', name: '2 Players',         desc: 'Pass and play on this device' },
  online: { icon: '🌐', name: 'Online Multiplayer', desc: 'Play a friend via room code' },
};

// Inline mode picker shown by the Game Menu's "New Game" for games that route
// their modes through the menu (e.g. Chutes & Ladders). Calls onPlay(mode, opts).
function ClassicModePicker({ game, onPlay }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handlePlay = async () => {
    if (!mode) return;
    if (mode !== 'online') { onPlay(mode, {}); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${game.id}/rooms`, { method: 'POST' });
      setBusy(false);
      if (ok && body) onPlay('online', { roomAction: 'create', roomId: body.id });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api(`/api/classic/${game.id}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) onPlay('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="mnc-mode-select" style={{ padding: 0 }}>
      {(game.modes || []).map(m => (
        <button key={m} className={'mnc-mode-btn' + (mode === m ? ' active' : '')} onClick={() => { setMode(m); setError(''); }}>
          <span className="mnc-mode-icon">{CLASSIC_MODE_META[m].icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">{CLASSIC_MODE_META[m].name}</span>
            <span className="mnc-mode-desc">{CLASSIC_MODE_META[m].desc}</span>
          </span>
        </button>
      ))}
      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            </div>
          )}
        </div>
      )}
      {error && <div className="mnc-join-error">{error}</div>}
      {mode && <button className="mnc-mode-start-btn" onClick={handlePlay} disabled={!canStart || busy}>{busy ? 'Please wait…' : 'Play'}</button>}
    </div>
  );
}

// The Menu tab of the ClassicShell bottom sheet: New Game, Save Game (bot
// only), and Post to Feed (after a result).
function ClassicGameMenuSection({ game, gameMode, lastResult, onNewGameMode, onSaveGame, onPostToFeed, onClose }) {
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState(false);
  const modes = game.modes || [];
  const usePicker = !!game.menuModePicker && modes.length > 0;
  // Default new-game mode for games without an inline picker.
  const defaultMode = modes.length === 1 ? modes[0] : null;

  const doSave = async () => {
    const ok = await onSaveGame();
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  };

  return (
    <div className="cg-menu-section">
      <div className="cg-menu-label">New game</div>
      {usePicker ? (
        picking
          ? <ClassicModePicker game={game} onPlay={(mode, opts) => { setPicking(false); onNewGameMode(mode, opts); onClose && onClose(); }} />
          : <button className="cg-sheet-action" onClick={() => setPicking(true)}>↺ New Game</button>
      ) : (
        <button className="cg-sheet-action" onClick={() => { onNewGameMode(defaultMode, {}); onClose && onClose(); }}>↺ New Game</button>
      )}

      {game.supportsSave && gameMode === 'bot' && (
        <>
          <div className="cg-menu-label" style={{ marginTop: '0.6rem' }}>Versus Bot</div>
          <button className="cg-sheet-action" onClick={doSave}>{saved ? 'Saved ✓' : '💾 Save Game'}</button>
        </>
      )}

      {lastResult && (
        <>
          <div className="cg-menu-label" style={{ marginTop: '0.6rem' }}>Share</div>
          <button className="cg-sheet-action" style={{ borderColor: C.emerald, color: C.emerald }}
            onClick={() => { onPostToFeed(lastResult); onClose && onClose(); }}>📤 Post to Feed</button>
        </>
      )}
    </div>
  );
}

// A small in-stage banner offering to resume a saved Versus-Bot game.
function ClassicResumeBanner({ onResume, onDismiss }) {
  return (
    <div className="cg-resume-banner">
      <span>💾 You have a saved game.</span>
      <div className="cg-resume-actions">
        <button onClick={onResume}>Resume</button>
        <button className="ghost" onClick={onDismiss}>New</button>
      </div>
    </div>
  );
}

// game: { icon, name }; onExit/onNewGame callbacks; sheetSections: [{ id, label, render }]
// menuConfig (optional): wires the first "Menu" tab — New Game / Save / Post to Feed.
function ClassicShell({ game, onExit, onNewGame, sheetSections, children, menuConfig }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, force] = useState(0);
  const sections = [
    ...(menuConfig ? [{
      id: 'menu', label: 'Menu',
      render: () => <ClassicGameMenuSection {...menuConfig} onClose={() => setSheetOpen(false)} />,
    }] : []),
    ...(sheetSections || []),
    { id: 'settings', label: 'Settings', render: () => <CgSettings /> },
  ];
  const [active, setActive] = useState(sections[0].id);
  const open = (id) => { setActive(id || sections[0].id); setSheetOpen(true); cgSound('click'); };
  const toggleSound = () => { cgSetPref('sound', !cgPrefs.sound); force(n => n + 1); if (cgPrefs.sound) cgSound('click'); };
  const cur = sections.find(s => s.id === active) || sections[0];
  // Games whose New Game lives in the menu hide the topbar quick-reset ↺.
  const hideQuickReset = menuConfig && (game.modes || []).length > 0;
  const modePill = menuConfig && menuConfig.gameMode && CLASSIC_MODE_META[menuConfig.gameMode];
  return (
    <div className="cg-shell">
      <div className="cg-topbar">
        <button className="cg-btn" onClick={onExit} title="Back to lobby" aria-label="Back">←</button>
        <div className="cg-title">
          <span>{game.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</span>
          {modePill && <span className="cg-mode-pill">{modePill.icon} {menuConfig.gameMode === '2p' ? '2P' : menuConfig.gameMode === 'online' ? 'Online' : 'Bot'}</span>}
        </div>
        {onNewGame && !hideQuickReset && <button className="cg-btn" onClick={() => { cgSound('click'); onNewGame(); }} title="New game" aria-label="New game">↺</button>}
        <button className="cg-btn" onClick={toggleSound} title="Sound" aria-label="Sound">{cgPrefs.sound ? '🔊' : '🔇'}</button>
        <button className="cg-btn" onClick={() => open()} title="Menu" aria-label="Menu">☰</button>
      </div>
      {children}
      <div className={'cg-sheet-backdrop' + (sheetOpen ? ' open' : '')} onClick={() => setSheetOpen(false)} />
      <div className={'cg-sheet' + (sheetOpen ? ' open' : '')}>
        <div className="cg-sheet-handle" />
        {sections.length > 1 && (
          <div className="cg-sheet-tabs">
            {sections.map(s => (
              <button key={s.id} className={'cg-sheet-tab' + (active === s.id ? ' active' : '')} onClick={() => setActive(s.id)}>{s.label}</button>
            ))}
          </div>
        )}
        {sheetOpen && cur.render()}
      </div>
    </div>
  );
}

// Shared status-bar helper for new games.
function CgStatus({ items }) {
  return (
    <div className="cg-statusbar">
      {items.map((it, i) => (
        <div className="cg-stat" key={i}><div className="l">{it.l}</div><div className="v">{it.v}</div></div>
      ))}
    </div>
  );
}

// Generic history list + stats grid section builders for the sheet.
function cgHistorySection(rows, renderRow) {
  return {
    id: 'history', label: 'History',
    render: () => (
      <div>
        <h4>Recent games</h4>
        {(!rows || rows.length === 0)
          ? <div className="cg-sheet-empty">No games yet — play one!</div>
          : <div className="cg-sheet-list">{rows.map((r, i) => <div className="cg-sheet-row" key={i}>{renderRow(r)}</div>)}</div>}
      </div>
    ),
  };
}
function cgStatsSection(cards) {
  return {
    id: 'stats', label: 'Stats',
    render: () => (
      <div>
        <h4>Stats</h4>
        <div className="cg-stats-grid">
          {cards.map((c, i) => <div className="cg-stat-card" key={i}><div className="val">{c.val}</div><div className="lbl">{c.lbl}</div></div>)}
        </div>
      </div>
    ),
  };
}
function cgRulesSection(items) {
  return {
    id: 'rules', label: 'How to play',
    render: () => <div><h4>How to play</h4><ul className="cg-rules">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>,
  };
}

/* ============================================================
   Shared timer hook
   ============================================================ */
// Counts up from `initialSecs` (default 0) while `running`. Seeding from a
// non-zero value lets a resumed daily attempt continue the timer from where it
// left off instead of restarting.
function useTimer(running, initialSecs = 0) {
  const [secs, setSecs] = useState(initialSecs);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { secs, fmt: fmt(secs) };
}

/* ============================================================
   Seeded PRNG — deterministic daily puzzle generation
   ============================================================ */
// mulberry32: a tiny, fast, well-distributed 32-bit seeded PRNG. Returns a
// function yielding floats in [0,1), same contract as Math.random() so it can
// be threaded through the existing generators.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Server-anchored UTC day number (offset = serverNow − clientNow) so the daily
// puzzle can't desync from the lock countdown on a skewed device clock.
function utcDayNum(offset) {
  const d = new Date(Date.now() + (offset || 0));
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000
  );
}

// Cheap string→int hash, used to salt the seed per game so the three puzzles
// don't share a PRNG sequence on a given day.
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A fresh seeded RNG for (today, gameId). Everyone on the same UTC day gets the
// identical board for each game — the precondition for a fair leaderboard.
function dailyRng(offset, gameId) {
  return mulberry32((utcDayNum(offset) + hashStr(gameId)) >>> 0);
}

// Mancala Daily Challenge opening board, derived from the server-anchored UTC
// day. Deals 24 stones into one side via the daily seed, then mirrors them
// rotationally (pit i ↔ opposite 12-i) so both players start from an identical,
// fair position; stores (6, 13) stay empty. MUST match srvMncDailyBoard in
// server.js byte-for-byte or verification fails.
function mncDailyBoard(offset) {
  const rng = dailyRng(offset, 'mancaladaily');
  const side = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < 24; s++) side[Math.floor(rng() * 6)]++;
  const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    board[i] = side[i];
    board[12 - i] = side[i];
  }
  return board;
}

// Periodically persist a game's in-progress state so a resumed attempt picks up
// the exact board, step count, and accumulated timer. `getState()` returns
// `{ progress, steps, secs }`; it's read through a ref so the interval and the
// unmount-flush always see the latest values without re-subscribing. Games also
// call `onSaveProgress` directly on each move for immediate persistence; this
// hook covers idle timer advance and the leave-the-tab case.
function useAutosave(onSaveProgress, getState, active) {
  const ref = useRef({});
  ref.current = { onSaveProgress, getState, active };
  useEffect(() => {
    const flush = () => {
      const cur = ref.current;
      if (!cur.active || !cur.onSaveProgress) return;
      const s = cur.getState();
      cur.onSaveProgress(s.progress, s.steps, s.secs);
    };
    const id = setInterval(flush, 10000);
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      flush(); // best-effort save when leaving the game screen
    };
  }, []);
}

/* ============================================================
   Shared localStorage "recent results" history
   ============================================================ */
// Newest-first list of finished-game summaries, persisted per game under its
// own storage key with a hard length cap. Several classic games (minesweeper,
// mancala, 2048, knight's tour) each used to carry an identical copy of this
// load/unshift/cap/save pair — collapsed here into one shared implementation
// they delegate to (the per-game wrappers keep their names + keys, so behavior
// is byte-identical: same key, same MAX cap, newest-first, errors swallowed).
function loadHistory(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function saveHistory(key, entry, max) {
  const h = loadHistory(key);
  h.unshift(entry);
  if (h.length > max) h.length = max;
  try { localStorage.setItem(key, JSON.stringify(h)); } catch {}
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

/* ============================================================
   DApp Mode (Phase 0) — client helpers
   canonicalize + sha256 mirror lib/dapp.js byte-for-byte so a chain
   hash the client builds equals the one the server recomputes.
   ============================================================ */
function dappCanonicalize(value) {
  if (value === null || value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error('non-integer in hashed state');
    return String(value);
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(dappCanonicalize).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + dappCanonicalize(value[k])).join(',') + '}';
  }
  throw new Error('unhashable');
}
async function dappSha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Anchor a verified session's final chain hash on-chain via the bridge, then
// confirm with the server. Best-effort: degrades to a 'mock' anchor when the
// bridge/wallet is unavailable (staging) and never throws. Returns the updated
// session shape (with anchorStatus/anchorTxHash) or the original on failure.
async function dappAnchor(session) {
  if (!session || session.status !== 'verified' || !session.chainHash) return session;
  let txHash = null;
  let mock = true;
  try {
    const bridgeMockOff = window.usernode && window.usernode.isMockEnabled
      ? !(await window.usernode.isMockEnabled())
      : false;
    if (window.usernode && window.usernode.sendTransaction && window.usernode.getNodeAddress && bridgeMockOff) {
      const addr = await window.usernode.getNodeAddress();
      if (addr) {
        const tx = await window.usernode.sendTransaction({ to: addr, data: '0x' + session.chainHash, value: 0 });
        txHash = tx && tx.hash ? tx.hash : null;
        mock = false;
      }
    }
  } catch (e) { /* fall through to mock anchor */ }
  try {
    const { ok, body } = await api(`/api/dapp/sessions/${session.sessionId}/anchor/confirm`, {
      method: 'POST', body: JSON.stringify({ txHash, mock }),
    });
    if (ok && body && body.session) return body.session;
  } catch (e) {}
  return session;
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

const BADGE_DEFS = [
  {
    id: 'first-light',
    icon: '🕯️',
    label: 'First Light',
    desc: 'Solve any daily puzzle',
    check: (streak, attempts) =>
      Object.values(attempts).some(a => a.finishedAt && a.score > 0),
  },
  {
    id: 'all-in',
    icon: '🎯',
    label: 'All In',
    desc: 'Complete all 4 daily games in one day',
    check: (streak, attempts) =>
      GAMES.filter(g => g.category === 'daily')
           .every(g => attempts[g.id] && attempts[g.id].finishedAt && attempts[g.id].score > 0),
  },
  {
    id: 'flame-keeper',
    icon: '🔥',
    label: 'Flame Keeper',
    desc: '3-day streak',
    check: (streak) => streak >= 3,
  },
  {
    id: 'weekly-warrior',
    icon: '📅',
    label: 'Weekly Warrior',
    desc: '7-day streak',
    check: (streak) => streak >= 7,
  },
  {
    id: 'multiplied',
    icon: '💫',
    label: 'Multiplied',
    desc: '10-day streak (×1.5 points)',
    check: (streak) => streak >= 10,
  },
  {
    id: 'streak-titan',
    icon: '⚡',
    label: 'Streak Titan',
    desc: '30-day streak',
    check: (streak) => streak >= 30,
  },
];

/* ============================================================
   Streak badges — named milestones unlocked at consecutive-day
   thresholds. The single source of truth for badge copy/icons;
   the server (STREAK_BADGE_DAYS in server.js) persists the same day
   thresholds as streak_milestone achievements so earned badges
   survive a streak reset. Keep the `min` list in sync across both.
   ============================================================ */
const STREAK_BADGES = [
  { min: 3,   id: 'on-fire',     name: 'On Fire',          icon: '🔥' },
  { min: 7,   id: 'week',        name: 'Week Warrior',     icon: '⚡' },
  { min: 30,  id: 'monthly',     name: 'Monthly Master',   icon: '🌟' },
  { min: 50,  id: 'half-cent',   name: 'Half-Century',     icon: '💎' },
  { min: 100, id: 'centurion',   name: 'Centurion',        icon: '👑' },
  { min: 180, id: 'half-year',   name: 'Half-Year Hero',   icon: '🛡️' },
  { min: 365, id: 'year-legend', name: 'Year-Long Legend', icon: '🏆' },
];

// Look up a badge definition by its day threshold (used to render the
// permanent earned-badge list the server returns as `badges`).
function badgeForDays(days) {
  return STREAK_BADGES.find(b => b.min === days) || null;
}

// All badges a live streak currently satisfies (streak >= min), low→high.
function streakBadges(streak) {
  return STREAK_BADGES.filter(b => streak >= b.min);
}

// The highest badge a live streak has reached, or null below the first tier.
function activeBadge(streak) {
  const earned = streakBadges(streak);
  return earned.length ? earned[earned.length - 1] : null;
}

// Does this win's streak land EXACTLY on a badge threshold? (the "just
// unlocked" celebration fires only on the day the milestone is reached.)
function justUnlockedBadge(streak) {
  return STREAK_BADGES.find(b => b.min === streak) || null;
}

/* ============================================================
   Achievement badges — non-streak milestones the server awards
   in /api/daily/:gameId/finish and persists in user_achievements.
   This is the client's source of truth for badge copy/icons; the
   server (ACHIEVEMENT_BADGE_TYPES + criteria in server.js) owns when
   each is awarded. Keep `type` values in sync across both files.
   `solve_milestone` is parameterized by a `count` (10/50/100).
   ============================================================ */
const ACHIEVEMENT_BADGES = [
  { type: 'first_solve', name: 'First Solve',   icon: '🎉', desc: 'Solved your first daily puzzle' },
  { type: 'speed_demon', name: 'Speed Demon',   icon: '⚡', desc: 'Solved a daily in under 60s' },
  { type: 'flawless',    name: 'Flawless',      icon: '✨', desc: 'Solved with no wasted moves' },
  { type: 'daily_sweep', name: 'Daily Sweep',   icon: '🧹', desc: 'Solved every daily puzzle in one day' },
  { type: 'podium',      name: 'Podium Finish', icon: '🥇', desc: 'Finished #1 on a daily leaderboard' },
];
// Lifetime solve-count milestones (a single `solve_milestone` type, many counts).
const SOLVE_MILESTONE_BADGES = [
  { count: 10,  name: 'Solver',      icon: '🔟', desc: 'Solved 10 daily puzzles' },
  { count: 50,  name: 'Dedicated',   icon: '🏅', desc: 'Solved 50 daily puzzles' },
  { count: 100, name: 'Centenarian', icon: '💯', desc: 'Solved 100 daily puzzles' },
];

// Resolve a freshly-awarded achievement (from finish's newAchievements) to its
// badge definition for the "just unlocked" overlay pop.
function achievementBadgeFor(ach) {
  if (!ach || !ach.type) return null;
  if (ach.type === 'solve_milestone') {
    const c = ach.metadata && ach.metadata.count;
    return SOLVE_MILESTONE_BADGES.find(b => b.count === c) || null;
  }
  return ACHIEVEMENT_BADGES.find(b => b.type === ach.type) || null;
}

// Merge newly-awarded achievements into the { types, milestones } client state.
function mergeAchievements(prev, newAch) {
  const types = new Set((prev && prev.types) || []);
  const milestones = new Set((prev && prev.milestones) || []);
  for (const a of newAch || []) {
    if (!a || !a.type) continue;
    types.add(a.type);
    if (a.type === 'solve_milestone' && a.metadata && Number.isFinite(+a.metadata.count)) {
      milestones.add(+a.metadata.count);
    }
  }
  return { types: Array.from(types), milestones: Array.from(milestones).sort((a, b) => a - b) };
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

// Fisher–Yates using a supplied rng() (defaults to Math.random for any
// non-daily callers). A seeded rng makes the result deterministic.
const shuffle = (arr, rng = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function generateSudoku6(rng = Math.random) {
  // 1. start from the hardcoded valid solution
  let sol = SUDOKU6_SOLUTION.map(row => row.slice());

  // 2. seeded digit permutation (remap 1..6)
  const perm = shuffle([1, 2, 3, 4, 5, 6], rng);
  const map = {};
  for (let i = 0; i < 6; i++) map[i + 1] = perm[i];
  sol = sol.map(row => row.map(v => map[v]));

  // 3. swap rows within each horizontal band (rows 0-1, 2-3, 4-5)
  for (let band = 0; band < 3; band++) {
    if (rng() < 0.5) {
      const r0 = band * 2, r1 = band * 2 + 1;
      [sol[r0], sol[r1]] = [sol[r1], sol[r0]];
    }
  }

  // 4. blank out 14 cells (seeded)
  const puzzle = sol.map(row => row.slice());
  const positions = shuffle(Array.from({ length: 36 }, (_, i) => i), rng).slice(0, 14);
  positions.forEach(p => { puzzle[Math.floor(p / 6)][p % 6] = 0; });

  return { solution: sol, puzzle };
}

const boxAt = (r, c) => Math.floor(r / 2) * 2 + Math.floor(c / 3);

// Real-Sudoku conflict marking: a filled cell is in error if its value repeats
// elsewhere in its row, column, or 2×3 box. Returns the set of "r,c" keys in
// conflict — no hidden "correct answer" comparison.
function sudokuConflicts(grid) {
  const errs = new Set();
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const v = grid[r][c];
      if (!v) continue;
      for (let k = 0; k < 6; k++) {
        if (k !== c && grid[r][k] === v) errs.add(`${r},${c}`);
        if (k !== r && grid[k][c] === v) errs.add(`${r},${c}`);
      }
      for (let rr = 0; rr < 6; rr++) {
        for (let cc = 0; cc < 6; cc++) {
          if ((rr !== r || cc !== c) && boxAt(rr, cc) === boxAt(r, c) && grid[rr][cc] === v) {
            errs.add(`${r},${c}`);
          }
        }
      }
    }
  }
  return errs;
}

// Win = fully filled with zero conflicts (every row/col/box a permutation of
// 1–6). The true Sudoku rule, decoupled from any single generated solution.
function sudokuSolved(grid) {
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (!grid[r][c]) return false;
  return sudokuConflicts(grid).size === 0;
}

function SudokuGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const init = useRef(generateSudoku6(dailyRng(offset, 'sudoku'))).current;
  const { puzzle } = init;
  const dayNum = useRef(utcDayNum(offset)).current;

  // Hydrate from a resumed attempt when the saved board is for today's puzzle.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress
    : null;
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map(row => row.slice()) : puzzle.map(row => row.slice())
  );
  const [selected, setSelected] = useState(null); // [r, c]
  const [errors, setErrors] = useState(() => sudokuConflicts(grid));
  // Steps is a free counter (not encoded in the grid), so restore it whenever
  // the attempt carries one — even if the board itself couldn't be rehydrated.
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const isGiven = (r, c) => puzzle[r][c] !== 0;

  // Idle/leave autosave (timer advance + tab close). Per-move saves happen in place().
  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, grid: stateRef.current.grid }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

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

    // recompute conflict highlighting from the full grid
    setErrors(sudokuConflicts(ng));

    // persist this move immediately
    onSaveProgress && onSaveProgress({ dayNum, grid: ng }, newSteps, secs);

    // win check — fully filled and no conflicts
    if (sudokuSolved(ng)) {
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
function AccountChip({ loading, authOk, user, walletVerified, onOpen }) {
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
    <button
      type="button"
      className="account-chip on"
      title={`Signed in as ${name}${walletVerified ? ' · wallet verified' : ''} — tap to open your account.`}
      onClick={onOpen}
    >
      <span className="avatar mono">
        {initial}
        {walletVerified && <span className="avatar-tick" title="Wallet verified">✓</span>}
      </span>
      <span className="who">
        <span className="uname">{name}</span>
        <span className="status">{walletVerified ? '✓ Verified · saved' : '● Progress saved'}</span>
      </span>
    </button>
  );
}

/* ============================================================
   Account screen — single place for identity + on-chain login status.
   Surfaces username, a copyable Usernode pubkey, and a three-state
   wallet status (Not connected / Linked / Verified ✓), with manual
   Connect/Verify and Disconnect controls.
   ============================================================ */
function truncAddr(a) {
  if (!a) return '';
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function AccountScreen({ user, walletAddr, walletVerified, authOk, integration, onOpenFriends, onBack, onVerify, onDisconnect }) {
  const [copied, setCopied] = React.useState(false);
  const [dappCopied, setDappCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [confirmDisc, setConfirmDisc] = React.useState(false);
  const dappEnabled = !!(integration && integration.enabled);
  const dappPubkey = integration && integration.pubkey;
  const bridgeAvailable = !!(typeof window !== 'undefined' && window.usernode && window.usernode.getNodeAddress);

  // status: 'verified' | 'linked' | 'none'
  const status = walletVerified ? 'verified' : (walletAddr ? 'linked' : 'none');

  const copyPubkey = async () => {
    if (!user || !user.usernodePubkey) return;
    try {
      await navigator.clipboard.writeText(user.usernodePubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const copyDappPubkey = async () => {
    if (!dappPubkey) return;
    try {
      await navigator.clipboard.writeText(dappPubkey);
      setDappCopied(true);
      setTimeout(() => setDappCopied(false), 1500);
    } catch {}
  };

  const handleVerify = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await onVerify();
      if (res && res.verified) setMsg({ ok: true, text: 'Wallet ownership verified ✓' });
      else if (res && res.ok) setMsg({ ok: true, text: 'Wallet linked. Ownership proof unavailable (your wallet can’t sign here).' });
      else setMsg({ ok: false, text: 'No wallet was readable in this environment.' });
    } catch {
      setMsg({ ok: false, text: 'Could not connect to your wallet.' });
    }
    setBusy(false);
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await onDisconnect();
      setMsg({ ok: true, text: 'Disconnected. Your public link is kept so received tips still resolve.' });
    } catch {
      setMsg({ ok: false, text: 'Could not disconnect.' });
    }
    setConfirmDisc(false);
    setBusy(false);
  };

  const initial = (user && user.username ? user.username : '?').charAt(0).toUpperCase();

  return (
    <div className="account-screen">
      <div className="account-head">
        <button className="back-btn" onClick={onBack}>‹ Back</button>
        <h2>Account</h2>
      </div>

      {(!authOk || !user) ? (
        <div className="wallet-card">
          <div className="account-signed-out">
            You’re signed out. Open PuzzleChain inside Usernode so your progress
            and identity are saved to your account.
          </div>
        </div>
      ) : (
        <>
          <div className="wallet-card">
            <div className="account-id-row">
              <span className="account-avatar mono">{initial}</span>
              <div>
                <div className="account-uname">{user.username || 'Linked account'}</div>
                <div className="account-sub">Signed in · progress saved</div>
              </div>
            </div>
            <div className="account-field">
              <div className="wallet-card-title">Usernode public key</div>
              <div className="wallet-addr-row">
                <span className="wallet-addr">{user.usernodePubkey || '— not linked —'}</span>
                {user.usernodePubkey && (
                  <button className="back-btn" onClick={copyPubkey}>{copied ? 'Copied ✓' : 'Copy'}</button>
                )}
              </div>
            </div>
          </div>

          <div className="wallet-card">
            <div className="wallet-card-title">On-chain login</div>
            <div className={`account-status account-status-${status}`}>
              {status === 'verified' && <span className="account-status-dot" />}
              {status === 'verified' && <span>Verified ✓</span>}
              {status === 'linked' && <span className="account-status-dot" />}
              {status === 'linked' && <span>Linked (not verified)</span>}
              {status === 'none' && <span className="account-status-dot" />}
              {status === 'none' && <span>Not connected</span>}
            </div>
            {walletAddr && (
              <div className="account-wallet-addr mono" title={walletAddr}>{truncAddr(walletAddr)}</div>
            )}
            <div className="account-status-desc">
              {status === 'verified' && 'You’ve signed an ownership challenge — this wallet is cryptographically yours.'}
              {status === 'linked' && 'Your wallet address is linked to your account, but ownership hasn’t been proven yet. Verify to confirm it’s really yours.'}
              {status === 'none' && (bridgeAvailable
                ? 'No wallet is linked yet. Connect to read your Usernode wallet and link it to your account.'
                : 'On-chain features are unavailable in this environment (no wallet could be read). Open PuzzleChain inside Usernode.')}
            </div>

            <div className="wallet-btn-row">
              <button
                className="primary-btn"
                disabled={busy || !bridgeAvailable}
                onClick={handleVerify}
              >
                {busy ? 'Working…' : status === 'verified' ? 'Re-verify wallet' : 'Connect / Verify wallet'}
              </button>
              {status === 'verified' && !confirmDisc && (
                <button className="back-btn" disabled={busy} onClick={() => setConfirmDisc(true)}>Disconnect</button>
              )}
              {confirmDisc && (
                <>
                  <button className="back-btn account-danger" disabled={busy} onClick={handleDisconnect}>Confirm disconnect</button>
                  <button className="back-btn" disabled={busy} onClick={() => setConfirmDisc(false)}>Cancel</button>
                </>
              )}
            </div>
            {msg && (
              <div className={`account-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>
            )}
          </div>

          {/* Connections — Friends + dApps, shown here only on narrow viewports
              (hidden ≥561px via CSS, where they live in the top bar instead). */}
          <div className="wallet-card account-connections">
            <div className="wallet-card-title">Connections</div>
            <button
              type="button"
              className="account-connection-row"
              onClick={onOpenFriends}
            >
              👥 Friends
              <span className="chev">›</span>
            </button>
            {dappEnabled && (
              <div className="account-dapps-row">
                <div className="wallet-card-title">dApps integration</div>
                <div className="account-status account-status-verified">
                  <span className="account-status-dot" />
                  <span>Active</span>
                </div>
                {dappPubkey && (
                  <div className="wallet-addr-row">
                    <span className="account-dapps-pubkey" title={dappPubkey}>
                      🔗 {truncAddr(dappPubkey)}
                    </span>
                    <button className="back-btn" onClick={copyDappPubkey}>
                      {dappCopied ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Daily leaderboard — today's solvers for one game, ranked by fastest
   completion time, then fewest steps. Highlights the current user and
   pins their row when they're outside the visible top N.
   ============================================================ */
const lbFmtTime = s =>
  s == null ? '—' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function Leaderboard({ gameId, solved }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api(`/api/daily/${gameId}/leaderboard`);
      if (!alive) return;
      if (ok && body) setState({ loading: false, ...body });
      else setState({ loading: false, entries: [], me: null, total: 0, error: true });
    })();
    return () => { alive = false; };
  }, [gameId]);

  if (state.loading) {
    return <div className="lboard"><div className="lboard-title">Today's leaderboard</div><div className="lboard-empty">Loading…</div></div>;
  }

  const entries = state.entries || [];
  const me = state.me || null;
  const meVisible = me && entries.some(e => e.isCurrentUser);

  return (
    <div className="lboard">
      <div className="lboard-title">
        Today's leaderboard
        {state.total > 0 && <span className="lboard-count">{state.total} solved</span>}
      </div>
      {entries.length === 0 ? (
        <div className="lboard-empty">Be the first to solve today's puzzle.</div>
      ) : (
        <div className="lboard-rows">
          {entries.map(e => (
            <div key={e.rank} className={`lrow${e.isCurrentUser ? ' me' : ''}`}>
              <span className="lrank mono">#{e.rank}</span>
              <span className="lname">{e.username}{e.isCurrentUser ? ' (you)' : ''}</span>
              <span className="ltime mono">{lbFmtTime(e.timeSecs)}</span>
              <span className="lsteps mono">{e.steps != null ? `${e.steps} st` : '—'}</span>
            </div>
          ))}
          {me && !meVisible && (
            <div className="lrow me pinned">
              <span className="lrank mono">#{me.rank}</span>
              <span className="lname">{me.username} (you)</span>
              <span className="ltime mono">{lbFmtTime(me.timeSecs)}</span>
              <span className="lsteps mono">{me.steps != null ? `${me.steps} st` : '—'}</span>
            </div>
          )}
        </div>
      )}
      {solved === false && (
        <div className="lboard-note">You didn't solve today's puzzle — no ranking this round.</div>
      )}
    </div>
  );
}

/* ============================================================
   Today's Champions — lobby-wide leaderboard aggregating EVERYONE who
   solved at least one daily puzzle today, ranked by total points then
   games solved. Reuses the per-game leaderboard styles. Tapping a row
   opens that player's profile via onSelectUser.
   ============================================================ */
function TodayChampions({ onSelectUser }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api('/api/daily/leaderboard/today');
      if (!alive) return;
      if (ok && body) setState({ loading: false, ...body });
      else setState({ loading: false, entries: [], me: null, total: 0, error: true });
    })();
    return () => { alive = false; };
  }, []);

  if (state.loading) {
    return <div className="lboard champions"><div className="lboard-title">Today's Champions</div><div className="lboard-empty">Loading…</div></div>;
  }

  const entries = state.entries || [];
  const me = state.me || null;
  const meVisible = me && entries.some(e => e.isCurrentUser);
  const gameCount = state.gameCount || 0;
  const row = (e, pinned) => (
    <div
      key={pinned ? 'me-pinned' : e.rank}
      className={`lrow${e.isCurrentUser ? ' me' : ''}${pinned ? ' pinned' : ''}${onSelectUser ? ' clickable' : ''}`}
      onClick={onSelectUser && e.userId ? () => onSelectUser(e.userId) : undefined}
    >
      <span className="lrank mono">#{e.rank}</span>
      <span className="lname">{e.username}{e.isCurrentUser ? ' (you)' : ''}</span>
      <span className="ltime mono">{e.totalPoints} pts</span>
      <span className="lsteps mono">{e.gamesSolved}{gameCount ? ` / ${gameCount}` : ''}</span>
    </div>
  );

  return (
    <div className="lboard champions">
      <div className="lboard-title">
        Today's Champions
        {state.total > 0 && <span className="lboard-count">{state.total} playing</span>}
      </div>
      {entries.length === 0 ? (
        <div className="lboard-empty">No one has solved today's puzzles yet — be the first!</div>
      ) : (
        <div className="lboard-rows">
          {entries.map(e => row(e, false))}
          {me && !meVisible && row(me, true)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Badge strip — the player's collected badges (streak milestones +
   non-streak achievements). Earned badges render solid; not-yet-earned
   render dimmed so there's a visible collection to complete. Shared by
   the lobby and the profile screen.
   ============================================================ */
function BadgeStrip({ badges, achievements }) {
  const earnedDays = new Set(badges || []);
  const ach = achievements || { types: [], milestones: [] };
  const earnedTypes = new Set(ach.types || []);
  const earnedMilestones = new Set(ach.milestones || []);

  const chips = [];
  for (const b of STREAK_BADGES) {
    chips.push({ key: `s${b.min}`, icon: b.icon, name: b.name, sub: `${b.min}-day streak`, earned: earnedDays.has(b.min) });
  }
  for (const b of ACHIEVEMENT_BADGES) {
    chips.push({ key: `a${b.type}`, icon: b.icon, name: b.name, sub: b.desc, earned: earnedTypes.has(b.type) });
  }
  for (const b of SOLVE_MILESTONE_BADGES) {
    chips.push({ key: `m${b.count}`, icon: b.icon, name: b.name, sub: b.desc, earned: earnedMilestones.has(b.count) });
  }
  const earnedCount = chips.filter(c => c.earned).length;

  return (
    <div className="badge-strip-wrap">
      <div className="badge-strip-head">
        <span>Badges</span>
        <span className="badge-strip-count mono">{earnedCount} / {chips.length}</span>
      </div>
      <div className="badge-strip">
        {chips.map(c => (
          <div
            key={c.key}
            className={`badge-chip${c.earned ? ' active' : ' locked'}`}
            title={`${c.name}${c.earned ? '' : ' (locked)'} — ${c.sub}`}
          >
            <span className="badge-chip-icon">{c.icon}</span>
            <span className="badge-chip-name">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Locked screen — shown when today's attempt is already used
   ============================================================ */
function LockedScreen({ game, attempt, nextResetUtc, offset, onReset, onBack }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const hasResult = attempt && attempt.score != null;
  const solved = !!(attempt && attempt.score != null && attempt.score > 0);
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
      <Leaderboard gameId={game.id} solved={solved} />
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
const wsRandLetter = (rng = Math.random) => ALPHABET[Math.floor(rng() * 26)];

// Try to place every word into a fresh grid. Returns the filled letter grid,
// or null if any word couldn't be placed (caller retries with a new grid).
function placeWords(words, rng = Math.random) {
  const grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 250 && !placed; attempt++) {
      const [dr, dc] = WS_DIRS[Math.floor(rng() * WS_DIRS.length)];
      const r0 = Math.floor(rng() * WS_SIZE);
      const c0 = Math.floor(rng() * WS_SIZE);
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

function generateWordSearch(rng = Math.random) {
  const set = WORD_SETS[Math.floor(rng() * WORD_SETS.length)];
  const words = set.words.slice();
  let grid = null;
  for (let attempt = 0; attempt < 60 && !grid; attempt++) grid = placeWords(words, rng);
  if (!grid) grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(null));
  // Fill the empty cells with seeded filler letters.
  const letters = grid.map(row => row.map(ch => ch || wsRandLetter(rng)));
  return { theme: set.theme, words, letters };
}

// Locate `word` on the letter grid (any of the 8 directions, forwards or
// reversed) and return its cell indices, or null. Used to restore highlighted
// cells for words a resumed player had already found.
function locateWord(letters, word) {
  const idx = (r, c) => r * WS_SIZE + c;
  for (let r = 0; r < WS_SIZE; r++) {
    for (let c = 0; c < WS_SIZE; c++) {
      for (const [dr, dc] of WS_DIRS) {
        const cells = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || rr >= WS_SIZE || cc < 0 || cc >= WS_SIZE || letters[rr][cc] !== word[i]) { ok = false; break; }
          cells.push(idx(rr, cc));
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

function WordHuntGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const board = useRef(generateWordSearch(dailyRng(offset, 'wordhunt'))).current;
  const { theme, words, letters } = board;
  const total = words.length;
  const dayNum = useRef(utcDayNum(offset)).current;

  // Hydrate from a resumed attempt for today's board.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.found)
    ? savedProgress
    : null;
  const initFound = () => new Set((resumed ? resumed.found : []).filter(w => words.includes(w)));
  const initCells = () => {
    const set = new Set();
    if (resumed) for (const w of resumed.found) {
      const cells = locateWord(letters, w);
      if (cells) cells.forEach(i => set.add(i));
    }
    return set;
  };

  const [found, setFound] = useState(initFound);            // found word strings
  const [foundCells, setFoundCells] = useState(initCells);  // locked cell indices
  const [anchor, setAnchor] = useState(null);                // [r, c] drag start
  const [sel, setSel] = useState([]);                        // cell indices in current drag
  const [steps, setSteps] = useState(() => (resumed && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [score, setScore] = useState(() => {
    // Reconstruct score from already-found words so a resumed win scores right.
    let s = 0;
    if (resumed) for (const w of resumed.found) if (words.includes(w)) s += w.length * w.length * 10;
    return s;
  });
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  // Keep the latest elapsed seconds reachable inside event-handler closures.
  const secsRef = useRef(initialSecs);
  secsRef.current = secs;

  const idx = (r, c) => r * WS_SIZE + c;

  // Idle/leave autosave; per-find saves happen in endSel().
  const stateRef = useRef({});
  stateRef.current = { found, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, found: [...stateRef.current.found] }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

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

      // persist this find immediately
      onSaveProgress && onSaveProgress({ dayNum, found: [...nf] }, newSteps, secsRef.current);

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
   Game 3 — Crypto Wordle (daily variable-length finance/crypto word)
   ============================================================ */
// The daily word now varies in length (3–8 letters). The board sizes its
// columns to the word and allows wordLen + 1 guesses (see cwMaxGuesses).
const CW_MIN_LEN = 3;
const CW_MAX_LEN = 8;

// Curated finance / crypto terms of VARYING length (3–8 letters), each with a
// short themed clue the player reads while solving. The daily answer is chosen
// deterministically from this list, so everyone gets the same word + length +
// clue on the same UTC day (shareable, comparable). No dictionary validates the
// guesses — any letters of the right length are accepted — but the answer is
// always from here. Every `word` must be UPPERCASE A–Z and 3–8 letters.
// Each entry: `clue` is the always-visible main clue; `hints` is an ordered
// list of EXTRA clues (default 2) that unlock progressively — one per wrong
// guess, or early via the paid Hint button. Keep hints incremental and
// spoiler-light (never spell the word).
const CW_WORDS = [
  { word: 'FEE',      clue: 'What you pay to get a transaction processed',        hints: ['Charged every time you move funds on-chain', 'Spikes when the network is congested'] },
  { word: 'BID',      clue: 'The price a buyer offers in an order book',          hints: ["The opposite of an 'ask'", 'Sits on the buy side of the book'] },
  { word: 'APY',      clue: 'Yearly compounded return on a staking deposit',      hints: ['A percentage yield farmers watch', "Three-letter acronym ending in 'yield'"] },
  { word: 'BULL',     clue: 'An investor betting prices will rise',               hints: ['This market only goes up, they say', 'The opposite of a bear'] },
  { word: 'BEAR',     clue: 'An investor betting prices will fall',               hints: ['Prices keep sliding in this market', 'The opposite of a bull'] },
  { word: 'COIN',     clue: "A blockchain's own native digital currency",         hints: ['Bitcoin is the original one', 'Not a token — it has its own chain'] },
  { word: 'FIAT',     clue: 'Government-issued money like dollars or euros',      hints: ['Backed by a state, not a blockchain', 'The dollar and euro are examples'] },
  { word: 'HODL',     clue: 'Crypto slang for holding through the swings',        hints: ["Born from a typo of 'hold'", 'A meme for diamond hands'] },
  { word: 'MINT',     clue: 'To create a brand-new token or NFT',                 hints: ['Happens when an NFT is first created', 'Adds fresh supply to existence'] },
  { word: 'PUMP',     clue: 'A sharp, sudden rise in a coin’s price',             hints: ['Often followed by a dump', 'A rapid green candle'] },
  { word: 'TOKEN',    clue: 'A tradable unit of value issued on a chain',         hints: ['Issued on top of an existing chain', 'ERC-20 is a standard for these'] },
  { word: 'BLOCK',    clue: 'A bundle of transactions added to the chain',        hints: ['Miners race to add the next one', 'Links to the one before it'] },
  { word: 'CHAIN',    clue: 'The shared ledger of linked blocks',                 hints: ['A linked sequence of blocks', "The 'chain' in blockchain"] },
  { word: 'STAKE',    clue: 'Lock up coins to secure a network and earn rewards', hints: ['You give this up temporarily to earn passive rewards', 'Proof-of-_____ networks rely on it'] },
  { word: 'VAULT',    clue: 'A smart contract that safeguards deposited assets',  hints: ['Where a DeFi protocol stores deposits', 'A digital strongbox'] },
  { word: 'WHALE',    clue: 'A holder big enough to move the market',             hints: ['A sea creature that moves markets', 'Holds enough to cause a splash'] },
  { word: 'YIELD',    clue: 'The income your crypto earns over time',             hints: ['What farmers chase in DeFi', 'Your return, expressed as a rate'] },
  { word: 'AUDIT',    clue: 'A security review of a smart contract',             hints: ['Done before a protocol launches', 'Hunts for code vulnerabilities'] },
  { word: 'ASSET',    clue: 'Anything of value you can hold or trade',            hints: ['On the plus side of a balance sheet', 'Crypto, stocks, and gold all count'] },
  { word: 'NONCE',    clue: 'The number a miner tweaks to find a valid hash',     hints: ['A miner increments it endlessly', 'Used once, then discarded'] },
  { word: 'WALLET',   clue: 'App that holds your keys and coins',                 hints: ['Holds your private keys', 'Can be hot software or a cold device'] },
  { word: 'LEDGER',   clue: 'The record of every transaction ever made',         hints: ['An immutable transaction record', 'Also a famous hardware brand'] },
  { word: 'MINING',   clue: 'Spending compute to add blocks and earn rewards',    hints: ['How proof-of-work secures a chain', 'Rewards whoever solves the puzzle'] },
  { word: 'ORACLE',   clue: 'A feed that brings off-chain data on-chain',         hints: ['Feeds real-world prices on-chain', 'Chainlink is the best-known one'] },
  { word: 'BRIDGE',   clue: 'Moves assets between two different blockchains',     hints: ['Connects two separate chains', 'A frequent hacking target'] },
  { word: 'TETHER',   clue: 'Nickname for the best-known dollar stablecoin',      hints: ['Its ticker is USDT', 'A coin pegged to the dollar'] },
  { word: 'CRYPTO',   clue: 'Short name for digital currencies as a whole',       hints: ["Short for a kind of currency", "The whole industry's nickname"] },
  { word: 'BROKER',   clue: 'A middleman who places trades for you',              hints: ['Places trades on your behalf', 'Earns a commission per trade'] },
  { word: 'WALLETS',  clue: 'Where holders keep their keys and coins (plural)',   hints: ['Plural of where you keep keys', 'You might own several of these'] },
  { word: 'NETWORK',  clue: 'The connected nodes that run a blockchain',          hints: ['Nodes connected together', 'Ethereum is one of these'] },
  { word: 'TRADING',  clue: 'Buying and selling to profit from price moves',      hints: ['Buying low and selling high', 'What day-_____ describes'] },
  { word: 'STAKING',  clue: 'Earning rewards by locking up your coins',           hints: ['Locking coins to earn rewards', 'Powers proof-of-stake'] },
  { word: 'DEPOSIT',  clue: 'Funds you put into an account or protocol',          hints: ['Money you put in', 'The opposite of a withdrawal'] },
  { word: 'AIRDROP',  clue: 'Free tokens dropped to a community of wallets',      hints: ['Free tokens sent to wallets', 'Often rewards early users'] },
  { word: 'LENDING',  clue: 'Supplying assets so others can borrow for interest', hints: ['Earn interest by supplying assets', 'Aave and Compound enable it'] },
  { word: 'EXCHANGE', clue: 'A marketplace for swapping one coin for another',    hints: ['Where you swap one coin for another', 'Can be centralized or decentralized'] },
  { word: 'SOLVENCY', clue: 'Having enough assets to cover what you owe',         hints: ['Enough assets to cover liabilities', 'The opposite of bankruptcy'] },
  { word: 'TREASURY', clue: 'The shared pool of funds a protocol controls',       hints: ["A DAO's shared war chest", "Holds a protocol's reserves"] },
  { word: 'VALIDATE', clue: 'To confirm transactions are legitimate',             hints: ['Confirm a transaction is legit', 'Validators do this'] },
  { word: 'DIVIDEND', clue: 'A share of profits paid out to holders',             hints: ['A payout to shareholders', 'Profit shared with holders'] },
  { word: 'CURRENCY', clue: 'Money in a particular form, digital or fiat',        hints: ['A medium of exchange', 'Dollars and bitcoin both qualify'] },
  { word: 'CONTRACT', clue: 'Self-running code that enforces an agreement',       hints: ['Self-executing code on a chain', 'Smart ones run on Ethereum'] },
];

// Hint pricing — single tuning knob. Cost of the Nth hint purchased today
// (0-indexed) is CW_HINT_BASE_COST * 2**N → 1, 2, 4, 8, … in MATCH tokens.
// The server is authoritative; this client copy is for display only.
const CW_HINT_BASE_COST = 1;
const cwHintCost = (purchased) => CW_HINT_BASE_COST * Math.pow(2, purchased);

// Guesses allowed for a given word length: one more than the length, so a
// 3-letter word gives 4 tries and an 8-letter word gives 9. Single knob.
const cwMaxGuesses = (wordLen) => wordLen + 1;

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
  const len = answer.length;
  const res = Array(len).fill('gray');
  const counts = {};
  for (let i = 0; i < len; i++) counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  for (let i = 0; i < len; i++) {
    if (guess[i] === answer[i]) { res[i] = 'green'; counts[guess[i]]--; }
  }
  for (let i = 0; i < len; i++) {
    if (res[i] === 'green') continue;
    if (counts[guess[i]] > 0) { res[i] = 'yellow'; counts[guess[i]]--; }
  }
  return res;
}

// Multi-word daily puzzle: each UTC day is a deterministic stack of 4–7
// independent words drawn from CW_WORDS via the shared seeded PRNG, so every
// player faces the identical set. Tunable knobs.
const CW_MIN_ROWS = 4;
const CW_MAX_ROWS = 7;

// Points banked for solving one word in `attemptsUsed` tries. Fewer attempts and
// longer words score more. Missed words score 0. Single formula, easy to retune.
const cwRoundPoints = (wordLen, attemptsUsed) =>
  Math.max((cwMaxGuesses(wordLen) + 1 - attemptsUsed) * 60, 60) + wordLen * 10;

// The day's ordered list of word entries ({ word, clue, hints }). Deterministic
// from the server-anchored UTC day, so it's identical for everyone (fair board).
function cwDailyRounds(offset) {
  const rng = dailyRng(offset, 'cryptowordle');
  const R = CW_MIN_ROWS + Math.floor(rng() * (CW_MAX_ROWS - CW_MIN_ROWS + 1));
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < R && guard < 1000) {
    guard++;
    const idx = Math.floor(rng() * CW_WORDS.length);
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(CW_WORDS[idx]);
  }
  return picked;
}

function CryptoWordleGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, matchBalance, onMatchBalanceChange }) {
  const dayNum = useRef(cwDayNum(offset)).current;
  // The day's stack of independent word rounds (stable for the render lifetime).
  const roundsDef = useRef(cwDailyRounds(offset)).current;

  // Resume only today's saved progress (multi-round shape). Board is re-derived
  // from the seed; we persist only the mutable per-round guess words + hint use.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.rounds)
    ? savedProgress
    : null;
  const initRoundGuesses = () => roundsDef.map((rd, i) => {
    const words = resumed && Array.isArray(resumed.rounds[i]) ? resumed.rounds[i] : [];
    return words
      .filter(w => typeof w === 'string' && w.length === rd.word.length)
      .slice(0, cwMaxGuesses(rd.word.length))
      .map(w => ({ word: w, result: cwScoreGuess(w, rd.word) }));
  });
  const initHintsByRound = () => roundsDef.map((_, i) =>
    resumed && Array.isArray(resumed.hintsByRound) && Number.isFinite(resumed.hintsByRound[i])
      ? resumed.hintsByRound[i] : 0
  );

  // roundGuesses[i] = [{ word, result }]; hintsByRound[i] = paid hints applied to round i.
  const [roundGuesses, setRoundGuesses] = useState(initRoundGuesses);
  const [hintsByRound, setHintsByRound] = useState(initHintsByRound);
  const [cur, setCur] = useState('');
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  // Derive per-round status (solved / missed / active) from the submitted guesses.
  const resolveRounds = (guessArrays) => roundsDef.map((rd, i) => {
    const gs = guessArrays[i] || [];
    const maxG = cwMaxGuesses(rd.word.length);
    const solved = gs.length > 0 && gs[gs.length - 1].word === rd.word;
    const missed = !solved && gs.length >= maxG;
    return { def: rd, guesses: gs, maxG, solved, missed, resolved: solved || missed };
  });
  const roundState = resolveRounds(roundGuesses);
  const activeIdx = roundState.findIndex(r => !r.resolved);
  const allResolved = activeIdx === -1;
  const active = activeIdx >= 0 ? roundState[activeIdx] : null;

  const solvedCount = roundState.filter(r => r.solved).length;
  const totalScore = roundState.reduce(
    (a, r) => a + (r.solved ? cwRoundPoints(r.def.word.length, r.guesses.length) : 0), 0
  );
  const totalSteps = roundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0);

  const buildProgress = (guessArrays, hbr) => ({
    dayNum,
    rounds: guessArrays.map(gs => (gs || []).map(g => g.word)),
    hintsByRound: hbr,
  });

  // Idle/leave autosave; per-guess + per-purchase saves happen inline.
  const stateRef = useRef({});
  stateRef.current = { roundGuesses, hintsByRound, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: buildProgress(stateRef.current.roundGuesses, stateRef.current.hintsByRound),
      steps: stateRef.current.roundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0),
      secs: stateRef.current.secs,
    }),
    !done
  );

  // Paid-hint state. hintsPurchased is the server-authoritative DAILY count that
  // drives the doubling cost ramp; the MATCH balance is the global nav balance
  // passed in via props. Both are read on mount and reconciled from purchases.
  const [hintsPurchased, setHintsPurchased] = useState(0);
  const [buying, setBuying] = useState(false);
  const [hintMsg, setHintMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api('/api/cryptowordle/hint');
      if (!alive || !ok || !body) return;
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
      if (Number.isFinite(body.balance) && onMatchBalanceChange) onMatchBalanceChange(body.balance);
    })();
    return () => { alive = false; };
  }, []);

  // Per-round clue reveal: wrong guesses in THIS round + hints applied to it,
  // capped at the round's available clues. Cost ramp is global across rounds.
  const activeHints = active ? (active.def.hints || []) : [];
  const activeWrong = active ? active.guesses.filter(g => g.word !== active.def.word).length : 0;
  const activeHintsApplied = active ? (hintsByRound[activeIdx] || 0) : 0;
  const revealedExtra = active ? Math.min(activeWrong + activeHintsApplied, activeHints.length) : 0;
  const cluesLeft = activeHints.length - revealedExtra;
  const nextCost = cwHintCost(hintsPurchased);
  const canAffordHint = matchBalance != null && matchBalance >= nextCost;
  // Daily cap sent to the server: total clues purchasable across all rounds.
  const dailyClueTotal = roundsDef.reduce((a, rd) => a + (rd.hints ? rd.hints.length : 0), 0);

  const buyHint = async () => {
    if (buying || done || !active || cluesLeft <= 0) return;
    setBuying(true);
    setHintMsg('');
    const { ok, status, body } = await api('/api/cryptowordle/hint', {
      method: 'POST',
      body: JSON.stringify({ maxHints: dailyClueTotal }),
    });
    setBuying(false);
    if (ok && body) {
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
      if (Number.isFinite(body.balance) && onMatchBalanceChange) onMatchBalanceChange(body.balance);
      // Apply the revealed clue to the active round and persist immediately so a
      // reload can't lose a paid reveal while the server counter already advanced.
      const nextHbr = hintsByRound.map((n, i) => (i === activeIdx ? (n || 0) + 1 : n));
      setHintsByRound(nextHbr);
      onSaveProgress && onSaveProgress(buildProgress(roundGuesses, nextHbr), totalSteps, secs);
      return;
    }
    if (status === 409 && body && body.code === 'insufficient_funds') {
      if (Number.isFinite(body.balance) && onMatchBalanceChange) onMatchBalanceChange(body.balance);
      setHintMsg('Not enough MATCH');
    } else if (status === 409 && body && body.code === 'no_more_hints') {
      setHintMsg('No more clues');
    } else {
      setHintMsg('Could not buy hint');
    }
  };

  // Spoiler-free multi-word share: one line per word (✅/❌ + blank squares).
  const buildShare = (rs) => {
    const lines = [`Crypto Wordle #${dayNum} — ${rs.filter(r => r.solved).length}/${rs.length} · ${totalScore} pts`];
    rs.forEach(r => {
      lines.push((r.solved ? '✅ ' : '❌ ') + (r.solved ? '🟩' : '⬛').repeat(r.def.word.length));
    });
    return lines.join('\n');
  };

  const finishIfDone = (nextRoundState) => {
    if (nextRoundState.some(r => !r.resolved)) return false;
    setDone(true);
    const share = buildShare(nextRoundState);
    const solved = nextRoundState.filter(r => r.solved).length;
    const total = nextRoundState.length;
    const pts = nextRoundState.reduce(
      (a, r) => a + (r.solved ? cwRoundPoints(r.def.word.length, r.guesses.length) : 0), 0
    );
    const meta = { share, hintsUsed: hintsPurchased, wordsSolved: solved, wordsTotal: total };
    if (pts > 0) onWin(pts, totalSteps + 1, secs, meta);
    else onLose(totalSteps + 1, secs, meta);
    return true;
  };

  // Best color per letter for the active round's keyboard tinting.
  const keyState = {};
  const rank = { gray: 0, yellow: 1, green: 2 };
  if (active) {
    for (const g of active.guesses) {
      for (let i = 0; i < active.def.word.length; i++) {
        const ch = g.word[i], c = g.result[i];
        if (!(ch in keyState) || rank[c] > rank[keyState[ch]]) keyState[ch] = c;
      }
    }
  }

  const submit = () => {
    if (done || !active) return;
    const answer = active.def.word;
    const wordLen = answer.length;
    if (cur.length !== wordLen) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const result = cwScoreGuess(cur, answer);
    const newRoundGuesses = roundGuesses.map((g, i) =>
      i === activeIdx ? [...(g || []), { word: cur, result }] : g
    );
    setRoundGuesses(newRoundGuesses);
    setCur('');
    const steps = newRoundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0);
    onStepChange(steps);
    onSaveProgress && onSaveProgress(buildProgress(newRoundGuesses, hintsByRound), steps, secs);
    finishIfDone(resolveRounds(newRoundGuesses));
  };

  const typeLetter = (ch) => { if (!done && active && cur.length < active.def.word.length) setCur(cur + ch); };
  const backspace = () => { if (!done) setCur(cur.slice(0, -1)); };

  // Physical keyboard, dispatched through a ref so each keypress runs the latest closure.
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

  const wordLen = active ? active.def.word.length : 5;
  const maxGuesses = active ? active.maxG : 6;
  const rowsLeft = active ? Math.max(maxGuesses - active.guesses.length, 0) : 0;
  const boardWidth = Math.min(wordLen * 52, 440);

  return (
    <div>
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Word</div>
          <div className="pvalue">{Math.min(activeIdx < 0 ? roundsDef.length : activeIdx + 1, roundsDef.length)}/{roundsDef.length}</div>
        </div>
        <div className="pill">
          <div className="plabel">Solved</div>
          <div className="pvalue">{solvedCount}/{roundsDef.length}</div>
        </div>
        <div className="pill">
          <div className="plabel">Points</div>
          <div className="pvalue">{totalScore}</div>
        </div>
      </div>

      <div className="cw-tracker">
        {roundState.map((r, i) => {
          let cls = 'cw-dot';
          if (r.solved) cls += ' solved';
          else if (r.missed) cls += ' missed';
          else if (i === activeIdx) cls += ' active';
          return (
            <span
              key={i}
              className={cls}
              title={r.resolved ? `Word ${i + 1}: ${r.def.word}` : `Word ${i + 1}`}
            >
              {r.solved ? '●' : r.missed ? '✗' : i === activeIdx ? '▶' : '○'}
            </span>
          );
        })}
      </div>

      {active && (
        <>
          <div className="cw-clue">
            <span className="cw-clue-label">Clue</span>
            <span className="cw-clue-text">{active.def.clue}</span>
            <span className="cw-clue-len">{wordLen} letters</span>
          </div>

          {activeHints.slice(0, revealedExtra).map((h, i) => (
            <div key={i} className="cw-clue cw-clue-extra">
              <span className="cw-clue-label">Hint {i + 1}</span>
              <span className="cw-clue-text">{h}</span>
            </div>
          ))}

          {activeHints.length > 0 && (
            <div className="cw-hint-bar">
              <button
                className="cw-hint-btn"
                onClick={buyHint}
                disabled={buying || cluesLeft <= 0 || !canAffordHint}
              >
                {cluesLeft <= 0
                  ? '💡 No more clues'
                  : <>💡 Hint · {nextCost} 🪙</>}
              </button>
              <span className="cw-hint-balance">
                Balance: {matchBalance == null ? '…' : matchBalance} 🪙 MATCH
              </span>
              {hintMsg && <span className="cw-hint-msg">{hintMsg}</span>}
            </div>
          )}

          <div
            className="cw-board"
            style={{ gridTemplateRows: `repeat(${maxGuesses}, 1fr)`, maxWidth: `${boardWidth}px` }}
          >
            {Array.from({ length: maxGuesses }).map((_, r) => {
              const g = active.guesses[r];
              const isCurrent = !g && r === active.guesses.length && !done;
              const letters = g ? g.word : (isCurrent ? cur : '');
              return (
                <div
                  key={r}
                  className={`cw-row${isCurrent && shake ? ' shake' : ''}`}
                  style={{ gridTemplateColumns: `repeat(${wordLen}, 1fr)` }}
                >
                  {Array.from({ length: wordLen }).map((__, c) => {
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
        </>
      )}

      {allResolved && (
        <div className="cw-alldone">Puzzle complete — {solvedCount}/{roundsDef.length} words · {totalScore} pts</div>
      )}
    </div>
  );
}

/* ============================================================
   Game 4 — Minesweeper (8×8, 10 mines, classic game)
   ============================================================ */
const MS_ROWS = 8, MS_COLS = 8, MS_MINES = 10, MS_SAFE = MS_ROWS * MS_COLS - MS_MINES; // 54

const MS_HISTORY_KEY = 'puzzlechain_minesweeper_history';
const MS_HISTORY_MAX = 50;
// Looping background-music asset (served by express.static from public/audio).
const MS_MUSIC_URL = '/audio/minesweeper-bg.mp3';

function msLoadHistory() { return loadHistory(MS_HISTORY_KEY); }
function msSaveEntry(entry) { saveHistory(MS_HISTORY_KEY, entry, MS_HISTORY_MAX); }

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
  const [walletAddr, setWalletAddr] = useState(null);
  const [gameHistory, setGameHistory] = useState(() => msLoadHistory());
  // Audio: `soundOn` mirrors the shared cgPrefs.sound master switch (controls
  // both SFX and music); `musicPaused` is the player's in-game music pause that
  // leaves SFX untouched.
  const [soundOn, setSoundOn] = useState(() => cgPrefs.sound);
  const [musicPaused, setMusicPaused] = useState(false);
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
    setMusicPaused(false);
  }, [resetKey]);

  // Background music: plays while a game is live (board generated on first
  // reveal), sound is enabled, and the player hasn't paused it. Starting only
  // after the first reveal means it's triggered by a user gesture, satisfying
  // browser autoplay policy. Any change to these conditions re-evaluates.
  useEffect(() => {
    const shouldPlay = mineSet !== null && !done && soundOn && !musicPaused;
    if (shouldPlay) startBackgroundMusic(MS_MUSIC_URL);
    else stopBackgroundMusic();
  }, [mineSet, done, soundOn, musicPaused]);

  // Always silence the track when leaving the game (unmount → back to lobby).
  useEffect(() => () => stopBackgroundMusic(), []);

  // Toggle the shared sound master switch (persists to localStorage via cgPrefs)
  // and mirror it into local state so the component re-renders.
  const toggleSound = () => {
    const next = !cgPrefs.sound;
    cgSetPref('sound', next);
    setSoundOn(next);
  };

  // Bridge: detect mock mode and fetch wallet address
  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
    if (window.usernode && typeof window.usernode.getNodeAddress === 'function') {
      window.usernode.getNodeAddress().then(addr => { if (addr) setWalletAddr(addr); }).catch(() => {});
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
      cgSound('lose'); cgHaptic([20, 40, 20]);
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
      cgSound('win'); cgHaptic([15, 30, 15]);
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
    cgSound('win'); cgHaptic([15, 30, 15]);
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

  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>

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
            <button
              className={'ms-music-btn' + (!soundOn ? ' off' : musicPaused ? ' paused' : '')}
              onClick={() => setMusicPaused(p => !p)}
              disabled={!soundOn}
              title={!soundOn ? 'Sound is off (Settings)' : musicPaused ? 'Resume music' : 'Pause music'}
              aria-label={!soundOn ? 'Sound off' : musicPaused ? 'Resume music' : 'Pause music'}
            >
              {!soundOn ? '🔇' : musicPaused ? '▶' : '⏸'}
            </button>
            <button className="ms-newgame-btn" onClick={() => {
              setMineSet(null); setAdjacency(null); setRevealed(new Set());
              setFlagged(new Set()); setDone(false); setGameOverMine(null); setSteps(0);
              setMusicPaused(false);
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

      {activeTab === 'settings' && (
        <div style={{ padding: '0.5rem 0' }}>
          <div className="ms-settings-section">
            <h4>Audio</h4>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Sound &amp; music</span>
              <button className="ms-theme-toggle" onClick={toggleSound}>
                {soundOn ? '🔊 On' : '🔇 Off'}
              </button>
            </div>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Background music</span>
              <button
                className="ms-theme-toggle"
                onClick={() => setMusicPaused(p => !p)}
                disabled={!soundOn}
                style={!soundOn ? { opacity: 0.5, cursor: 'default' } : undefined}
              >
                {!soundOn ? '🔇 Off' : musicPaused ? '▶ Paused' : '⏸ Playing'}
              </button>
            </div>
          </div>
          <div className="ms-settings-section">
            <h4>Appearance</h4>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Theme</span>
              <button className="ms-theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? '🌙 Dark' : '☀ Light'}
              </button>
            </div>
          </div>
          <div className="ms-settings-section">
            <h4>Usernode Wallet</h4>
            <div className="ms-settings-row">
              <span className="ms-settings-label">Connection</span>
              {isMock ? (
                <div className="ms-wallet-status">
                  <span className="ms-ws-label mock">🔧 Dev mode</span>
                  <span className="ms-ws-addr">mock wallet active</span>
                </div>
              ) : window.usernode ? (
                <div className="ms-wallet-status">
                  <span className="ms-ws-label">🔗 Connected</span>
                  {walletAddr && <span className="ms-ws-addr">{truncAddr(walletAddr)}</span>}
                </div>
              ) : (
                <div className="ms-wallet-status">
                  <span className="ms-ws-label unavail">Not available</span>
                  <span className="ms-ws-addr">open in Usernode</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ms-bottom-nav">
        {['game', 'history', 'leaderboard', 'settings'].map(tab => (
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

function mncLoadHistory() { return loadHistory(MNC_HISTORY_KEY); }
function mncSaveEntry(entry) { saveHistory(MNC_HISTORY_KEY, entry, MNC_HISTORY_MAX); }

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
   Mancala ZK helpers (commit-reveal proof, browser-side)
   ============================================================ */
async function mncStartSession(difficulty) {
  try {
    const nonceBytes = new Uint8Array(16);
    window.crypto.getRandomValues(nonceBytes);
    const nonceHex = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const initBoard = [4,4,4,4,4,4,0,4,4,4,4,4,4,0];
    const msgBuf = new TextEncoder().encode(nonceHex + '||' + JSON.stringify(initBoard));
    const hashBuf = await window.crypto.subtle.digest('SHA-256', msgBuf);
    const commitment = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const { ok, body } = await api('/api/mancala/score/start', {
      method: 'POST',
      body: JSON.stringify({ commitment, difficulty }),
    });
    if (ok && body && body.sessionId) {
      return { sessionId: body.sessionId, nonce: nonceHex };
    }
    return null;
  } catch { return null; }
}

async function mncVerifySession(sessionId, nonce, moveLog, finalPits, timeSecs) {
  try {
    const { ok, body } = await api('/api/mancala/score/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, nonce, moveLog, finalPits, timeSecs }),
    });
    if (ok && body) return body;
    return { verified: false, reason: 'network_error' };
  } catch { return { verified: false, reason: 'network_error' }; }
}

// Daily Challenge: claim today's attempt and mint a session whose commitment
// covers the day's deterministic board. Returns { sessionId, nonce, attempt, ... }
// or { locked, ... } / null. Mirrors mncStartSession but for the daily board.
async function mncDailyStart(offset) {
  try {
    const board = mncDailyBoard(offset);
    const nonceBytes = new Uint8Array(16);
    window.crypto.getRandomValues(nonceBytes);
    const nonceHex = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const msgBuf = new TextEncoder().encode(nonceHex + '||' + JSON.stringify(board));
    const hashBuf = await window.crypto.subtle.digest('SHA-256', msgBuf);
    const commitment = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const { ok, status, body } = await api('/api/mancala/daily/start', {
      method: 'POST',
      body: JSON.stringify({ commitment }),
    });
    if (status === 409) return { locked: true, body };
    if (ok && body && body.sessionId) return { sessionId: body.sessionId, nonce: nonceHex, body };
    return null;
  } catch { return null; }
}

async function mncDailyFinish(sessionId, nonce, moveLog, finalPits, timeSecs) {
  try {
    const { ok, body } = await api('/api/mancala/daily/finish', {
      method: 'POST',
      body: JSON.stringify({ sessionId, nonce, moveLog, finalPits, timeSecs }),
    });
    if (ok && body) return body;
    return { verified: false, reason: 'network_error' };
  } catch { return { verified: false, reason: 'network_error' }; }
}

/* ============================================================
   Mancala Leaderboard component (used inside AI game tab)
   ============================================================ */
function MncLeaderboard() {
  const [diff, setDiff]       = useState('hard');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api('/api/mancala/leaderboard?difficulty=' + diff)
      .then(({ ok, body }) => {
        if (ok && body) setData(body);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [diff]);

  const fmtSecs = s => {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const tabs = ['easy', 'medium', 'hard'];
  const meInTop = data && data.me && data.top && data.top.some(r => r.rank === data.me.rank);

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {tabs.map(t => (
          <button
            key={t}
            className={'mnc-difficulty-pill' + (diff === t ? ' active' : '')}
            onClick={() => setDiff(t)}
            style={{ textTransform: 'capitalize' }}
          >{t}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign: 'center', color: C.muted, padding: '1rem', fontSize: '0.85rem' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', color: C.rose, padding: '1rem', fontSize: '0.85rem' }}>Could not load leaderboard.</div>}
      {!loading && !error && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem', fontSize: '0.75rem', color: C.muted, padding: '0 0.25rem 0.3rem', borderBottom: `1px solid ${C.border}` }}>
            <span>#</span><span>Player</span><span>Score</span><span>Time</span>
          </div>
          {data.top.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, padding: '1.25rem', fontSize: '0.85rem' }}>No scores yet — be the first!</div>
          )}
          {data.top.map((row, i) => {
            const isMe = data.me && row.rank === data.me.rank;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem',
                padding: '0.4rem 0.25rem', fontSize: '0.82rem',
                borderBottom: `1px solid ${C.border}22`,
                background: isMe ? C.accent + '18' : 'transparent',
                borderRadius: isMe ? '6px' : '0',
              }}>
                <span style={{ color: row.rank <= 3 ? C.gold : C.muted, fontWeight: row.rank <= 3 ? 700 : 400 }}>{row.rank}</span>
                <span style={{ color: isMe ? C.accent : C.text, fontWeight: isMe ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.username || '—'}</span>
                <span style={{ color: C.gold, fontFamily: 'monospace' }}>{row.bestScore}</span>
                <span style={{ color: C.muted }}>{fmtSecs(row.bestTimeSecs)}</span>
              </div>
            );
          })}
          {data.me && !meInTop && (
            <div>
              <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.7rem', padding: '0.2rem 0' }}>…</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '2rem 1fr auto auto', gap: '0 0.5rem',
                padding: '0.4rem 0.25rem', fontSize: '0.82rem',
                background: C.accent + '18', borderRadius: '6px',
              }}>
                <span style={{ color: C.accent, fontWeight: 600 }}>{data.me.rank}</span>
                <span style={{ color: C.accent, fontWeight: 600 }}>{data.me.username || 'You'}</span>
                <span style={{ color: C.gold, fontFamily: 'monospace' }}>{data.me.bestScore}</span>
                <span style={{ color: C.muted }}>{fmtSecs(data.me.bestTimeSecs)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Mancala Daily Challenge — leaderboard (Today / All-Time tabs)
   ============================================================ */
function MncDailyLeaderboard({ refreshKey }) {
  const [scope, setScope]     = useState('today');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api('/api/mancala/daily/leaderboard?scope=' + scope)
      .then(({ ok, body }) => {
        if (!alive) return;
        if (ok && body) setData(body);
        else setError(true);
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope, refreshKey]);

  const fmtSecs = s => {
    if (s == null) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };
  const meInTop = data && data.me && data.entries && data.entries.some(r => r.rank === data.me.rank);
  const cols = scope === 'today' ? '2rem 1fr auto auto' : '2rem 1fr auto auto';

  const Row = ({ r, me }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: cols, gap: '0 0.5rem',
      padding: '0.4rem 0.25rem', fontSize: '0.82rem',
      borderBottom: `1px solid ${C.border}22`,
      background: me ? C.accent + '18' : 'transparent',
      borderRadius: me ? '6px' : '0',
    }}>
      <span style={{ color: r.rank <= 3 ? C.gold : C.muted, fontWeight: r.rank <= 3 ? 700 : 400 }}>{r.rank}</span>
      <span style={{ color: me ? C.accent : C.text, fontWeight: me ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || '—'}</span>
      <span style={{ color: C.gold, fontFamily: 'monospace' }}>{r.score}</span>
      <span style={{ color: C.muted }}>
        {scope === 'today' ? fmtSecs(r.timeSecs) : `🔥 ${r.daysHeldRecord != null ? r.daysHeldRecord : 0}`}
      </span>
    </div>
  );

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {[['today', 'Today'], ['alltime', 'All-Time']].map(([id, label]) => (
          <button key={id} className={'mnc-difficulty-pill' + (scope === id ? ' active' : '')} onClick={() => setScope(id)}>{label}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign: 'center', color: C.muted, padding: '1rem', fontSize: '0.85rem' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', color: C.rose, padding: '1rem', fontSize: '0.85rem' }}>Could not load leaderboard.</div>}
      {!loading && !error && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 0.5rem', fontSize: '0.75rem', color: C.muted, padding: '0 0.25rem 0.3rem', borderBottom: `1px solid ${C.border}` }}>
            <span>#</span><span>Player</span><span>Score</span><span>{scope === 'today' ? 'Time' : 'Record'}</span>
          </div>
          {data.entries.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, padding: '1.25rem', fontSize: '0.85rem' }}>No scores yet — be the first!</div>
          )}
          {data.entries.map((r, i) => <Row key={i} r={r} me={r.isCurrentUser} />)}
          {data.me && !meInTop && (
            <div>
              <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.7rem', padding: '0.2rem 0' }}>…</div>
              <Row r={data.me} me={true} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Game 5e — Mancala Daily Challenge (one seeded puzzle/day vs Hard AI)
   ============================================================ */
function MancalaDailyGame({ onWin, onStepChange, offset }) {
  // Phase: 'loading' | 'locked' | 'play' | 'error'
  const [phase, setPhase]               = useState('loading');
  const [pits, setPits]                 = useState(() => mncDailyBoard(offset));
  const [player, setPlayer]             = useState(1);
  const [done, setDone]                 = useState(false);
  const [winner, setWinner]             = useState(null);
  const [moves, setMoves]               = useState(0);
  const [flashPits, setFlashPits]       = useState(() => new Set());
  const [captureFlash, setCaptureFlash] = useState(() => new Set());
  const [bannerMsg, setBannerMsg]       = useState('');
  const [aiThinking, setAiThinking]     = useState(false);
  const [soundOn, setSoundOn]           = useState(() => localStorage.getItem(MNC_SOUND_KEY) !== '0');
  const [activeTab, setActiveTab]       = useState('game');
  const [globalRecord, setGlobalRecord] = useState(null);
  const [streak, setStreak]             = useState(0);
  const [nextReset, setNextReset]       = useState(null);
  const [lockedAttempt, setLockedAttempt] = useState(null);
  const [verifying, setVerifying]       = useState(false);
  const [verified, setVerified]         = useState(null);
  const [becameRecord, setBecameRecord] = useState(false);
  const [lbKey, setLbKey]               = useState(0);
  const [resumeSecs, setResumeSecs]     = useState(0);

  const animatingRef = useRef(false);
  const soundOnRef   = useRef(soundOn);
  const winTimerRef  = useRef(null);
  const applyMoveRef = useRef(null);
  const pitsRef      = useRef(pits);
  const movesRef     = useRef(moves);
  const sessionIdRef = useRef(null);
  const nonceRef     = useRef(null);
  const moveLogRef   = useRef([]);
  const startedRef   = useRef(false);
  soundOnRef.current = soundOn;
  pitsRef.current    = pits;
  movesRef.current   = moves;

  const { secs, fmt } = useTimer(phase === 'play' && !done, resumeSecs);
  const secsRef = useRef(0);
  secsRef.current = secs;

  const countdown = useCountdown(nextReset, offset, null);

  // Hydrate state on mount: derive board, learn record/streak/lock, and (if
  // playable) claim today's attempt + mint the ZK session.
  useEffect(() => {
    let alive = true;
    (async () => {
      const demo = new URLSearchParams(window.location.search).get('demo');
      const { ok, body } = await api('/api/mancala/daily' + (demo ? `?demo=${encodeURIComponent(demo)}` : ''));
      if (!alive) return;
      if (!ok || !body) { setPhase('error'); return; }
      setPits(body.board || mncDailyBoard(offset));
      setGlobalRecord(body.globalRecord != null ? body.globalRecord : null);
      setStreak(typeof body.streak === 'number' ? body.streak : 0);
      setNextReset(body.nextResetUtc || null);
      const at = body.attempt;
      if (at && at.finishedAt) {
        setLockedAttempt(at);
        setPhase('locked');
        return;
      }
      // Fresh or resumable — claim/mint a session.
      const started = await mncDailyStart(offset);
      if (!alive) return;
      if (started && started.locked) {
        setLockedAttempt(started.body && started.body.attempt);
        if (started.body && started.body.nextResetUtc) setNextReset(started.body.nextResetUtc);
        setPhase('locked');
        return;
      }
      if (!started || !started.sessionId) { setPhase('error'); return; }
      sessionIdRef.current = started.sessionId;
      nonceRef.current = started.nonce;
      moveLogRef.current = [];
      if (started.body) {
        if (started.body.board) setPits(started.body.board);
        if (started.body.globalRecord != null) setGlobalRecord(started.body.globalRecord);
        if (started.body.nextResetUtc) setNextReset(started.body.nextResetUtc);
        const sa = started.body.attempt;
        // Resume an unfinished attempt: restore move count + elapsed timer. The
        // board itself is re-derived from the day seed, so only the count is
        // needed to keep the step display honest (moves replay isn't restored —
        // a same-day return continues from the live board the server tracks via
        // the new session; we keep it simple and resume the clock + counter).
        if (sa && sa.elapsedSecs) setResumeSecs(sa.elapsedSecs);
        if (sa && typeof sa.moves === 'number') { setMoves(sa.moves); onStepChange(sa.moves); }
      }
      startedRef.current = true;
      setPhase('play');
    })();
    return () => { alive = false; };
  }, []);

  // Autosave elapsed time + move count for resume (board re-derives from seed).
  useAutosave(
    (progress, steps, s) => {
      if (phase !== 'play' || done) return;
      api('/api/mancala/daily/progress', {
        method: 'POST', keepalive: true,
        body: JSON.stringify({ progress, moves: steps, elapsedSecs: s }),
      }).catch(() => {});
    },
    () => ({ progress: { dayNum: utcDayNum(offset), moves: movesRef.current }, steps: movesRef.current, secs: secsRef.current }),
    phase === 'play' && !done
  );

  const finishMove = (newPits, currentPlayer, extraTurn, captureFrom, newMoves) => {
    const p = newPits.slice();
    const p1Empty = p.slice(0, 6).every(v => v === 0);
    const p2Empty = p.slice(7, 13).every(v => v === 0);
    const isGameOver = p1Empty || p2Empty;
    if (isGameOver) {
      for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
      for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
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

      const finalSecs = secsRef.current;
      const date = new Date(Date.now() + offset).toISOString().slice(0, 10);
      const recLine = w === 1 ? '' : '';
      const share = `Mancala Daily ${date} — 🫘 You ${p[6]} · AI ${p[13]} · ${finalSecs}s${recLine}`;
      const base = Math.max((p[6] - p[13]) * 15 - finalSecs, 0);

      setVerifying(true);
      const sid = sessionIdRef.current;
      const nonce = nonceRef.current;
      const log = moveLogRef.current.slice();
      const fp = p.slice();
      const proceed = (serverScore, ver, became) => {
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          setBannerMsg('');
          const label = w === 'draw' ? "Draw 🤝"
            : w === 2 ? 'AI wins 🤖'
            : became ? '🏆 New daily record!' : 'You win! 🎉';
          onWin(w === 1 ? serverScore : 0, newMoves, finalSecs, {
            winner: w, share, verified: ver, daily: true,
            becameRecord: became, streak, winnerLabel: label,
          });
        }, 700);
      };

      if (sid && nonce) {
        mncDailyFinish(sid, nonce, log, fp, finalSecs).then(result => {
          setVerifying(false);
          const ok = result && result.verified;
          setVerified(ok);
          if (ok) {
            if (result.globalRecord != null) setGlobalRecord(result.globalRecord);
            if (typeof result.streak === 'number') setStreak(result.streak);
            setBecameRecord(!!result.becameRecord);
            setLbKey(k => k + 1);
            proceed(typeof result.score === 'number' ? result.score : (w === 1 ? base : 0), true, !!result.becameRecord);
          } else {
            proceed(w === 1 ? base : 0, false, false);
          }
        });
      } else {
        setVerifying(false);
        proceed(w === 1 ? base : 0, false, false);
      }
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
    moveLogRef.current.push(idx);
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

  // AI plays P2 at Hard difficulty (deterministic — matches server verification).
  useEffect(() => {
    if (phase !== 'play' || player !== 2 || done) return;
    setAiThinking(true);
    const FLOOR = 350;
    let raf = null, applyTimer = null;
    raf = requestAnimationFrame(() => {
      const startedAt = Date.now();
      const idx = mncAIMove(pitsRef.current, 'hard');
      const elapsed = Date.now() - startedAt;
      applyTimer = setTimeout(() => {
        setAiThinking(false);
        if (idx >= 0) applyMoveRef.current(idx, 2);
      }, Math.max(0, FLOOR - elapsed));
    });
    return () => { if (raf) cancelAnimationFrame(raf); if (applyTimer) clearTimeout(applyTimer); };
  }, [player, done, phase]);

  useEffect(() => () => { if (winTimerRef.current) clearTimeout(winTimerRef.current); }, []);

  if (phase === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: C.muted, fontSize: '0.85rem' }}>Loading today's challenge…</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: C.rose, fontSize: '0.9rem' }}>
        Couldn't load the Daily Challenge. Make sure you're signed in, then try again.
      </div>
    );
  }

  if (phase === 'locked') {
    const at = lockedAttempt || {};
    const solved = at.score != null && at.score > 0;
    const fmtTime = s => s == null ? '—' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return (
      <div className="locked-card">
        <div className="lock-icon">🔒</div>
        <h2>You've played today</h2>
        <div className="sub">Mancala Daily Challenge — one attempt per day</div>
        <div className="mnc-daily-pills" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
          <span className="mnc-record-pill">🏆 Record: {globalRecord != null ? globalRecord : '—'}</span>
          {streak > 0 && <span className="mnc-streak-chip">🔥 {streak} day{streak === 1 ? '' : 's'}</span>}
        </div>
        <div className="countdown-block">
          <div className="clabel">Next puzzle in</div>
          <div className="ctime mono">{countdown}</div>
        </div>
        {at.score != null && (
          <div className="locked-result">
            <div className="score-row"><span className="k">Your score</span><span className="v">{solved ? '+' + at.score : '0'}</span></div>
            {at.timeSecs != null && <div className="score-row"><span className="k">Time</span><span className="v">{fmtTime(at.timeSecs)}</span></div>}
            {at.moves != null && <div className="score-row"><span className="k">Moves</span><span className="v">{at.moves}</span></div>}
          </div>
        )}
        <MncDailyLeaderboard refreshKey={lbKey} />
      </div>
    );
  }

  // ----- play phase -----
  const p2Display = [12, 11, 10, 9, 8, 7];
  const p1Display = [0, 1, 2, 3, 4, 5];
  const p1Color = C.accent, p2Color = C.rose;
  const activeColor = player === 1 ? p1Color : p2Color;
  const leadingRecord = globalRecord != null && pits[6] > globalRecord;

  const handlePitClick = (idx) => {
    if (player !== 1 || done || animatingRef.current) return;
    if (idx < 0 || idx > 5 || pits[idx] === 0) return;
    applyMove(idx, 1);
  };
  const pitClass = (idx) => {
    const isP1Pit = idx <= 5;
    const canClick = !done && player === 1 && isP1Pit && pits[idx] > 0 && !animatingRef.current;
    const cls = ['mnc-pit'];
    cls.push(canClick ? 'mnc-clickable' : 'mnc-dim');
    if (flashPits.has(idx)) cls.push('mnc-flash');
    if (captureFlash.has(idx)) cls.push('mnc-capture-flash');
    return cls.join(' ');
  };

  return (
    <div>
      <div className="mnc-daily-header">
        <div className="mnc-daily-title">🗓️ Daily Challenge</div>
        <div className="mnc-daily-pills">
          <span className="mnc-record-pill" style={leadingRecord ? { borderColor: C.gold, color: C.gold } : null}>
            {globalRecord != null ? `🏆 Record: ${globalRecord}` : '🏆 Be the first!'}
          </span>
          {streak > 0 && <span className="mnc-streak-chip">🔥 {streak} day{streak === 1 ? '' : 's'}</span>}
        </div>
      </div>

      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill"><div className="plabel">You</div><div className="pvalue" style={{ color: p1Color }}>{pits[6]}</div></div>
        <div className="pill">
          <div className="plabel">ZK</div>
          <div className="pvalue" style={{ fontSize: '0.75rem', color: verifying ? C.gold : verified === true ? '#4ade80' : verified === false ? C.rose : sessionIdRef.current ? C.accent : C.muted }}>
            {verifying ? '…' : verified === true ? '✓' : verified === false ? '✗' : sessionIdRef.current ? '⚡' : '—'}
          </div>
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
          : player === 2 ? 'AI is thinking… 🤖' : 'Your turn — sow from your pits'}
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
      {becameRecord && <div className="mnc-banner" style={{ color: C.gold }}>🏆 New daily record!</div>}

      <div className="mnc-controls">
        <button onClick={() => { const next = !soundOn; setSoundOn(next); soundOnRef.current = next; try { localStorage.setItem(MNC_SOUND_KEY, next ? '1' : '0'); } catch {} }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0', marginTop: '1.25rem', borderBottom: `1px solid ${C.border}` }}>
        {['game', 'leaderboard'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.45rem', fontSize: '0.82rem', fontWeight: activeTab === tab ? 700 : 400,
              background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${C.accent}` : '2px solid transparent',
              color: activeTab === tab ? C.accent : C.muted, cursor: 'pointer',
            }}>{tab === 'game' ? '🎯 Challenge' : '🏆 Leaderboard'}</button>
        ))}
      </div>
      {activeTab === 'game' && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.82rem', padding: '0.9rem 0.5rem', lineHeight: 1.5 }}>
          One puzzle a day — the same board for every player. Win against the Hard AI to score; a bigger,
          faster win scores higher. Beat the global record to extend your 🔥 streak.
        </div>
      )}
      {activeTab === 'leaderboard' && <MncDailyLeaderboard refreshKey={lbKey} />}
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
  const [activeTab, setActiveTab]       = useState('game');
  // ZK session state
  const [verifying, setVerifying]       = useState(false);
  const [verified, setVerified]         = useState(null); // null | true | false

  const animatingRef  = useRef(false);
  const soundOnRef    = useRef(soundOn);
  const winTimerRef   = useRef(null);
  const applyMoveRef  = useRef(null);
  const pitsRef       = useRef(pits);
  const movesRef      = useRef(moves);
  const playerRef     = useRef(player);
  const doneRef       = useRef(done);
  // AI turn-loop timers (thinking delay + last-resort watchdog)
  const aiTimerRef    = useRef(null);
  const aiWatchdogRef = useRef(null);
  // ZK proof refs
  const sessionIdRef  = useRef(null);
  const nonceRef      = useRef(null);
  const moveLogRef    = useRef([]);
  soundOnRef.current  = soundOn;
  pitsRef.current     = pits;
  movesRef.current    = moves;
  playerRef.current   = player;
  doneRef.current     = done;

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;

  // Game Menu Save/Resume for the Versus-Bot (AI) Mancala game.
  const { loadState, clearState } = useClassicSave('mancala');
  const [resumeOffer, setResumeOffer] = useState(null);
  const resumeCheckedRef = useRef(false);
  useClassicSaveSource(!done, () => ({
    difficulty, pits: pitsRef.current, currentPlayer: playerRef.current,
    moves: movesRef.current, secs: secsRef.current,
  }));
  useEffect(() => {
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    loadState().then(s => { if (s && Array.isArray(s.pits)) setResumeOffer(s); });
  }, []);
  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    setPits(s.pits); pitsRef.current = s.pits;
    setPlayer(s.currentPlayer || 1); playerRef.current = s.currentPlayer || 1;
    setMoves(s.moves || 0); movesRef.current = s.moves || 0;
    setDone(false); doneRef.current = false;
    setResumeOffer(null);
  };
  const dismissResume = () => { setResumeOffer(null); clearState(); };

  const startSession = async () => {
    sessionIdRef.current = null;
    nonceRef.current = null;
    moveLogRef.current = [];
    const result = await mncStartSession(difficulty);
    if (result) {
      sessionIdRef.current = result.sessionId;
      nonceRef.current = result.nonce;
    }
  };

  useEffect(() => { resetGame(); }, [resetKey]);

  const resetGame = () => {
    animatingRef.current = false;
    cancelAiTimers();
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
    setVerifying(false);
    setVerified(null);
    startSession();
  };

  useEffect(() => { startSession(); }, []);

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
      cancelAiTimers();
      const w = p[6] > p[13] ? 1 : p[13] > p[6] ? 2 : 'draw';
      setWinner(w);
      setDone(true);
      doneRef.current = true;
      setAiThinking(false);
      clearState(); // a finished bot game has no save to resume
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

      // ZK verify on player win, then fire onWin
      const finalSecs = secsRef.current;
      const base = Math.max(Math.abs(p[6] - p[13]) * 15 - finalSecs, 50);
      const share = `Mancala vs AI (${difficulty}) — 🫘 You ${p[6]} · AI ${p[13]} · ${newMoves} moves · ${finalSecs}s`;

      if (w === 1 && sessionIdRef.current && nonceRef.current) {
        setVerifying(true);
        const sid = sessionIdRef.current;
        const nonce = nonceRef.current;
        const log = moveLogRef.current.slice();
        const fp = p.slice();
        // Race: verify within 3s max, then proceed regardless
        const verifyTimeout = setTimeout(() => {
          setVerifying(false);
          setVerified(false);
          winTimerRef.current = setTimeout(() => {
            winTimerRef.current = null;
            setBannerMsg('');
            onWin(base, newMoves, finalSecs, { winner: w, share, verified: false });
          }, 500);
        }, 3000);
        mncVerifySession(sid, nonce, log, fp, finalSecs).then(result => {
          clearTimeout(verifyTimeout);
          setVerifying(false);
          const ok = result && result.verified;
          setVerified(ok);
          winTimerRef.current = setTimeout(() => {
            winTimerRef.current = null;
            setBannerMsg('');
            onWin(ok ? (result.score || base) : base, newMoves, finalSecs, { winner: w, share, verified: ok });
          }, 600);
        });
      } else {
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          setBannerMsg('');
          onWin(w === 1 ? base : w === 'draw' ? 50 : 0, newMoves, finalSecs, { winner: w, share, verified: false });
        }, 1500);
      }
    } else if (extraTurn) {
      setBannerMsg(currentPlayer === 2 ? 'AI gets another turn! 🔄' : 'Extra turn! 🔄');
      setTimeout(() => setBannerMsg(m => (m === 'Extra turn! 🔄' || m === 'AI gets another turn! 🔄') ? '' : m), 1200);
      // The AI keeps the turn on an extra turn; the [player, done] effect
      // won't re-fire (player is unchanged), so re-arm the AI loop directly.
      if (currentPlayer === 2) scheduleAiMove();
    } else {
      if (currentPlayer === 2) cancelAiTimers();
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
    moveLogRef.current.push(idx);
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

  // --- AI turn loop -------------------------------------------------------
  // Cancel any pending AI thinking timer + watchdog.
  const cancelAiTimers = () => {
    if (aiTimerRef.current)    { clearTimeout(aiTimerRef.current);    aiTimerRef.current = null; }
    if (aiWatchdogRef.current) { clearTimeout(aiWatchdogRef.current); aiWatchdogRef.current = null; }
  };

  // Settle every remaining stone into its owner's store and end the game.
  // Used when the AI has no legal move, or as the watchdog's last resort so
  // the board can never stay frozen on "AI is thinking…".
  const forceEndGame = () => {
    cancelAiTimers();
    if (doneRef.current) return;
    const p = pitsRef.current.slice();
    for (let i = 0; i < 6;  i++) { p[6]  += p[i]; p[i] = 0; }
    for (let i = 7; i < 13; i++) { p[13] += p[i]; p[i] = 0; }
    animatingRef.current = false;
    setAiThinking(false);
    // p has both sides empty, so finishMove detects game-over and runs the
    // full winner / history / ZK / onWin flow exactly as a normal end would.
    finishMove(p, 2, false, -1, movesRef.current);
  };

  // Last-resort safety net: if the AI ever fails to produce a move within a
  // generous window, force the game to a result rather than hang forever.
  const armWatchdog = () => {
    if (aiWatchdogRef.current) { clearTimeout(aiWatchdogRef.current); aiWatchdogRef.current = null; }
    aiWatchdogRef.current = setTimeout(() => {
      aiWatchdogRef.current = null;
      if (doneRef.current || playerRef.current !== 2) return;
      // A real move may still be animating — give it more time, don't cut in.
      if (animatingRef.current) { armWatchdog(); return; }
      forceEndGame();
    }, 12000);
  };

  // Compute and play the AI's move. Defends against a thrown engine, a missing
  // legal move, and a still-running animation (retry instead of dropping it).
  const performAiMove = () => {
    aiTimerRef.current = null;
    if (doneRef.current || playerRef.current !== 2) { setAiThinking(false); return; }
    if (animatingRef.current) {
      // Previous animation hasn't settled yet — retry shortly so the busy
      // guard in applyMove never silently swallows the AI's move.
      aiTimerRef.current = setTimeout(performAiMove, 120);
      return;
    }
    let idx = -1;
    try {
      idx = mncAIMove(pitsRef.current, difficulty);
    } catch (e) {
      const legal = mncGetValidMoves(pitsRef.current, 2);
      idx = legal.length ? legal[Math.floor(Math.random() * legal.length)] : -1;
    }
    if (idx < 0) { setAiThinking(false); forceEndGame(); return; }
    setAiThinking(false);
    applyMoveRef.current(idx, 2);
  };

  // Arm a single AI step (thinking delay + watchdog). Cancels any prior timer
  // first, so chained extra turns never stack up.
  const scheduleAiMove = () => {
    if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }
    if (doneRef.current || playerRef.current !== 2) return;
    setAiThinking(true);
    armWatchdog();
    const delay = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 700 : 1100;
    aiTimerRef.current = setTimeout(performAiMove, delay);
  };

  // Kick off the AI loop whenever it becomes P2's turn. Chained extra turns
  // are re-armed from finishMove (player is unchanged, so this won't re-fire).
  useEffect(() => {
    if (player !== 2 || done) { cancelAiTimers(); return; }
    scheduleAiMove();
    return () => cancelAiTimers();
  }, [player, done]);

  // Cancel all AI timers on unmount.
  useEffect(() => () => cancelAiTimers(), []);

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
      {resumeOffer && <ClassicResumeBanner onResume={applyResume} onDismiss={dismissResume} />}
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill">
          <div className="plabel">Diff</div>
          <div className="pvalue" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{difficulty}</div>
        </div>
        <div className="pill">
          <div className="plabel">ZK</div>
          <div className="pvalue" style={{ fontSize: '0.75rem', color: verifying ? C.gold : verified === true ? C.emerald : verified === false ? C.rose : sessionIdRef.current ? C.accent : C.muted }}>
            {verifying ? '…' : verified === true ? '✓' : verified === false ? '✗' : sessionIdRef.current ? '⚡' : '—'}
          </div>
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

      <div style={{ display: 'flex', gap: '0', marginTop: '1.25rem', borderBottom: `1px solid ${C.border}` }}>
        {['game', 'leaderboard'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.45rem', fontSize: '0.82rem', fontWeight: activeTab === tab ? 700 : 400,
              background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${C.accent}` : '2px solid transparent',
              color: activeTab === tab ? C.accent : C.muted, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{tab === 'game' ? '📊 Stats' : '🏆 Leaderboard'}</button>
        ))}
      </div>

      {activeTab === 'game' && aiHistory.length > 0 && (
        <div className="mnc-stats-grid" style={{ marginTop: '0.75rem' }}>
          <div className="mnc-stat-card"><div className="mnc-stat-val">{stats.total}</div><div className="mnc-stat-lbl">Games</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p1Color }}>{stats.wins}</div><div className="mnc-stat-lbl">Wins</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: p2Color }}>{stats.losses}</div><div className="mnc-stat-lbl">Losses</div></div>
          <div className="mnc-stat-card"><div className="mnc-stat-val" style={{ color: C.muted }}>{stats.draws}</div><div className="mnc-stat-lbl">Draws</div></div>
        </div>
      )}
      {activeTab === 'game' && aiHistory.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.82rem', padding: '1rem 0' }}>No games yet — play one!</div>
      )}
      {activeTab === 'leaderboard' && <MncLeaderboard />}
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
function MancalaModeSelect({ onSelectLocal, onSelectAI, onSelectOnline, onSelectDaily }) {
  const [mode, setMode]             = useState(null);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem(MNC_AI_DIFF_KEY) || 'medium');
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode]     = useState('');
  const [joinError, setJoinError]   = useState('');
  const [busy, setBusy]             = useState(false);

  const handleStart = async () => {
    if (!mode) return;
    if (mode === 'daily') { onSelectDaily(); return; }
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
    { id: 'daily',  icon: '🗓️', name: 'Daily Challenge', desc: 'One puzzle a day. Beat the global record.', ranked: true },
    { id: 'local',  icon: '👥', name: 'Local 2-Player', desc: 'Pass and play on this device' },
    { id: 'ai',     icon: '🤖', name: 'vs AI Bot',       desc: 'Challenge the computer', ranked: true },
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
            <span className="mnc-mode-name">
              {m.name}
              {m.ranked && <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', background: C.gold + '33', color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: '999px', padding: '0.1rem 0.4rem', verticalAlign: 'middle', fontWeight: 700 }}>🏆 Ranked</span>}
            </span>
            <span className="mnc-mode-desc">{m.desc}{m.ranked ? ' — wins post to leaderboard' : ''}</span>
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
function MancalaGame({ onWin, onStepChange, resetKey, gameMode, onModeChange, offset }) {
  const [mode, setMode]               = useState(() =>
    new URLSearchParams(window.location.search).get('mmode') === 'daily' ? 'daily' : null);
  const [difficulty, setDifficulty]   = useState(null);
  const [roomId, setRoomId]           = useState(null);
  const [myPlayerNum, setMyPlayerNum] = useState(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // On "Play Again" / Game-Menu New Game (resetKey change), return to the mode
  // selector. Skip the initial mount so a ?mmode=daily deep-link survives.
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) { firstReset.current = false; return; }
    setMode(null);
    setRoomId(null);
    setMyPlayerNum(null);
  }, [resetKey]);

  // Report the active mode upward so the top-bar pill + Save toggle reflect it.
  // 'ai' → 'bot' (saveable), 'local' → '2p', daily/null are non-mode states.
  useEffect(() => {
    if (!onModeChange) return;
    onModeChange(mode === 'ai' ? 'bot' : mode === 'local' ? '2p' : mode === 'online' ? 'online' : null);
  }, [mode]);

  if (!mode) {
    return (
      <MancalaModeSelect
        onSelectDaily={() => setMode('daily')}
        onSelectLocal={() => setMode('local')}
        onSelectAI={(diff) => { setDifficulty(diff); setMode('ai'); }}
        onSelectOnline={(playerNum, rId) => { setMyPlayerNum(playerNum); setRoomId(rId); setMode('online'); }}
      />
    );
  }

  if (mode === 'daily')  return React.createElement(MancalaDailyGame, { onWin, onStepChange, offset });
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

function t2048LoadHistory() { return loadHistory(T2048_HISTORY_KEY); }
function t2048SaveEntry(entry) { saveHistory(T2048_HISTORY_KEY, entry, T2048_HISTORY_MAX); }
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
   New Classic Games (Snake, Block Blast, Tile Match, Diamond Rush,
   Texas Hold 'Em) — all self-wrap in ClassicShell.
   ============================================================ */
const SNAKE_KEY = 'puzzlechain_snake_history';
const SNAKE_DIFFICULTY_KEY = 'puzzlechain_snake_difficulty';
const BB_KEY    = 'puzzlechain_blockblast_history';
const DR_KEY    = 'puzzlechain_diamondrush_history';
const TH_KEY    = 'puzzlechain_texas_history';

function cgLoadHistory(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function cgSaveHistory(key, entry) {
  const h = cgLoadHistory(key);
  h.unshift(entry);
  const trimmed = h.slice(0, 30);
  try { localStorage.setItem(key, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}
function cgFmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function useElapsed(resetKey, running) {
  const [secs, setSecs] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => { start.current = Date.now(); setSecs(0); }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(Math.round((Date.now() - start.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [running, resetKey]);
  return secs;
}

/* ---------------- Snake ---- Difficulty config ---- */
const SNAKE_SPEED_CONFIG = {
  easy:   { initial: 250, decrement: 4 },
  normal: { initial: 200, decrement: 6 },
  hard:   { initial: 150, decrement: 8 },
};

/* ---- Snake — Mode Selector ---- */
function SnakeGameModeSelect({ onSelectDifficulty }) {
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem(SNAKE_DIFFICULTY_KEY) || 'normal');

  const handleStart = () => {
    try { localStorage.setItem(SNAKE_DIFFICULTY_KEY, difficulty); } catch {}
    onSelectDifficulty(difficulty);
  };

  return (
    <div className="mnc-mode-select">
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Choose Difficulty</h3>
        <p style={{ color: 'var(--cg-muted, #999)', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>Affects starting speed and acceleration</p>
      </div>
      <div className="mnc-difficulty-row">
        {['easy', 'normal', 'hard'].map(d => (
          <button key={d} className={'mnc-difficulty-pill' + (difficulty === d ? ' active' : '')} onClick={() => setDifficulty(d)}>
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <button className="mnc-mode-start-btn" onClick={handleStart}>
        Play
      </button>
    </div>
  );
}

/* ---- Snake — Gameplay ---- */
function SnakeGameplay({ onWin, onStepChange, resetKey, game, onBack, difficulty, menuConfig }) {
  const N = 15;
  const [, render] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pausedSecs, setPausedSecs] = useState(0);
  const st = useRef(null);
  const doneRef = useRef(false);
  const boardRef = useRef(null);
  const secs = useElapsed(resetKey, !done && !paused);
  const secsRef = useRef(0); secsRef.current = secs;

  const randFood = (snake) => {
    let c;
    do { c = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (snake.some(s => s.x === c.x && s.y === c.y));
    return c;
  };
  const init = () => {
    const m = Math.floor(N / 2);
    const snake = [{ x: m, y: m }, { x: m - 1, y: m }, { x: m - 2, y: m }];
    const config = SNAKE_SPEED_CONFIG[difficulty || 'normal'];
    st.current = { snake, dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: randFood(snake), speed: config.initial, eaten: 0 };
    doneRef.current = false;
    setDone(false); setScore(0); setStarted(false); setPaused(false); setPausedSecs(0); render(n => n + 1);
  };
  useEffect(() => { init(); }, [resetKey]);

  const gameOver = () => {
    if (doneRef.current) return;
    doneRef.current = true; setDone(true);
    cgSound('lose'); cgHaptic([20, 40, 20]);
    const sc = st.current.eaten * 10;
    cgSaveHistory(SNAKE_KEY, { score: sc, len: st.current.snake.length, ts: Date.now() });
    const hist = cgLoadHistory(SNAKE_KEY);
    const bestScore = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
    const longestSnake = hist.reduce((m, r) => Math.max(m, r.len || 0), 0);
    onWin(sc, st.current.eaten, secsRef.current, { winnerLabel: 'Game Over', share: `🐍 Snake — ${sc} pts, length ${st.current.snake.length}`, bestScore, longestSnake });
  };
  const step = () => {
    const s = st.current;
    if (!s || doneRef.current) return;
    s.dir = s.nextDir;
    const head = s.snake[0];
    const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N ||
        s.snake.some((seg, i) => i < s.snake.length - 1 && seg.x === nx && seg.y === ny)) {
      gameOver(); return;
    }
    s.snake.unshift({ x: nx, y: ny });
    if (nx === s.food.x && ny === s.food.y) {
      s.eaten++; setScore(s.eaten * 10);
      cgSound('clear', 1 + s.eaten * 0.02); cgHaptic(15);
      s.food = randFood(s.snake);
      const config = SNAKE_SPEED_CONFIG[difficulty || 'normal'];
      s.speed = Math.max(80, config.initial - s.eaten * config.decrement);
      onStepChange && onStepChange(s.eaten);
    } else {
      s.snake.pop();
    }
    render(n => n + 1);
  };
  useEffect(() => {
    if (done || !started || paused) return;
    let raf, last = 0, alive = true;
    const loop = (ts) => {
      if (!alive) return;
      const s = st.current;
      if (s && ts - last >= s.speed) { last = ts; step(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [done, started, paused, resetKey]);

  const turn = (dir) => {
    const s = st.current;
    if (!s || doneRef.current || paused) return;
    const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const nd = map[dir]; if (!nd) return;
    if (nd.x === -s.dir.x && nd.y === -s.dir.y) return;
    s.nextDir = nd;
    if (!started) setStarted(true);
    cgSound('move');
  };
  useGestures(boardRef, { onSwipe: (d) => turn(d), onTap: () => { if (!started && !paused) setStarted(true); } });
  useEffect(() => {
    const onKey = (e) => {
      const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (k) { e.preventDefault(); turn(k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  const s = st.current;
  const cells = [];
  if (s) {
    const occ = {};
    s.snake.forEach((seg, i) => { occ[seg.y * N + seg.x] = i === 0 ? 'head' : 'body'; });
    const fi = s.food.y * N + s.food.x;
    for (let i = 0; i < N * N; i++) {
      const o = occ[i];
      cells.push(<div key={i} className={'snake-cell' + (o ? ' ' + o : '') + (i === fi ? ' food' : '')} />);
    }
  }
  const hist = cgLoadHistory(SNAKE_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const longest = hist.reduce((m, r) => Math.max(m, r.len || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">len {r.len}</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Games' },
      { val: longest, lbl: 'Longest' }, { val: score, lbl: 'This run' },
    ]),
    cgRulesSection(['Swipe (or arrow keys) to steer the snake.', 'Eat the red food to grow and score.', 'Avoid the walls and your own tail.', 'It speeds up as you grow — chase a high score!', `Difficulty: ${(difficulty || 'normal').charAt(0).toUpperCase() + (difficulty || 'normal').slice(1)} — change via New Game.`]),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: score }, { l: 'Length', v: s ? s.snake.length : 0 }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="snake-board-wrap">
          <div className="snake-board" ref={boardRef} style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, gridTemplateRows: `repeat(${N}, 1fr)` }}>
            {cells}
          </div>
          {paused && !done && (
            <div className="snake-pause-overlay">
              <div className="snake-pause-text">PAUSED</div>
            </div>
          )}
        </div>
        <div className="snake-hint">{started ? 'Swipe to steer' : 'Swipe or tap to start'}</div>
        <div className="snake-controls">
          {!started && <button onClick={() => init()}>Restart</button>}
          {started && !paused && !done && (
            <>
              <button onClick={() => { setPaused(true); setPausedSecs(secs); }}>Pause</button>
              <button onClick={() => init()}>Restart</button>
            </>
          )}
          {paused && !done && (
            <>
              <button onClick={() => { setPaused(false); }}>Resume</button>
              <button onClick={() => init()}>Restart</button>
            </>
          )}
        </div>
      </div>
    </ClassicShell>
  );
}

/* ---- Snake — Wrapper (mode selector + gameplay) ---- */
function SnakeGame({ onWin, onStepChange, resetKey, game, onBack, menuConfig }) {
  const [difficulty, setDifficulty] = useState(null);
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  useEffect(() => {
    if (diffRef.current !== null) {
      setDifficulty(null);
    }
  }, [resetKey]);

  if (!difficulty) {
    return (
      <ClassicShell game={game} onExit={onBack} sheetSections={[]} menuConfig={menuConfig}>
        <div className="cg-stage">
          <SnakeGameModeSelect onSelectDifficulty={(d) => setDifficulty(d)} />
        </div>
      </ClassicShell>
    );
  }

  return React.createElement(SnakeGameplay, { onWin, onStepChange, resetKey, game, onBack, difficulty, menuConfig });
}

/* ---------------- Block Blast ---------------- */
const BB_SHAPES = [
  [[0, 0]],
  [[0, 0], [0, 1]], [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
];
const BB_COLORS = [C.accent, C.emerald, C.gold, C.violet, C.rose];
function bbRandPiece() {
  const cells = BB_SHAPES[Math.floor(Math.random() * BB_SHAPES.length)];
  return { cells, color: BB_COLORS[Math.floor(Math.random() * BB_COLORS.length)] };
}
function bbCanPlace(grid, cells, or, oc) {
  return cells.every(([r, c]) => {
    const rr = or + r, cc = oc + c;
    return rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !grid[rr * 8 + cc];
  });
}
function bbCanPlaceAny(grid, tray) {
  for (const p of tray) {
    if (!p) continue;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (bbCanPlace(grid, p.cells, r, c)) return true;
  }
  return false;
}
function BlockBlastGame({ onWin, onStepChange, resetKey, game, onBack, menuConfig }) {
  const [grid, setGrid] = useState(() => new Array(64).fill(null));
  const [tray, setTray] = useState(() => [bbRandPiece(), bbRandPiece(), bbRandPiece()]);
  const [score, setScore] = useState(0);
  const [drag, setDrag] = useState(null); // { idx, cells, color, x, y }
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const placedRef = useRef(0);
  const linesRef = useRef(0);
  const gridRef = useRef(null);
  const secs = useElapsed(resetKey, !done);
  const secsRef = useRef(0); secsRef.current = secs;
  const scoreRef = useRef(0); scoreRef.current = score;

  const init = () => {
    setGrid(new Array(64).fill(null));
    setTray([bbRandPiece(), bbRandPiece(), bbRandPiece()]);
    setScore(0); setDone(false); setDrag(null);
    doneRef.current = false; placedRef.current = 0; linesRef.current = 0;
  };
  useEffect(() => { init(); }, [resetKey]);

  const originFromPointer = (x, y, cells) => {
    const el = gridRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = rect.width / 8;
    const maxR = Math.max(...cells.map(c => c[0]));
    const maxC = Math.max(...cells.map(c => c[1]));
    let oc = Math.round((x - rect.left) / cs - (maxC + 1) / 2);
    let or = Math.round((y - rect.top) / cs - (maxR + 1) / 2);
    oc = Math.max(0, Math.min(7 - maxC, oc));
    or = Math.max(0, Math.min(7 - maxR, or));
    return { or, oc };
  };
  const commitDrop = (endX, endY) => {
    setDrag(d => {
      if (!d) return null;
      const o = originFromPointer(endX, endY, d.cells);
      if (o && bbCanPlace(grid, d.cells, o.or, o.oc)) {
        place(d, o.or, o.oc);
      }
      return null;
    });
  };
  const place = (piece, or, oc) => {
    const g = grid.slice();
    piece.cells.forEach(([r, c]) => { g[(or + r) * 8 + (oc + c)] = piece.color; });
    // find full rows/cols
    const fullRows = [], fullCols = [];
    for (let r = 0; r < 8; r++) if ([0,1,2,3,4,5,6,7].every(c => g[r * 8 + c])) fullRows.push(r);
    for (let c = 0; c < 8; c++) if ([0,1,2,3,4,5,6,7].every(r => g[r * 8 + c])) fullCols.push(c);
    const lines = fullRows.length + fullCols.length;
    fullRows.forEach(r => { for (let c = 0; c < 8; c++) g[r * 8 + c] = null; });
    fullCols.forEach(c => { for (let r = 0; r < 8; r++) g[r * 8 + c] = null; });
    const gain = piece.cells.length + (lines > 0 ? lines * 10 + (lines - 1) * 10 : 0);
    placedRef.current++; linesRef.current += lines;
    cgSound(lines > 0 ? 'clear' : 'move'); cgHaptic(lines > 0 ? 25 : 10);
    setScore(s => s + gain);
    onStepChange && onStepChange(placedRef.current);
    // consume tray slot
    let nt = tray.slice();
    if (piece.idx != null) nt[piece.idx] = null;
    if (nt.every(p => !p)) nt = [bbRandPiece(), bbRandPiece(), bbRandPiece()];
    setGrid(g);
    setTray(nt);
    // game-over check next frame
    setTimeout(() => {
      if (doneRef.current) return;
      if (!bbCanPlaceAny(g, nt)) {
        doneRef.current = true; setDone(true);
        cgSound('lose'); cgHaptic([20, 40]);
        const sc = scoreRef.current;
        cgSaveHistory(BB_KEY, { score: sc, lines: linesRef.current, ts: Date.now() });
        onWin(sc, placedRef.current, secsRef.current, { winnerLabel: 'Game Over', share: `🧱 Block Blast — ${sc} pts` });
      }
    }, 0);
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => { if (e.cancelable) e.preventDefault(); const { x, y } = pointerXY(e); setDrag(d => d && { ...d, x, y }); };
    const up = (e) => { const { x, y } = pointerXY(e); commitDrop(x, y); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag, grid, tray]);

  const startDrag = (e, idx) => {
    if (done || !tray[idx]) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = pointerXY(e);
    cgSound('click');
    setDrag({ idx, cells: tray[idx].cells, color: tray[idx].color, x, y });
  };
  // preview cells
  let preview = null;
  if (drag) {
    const o = originFromPointer(drag.x, drag.y, drag.cells);
    if (o) {
      const ok = bbCanPlace(grid, drag.cells, o.or, o.oc);
      preview = {};
      drag.cells.forEach(([r, c]) => { preview[(o.or + r) * 8 + (o.oc + c)] = ok ? 'preview' : 'invalid'; });
    }
  }
  const hist = cgLoadHistory(BB_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">{r.lines} lines</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Games' },
      { val: linesRef.current, lbl: 'Lines (run)' }, { val: score, lbl: 'This run' },
    ]),
    cgRulesSection(['Drag a block from the tray onto the grid.', 'Fill a full row or column to clear it and score.', 'Clear several lines at once for bonus points.', 'Game ends when none of the three pieces fit.']),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: score }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="bb-grid" ref={gridRef}>
          {grid.map((cell, i) => {
            const pv = preview && preview[i];
            return <div key={i} className={'bb-cell' + (cell ? ' filled' : '') + (pv ? ' ' + pv : '')}
              style={cell ? { background: cell } : undefined} />;
          })}
        </div>
        <div className="bb-tray">
          {tray.map((p, idx) => (
            <div key={idx} className={'bb-piece' + (!p ? ' used' : '') + (drag && drag.idx === idx ? ' dragging' : '')}
              style={p ? { gridTemplateColumns: `repeat(${Math.max(...p.cells.map(c => c[1])) + 1}, auto)` } : undefined}
              onMouseDown={(e) => startDrag(e, idx)} onTouchStart={(e) => startDrag(e, idx)}>
              {p && (() => {
                const maxR = Math.max(...p.cells.map(c => c[0]));
                const maxC = Math.max(...p.cells.map(c => c[1]));
                const set = new Set(p.cells.map(([r, c]) => r * 10 + c));
                const out = [];
                for (let r = 0; r <= maxR; r++) for (let c = 0; c <= maxC; c++) {
                  const on = set.has(r * 10 + c);
                  out.push(<div key={r + '-' + c} className={'bb-pcell' + (on ? ' on' : '')} style={on ? { background: p.color } : { background: 'transparent' }} />);
                }
                return out;
              })()}
            </div>
          ))}
        </div>
      </div>
      {drag && (
        <div className="bb-drag-ghost" style={{
          left: drag.x, top: drag.y - 40,
          transform: 'translate(-50%, -50%)',
          gridTemplateColumns: `repeat(${Math.max(...drag.cells.map(c => c[1])) + 1}, 1.1rem)`,
        }}>
          {(() => {
            const maxR = Math.max(...drag.cells.map(c => c[0]));
            const maxC = Math.max(...drag.cells.map(c => c[1]));
            const set = new Set(drag.cells.map(([r, c]) => r * 10 + c));
            const out = [];
            for (let r = 0; r <= maxR; r++) for (let c = 0; c <= maxC; c++) {
              const on = set.has(r * 10 + c);
              out.push(<div key={r + '-' + c} className={'bb-pcell' + (on ? ' on' : '')} style={on ? { background: drag.color, width: '1.1rem', height: '1.1rem' } : { width: '1.1rem', height: '1.1rem', background: 'transparent' }} />);
            }
            return out;
          })()}
        </div>
      )}
    </ClassicShell>
  );
}

/* ---------------- Diamond Rush ---------------- */
const DR_GEMS = ['💎', '🔴', '🟡', '🟢', '🟣', '🔵', '💣', '⚡', '🌈'];
const DR_POWER_UP_ICONS = { hint: '💡', shuffle: '🔀', extraTime: '⏱️' };
const DR_POWER_UP_TYPES = { 6: 'hint', 7: 'shuffle', 8: 'extraTime' };
const DR_POWER_UP_REWARDS = {
  win: [
    { cascades: 3, reward: 'shuffle' },
    { moves: 15, reward: 'hint' },
    { always: true, reward: 'extraTime' },
  ],
};
function comboMultiplier(combo) {
  if (combo <= 1) return 1.0;
  if (combo <= 3) return 1.2;
  if (combo <= 5) return 1.5;
  return 2.0;
}
function drMake(powerUpSeed = false) {
  const g = new Array(64);
  for (let i = 0; i < 64; i++) {
    let v;
    do {
      if (powerUpSeed && Math.random() < 0.08) {
        v = 6 + Math.floor(Math.random() * 3);
      } else {
        v = Math.floor(Math.random() * 6);
      }
    }
    while (
      (i % 8 >= 2 && g[i - 1] === v && g[i - 2] === v) ||
      (i >= 16 && g[i - 8] === v && g[i - 16] === v)
    );
    g[i] = v;
  }
  return g;
}
function drFindMatches(g, onPowerUpEarned) {
  const m = new Set();
  let sourceColor = null;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
    const i = r * 8 + c, v = g[i];
    if (v != null && v < 6 && g[i + 1] === v && g[i + 2] === v) {
      m.add(i); m.add(i + 1); m.add(i + 2);
      if (sourceColor === null) sourceColor = v;
    }
  }
  for (let c = 0; c < 8; c++) for (let r = 0; r < 6; r++) {
    const i = r * 8 + c, v = g[i];
    if (v != null && v < 6 && g[i + 8] === v && g[i + 16] === v) {
      m.add(i); m.add(i + 8); m.add(i + 16);
      if (sourceColor === null) sourceColor = v;
    }
  }
  if (onPowerUpEarned) {
    m.forEach(i => {
      const gemType = g[i];
      if (gemType >= 6 && gemType <= 8) {
        const powerUpType = DR_POWER_UP_TYPES[gemType];
        onPowerUpEarned(powerUpType);
      }
    });
  }
  return { matches: m, sourceColor };
}
function drCreateSpecialGem(g, matchSet, sourceColor, rainbowMeta) {
  const count = matchSet.size;
  if (count < 3) return null;
  let gemType = null;
  if (count >= 7) gemType = 8; // Rainbow
  else if (count >= 5) gemType = 7; // Lightning
  else if (count >= 3) gemType = 6; // Bomb
  if (gemType === null) return null;
  const positions = Array.from(matchSet).map(i => ({ r: Math.floor(i / 8), c: i % 8 }));
  const centerR = Math.round(positions.reduce((s, p) => s + p.r, 0) / positions.length);
  const centerC = Math.round(positions.reduce((s, p) => s + p.c, 0) / positions.length);
  const centerIndex = centerR * 8 + centerC;
  g[centerIndex] = gemType;
  if (gemType === 8) rainbowMeta.set(centerIndex, sourceColor);
  return centerIndex;
}
function drResolveSpecialEffects(g, specialIndex, rainbowMeta, toClear, processed = new Set()) {
  if (processed.has(specialIndex)) return toClear;
  processed.add(specialIndex);
  const gemType = g[specialIndex];
  const r = Math.floor(specialIndex / 8), c = specialIndex % 8;
  if (gemType === 6) { // Bomb 3×3
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          toClear.add(nr * 8 + nc);
        }
      }
    }
  } else if (gemType === 7) { // Lightning row+col
    for (let col = 0; col < 8; col++) toClear.add(r * 8 + col);
    for (let row = 0; row < 8; row++) toClear.add(row * 8 + c);
  } else if (gemType === 8) { // Rainbow color match
    const sourceColor = rainbowMeta.get(specialIndex);
    for (let i = 0; i < 64; i++) {
      if (g[i] === sourceColor) toClear.add(i);
    }
  }
  const newSpecials = new Set();
  for (let i of toClear) {
    if ((g[i] === 6 || g[i] === 7 || g[i] === 8) && !processed.has(i)) {
      newSpecials.add(i);
    }
  }
  for (let special of newSpecials) {
    toClear = drResolveSpecialEffects(g, special, rainbowMeta, toClear, processed);
  }
  return toClear;
}
function drResolve(grid) {
  let g = grid.slice();
  let rainbowMeta = new Map();
  let total = 0, cascades = 0, maxClear = 0;
  while (true) {
    const matchResult = drFindMatches(g);
    const m = matchResult.matches;
    const sourceColor = matchResult.sourceColor;
    if (!m.size) break;
    const specialGemIndex = drCreateSpecialGem(g, m, sourceColor, rainbowMeta);
    let toClear = new Set(m);
    if (specialGemIndex !== null) {
      toClear = drResolveSpecialEffects(g, specialGemIndex, rainbowMeta, toClear, new Set());
    }
    cascades++;
    maxClear = Math.max(maxClear, toClear.size);
    total += toClear.size * 10 * cascades;
    toClear.forEach(i => {
      g[i] = null;
      rainbowMeta.delete(i);
    });
    for (let c = 0; c < 8; c++) {
      const col = [];
      for (let r = 7; r >= 0; r--) { const v = g[r * 8 + c]; if (v != null) col.push(v); }
      for (let r = 7; r >= 0; r--) {
        const idx = (7 - r);
        g[r * 8 + c] = idx < col.length ? col[idx] : Math.floor(Math.random() * 6);
      }
    }
  }
  return { grid: g, total, cascades, maxClear };
}

function findHighestScoringSwap(grid) {
  let best = { a: -1, b: -1, score: 0 };
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8), c = i % 8;
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
      const j = nr * 8 + nc;
      if (j <= i) continue;
      const g = grid.slice();
      [g[i], g[j]] = [g[j], g[i]];
      const m = drFindMatches(g);
      const score = m.matches.size * 10;
      if (score > best.score) best = { a: i, b: j, score };
    }
  }
  return best;
}
function DiamondRushGame({ onWin, onLose, onStepChange, resetKey, game, onBack, menuConfig, savedProgress, onSaveProgress }) {
  const TARGET = 800, START_MOVES = 18;
  const [grid, setGrid] = useState(() => drMake());
  const [sel, setSel] = useState(-1);
  const [moves, setMoves] = useState(START_MOVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);
  const [powerUps, setPowerUps] = useState(() => (savedProgress?.powerUps || { hint: 0, shuffle: 0, extraTime: 0 }));
  const [hintIndices, setHintIndices] = useState([]);
  const [timeBoost, setTimeBoost] = useState(false);
  const doneRef = useRef(false);
  const bestCascadeRef = useRef(0);
  const bestComboRef = useRef(0);
  const touch = useRef(null);
  const timeAddedRef = useRef(0);
  const secs = useElapsed(resetKey, !done) + timeAddedRef.current;
  const secsRef = useRef(0); secsRef.current = secs;

  const init = () => {
    setGrid(drMake()); setSel(-1); setMoves(START_MOVES); setScore(0); setCombo(0);
    setDone(false); doneRef.current = false; bestCascadeRef.current = 0; bestComboRef.current = 0;
    setHintIndices([]);
    timeAddedRef.current = 0;
  };
  useEffect(() => { init(); }, [resetKey]);

  const grantPowerUp = (type) => {
    setPowerUps(prev => ({ ...prev, [type]: prev[type] + 1 }));
  };

  const onPowerUpEarned = (type) => {
    grantPowerUp(type);
  };

  const finish = (sc, win, mv) => {
    doneRef.current = true; setDone(true);
    cgSound(win ? 'win' : 'lose'); cgHaptic(win ? [15, 30, 15] : [20, 40]);
    cgSaveHistory(DR_KEY, { score: sc, win, cascade: bestCascadeRef.current, bestCombo: bestComboRef.current, ts: Date.now() });
    setCombo(0);
    if (win) {
      if (bestCascadeRef.current >= 3) grantPowerUp('shuffle');
      if (mv >= 15) grantPowerUp('hint');
      grantPowerUp('extraTime');
      onWin(sc, START_MOVES - mv, secsRef.current, { share: `💎 Diamond Rush — ${sc} pts!` });
    } else {
      grantPowerUp('extraTime');
      onLose(START_MOVES - mv, secsRef.current, { share: `💎 Diamond Rush — ${sc}/${TARGET}` });
    }
  };
  const adjacent = (a, b) => {
    const ar = Math.floor(a / 8), ac = a % 8, br = Math.floor(b / 8), bc = b % 8;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  };
  const trySwap = (a, b) => {
    if (done || a === b || !adjacent(a, b)) { setSel(-1); return; }
    const g = grid.slice();
    [g[a], g[b]] = [g[b], g[a]];
    if (!drFindMatches(g).matches.size) { cgSound('move'); setCombo(0); setSel(-1); return; }
    drFindMatches(g, onPowerUpEarned);
    const newCombo = combo + 1;
    const multiplier = comboMultiplier(newCombo);
    const res = drResolve(g);
    bestCascadeRef.current = Math.max(bestCascadeRef.current, res.cascades);
    cgSound('clear', 1 + res.cascades * 0.12); cgHaptic(20);
    const baseScore = res.total;
    const multipliedScore = Math.round(baseScore * multiplier);
    const ns = score + multipliedScore;
    const nm = moves - 1;
    setGrid(res.grid); setScore(ns); setCombo(newCombo); setMoves(nm); setSel(-1);
    if (newCombo > bestComboRef.current) bestComboRef.current = newCombo;
    onStepChange && onStepChange(START_MOVES - nm);
    if (ns >= TARGET) { setTimeout(() => finish(ns, true, nm), 150); }
    else if (nm <= 0) { setTimeout(() => finish(ns, false, nm), 150); }
  };
  const onGemDown = (e, i) => { const p = pointerXY(e); touch.current = { i, x: p.x, y: p.y }; };
  const onGemUp = (e, i) => {
    const start = touch.current; touch.current = null;
    if (!start) { return; }
    const p = pointerXY(e);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      // swipe from start.i toward neighbor
      const r = Math.floor(start.i / 8), c = start.i % 8;
      let nr = r, nc = c;
      if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1; else nr += dy > 0 ? 1 : -1;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) trySwap(start.i, nr * 8 + nc);
      else setSel(-1);
      return;
    }
    // tap
    if (sel === -1) { setSel(start.i); cgSound('click'); }
    else if (sel === start.i) { setSel(-1); }
    else trySwap(sel, start.i);
  };
  const usePowerUp = (type) => {
    if (done || powerUps[type] <= 0) return;
    if (type === 'hint') {
      const best = findHighestScoringSwap(grid);
      if (best.a !== -1) {
        setHintIndices([best.a, best.b]);
        setTimeout(() => setHintIndices([]), 2000);
      }
    } else if (type === 'shuffle') {
      const g = grid.slice();
      const nonNull = [];
      for (let i = 0; i < 64; i++) if (g[i] != null && g[i] < 6) nonNull.push(i);
      for (let i = nonNull.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [g[nonNull[i]], g[nonNull[j]]] = [g[nonNull[j]], g[nonNull[i]]];
      }
      setGrid(g);
      cgSound('click'); cgHaptic(30);
    } else if (type === 'extraTime') {
      timeAddedRef.current += 30;
      setTimeBoost(true);
      setTimeout(() => setTimeBoost(false), 1000);
      cgSound('click'); cgHaptic(15);
    }
    setPowerUps(prev => ({ ...prev, [type]: prev[type] - 1 }));
  };

  const hist = cgLoadHistory(DR_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const wins = hist.filter(r => r.win).length;
  const bigC = hist.reduce((m, r) => Math.max(m, r.cascade || 0), 0);
  const bestCombo = hist.reduce((m, r) => Math.max(m, r.bestCombo || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.win ? '✅' : '❌'} {r.score} pts</span><span className="mono">x{r.cascade}</span><span className="mono">c{r.bestCombo || 0}</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: wins, lbl: 'Rounds won' },
      { val: bigC, lbl: 'Best cascade' }, { val: bestCombo, lbl: 'Best combo' },
    ]),
    cgRulesSection([`Reach ${TARGET} points within ${START_MOVES} moves.`, 'Tap a gem then an adjacent gem — or swipe — to swap.', 'Line up 3+ to clear them. Special gems: 3-match→Bomb (3×3), 5+→Lightning (row+col), 7+→Rainbow (color).', 'Falling gems can chain into cascades for big bonuses.', 'Each consecutive clear builds your combo, multiplying your score — reset on any failed swap.', 'Use power-ups (Hint, Shuffle, Extra Time) to gain an edge.']),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: `${score}/${TARGET}` }, { l: 'Moves', v: moves }, { l: 'Combo', v: combo > 0 ? `${combo} / ×${comboMultiplier(combo).toFixed(1)}` : '—' }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="dr-powerups-bar">
          {['hint', 'shuffle', 'extraTime'].map(type => (
            <button
              key={type}
              className={`dr-powerup-btn ${powerUps[type] > 0 ? 'owned' : 'empty'}`}
              onClick={() => usePowerUp(type)}
              disabled={powerUps[type] === 0 || done}
              title={`${type.charAt(0).toUpperCase() + type.slice(1)} (${powerUps[type]} owned)`}
            >
              <span className="icon">{DR_POWER_UP_ICONS[type]}</span>
              <span className="count">{powerUps[type]}</span>
            </button>
          ))}
        </div>
        <div className="dr-grid">
          {grid.map((v, i) => {
            const isSpecial = v >= 6 ? ['bomb', 'lightning', 'rainbow'][v - 6] : null;
            return (
              <div key={i} className={'dr-gem' + (sel === i ? ' sel' : '') + (isSpecial ? ' ' + isSpecial : '') + (hintIndices.includes(i) ? ' hint-target' : '')}
                data-special={isSpecial}
                onMouseDown={(e) => onGemDown(e, i)} onMouseUp={(e) => onGemUp(e, i)}
                onTouchStart={(e) => onGemDown(e, i)} onTouchEnd={(e) => onGemUp(e, i)}>
                {DR_GEMS[v]}
              </div>
            );
          })}
        </div>
        {timeBoost && <div className="dr-time-boost">+30 sec</div>}
      </div>
    </ClassicShell>
  );
}

/* ---------------- Texas Hold 'Em ---------------- */
const TH_SUITS = ['♠', '♥', '♦', '♣'];
const TH_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function thDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ r: r + 2, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function thScore5(cards) {
  const ranks = cards.map(c => c.r).sort((a, b) => b - a);
  const suits = cards.map(c => c.s);
  const flush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // wheel
  }
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map(g => g[1]);
  let cat;
  if (straightHigh && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const order = (cat === 4 || cat === 8) ? [straightHigh, 0, 0, 0, 0] : kick;
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 15 + (order[i] || 0);
  return v;
}
function thBest(cards) {
  if (cards.length < 5) return 0;
  let best = 0;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++)
    for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
      const v = thScore5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
      if (v > best) best = v;
    }
  return best;
}
const TH_CATS = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
function thCatName(v) { let cat = v; for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15); return TH_CATS[cat] || ''; }
function thHandStrength(hole, board) {
  if (board.length >= 3) {
    const v = thBest([...hole, ...board]);
    let cat = v; for (let i = 0; i < 5; i++) cat = Math.floor(cat / 15);
    return Math.min(1, cat / 6 + (hole[0].r + hole[1].r) / 200);
  }
  // preflop heuristic
  const [a, b] = hole;
  let s = (a.r + b.r) / 40;
  if (a.r === b.r) s += 0.35;
  if (a.s === b.s) s += 0.08;
  if (Math.abs(a.r - b.r) === 1) s += 0.05;
  return Math.min(0.95, s);
}
function TexasHoldemGame({ onWin, onLose, onStepChange, resetKey, game, onBack, menuConfig, gameMode, onModeChange }) {
  const START = 200, BB = 10;
  const [state, setState] = useState(null);
  const [betOpen, setBetOpen] = useState(false);
  const [betAmt, setBetAmt] = useState(BB);
  const doneRef = useRef(false);
  const handsRef = useRef(0);
  const bigPotRef = useRef(0);
  const secsRef = useRef(0);
  const [done, setDone] = useState(false);
  const secs = useElapsed(resetKey, !done);
  secsRef.current = secs;

  // Texas is always a Versus-Bot game — report it so the menu shows Save.
  useEffect(() => { onModeChange && onModeChange('bot'); }, []);

  // Game Menu Save/Resume.
  const { loadState, clearState } = useClassicSave('texas');
  const [resumeOffer, setResumeOffer] = useState(null);
  const resumeCheckedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  useClassicSaveSource(!done && !!state, () => ({
    th: stateRef.current, hands: handsRef.current, bigPot: bigPotRef.current,
  }));
  useEffect(() => {
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    loadState().then(s => { if (s && s.th) setResumeOffer(s); });
  }, []);
  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    handsRef.current = s.hands || 0; bigPotRef.current = s.bigPot || 0;
    setState(s.th); setDone(false); doneRef.current = false;
    setResumeOffer(null);
  };
  const dismissResume = () => { setResumeOffer(null); clearState(); };

  const newHand = (pc, ac, dealerIsPlayer) => {
    const deck = thDeck();
    const player = [deck.pop(), deck.pop()];
    const ai = [deck.pop(), deck.pop()];
    // simple blinds: dealer posts SB(BB/2), other posts BB
    const sb = BB / 2;
    let playerBet = dealerIsPlayer ? sb : BB;
    let aiBet = dealerIsPlayer ? BB : sb;
    playerBet = Math.min(playerBet, pc); aiBet = Math.min(aiBet, ac);
    return {
      deck, player, ai, board: [],
      pot: 0, pc: pc - playerBet, ac: ac - aiBet,
      playerBet, aiBet, street: 0,
      toAct: dealerIsPlayer ? 'player' : 'ai', // dealer/SB acts first preflop
      dealerIsPlayer, msg: 'Your move', reveal: false, phase: 'betting',
    };
  };
  const init = () => {
    handsRef.current = 0; doneRef.current = false; setDone(false);
    setState(newHand(START, START, true));
    setBetOpen(false); setBetAmt(BB);
  };
  useEffect(() => { init(); }, [resetKey]);

  // AI acts when it's their turn
  useEffect(() => {
    if (!state || state.phase !== 'betting' || state.toAct !== 'ai' || done) return;
    const t = setTimeout(() => aiAct(), 700);
    return () => clearTimeout(t);
  }, [state, done]);

  const dealNext = (s) => {
    const d = s.deck.slice();
    const board = s.board.slice();
    if (s.street === 0) { board.push(d.pop(), d.pop(), d.pop()); }
    else { board.push(d.pop()); }
    return { ...s, deck: d, board, street: s.street + 1 };
  };
  const showdown = (s) => {
    const pv = thBest([...s.player, ...s.board]);
    const av = thBest([...s.ai, ...s.board]);
    let pc = s.pc, ac = s.ac, msg;
    if (pv > av) { pc += s.pot; msg = `You win ${s.pot} with ${thCatName(pv)}`; cgSound('win'); }
    else if (av > pv) { ac += s.pot; msg = `Opponent wins with ${thCatName(av)}`; cgSound('lose'); }
    else { pc += Math.floor(s.pot / 2); ac += Math.ceil(s.pot / 2); msg = `Split pot (${thCatName(pv)})`; }
    bigPotRef.current = Math.max(bigPotRef.current, s.pot);
    return { ...s, pc, ac, msg, reveal: true, phase: 'handover' };
  };
  const advanceStreet = (s) => {
    const pot = s.pot + s.playerBet + s.aiBet;
    let ns = { ...s, pot, playerBet: 0, aiBet: 0, _pAct: false, _aAct: false };
    if (s.street >= 4) return showdown(ns);
    ns = dealNext(ns);
    ns.toAct = ns.dealerIsPlayer ? 'ai' : 'player'; // non-dealer acts first post-flop
    ns.msg = ns.toAct === 'player' ? 'Your move' : 'Opponent thinking…';
    return ns;
  };
  const endFold = (s, who) => {
    const pot = s.pot + s.playerBet + s.aiBet;
    let pc = s.pc, ac = s.ac, msg;
    if (who === 'ai') { pc += pot; msg = `Opponent folds — you win ${pot}`; cgSound('chip'); }
    else { ac += pot; msg = `You fold — opponent wins ${pot}`; }
    bigPotRef.current = Math.max(bigPotRef.current, pot);
    return { ...s, pc, ac, pot, playerBet: 0, aiBet: 0, msg, reveal: who !== 'player', phase: 'handover' };
  };
  // Unified heads-up round resolution: a betting round closes when bets are
  // equal AND the other player has already acted since the last aggression.
  const resolve = (s, actorIsPlayer) => {
    const equal = s.playerBet === s.aiBet;
    const otherActed = actorIsPlayer ? s._aAct : s._pAct;
    if (equal && otherActed) return advanceStreet(s);
    s.toAct = actorIsPlayer ? 'ai' : 'player';
    s.msg = s.toAct === 'player' ? 'Your move' : 'Opponent thinking…';
    return s;
  };
  const playerAction = (action, amount) => {
    if (!state || state.toAct !== 'player' || state.phase !== 'betting') return;
    let s = { ...state };
    const toCall = s.aiBet - s.playerBet;
    if (action === 'fold') { const ns = endFold(s, 'player'); setState(ns); setTimeout(() => checkMatch(ns), 0); return; }
    if (action === 'check') {
      if (toCall > 0) return;
      s._pAct = true; cgSound('chip');
      setState(resolve(s, true)); return;
    }
    if (action === 'call') {
      const pay = Math.min(toCall, s.pc);
      s.pc -= pay; s.playerBet += pay; s._pAct = true; cgSound('chip');
      setState(resolve(s, true)); return;
    }
    if (action === 'bet') {
      const minAdd = Math.min(toCall > 0 ? toCall + BB : BB, s.pc);
      let add = Math.min(Math.max(amount || BB, minAdd), s.pc);
      s.pc -= add; s.playerBet += add; s._pAct = true; s._aAct = false;
      cgSound('chip'); cgHaptic(12); setBetOpen(false);
      setState(resolve(s, true)); return;
    }
  };
  const aiAct = () => {
    setState(prev => {
      if (!prev || prev.toAct !== 'ai' || prev.phase !== 'betting') return prev;
      let s = { ...prev };
      const toCall = s.playerBet - s.aiBet;
      const strength = thHandStrength(s.ai, s.board);
      const r = Math.random();
      if (toCall > 0) {
        const potOdds = toCall / (s.pot + s.playerBet + s.aiBet + toCall);
        if (strength < 0.25 && potOdds > 0.18 && r > 0.2) { const ns = endFold(s, 'ai'); setTimeout(() => checkMatch(ns), 0); return ns; }
        if (strength > 0.7 && s.ac > toCall + BB && r > 0.55) {
          const add = Math.min(toCall + BB * 2, s.ac);
          s.ac -= add; s.aiBet += add; s._aAct = true; s._pAct = false; cgSound('chip');
          return resolve(s, false);
        }
        const pay = Math.min(toCall, s.ac);
        s.ac -= pay; s.aiBet += pay; s._aAct = true; cgSound('chip');
        return resolve(s, false);
      }
      if (strength > 0.6 && r > 0.5 && s.ac > BB) {
        const add = Math.min(BB * 2, s.ac);
        s.ac -= add; s.aiBet += add; s._aAct = true; s._pAct = false; cgSound('chip');
        return resolve(s, false);
      }
      s._aAct = true; cgSound('chip');
      return resolve(s, false);
    });
  };
  const checkMatch = (s) => {
    if (doneRef.current) return;
    handsRef.current++;
    onStepChange && onStepChange(handsRef.current);
    if (s.pc <= 0 || s.ac <= 0) {
      doneRef.current = true; setDone(true);
      clearState(); // match over — no save to resume
      const youWin = s.pc > 0;
      cgSound(youWin ? 'win' : 'lose'); cgHaptic(youWin ? [15, 30, 15] : [20, 40]);
      cgSaveHistory(TH_KEY, { win: youWin, hands: handsRef.current, ts: Date.now() });
      if (youWin) onWin(s.pc, handsRef.current, secsRef.current, { winnerLabel: 'You win!', share: `🃏 Won heads-up poker in ${handsRef.current} hands` });
      else onLose(handsRef.current, secsRef.current, { share: `🃏 Busted after ${handsRef.current} hands`, answer: 'Opponent wins' });
    }
  };
  const nextHand = () => {
    if (!state || doneRef.current) return;
    checkMatch(state);
    if (doneRef.current) return;
    setState(newHand(state.pc, state.ac, !state.dealerIsPlayer));
    setBetAmt(BB);
  };

  const Card = ({ c, hidden }) => {
    if (hidden) return <div className="th-card back">?</div>;
    const red = c.s === 1 || c.s === 2;
    return <div className={'th-card' + (red ? ' red' : '')}><span>{TH_RANKS[c.r - 2]}</span><span>{TH_SUITS[c.s]}</span></div>;
  };

  const hist = cgLoadHistory(TH_KEY);
  const wins = hist.filter(r => r.win).length;
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.win ? '🏆 Won match' : '💀 Lost match'}</span><span className="mono">{r.hands} hands</span></>),
    cgStatsSection([
      { val: wins, lbl: 'Matches won' }, { val: hist.length, lbl: 'Matches' },
      { val: bigPotRef.current, lbl: 'Biggest pot' }, { val: handsRef.current, lbl: 'Hands (match)' },
    ]),
    cgRulesSection(['Heads-up Texas Hold \'Em vs the computer.', 'Tap Check / Call / Fold to act.', 'Tap Bet/Raise to size a wager.', 'Win all the opponent\'s chips to take the match.']),
  ];

  if (!state) return <ClassicShell game={game} onExit={onBack} sheetSections={sheet} menuConfig={menuConfig}><div className="cg-stage" /></ClassicShell>;
  const s = state;
  const toCall = Math.max(0, s.aiBet - s.playerBet);
  const canAct = s.phase === 'betting' && s.toAct === 'player' && !done;
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        {resumeOffer && <ClassicResumeBanner onResume={applyResume} onDismiss={dismissResume} />}
        <div className="th-felt">
          <div className="th-seat">
            <div className="who">Opponent</div>
            <div className="chips">{s.ac} chips{s.aiBet ? ` · bet ${s.aiBet}` : ''}</div>
          </div>
          <div className="th-cards">
            <Card c={s.ai[0]} hidden={!s.reveal} /><Card c={s.ai[1]} hidden={!s.reveal} />
          </div>
          <div className="th-pot">Pot {s.pot + s.playerBet + s.aiBet}</div>
          <div className="th-community">
            {s.board.length === 0 ? <span className="th-msg">— flop comes after betting —</span> : s.board.map((c, i) => <Card key={i} c={c} />)}
          </div>
          <div className="th-msg">{s.msg}</div>
          <div className="th-cards">
            <Card c={s.player[0]} /><Card c={s.player[1]} />
          </div>
          <div className="th-seat">
            <div className="who">You{s.dealerIsPlayer ? ' (D)' : ''}</div>
            <div className="chips">{s.pc} chips{s.playerBet ? ` · bet ${s.playerBet}` : ''}</div>
          </div>
        </div>
        {s.phase === 'handover' ? (
          <div className="th-actions"><button className="bet" onClick={nextHand}>Next hand →</button></div>
        ) : betOpen ? (
          <>
            <div className="th-betsizer">
              <input type="range" min={BB} max={Math.max(BB, s.pc)} step={BB} value={betAmt} onChange={e => setBetAmt(+e.target.value)} />
              <span className="amt">{betAmt}</span>
            </div>
            <div className="th-actions">
              <button onClick={() => setBetOpen(false)}>Cancel</button>
              <button className="bet" disabled={!canAct} onClick={() => playerAction('bet', betAmt)}>{toCall > 0 ? 'Raise' : 'Bet'} {betAmt}</button>
            </div>
          </>
        ) : (
          <div className="th-actions">
            <button disabled={!canAct} onClick={() => playerAction('fold')}>Fold</button>
            {toCall > 0
              ? <button disabled={!canAct} onClick={() => playerAction('call')}>Call {toCall}</button>
              : <button disabled={!canAct} onClick={() => playerAction('check')}>Check</button>}
            <button className="bet" disabled={!canAct || s.pc <= 0} onClick={() => { setBetAmt(Math.min(Math.max(BB, toCall + BB), s.pc)); setBetOpen(true); cgSound('click'); }}>{toCall > 0 ? 'Raise' : 'Bet'}</button>
          </div>
        )}
      </div>
    </ClassicShell>
  );
}


/* ============================================================
   Game 7 — Tile Match (3-Tiles style)
   ============================================================ */

// Seeded PRNG (mulberry32) — deterministic layouts per level number.
// mulberry32 is defined once in the shared SDK section above; the Tile Match
// generator (tmGenerateLevel) uses that single definition. The duplicate copy
// that previously lived here produced an identical PRNG sequence and has been
// removed.

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

/* ============================================================
   Tile Match Puzzle — competitive sub-components
   ============================================================ */

function TileMatchWalletChip({ balance }) {
  return (
    <div className="tm-wallet-chip">
      🪙 {balance != null ? balance : '—'} MATCH
    </div>
  );
}

function TileMatchLeaderboard({ user }) {
  const [sub, setSub] = useState('global');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tilematch/leaderboard', { headers: { 'x-usernode-token': window._unToken || '' } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading) return <div className="tm-lb-empty">Loading…</div>;
  if (!data) return <div className="tm-lb-empty">Failed to load leaderboard.</div>;

  const rows = sub === 'global' ? data.global : data.daily;
  const me = sub === 'global' ? data.me?.global : data.me?.daily;

  return (
    <div>
      <div className="tm-lb-tabs">
        <button className={'tm-lb-sub-tab' + (sub === 'global' ? ' active' : '')} onClick={() => setSub('global')}>Global</button>
        <button className={'tm-lb-sub-tab' + (sub === 'daily' ? ' active' : '')} onClick={() => setSub('daily')}>Daily</button>
      </div>
      {sub === 'daily' && !me && (
        <div className="tm-lb-empty">Complete today's Daily Tile Match to appear here.</div>
      )}
      {rows.length === 0 && sub === 'global' && (
        <div className="tm-lb-empty">No scores yet — be the first!</div>
      )}
      {rows.map(r => (
        <div key={r.rank} className="tm-lb-row">
          <span className="tm-lb-rank">#{r.rank}</span>
          <span className="tm-lb-name">{r.username || '—'}</span>
          <span className="tm-lb-stat">
            {sub === 'global' ? `L${r.highestLevel}` : fmtTime(r.timeSecs)}
          </span>
        </div>
      ))}
      {me && !rows.find(r => r.rank === me.rank) && (
        <div className="tm-lb-row me">
          <span className="tm-lb-rank">#{me.rank}</span>
          <span className="tm-lb-name">{me.username || 'You'} (you)</span>
          <span className="tm-lb-stat">
            {sub === 'global' ? `L${me.highestLevel}` : fmtTime(me.timeSecs)}
          </span>
        </div>
      )}
      {!me && sub === 'global' && user && (
        <div className="tm-lb-row me" style={{ color: 'var(--c-muted,#888)' }}>
          <span className="tm-lb-rank">—</span>
          <span className="tm-lb-name">{user.username} (you)</span>
          <span className="tm-lb-stat">not ranked yet</span>
        </div>
      )}
    </div>
  );
}

function TileMatchDuelArena({ user, balance, onBalanceChange }) {
  const [duelPhase, setDuelPhase] = useState('lobby'); // lobby|matchmaking|game|result
  const [duelId, setDuelId] = useState(null);
  const [duelData, setDuelData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [mmCountdown, setMmCountdown] = useState(120);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const mmRef = useRef(null);

  const authHeader = { 'Content-Type': 'application/json', 'x-usernode-token': window._unToken || '' };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (mmRef.current) { clearInterval(mmRef.current); mmRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const startMatchmaking = async (stakeTokens) => {
    setError(null);
    setJoining(true);
    try {
      const r = await fetch('/api/tilematch/duel/join', {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ stakeTokens }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to join'); setJoining(false); return; }
      if (d.status === 'active') {
        setDuelId(d.duelId); setDuelData(d.duel); setDuelPhase('game');
        if (onBalanceChange) onBalanceChange(b => b - stakeTokens);
      } else {
        setDuelId(d.duelId); setDuelPhase('matchmaking');
        setMmCountdown(120);
        if (onBalanceChange) onBalanceChange(b => b - stakeTokens);
        let c = 120;
        mmRef.current = setInterval(() => { c--; setMmCountdown(c); }, 1000);
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`/api/tilematch/duel/${d.duelId}`, { headers: { 'x-usernode-token': window._unToken || '' } });
            const pd = await pr.json();
            if (pd.duel && pd.duel.status === 'active') {
              stopPolling();
              setDuelData(pd.duel); setDuelPhase('game');
            } else if (pd.timedOut || (pd.duel && pd.duel.status === 'cancelled')) {
              stopPolling();
              setError('No opponent found — your tokens have been returned.');
              if (onBalanceChange) onBalanceChange(b => b + stakeTokens);
              setDuelPhase('lobby');
            }
          } catch {}
        }, 2000);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    }
    setJoining(false);
  };

  const handleForfeit = async () => {
    if (!duelId) return;
    await fetch(`/api/tilematch/duel/${duelId}/forfeit`, {
      method: 'POST', headers: authHeader, body: '{}',
    }).catch(() => {});
    stopPolling();
    setResultData({ isWinner: false, forfeited: true });
    setDuelPhase('result');
  };

  const handleDuelWin = async (score, steps, timeSecs) => {
    if (!duelId || !duelData) return;
    stopPolling();
    try {
      const r = await fetch(`/api/tilematch/duel/${duelId}/finish`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ score, steps, timeSecs, remainingTiles: 0, telemetry: [] }),
      });
      const d = await r.json();
      if (d.waiting) {
        // Poll for opponent
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`/api/tilematch/duel/${duelId}`, { headers: { 'x-usernode-token': window._unToken || '' } });
            const pd = await pr.json();
            if (pd.duel && pd.duel.status === 'finished') {
              stopPolling();
              const won = pd.duel.winner_id === user.id;
              const prize = pd.duel ? Math.floor(pd.duel.stakeTokens * 2 * 0.9) : 0;
              setResultData({ isWinner: won, prize: { winnerPayout: prize, stakeTokens: pd.duel?.stakeTokens } });
              if (won && onBalanceChange) onBalanceChange(b => b + prize);
              setDuelPhase('result');
            }
          } catch {}
        }, 2000);
      } else {
        if (d.isWinner && onBalanceChange && d.newBalance != null) onBalanceChange(() => d.newBalance);
        setResultData(d);
        setDuelPhase('result');
      }
    } catch {}
  };

  const handleDuelLose = async (steps, timeSecs) => {
    await handleDuelWin(0, steps, timeSecs);
  };

  const TIERS = [10, 50, 100];

  if (duelPhase === 'lobby') return (
    <div>
      {error && <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.84rem', color: '#ef4444' }}>{error}</div>}
      <p style={{ fontSize: '0.84rem', color: 'var(--c-muted,#888)', marginBottom: '0.75rem' }}>
        Stake MATCH tokens and race the same board as your opponent. Winner takes 90% of the pot.
      </p>
      <div className="tm-duel-tiers">
        {TIERS.map(stake => {
          const payout = Math.floor(stake * 2 * 0.9);
          const canAfford = (balance || 0) >= stake;
          return (
            <div key={stake} className="tm-duel-tier-card">
              <div className="tm-duel-stake">🪙 {stake}</div>
              <div className="tm-duel-payout">Stake {stake} MATCH → win <strong>{payout} MATCH</strong></div>
              <button className="tm-duel-find-btn" disabled={!canAfford || joining} onClick={() => startMatchmaking(stake)}>
                {joining ? '…' : 'Find Match'}
              </button>
            </div>
          );
        })}
      </div>
      {(balance || 0) < 10 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--c-muted,#888)', textAlign: 'center', marginTop: '0.5rem' }}>
          Complete daily tasks to earn MATCH tokens.
        </p>
      )}
    </div>
  );

  if (duelPhase === 'matchmaking') return (
    <div className="tm-duel-matchmaking">
      <div className="tm-duel-pulse" />
      <div style={{ fontSize: '0.9rem', color: 'var(--c-text,#e4e4e7)', fontWeight: 600 }}>Finding opponent…</div>
      <div className="tm-duel-timer">{String(Math.floor(mmCountdown / 60)).padStart(2,'0')}:{String(mmCountdown % 60).padStart(2,'0')}</div>
      <button className="tm-duel-back-btn" onClick={handleForfeit}>Cancel</button>
    </div>
  );

  if (duelPhase === 'game' && duelData) return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
        <button className="tm-duel-back-btn" onClick={handleForfeit}>Forfeit</button>
      </div>
      <TileMatchingDailyGame
        onWin={(score, steps, secs) => handleDuelWin(score, steps, secs)}
        onLose={(steps, secs) => handleDuelLose(steps, secs)}
        onStepChange={() => {}}
        resetKey={duelId}
        boardSeedOverride={duelData.boardSeed}
      />
    </div>
  );

  if (duelPhase === 'result') return (
    <div className="tm-duel-result">
      <div className="tm-duel-outcome">{resultData?.isWinner ? '🏆' : resultData?.forfeited ? '🏳' : '😤'}</div>
      <h3>{resultData?.isWinner ? 'You won!' : resultData?.forfeited ? 'You forfeited' : 'Better luck next time!'}</h3>
      {resultData?.prize && <div className="tm-duel-balance">Prize: 🪙 {resultData.prize.winnerPayout} MATCH</div>}
      {resultData?.newBalance != null && <div className="tm-duel-balance">Balance: 🪙 {resultData.newBalance} MATCH</div>}
      <button className="tm-duel-back-btn" onClick={() => { setDuelPhase('lobby'); setResultData(null); setDuelId(null); setError(null); }}>
        Back to Duel Lobby
      </button>
    </div>
  );

  return null;
}

function TileMatchDailyTasks({ tasks, onClaim }) {
  const allDone = tasks.length > 0 && tasks.every(t => t.claimed);
  if (allDone) return (
    <div className="tm-tasks-all-done">
      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🎉</div>
      All tasks done — come back tomorrow!
    </div>
  );
  return (
    <div>
      {tasks.map(task => {
        const pct = Math.min(100, Math.round((task.progress / task.target) * 100));
        return (
          <div key={task.id} className="tm-task-card">
            <div className="tm-task-header">
              <span className="tm-task-label">{task.label}</span>
              <span className="tm-task-reward">+{task.rewardTokens} 🪙</span>
            </div>
            <div className="tm-task-desc">{task.description}</div>
            <div className="tm-task-bar-wrap">
              <div className="tm-task-bar-fill" style={{ width: pct + '%' }} />
            </div>
            <div className="tm-task-footer">
              <span className="tm-task-progress-lbl">{task.progress} / {task.target}</span>
              {task.claimed ? (
                <span className="tm-task-claimed">Claimed ✓</span>
              ) : (
                <button
                  className="tm-task-claim-btn"
                  disabled={!task.completable}
                  onClick={() => onClaim(task.id)}
                >
                  Claim
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  // Competitive menu state
  const [tmMenuTab, setTmMenuTab] = useState('play');
  const [tmBalance, setTmBalance] = useState(null);
  const [tmTasks, setTmTasks] = useState([]);
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

  // Load wallet + tasks when the select screen is shown for the first time
  useEffect(() => {
    const token = window._unToken || '';
    const headers = { 'x-usernode-token': token };
    Promise.all([
      fetch('/api/tilematch/wallet', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/tilematch/tasks', { headers }).then(r => r.json()).catch(() => null),
    ]).then(([walletData, tasksData]) => {
      if (walletData && walletData.balance != null) setTmBalance(walletData.balance);
      if (tasksData && tasksData.tasks) setTmTasks(tasksData.tasks);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reportProgress = (lvlCleared, tileTaps) => {
    fetch('/api/tilematch/tasks/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': window._unToken || '' },
      body: JSON.stringify({ levelsCleared: lvlCleared || 0, tileTaps: tileTaps || 0 }),
    }).then(r => r.json()).then(d => { if (d.tasks) setTmTasks(d.tasks); }).catch(() => {});
  };

  const submitScore = (highestLevel, totalCleared, sessionScore) => {
    fetch('/api/tilematch/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': window._unToken || '' },
      body: JSON.stringify({ highestLevel, totalCleared, sessionScore }),
    }).catch(() => {});
  };

  const handleNextLevel = () => {
    const ns = sessionScore + levelScore;
    setSessionScore(ns);
    setCompletedLevels(prev => new Set([...prev, selectedLevel]));
    // Fire-and-forget: report task progress + submit score
    reportProgress(1, moves);
    submitScore(selectedLevel, completedLevels.size + 1, ns);
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
    // Fire-and-forget: report task progress + submit score
    reportProgress(1, moves);
    submitScore(selectedLevel, completedLevels.size + 1, ns);
    onWin(ns, newTotalMoves, totalS, { share });
  };

  const handleTaskClaim = (taskId) => {
    fetch(`/api/tilematch/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-usernode-token': window._unToken || '' },
      body: '{}',
    }).then(r => r.json()).then(d => {
      if (d.newBalance != null) setTmBalance(d.newBalance);
      if (d.task) setTmTasks(prev => prev.map(t => t.id === taskId ? { ...t, claimed: true, completable: false } : t));
    }).catch(() => {});
  };

  // ---- Level selector screen ----
  if (phase === 'select') {
    const menuContent = () => {
      if (tmMenuTab === 'leaderboard') return <TileMatchLeaderboard />;
      if (tmMenuTab === 'duel') return (
        <TileMatchDuelArena
          balance={tmBalance}
          onBalanceChange={(fn) => setTmBalance(b => typeof fn === 'function' ? fn(b || 0) : fn)}
        />
      );
      if (tmMenuTab === 'tasks') return <TileMatchDailyTasks tasks={tmTasks} onClaim={handleTaskClaim} />;
      // 'play' tab — existing level selector
      if (tierPage === null) return (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-muted,#888)', marginBottom: '1rem' }}>Click tiles off the layered board into your 7-slot bar — match three to clear them.</p>
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
      // Per-tier grid
      const tier = TM_TIER_LABELS[tierPage];
      return (
        <div>
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
    };

    return (
      <div className="tm-menu">
        <div className="tm-menu-header">
          <h2>Tile Match Puzzle</h2>
          <TileMatchWalletChip balance={tmBalance} />
        </div>
        <div className="tm-menu-tabs">
          {['play', 'leaderboard', 'duel', 'tasks'].map(tab => (
            <button key={tab} className={'tm-menu-tab' + (tmMenuTab === tab ? ' active' : '')} onClick={() => setTmMenuTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {menuContent()}
      </div>
    );
  }

  // ---- Level selector (old path kept for tierPage within play tab — now dead code guarded above) ----
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

function TileMatchingDailyGame({ onWin, onLose, onStepChange, resetKey, offset, savedProgress, onSaveProgress, boardSeedOverride, onMoveTile }) {
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

  // Server-anchored UTC day; the board is re-derived deterministically from it,
  // so persisted progress only carries the mutable player state.
  const dayNum = cwDayNum(offset || 0);
  // `hydrated` guards the autosave effects from firing before the board exists.
  const hydratedRef = useRef(false);

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
    const remaining = tiles.filter(t => !t.removed).length;
    onLose(movesRef.current, secsRef.current, { share: 'Daily Tile Match ⏱ time\'s up', remainingTiles: remaining, isTimeUp: true });
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise board from the day seed, hydrating today's saved progress when
  // present so a resumed attempt restores the exact tiles/bar/moves/boosters
  // and continues the timer from where it stopped.
  useEffect(() => {
    const seed = boardSeedOverride != null ? boardSeedOverride : (dayNum * 31 + 7);
    const freshTiles = tmGenerateLevel(TM_DAILY_CONFIG, seed);
    const resume = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.tiles)
      ? savedProgress
      : null;
    if (resume) {
      setTiles(resume.tiles.map(t => ({ ...t })));
      setBar(Array.isArray(resume.bar) ? resume.bar.slice() : []);
      setMoves(Number.isFinite(resume.moves) ? resume.moves : 0);
      setSecs(Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0);
      setBoosters(resume.boosters ? { ...resume.boosters } : { ...TM_DAILY_CONFIG.boosters });
    } else {
      setTiles(freshTiles);
      setBar([]);
      setMoves(0);
      setSecs(0);
      setBoosters({ ...TM_DAILY_CONFIG.boosters });
    }
    setDone(false);
    setLastBarEntry(null);
    setClearSlotMode(false);
    setBarFull(false);
    setFlashIds(new Set());
    hydratedRef.current = true;
  }, [resetKey, offset, boardSeedOverride]);

  // Autosave the mutable board state. The per-change effect captures every move
  // (tile placed, undo, shuffle, clear); useAutosave covers idle timer advance
  // and the tab-close case. Both are no-ops once finished.
  const tmStateRef = useRef({});
  tmStateRef.current = { tiles, bar, moves, boosters, secs };
  const buildTmProgress = () => ({
    progress: {
      dayNum,
      tiles: tmStateRef.current.tiles,
      bar: tmStateRef.current.bar,
      moves: tmStateRef.current.moves,
      boosters: tmStateRef.current.boosters,
    },
    steps: tmStateRef.current.moves,
    secs: tmStateRef.current.secs,
  });
  useAutosave(onSaveProgress, buildTmProgress, !done);
  useEffect(() => {
    if (done || !hydratedRef.current || tiles.length === 0 || !onSaveProgress) return;
    const s = buildTmProgress();
    onSaveProgress(s.progress, s.steps, s.secs);
  }, [tiles, bar, moves, boosters, done]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (onMoveTile) onMoveTile({ tileType: tile.type, moveSeq: newMoves - 1, tsClient: Date.now() });

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
   Game — Knight's Tour (8×8, visit every square exactly once)
   ============================================================ */
const KT_HISTORY_KEY = 'puzzlechain_knights_history';
const KT_HISTORY_MAX = 50;
const KT_MOVES = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function ktLoadHistory() { return loadHistory(KT_HISTORY_KEY); }
function ktSaveEntry(entry) { saveHistory(KT_HISTORY_KEY, entry, KT_HISTORY_MAX); }
function ktValidMoves(pos, visited) {
  if (pos === null) return [];
  const r = Math.floor(pos / 8), c = pos % 8;
  const out = [];
  for (const [dr, dc] of KT_MOVES) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const idx = nr * 8 + nc;
      if (!visited[idx]) out.push(idx);
    }
  }
  return out;
}
function ktFmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function ktFmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function KnightsTourGame({ onWin, onStepChange, resetKey }) {
  const [visited, setVisited]       = useState(() => new Array(64).fill(0));
  const [currentPos, setCurrentPos] = useState(null);
  const [moves, setMoves]           = useState(0);
  const [undoStack, setUndoStack]   = useState([]);
  const [done, setDone]             = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [activeTab, setActiveTab]   = useState('game');
  const [history, setHistory]       = useState(() => ktLoadHistory());
  const [lastWinId, setLastWinId]   = useState(null);
  const startTimeRef = useRef(null);
  const timerRef     = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const resetGame = () => {
    stopTimer();
    setVisited(new Array(64).fill(0));
    setCurrentPos(null);
    setMoves(0);
    setUndoStack([]);
    setDone(false);
    setElapsed(0);
    startTimeRef.current = null;
    setActiveTab('game');
  };

  useEffect(() => { resetGame(); }, [resetKey]);
  useEffect(() => () => stopTimer(), []);

  const validMvs  = ktValidMoves(currentPos, visited);
  const stuck     = currentPos !== null && !done && validMvs.length === 0;

  const handleCellClick = (idx) => {
    if (done) return;

    if (currentPos === null) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);
      }
      const v = visited.slice(); v[idx] = 1;
      setVisited(v); setCurrentPos(idx); setMoves(1); setUndoStack([]);
      onStepChange(1);
      return;
    }

    if (!validMvs.includes(idx)) return;

    const newUndoStack = [...undoStack, { visited: visited.slice(), currentPos, moves }];
    const v = visited.slice();
    const m = moves + 1;
    v[idx] = m;

    if (m === 64) {
      stopTimer();
      const finalSecs = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : elapsed;
      const score = Math.max(100, Math.round(6400 - finalSecs * 8));
      const today = new Date().toISOString().slice(0, 10);
      const entryId = Date.now();
      ktSaveEntry({ id: entryId, timeSecs: finalSecs, score, date: today });
      setHistory(ktLoadHistory());
      setLastWinId(entryId);
      setVisited(v); setCurrentPos(idx); setMoves(m); setUndoStack(newUndoStack); setDone(true);
      onStepChange(m);
      onWin(score, 64, finalSecs);
    } else {
      setVisited(v); setCurrentPos(idx); setMoves(m); setUndoStack(newUndoStack);
      onStepChange(m);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || done) return;
    const prev = undoStack[undoStack.length - 1];
    setVisited(prev.visited.slice());
    setCurrentPos(prev.currentPos);
    setMoves(prev.moves);
    setUndoStack(undoStack.slice(0, -1));
    onStepChange(prev.moves);
  };

  const sortedHistory = history.slice().sort((a, b) => a.timeSecs - b.timeSecs);
  const bestEntry = sortedHistory[0] || null;

  return (
    <div>
      {activeTab === 'game' && (
        <div className="kt-wrap">
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{ktFmtTime(elapsed)}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue" style={stuck ? { color: C.rose } : {}}>{moves}/64</div>
            </div>
            <div className="pill">
              <div className="plabel">Left</div>
              <div className="pvalue">{64 - moves}</div>
            </div>
          </div>

          <div className="kt-board">
            {Array.from({ length: 64 }, (_, idx) => {
              const r = Math.floor(idx / 8), c = idx % 8;
              const isLight    = (r + c) % 2 === 0;
              const isCurrent  = idx === currentPos;
              const isVisited  = visited[idx] > 0;
              const isValid    = !done && !isCurrent && validMvs.includes(idx);
              const canPlace   = currentPos === null && !isVisited;

              let cls = 'kt-cell ' + (isLight ? 'kt-light' : 'kt-dark');
              if (isCurrent)      cls += ' kt-current';
              else if (isVisited) cls += ' kt-visited';
              else if (isValid)   cls += ' kt-valid';

              return (
                <div
                  key={idx}
                  className={cls}
                  style={(canPlace || isValid) ? { cursor: 'pointer' } : {}}
                  onClick={() => (canPlace || isValid) && handleCellClick(idx)}
                >
                  {isCurrent  ? <span className="kt-knight">♞</span>
                   : isVisited ? <span className="kt-num">{visited[idx]}</span>
                   : null}
                </div>
              );
            })}
          </div>

          {stuck && <div className="kt-stuck-banner">No valid moves — try Undo or restart.</div>}

          <div className="kt-actions">
            <button
              className="kt-undo-btn"
              disabled={undoStack.length === 0 || done}
              onClick={handleUndo}
            >
              ↩ Undo
            </button>
            {stuck && (
              <button className="kt-new-btn" onClick={resetGame}>New Game</button>
            )}
          </div>

          {currentPos === null && (
            <div className="kt-hint">Tap any square to place the knight and begin.</div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {sortedHistory.length === 0 ? (
            <div className="kt-empty">No completed tours yet.</div>
          ) : (
            <>
              {bestEntry && (
                <div className="kt-best">
                  Best: {ktFmtTime(bestEntry.timeSecs)} · {bestEntry.score} pts
                </div>
              )}
              <div className="kt-history-list">
                {sortedHistory.slice(0, KT_HISTORY_MAX).map((h, i) => (
                  <div key={h.id} className={'kt-history-row' + (h.id === lastWinId ? ' kt-row-new' : '')}>
                    <span className="kt-rank">#{i + 1}</span>
                    <span className="mono" style={{ flex: 1, fontWeight: 600 }}>{ktFmtTime(h.timeSecs)}</span>
                    <span style={{ color: C.gold, fontWeight: 600 }}>+{h.score}</span>
                    <span style={{ color: C.muted, fontSize: '0.75rem' }}>{ktFmtDate(h.date)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="kt-bottom-nav">
        {['game', 'history'].map(tab => (
          <button
            key={tab}
            className={'kt-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab === 'history') setHistory(ktLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
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


/* ============================================================
   Bounce (Breakout) helpers + component
   ============================================================ */

// Fixed internal resolution — physics are device-independent; the canvas
// bitmap is scaled to fit the column via CSS.
const BOUNCE_W       = 360;
const BOUNCE_H       = 480;
const BOUNCE_PADDLE_W = 64;
const BOUNCE_PADDLE_H = 10;
const BOUNCE_PADDLE_Y = BOUNCE_H - 30;
const BOUNCE_BALL_R  = 6;
const BOUNCE_COLS    = 9;
const BOUNCE_BRICK_H = 16;
const BOUNCE_TOP     = 44;          // y offset of the first brick row
const BOUNCE_MARGIN  = 16;
const BOUNCE_GAP_X   = 5;
const BOUNCE_GAP_Y   = 6;
const BOUNCE_BASE_SPEED = 3.6;      // px per 1/60s step at level 1
const BOUNCE_MAX_SPEED  = 7.2;      // speed-up cap
const BOUNCE_MAX_ANGLE  = Math.PI / 3;   // 60° max paddle deflection
const BOUNCE_PADDLE_KEY_SPEED = 7;  // px/step when steering by key/dpad
const BOUNCE_LIVES   = 3;
const BOUNCE_LEVEL_BONUS = 100;
const BOUNCE_FIXED_DT = 1000 / 60;
const BOUNCE_SUBSTEPS = 3;          // anti-tunneling integration substeps
const BOUNCE_BEST_KEY = 'puzzlechain_bounce_best';

// Points by row (top rows are harder to reach, so worth more); fallback 10.
const BOUNCE_ROW_POINTS = [50, 50, 30, 30, 20, 10, 10, 10];
const BOUNCE_ROW_COLORS = [C.rose, C.gold, C.emerald, C.violet, C.accent];

function bounceClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function bounceLoadBest() {
  try { return parseInt(localStorage.getItem(BOUNCE_BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}
function bounceSaveBest(v) {
  try { localStorage.setItem(BOUNCE_BEST_KEY, String(v)); } catch {}
}

function bounceSpeedForLevel(level) {
  return Math.min(BOUNCE_BASE_SPEED + (level - 1) * 0.5, BOUNCE_MAX_SPEED);
}

// Build the brick wall for a level — denser (more rows) as levels climb.
function bounceBuildBricks(level) {
  const rows = Math.min(4 + (level - 1), 8);
  const brickW = (BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BOUNCE_COLS; c++) {
      bricks.push({
        x: BOUNCE_MARGIN + c * (brickW + BOUNCE_GAP_X),
        y: BOUNCE_TOP + r * (BOUNCE_BRICK_H + BOUNCE_GAP_Y),
        w: brickW,
        h: BOUNCE_BRICK_H,
        alive: true,
        points: BOUNCE_ROW_POINTS[r] != null ? BOUNCE_ROW_POINTS[r] : 10,
        color: BOUNCE_ROW_COLORS[r % BOUNCE_ROW_COLORS.length],
      });
    }
  }
  return bricks;
}

function bounceShareText(score, level, secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `I scored ${score.toLocaleString()} on Bounce 🧱 — reached level ${level} · ${m}:${s}`;
}

/* ============================================================
   Power-ups system (Bounce & Zuma)
   ============================================================ */
const POWERUP_DURATION_MS = 10000;
const POWERUP_SPAWN_RATE = 0.1;
const POWERUP_RADIUS = 12;
const POWERUP_TYPES = {
  bounce: ['multi-ball', 'larger-paddle', 'slower-ball', 'laser'],
  zuma: ['multi-shot', 'faster-shot', 'color-switch', 'chain-clear'],
};
const POWERUP_ICONS = {
  'multi-ball': '🔄',
  'larger-paddle': '⬆️',
  'slower-ball': '🐢',
  'laser': '⚡',
  'multi-shot': '🔄',
  'faster-shot': '💨',
  'color-switch': '🎨',
  'chain-clear': '✂️',
};

function spawnPowerup(x, y, typeArray) {
  const type = typeArray[Math.floor(Math.random() * typeArray.length)];
  return {
    id: `pu_${Date.now()}_${Math.random()}`,
    type,
    x, y,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 1.5,
    radius: POWERUP_RADIUS,
    spawnedAt: Date.now(),
    caught: false,
  };
}

function updatePowerup(pu, scale) {
  pu.x += pu.vx * scale;
  pu.y += pu.vy * scale;
  pu.vy += 0.1 * scale;
}

function BounceGame({ onWin, onStepChange, resetKey }) {
  const [score, setScore]   = useState(0);
  const [lives, setLives]   = useState(BOUNCE_LIVES);
  const [level, setLevel]   = useState(1);
  const [started, setStarted] = useState(false);
  const [done, setDone]     = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [bestScore, setBestScore] = useState(() => bounceLoadBest());
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isMock, setIsMock] = useState(false);
  const [activePowerups, setActivePowerups] = useState([]);

  // Leaderboard tab state (mirrors Snake)
  const [lb, setLb]               = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError]     = useState(false);

  // Canvas + simulation refs (the hot loop mutates these, not React state).
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const rafRef      = useRef(null);
  const lastTsRef   = useRef(null);
  const accRef      = useRef(0);

  const paddleRef   = useRef(BOUNCE_W / 2);
  const ballRef     = useRef({ x: BOUNCE_W / 2, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 });
  const bricksRef   = useRef(bounceBuildBricks(1));
  const speedRef    = useRef(bounceSpeedForLevel(1));
  const scoreRef    = useRef(0);
  const livesRef    = useRef(BOUNCE_LIVES);
  const levelRef    = useRef(1);
  const brokenRef   = useRef(0);
  const elapsedRef  = useRef(0);
  const launchedRef = useRef(false);
  const startedRef  = useRef(false);
  const doneRef     = useRef(false);
  const submittedRef = useRef(false);
  const leftRef     = useRef(false);
  const rightRef    = useRef(false);

  // Power-ups refs
  const ballsRef    = useRef([{ x: BOUNCE_W / 2, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 }]);
  const powerUpsRef = useRef([]);
  const activePowerupsRef = useRef([]);
  const basePaddleWRef = useRef(BOUNCE_PADDLE_W);
  const baseSpeedRef = useRef(bounceSpeedForLevel(1));
  const laserLoadedRef = useRef(0);

  // Latest-closure prop refs so listeners/loop mount once.
  const onWinRef = useRef(onWin);        onWinRef.current = onWin;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  const loopRunning = activeTab === 'game' && !done;
  const timerRunning = started && !done && activeTab === 'game';

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  // Elapsed-time clock (pauses when not actively playing).
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => { elapsedRef.current += 1; setElapsedSecs(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const resetBallToPaddle = () => {
    ballsRef.current = [{ x: paddleRef.current, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 }];
  };

  const handleNewGame = () => {
    paddleRef.current = BOUNCE_W / 2;
    basePaddleWRef.current = BOUNCE_PADDLE_W;
    bricksRef.current = bounceBuildBricks(1);
    speedRef.current = bounceSpeedForLevel(1);
    baseSpeedRef.current = bounceSpeedForLevel(1);
    scoreRef.current = 0;
    livesRef.current = BOUNCE_LIVES;
    levelRef.current = 1;
    brokenRef.current = 0;
    elapsedRef.current = 0;
    launchedRef.current = false;
    startedRef.current = false;
    doneRef.current = false;
    submittedRef.current = false;
    leftRef.current = false;
    rightRef.current = false;
    accRef.current = 0;
    lastTsRef.current = null;
    powerUpsRef.current = [];
    activePowerupsRef.current = [];
    laserLoadedRef.current = 0;
    resetBallToPaddle();
    setScore(0); setLives(BOUNCE_LIVES); setLevel(1);
    setStarted(false); setDone(false); setElapsedSecs(0); setActivePowerups([]);
  };

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  const submitScore = async (finalScore, finalLevel, secs) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBestScore(prev => {
      if (finalScore > prev) { bounceSaveBest(finalScore); return finalScore; }
      return prev;
    });
    try {
      await api('/api/bounce/score', {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, level: finalLevel, timeSecs: secs }),
      });
    } catch {}
  };

  const launch = () => {
    if (doneRef.current || launchedRef.current) return;
    launchedRef.current = true;
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    const speed = speedRef.current;
    const ball = ballRef.current;
    ball.vx = speed * 0.4;
    ball.vy = -Math.sqrt(Math.max(0.01, speed * speed - ball.vx * ball.vx));
  };
  const launchRef = useRef(launch);
  launchRef.current = launch;

  const endGame = () => {
    doneRef.current = true;
    setDone(true);
    const finalScore = scoreRef.current;
    const lvl = levelRef.current;
    const secs = elapsedRef.current;
    submitScore(finalScore, lvl, secs);
    onWinRef.current && onWinRef.current(finalScore, brokenRef.current, secs, {
      share: bounceShareText(finalScore, lvl, secs),
    });
  };

  const nextLevel = () => {
    scoreRef.current += BOUNCE_LEVEL_BONUS;
    setScore(scoreRef.current);
    const lvl = levelRef.current + 1;
    levelRef.current = lvl;
    setLevel(lvl);
    speedRef.current = bounceSpeedForLevel(lvl);
    bricksRef.current = bounceBuildBricks(lvl);
    launchedRef.current = false;
    resetBallToPaddle();
  };

  const loseLife = () => {
    const remaining = livesRef.current - 1;
    livesRef.current = remaining;
    setLives(remaining);
    if (remaining <= 0) { endGame(); return; }
    launchedRef.current = false;
    resetBallToPaddle();
  };

  const stepBall = (scale) => {
    const balls = ballsRef.current;
    const bricks = bricksRef.current;
    const px = paddleRef.current;
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));

    for (let ballIdx = 0; ballIdx < balls.length; ballIdx++) {
      const ball = balls[ballIdx];
      ball.x += ball.vx * scale;
      ball.y += ball.vy * scale;

      if (ball.x - BOUNCE_BALL_R < 0) { ball.x = BOUNCE_BALL_R; ball.vx = Math.abs(ball.vx); }
      else if (ball.x + BOUNCE_BALL_R > BOUNCE_W) { ball.x = BOUNCE_W - BOUNCE_BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BOUNCE_BALL_R < 0) { ball.y = BOUNCE_BALL_R; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 &&
          ball.y + BOUNCE_BALL_R >= BOUNCE_PADDLE_Y &&
          ball.y + BOUNCE_BALL_R <= BOUNCE_PADDLE_Y + BOUNCE_PADDLE_H + 8 &&
          ball.x >= px - paddleW / 2 - BOUNCE_BALL_R &&
          ball.x <= px + paddleW / 2 + BOUNCE_BALL_R) {
        const hit = bounceClamp((ball.x - px) / (paddleW / 2), -1, 1);
        const angle = hit * BOUNCE_MAX_ANGLE;
        const speed = speedRef.current;
        ball.vx = speed * Math.sin(angle);
        ball.vy = -Math.abs(speed * Math.cos(angle));
        ball.y = BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1;
      }

      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive) continue;
        const ox = Math.min(ball.x + BOUNCE_BALL_R, b.x + b.w) - Math.max(ball.x - BOUNCE_BALL_R, b.x);
        const oy = Math.min(ball.y + BOUNCE_BALL_R, b.y + b.h) - Math.max(ball.y - BOUNCE_BALL_R, b.y);
        if (ox > 0 && oy > 0) {
          if (laserLoadedRef.current > 0) {
            const col = Math.floor((b.x - BOUNCE_MARGIN) / ((BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS + BOUNCE_GAP_X));
            for (let j = 0; j < bricks.length; j++) {
              const br = bricks[j];
              const brickCol = Math.floor((br.x - BOUNCE_MARGIN) / ((BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS + BOUNCE_GAP_X));
              if (brickCol === col && br.alive) {
                br.alive = false;
                brokenRef.current += 1;
                scoreRef.current += br.points;
              }
            }
            laserLoadedRef.current -= 1;
          } else {
            b.alive = false;
            brokenRef.current += 1;
            scoreRef.current += b.points;
          }
          setScore(scoreRef.current);
          onStepRef.current && onStepRef.current(brokenRef.current);
          if (Math.random() < POWERUP_SPAWN_RATE) {
            powerUpsRef.current.push(spawnPowerup(b.x + b.w / 2, b.y + b.h / 2, POWERUP_TYPES.bounce));
          }
          if (ox < oy) { ball.vx = -ball.vx; ball.x += (ball.vx > 0 ? 1 : -1) * ox; }
          else { ball.vy = -ball.vy; ball.y += (ball.vy > 0 ? 1 : -1) * oy; }
          if (bricks.every(x => !x.alive)) { nextLevel(); return true; }
          break;
        }
      }

      if (ball.y - BOUNCE_BALL_R > BOUNCE_H) {
        balls.splice(ballIdx, 1);
        ballIdx--;
        if (balls.length === 0) { loseLife(); return true; }
      }
    }
    return false;
  };

  const update = () => {
    const now = Date.now();
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));

    let px = paddleRef.current;
    if (leftRef.current) px -= BOUNCE_PADDLE_KEY_SPEED;
    if (rightRef.current) px += BOUNCE_PADDLE_KEY_SPEED;
    paddleRef.current = bounceClamp(px, paddleW / 2, BOUNCE_W - paddleW / 2);

    // Update power-ups in flight
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const pu = powerUpsRef.current[i];
      updatePowerup(pu, 1);

      if (!pu.caught && pu.y + pu.radius >= BOUNCE_PADDLE_Y && pu.x >= paddleRef.current - paddleW / 2 - 20 && pu.x <= paddleRef.current + paddleW / 2 + 20) {
        pu.caught = true;
        const existing = activePowerupsRef.current.find(p => p.type === pu.type);
        if (pu.type === 'multi-ball') {
          if (ballsRef.current.length > 0) {
            const firstBall = ballsRef.current[0];
            const newBall = {
              x: firstBall.x + 10,
              y: firstBall.y,
              vx: firstBall.vx * Math.cos(Math.PI / 6) - firstBall.vy * Math.sin(Math.PI / 6),
              vy: firstBall.vx * Math.sin(Math.PI / 6) + firstBall.vy * Math.cos(Math.PI / 6),
            };
            ballsRef.current.push(newBall);
          }
        }
        if (existing) {
          existing.stacks += 1;
          existing.startedAt = now;
        } else {
          activePowerupsRef.current.push({ type: pu.type, startedAt: now, stacks: 1 });
        }
        setActivePowerups([...activePowerupsRef.current]);
        powerUpsRef.current.splice(i, 1);
      } else if (pu.y > BOUNCE_H + 50) {
        powerUpsRef.current.splice(i, 1);
      }
    }

    // Update active power-ups duration
    for (let i = activePowerupsRef.current.length - 1; i >= 0; i--) {
      const ap = activePowerupsRef.current[i];
      if (now - ap.startedAt > POWERUP_DURATION_MS) {
        if (ap.type === 'multi-shot') { } // handled in zuma
        activePowerupsRef.current.splice(i, 1);
      }
    }
    if (activePowerupsRef.current.length === 0 && powerUpsRef.current.length === 0) {
      setActivePowerups([]);
    }

    // Apply speed multiplier
    const slowPower = activePowerupsRef.current.find(p => p.type === 'slower-ball');
    if (slowPower) {
      speedRef.current = baseSpeedRef.current * Math.pow(0.7, slowPower.stacks);
    } else {
      speedRef.current = baseSpeedRef.current;
    }

    if (!launchedRef.current) { resetBallToPaddle(); return; }
    for (let i = 0; i < BOUNCE_SUBSTEPS; i++) {
      if (stepBall(1 / BOUNCE_SUBSTEPS)) return;
    }
  };

  const draw = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, BOUNCE_W, BOUNCE_H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, BOUNCE_W, BOUNCE_H);
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // Draw power-ups in flight
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      const pu = powerUpsRef.current[i];
      ctx.save();
      ctx.translate(pu.x, pu.y);
      const rotation = ((Date.now() - pu.spawnedAt) / 100) % (Math.PI * 2);
      ctx.rotate(rotation);
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_ICONS[pu.type], 0, 0);
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(pu.x, pu.y + pu.radius + 3, pu.radius * 0.7, pu.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = C.text;
    const px = paddleRef.current;
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));
    ctx.fillRect(px - paddleW / 2, BOUNCE_PADDLE_Y, paddleW, BOUNCE_PADDLE_H);

    const balls = ballsRef.current;
    ctx.fillStyle = C.gold;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BOUNCE_BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    if (startedRef.current && !launchedRef.current && !doneRef.current) {
      ctx.fillStyle = C.text;
      ctx.font = '600 14px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap or press Space to launch', BOUNCE_W / 2, BOUNCE_H / 2);
    }
  };

  // Animation loop — fixed-timestep accumulator so physics are frame-rate
  // independent; re-armed whenever play resumes (tab switch / not done).
  useEffect(() => {
    if (!loopRunning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = BOUNCE_W * dpr;
    canvas.height = BOUNCE_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    lastTsRef.current = null;
    accRef.current = 0;

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      if (lastTsRef.current == null) lastTsRef.current = ts;
      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (dt > 50) dt = 50;            // clamp after a backgrounded tab
      accRef.current += dt;
      let guard = 0;
      while (accRef.current >= BOUNCE_FIXED_DT && guard < 5) {
        update();
        accRef.current -= BOUNCE_FIXED_DT;
        guard += 1;
        if (doneRef.current) break;
      }
      draw();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopRunning]);

  // Keyboard — mounted once, latest-closure via refs.
  useEffect(() => {
    const down = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); leftRef.current = true; }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); rightRef.current = true; }
      else if (k === ' ' || k === 'Spacebar') { e.preventDefault(); launchRef.current(); }
    };
    const up = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') leftRef.current = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') rightRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Map a pointer's clientX onto the internal board coordinate and steer.
  const pointerToPaddle = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const x = (clientX - rect.left) / rect.width * BOUNCE_W;
    paddleRef.current = bounceClamp(x, BOUNCE_PADDLE_W / 2, BOUNCE_W - BOUNCE_PADDLE_W / 2);
  };
  const handleMouseMove = (e) => pointerToPaddle(e.clientX);
  const handleTouchMove = (e) => { if (e.touches[0]) { e.preventDefault(); pointerToPaddle(e.touches[0].clientX); } };
  const handleTouchStart = (e) => { if (e.touches[0]) pointerToPaddle(e.touches[0].clientX); launch(); };

  const loadLeaderboard = async () => {
    setLbLoading(true);
    setLbError(false);
    const { ok, body } = await api('/api/bounce/leaderboard');
    if (ok && body) setLb(body);
    else setLbError(true);
    setLbLoading(false);
  };

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
              <div className="plabel">Lives</div>
              <div className="pvalue">{'●'.repeat(Math.max(0, lives)) || '—'}</div>
            </div>
            <div className="pill">
              <div className="plabel">Level</div>
              <div className="pvalue mono">{level}</div>
            </div>
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
            </div>
            {activePowerups.map((ap, idx) => {
              const now = Date.now();
              const elapsed = now - ap.startedAt;
              const remaining = Math.max(0, Math.ceil((POWERUP_DURATION_MS - elapsed) / 1000));
              return (
                <div key={idx} className="pill" style={{ background: C.emerald + '22', border: `1px solid ${C.emerald}` }}>
                  <div className="plabel" style={{ fontSize: '0.75rem' }}>
                    {POWERUP_ICONS[ap.type]} {remaining}s {ap.stacks > 1 ? `×${ap.stacks}` : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bounce-board-wrap">
            <canvas
              ref={canvasRef}
              className="bounce-canvas"
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onClick={() => launch()}
            />
            {!started && !done && (
              <div className="bounce-start-overlay" onClick={() => launch()}>
                <div style={{ fontSize: '2rem' }}>🧱</div>
                <div>Move to aim, then tap / press Space to launch</div>
              </div>
            )}
          </div>

          <div className="bounce-dpad">
            <button
              aria-label="Left"
              onPointerDown={(e) => { e.preventDefault(); leftRef.current = true; }}
              onPointerUp={() => { leftRef.current = false; }}
              onPointerLeave={() => { leftRef.current = false; }}
            >◀</button>
            <button
              aria-label="Right"
              onPointerDown={(e) => { e.preventDefault(); rightRef.current = true; }}
              onPointerUp={() => { rightRef.current = false; }}
              onPointerLeave={() => { rightRef.current = false; }}
            >▶</button>
          </div>

          <div className="bounce-controls">
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
   PvP Arena components
   ============================================================ */
const PVP_TIERS = [
  { label: '10 UTGO',  value: 10,  color: C.emerald, payout: '18 UTGO' },
  { label: '50 UTGO',  value: 50,  color: C.gold,    payout: '90 UTGO' },
  { label: '100 UTGO', value: 100, color: C.rose,    payout: '180 UTGO' },
];

function PvpLobby({ user, balance, onJoin, joining }) {
  const balFmt = balance != null
    ? (Number(BigInt(balance)) / 1e18).toFixed(2) + ' UTGO'
    : '…';
  return (
    <div className="pvp-lobby">
      <div className="pvp-header">
        <div className="pvp-title">⚔️ PvP Arena</div>
        <div className="pvp-subtitle">Stake $UTGO and battle for the best tile-match score</div>
        <div className="pvp-balance">Balance: {balFmt}</div>
      </div>
      <div className="pvp-how">
        <div className="pvp-how-step">1. Choose a wager tier and get matched with an opponent</div>
        <div className="pvp-how-step">2. Both players clear the same seeded board — highest score wins, fastest time breaks ties</div>
        <div className="pvp-how-step">3. Winner claims 90% of the pot · 8% treasury · 2% burned 🔥</div>
      </div>
      <div className="pvp-tiers">
        {PVP_TIERS.map(t => (
          <div key={t.value} className="pvp-tier-card" style={{ '--pvp-color': t.color }}>
            <div className="pvp-tier-label">{t.label}</div>
            <div className="pvp-tier-payout">Win → {t.payout}</div>
            <button
              className="pvp-tier-btn"
              style={{ background: t.color }}
              disabled={joining !== null}
              onClick={() => onJoin(t.value)}
            >
              {joining === t.value ? 'Finding…' : 'Find Match'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PvpMatchmaking({ match, onCancel, onReclaim, cancelQueueCalldata }) {
  const { useState: useS, useEffect: useE } = React;
  const [secsLeft, setSecsLeft] = useS(() => {
    if (!match || !match.createdAt) return 120;
    const elapsed = Math.floor((Date.now() - new Date(match.createdAt).getTime()) / 1000);
    return Math.max(0, 120 - elapsed);
  });
  const [reclaiming, setReclaiming] = useS(false);

  useE(() => {
    if (secsLeft <= 0) return;
    const id = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secsLeft > 0]);

  const canReclaim = secsLeft === 0;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  const handleReclaim = async () => {
    setReclaiming(true);
    try {
      const cd = cancelQueueCalldata || (match && match.cancelQueueCalldata);
      if (cd && UTGO_CONTRACT_ADDRESS && window.usernode && window.usernode.sendTransaction) {
        await window.usernode.sendTransaction({ to: UTGO_CONTRACT_ADDRESS, data: cd });
      }
      onReclaim && onReclaim();
    } catch (e) {
      console.error('[pvp] reclaim failed:', e && e.message);
      onReclaim && onReclaim(); // fall back to cancel even if tx fails
    } finally {
      setReclaiming(false);
    }
  };

  return (
    <div className="pvp-matchmaking">
      <div className="pvp-mm-icon">⚔️</div>
      <div className="pvp-mm-pulse" />
      <div className="pvp-mm-title">Finding opponent…</div>
      <div className="pvp-mm-code">Room · {match && match.matchId}</div>
      <div className={`pvp-mm-countdown${canReclaim ? ' pvp-mm-countdown-expired' : ''}`}>{mm}:{ss}</div>
      <div className="pvp-mm-hint">
        {canReclaim
          ? 'Queue timed out — reclaim your deposit below'
          : `Waiting for a ${match && match.betTier ? match.betTier + ' UTGO' : ''} opponent`}
      </div>
      <div className="pvp-mm-btns">
        {canReclaim && (
          <button className="pvp-reclaim-btn" onClick={handleReclaim} disabled={reclaiming}>
            {reclaiming ? 'Reclaiming…' : 'Reclaim Deposit'}
          </button>
        )}
        <button className="pvp-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function PvpDepositScreen({ match, playerIsP1, onDeposit, depositing }) {
  const alreadyDeposited = playerIsP1 ? match.p1Deposited : match.p2Deposited;
  const oppDeposited = playerIsP1 ? match.p2Deposited : match.p1Deposited;
  const wagerFmt = match.wagerUtgo
    ? (Number(BigInt(match.wagerUtgo)) / 1e18).toFixed(2) + ' UTGO'
    : '?';
  return (
    <div className="pvp-deposit">
      <div className="pvp-deposit-title">Deposit Wager</div>
      <div className="pvp-deposit-amount">{wagerFmt}</div>
      <div className="pvp-deposit-hint">
        {alreadyDeposited
          ? (oppDeposited ? 'Both deposited — starting!' : 'Waiting for opponent to deposit…')
          : 'Deposit your wager to lock in the match'}
      </div>
      {!alreadyDeposited && (
        <button className="primary-btn" disabled={depositing} onClick={onDeposit}>
          {depositing ? 'Depositing…' : 'Deposit & Play'}
        </button>
      )}
    </div>
  );
}

function PvpGameScreen({ match, playerIsP1, onResult }) {
  const [depositing, setDepositing] = useState(false);
  const [deposited, setDeposited] = useState(
    playerIsP1 ? match.p1Deposited : match.p2Deposited
  );
  const [oppDeposited, setOppDeposited] = useState(
    playerIsP1 ? match.p2Deposited : match.p1Deposited
  );
  const [playing, setPlaying] = useState(deposited && oppDeposited);
  const [waiting, setWaiting] = useState(false);
  const [oppPct, setOppPct] = useState(null); // opponent tile-clear %, rounded to 10
  const [myRemaining, setMyRemaining] = useState(72);
  const pollRef = useRef(null);
  const resultPollRef = useRef(null);
  // Accumulate telemetry locally — useRef avoids stale closures in handleWin/handleLose
  const telemetryRef = useRef([]);

  // Poll for opponent deposit
  useEffect(() => {
    if (playing || !deposited) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      const oppNow = playerIsP1 ? body.p2Deposited : body.p1Deposited;
      if (oppNow) {
        setOppDeposited(true);
        setPlaying(true);
        clearInterval(pollRef.current);
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [deposited, playing]);

  // During play: poll every 2s for opponent progress + inactivity forfeit
  useEffect(() => {
    if (!playing || waiting) return;
    const poll = async () => {
      const rem = myRemaining;
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}?remaining=${rem}`);
      if (!ok) return;
      if (body.forfeitedBy) {
        clearInterval(resultPollRef.current);
        onResult({
          match: body,
          isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id),
          claimCalldata: body.claimCalldata,
          contractAddr: body.contractAddr,
        });
        return;
      }
      if (body.status === 'finished' || body.status === 'disputed') {
        clearInterval(resultPollRef.current);
        onResult({ match: body, isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id) });
        return;
      }
      // Update opponent progress bar (rounded to nearest 10%)
      const oppRem = playerIsP1 ? body.p2Remaining : body.p1Remaining;
      if (oppRem != null) {
        const cleared = 72 - oppRem;
        setOppPct(Math.round(cleared / 72 * 10) * 10);
      }
    };
    resultPollRef.current = setInterval(poll, 2000);
    return () => clearInterval(resultPollRef.current);
  }, [playing, waiting]);

  // Poll for opponent finish result while waiting
  useEffect(() => {
    if (!waiting) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      if (body.status === 'finished' || body.status === 'disputed') {
        clearInterval(pollRef.current);
        onResult({ match: body, isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id) });
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [waiting]);

  const handleDeposit = async () => {
    setDepositing(true);
    const isMock = !window.usernode || (window.usernode.isMockEnabled && window.usernode.isMockEnabled());
    if (!isMock && window.usernode && UTGO_CONTRACT_ADDRESS) {
      // Production: call on-chain deposit — skip for staging
    }
    await api(`/api/pvp/match/${match.matchId}/deposit-confirmed`, {
      method: 'POST',
      body: JSON.stringify({ txHash: '0xstaging' }),
    });
    setDeposited(true);
    setDepositing(false);
  };

  // Accumulate tile moves locally — no per-move API call
  const handleMoveTile = ({ tileType, moveSeq, tsClient }) => {
    telemetryRef.current.push({ tileType, moveSeq, tsClient });
  };

  const handleWin = async (score, steps, secs) => {
    clearInterval(resultPollRef.current);
    const { ok, body } = await api(`/api/pvp/match/${match.matchId}/finish`, {
      method: 'POST',
      body: JSON.stringify({
        score, steps, timeSecs: secs, remainingTiles: 0,
        telemetry: telemetryRef.current,
      }),
    });
    if (!ok) return;
    if (body.waiting) {
      setWaiting(true);
    } else {
      onResult({
        match: body.match,
        isWinner: body.isWinner,
        claimCalldata: body.claimCalldata,
        contractAddr: body.contractAddr,
        prize: body.prize,
        telemetrySummary: body.telemetrySummary,
        dapp: body.dapp,
      });
    }
  };

  const handleLose = async (steps, secs, meta) => {
    clearInterval(resultPollRef.current);
    if (meta && meta.isTimeUp) {
      // Time expired — submit finish with score 0
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          score: 0, steps, timeSecs: secs,
          remainingTiles: meta.remainingTiles || 0,
          telemetry: telemetryRef.current,
        }),
      });
      if (ok && body) {
        if (body.waiting) { setWaiting(true); return; }
        onResult({
          match: body.match,
          isWinner: body.isWinner,
          claimCalldata: body.claimCalldata,
          contractAddr: body.contractAddr,
          prize: body.prize,
          telemetrySummary: body.telemetrySummary,
          dapp: body.dapp,
        });
      }
    } else {
      // Bar full / manual forfeit
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}/forfeit`, { method: 'POST' });
      onResult({ isWinner: false, match: ok && body ? body : null });
    }
  };

  const handleStepChange = (n) => {
    setMyRemaining(Math.max(0, 72 - n));
  };

  const oppName = playerIsP1 ? (match.player2Name || 'Opponent') : (match.player1Name || 'Opponent');

  if (!deposited || !oppDeposited) {
    return (
      <PvpDepositScreen
        match={match}
        playerIsP1={playerIsP1}
        onDeposit={handleDeposit}
        depositing={depositing}
      />
    );
  }

  if (waiting) {
    return (
      <div className="pvp-waiting">
        <div className="pvp-mm-pulse" />
        <div className="pvp-waiting-title">Waiting for {oppName}…</div>
        <div className="pvp-waiting-hint">Your result has been submitted</div>
      </div>
    );
  }

  return (
    <div className="pvp-game-wrap game-wrap">
      <div className="pvp-vs-bar">
        <span>vs <span style={{ color: C.violet }}>{oppName}</span></span>
        <div className="pvp-opp-bar">
          <div className="pvp-opp-bar-label">{oppName} {oppPct !== null ? `${oppPct}%` : '—'}</div>
          <div className="pvp-opp-bar-track">
            <div className="pvp-opp-bar-fill" style={{ width: `${oppPct || 0}%` }} />
          </div>
        </div>
        <button className="pvp-forfeit-btn" onClick={() => handleLose(0, 0, {})}>Forfeit</button>
      </div>
      <TileMatchingDailyGame
        boardSeedOverride={match.boardSeed}
        onWin={handleWin}
        onLose={handleLose}
        onStepChange={handleStepChange}
        onMoveTile={handleMoveTile}
        resetKey={match.matchId}
        offset={0}
      />
    </div>
  );
}

function PvpResult({ result, onBack, onOpenReceipt }) {
  const { isWinner, match, claimCalldata, contractAddr, prize, telemetrySummary } = result || {};
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimErr, setClaimErr] = useState(null);
  const [txHash, setTxHash] = useState(null);
  // DApp Mode: surface + anchor the verified session minted from this match's
  // telemetry (server already replayed it).
  const [dappSession, setDappSession] = useState(result && result.dapp);
  useEffect(() => {
    if (result && result.dapp) {
      setDappSession(result.dapp);
      dappAnchor(result.dapp).then(setDappSession);
    }
  }, [result && result.dapp && result.dapp.sessionId]);

  const handleClaim = async () => {
    if (!claimCalldata || !contractAddr) return;
    setClaiming(true);
    setClaimErr(null);
    try {
      const tx = await window.usernode.sendTransaction({ to: contractAddr, data: claimCalldata });
      setTxHash(tx && tx.hash ? tx.hash : null);
      setClaimed(true);
    } catch (e) {
      setClaimErr(e && e.message ? e.message : 'Transaction failed');
    }
    setClaiming(false);
  };

  const myScore = match && (result.playerIsP1 !== false
    ? (match.p1Score != null ? match.p1Score : match.p2Score)
    : (match.p2Score != null ? match.p2Score : match.p1Score));
  const oppScore = match && (result.playerIsP1 !== false
    ? match.p2Score
    : match.p1Score);

  return (
    <div className="pvp-result">
      <div className="pvp-result-emoji">{isWinner ? '🏆' : '💀'}</div>
      <div className="pvp-result-title">{isWinner ? 'You Won!' : 'You Lost'}</div>

      {dappSession && <VerifiedBadge session={dappSession} onOpenReceipt={onOpenReceipt} />}

      {telemetrySummary && (
        <div className="pvp-telem-summary">
          <div className="pvp-telem-row">
            <span>Moves</span><span className="mono">{telemetrySummary.moveCount}</span>
          </div>
          <div className="pvp-telem-row">
            <span>Time</span><span className="mono">{telemetrySummary.timeTaken}s</span>
          </div>
          <div className="pvp-telem-row">
            <span>Tiles cleared</span><span className="mono">{telemetrySummary.tilesCleared}/72</span>
          </div>
        </div>
      )}

      {match && (
        <div className="score-rows" style={{ width: '100%', textAlign: 'left' }}>
          <div className="score-row">
            <span className="k">Your score</span>
            <span className="v mono">{myScore != null ? myScore : '—'}</span>
          </div>
          <div className="score-row">
            <span className="k">Opponent</span>
            <span className="v mono">{oppScore != null ? oppScore : '—'}</span>
          </div>
        </div>
      )}

      {isWinner && prize && (
        <div className="pvp-prize-anim">
          <div className="pvp-prize-title">Prize Distribution</div>
          <div className="pvp-prize-row pvp-prize-winner">
            <span>You (90%)</span><span className="mono">+{prize.winnerPrize} UTGO</span>
          </div>
          <div className="pvp-prize-row">
            <span>Treasury (8%)</span><span className="mono">{prize.treasuryFee} UTGO</span>
          </div>
          <div className="pvp-prize-row">
            <span>Burned (2%)</span><span className="mono">{prize.burned} UTGO 🔥</span>
          </div>
        </div>
      )}

      {claiming && (
        <div style={{ color: C.text, fontSize: '0.85rem', margin: '0.5rem 0' }}>
          Funds are being sent to your wallet…
        </div>
      )}
      {claimed && txHash && (
        <div style={{ color: C.emerald, fontSize: '0.8rem', wordBreak: 'break-all', margin: '0.25rem 0' }}>
          Tx: {txHash}
        </div>
      )}
      {claimErr && <div style={{ color: C.rose, fontSize: '0.8rem', margin: '0.25rem 0' }}>{claimErr}</div>}

      <div className="pvp-result-btns">
        {isWinner && claimCalldata && !claimed && (
          <button className="primary-btn" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Claiming…' : 'Claim Winnings'}
          </button>
        )}
        {claimed && <div style={{ color: C.emerald, fontWeight: 600 }}>Winnings claimed!</div>}
        <button
          className="primary-btn"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          onClick={onBack}
        >
          Back to Arena
        </button>
      </div>
    </div>
  );
}

function PvpArena({ user, authOk, walletAddr: appWalletAddr, walletBalance: appWalletBalance, onOpenReceipt }) {
  const [phase, setPhase] = useState('lobby'); // lobby | matchmaking | game | result
  const [match, setMatch] = useState(null);
  const [joining, setJoining] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  // Use app-level wallet addr/balance when available; fall back to own fetch
  const [localAddr, setLocalAddr] = useState(null);
  const [localBalance, setLocalBalance] = useState(null);
  const playerAddr = appWalletAddr || localAddr;
  const balance = appWalletBalance || localBalance;
  const pollRef = useRef(null);

  useEffect(() => {
    if (appWalletAddr) return; // already have it from app level
    if (!window.usernode || !window.usernode.getNodeAddress) return;
    window.usernode.getNodeAddress().then(addr => {
      if (!addr) return;
      setLocalAddr(addr);
      api(`/api/pvp/balance?addr=${encodeURIComponent(addr)}`)
        .then(({ ok, body }) => { if (ok && body) setLocalBalance(body.balance); })
        .catch(() => {});
    }).catch(() => {});
  }, [appWalletAddr]);

  // Poll for opponent joining while in matchmaking; also refresh cancelQueueCalldata
  useEffect(() => {
    if (phase !== 'matchmaking' || !match) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      if (body.status === 'active') {
        clearInterval(pollRef.current);
        setMatch(body);
        setPhase('game');
      } else {
        // Refresh cancelQueueCalldata when it becomes available after 120s
        setMatch(prev => prev ? { ...prev, cancelQueueCalldata: body.cancelQueueCalldata || prev.cancelQueueCalldata } : prev);
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [phase, match && match.matchId]);

  const handleJoin = async (betTier) => {
    if (!playerAddr) return;
    setJoining(betTier);
    const { ok, body } = await api('/api/pvp/join', {
      method: 'POST',
      body: JSON.stringify({ betTier, playerAddr }),
    });
    setJoining(null);
    if (!ok || !body) return;
    setMatch(body);
    setPhase(body.status === 'active' ? 'game' : 'matchmaking');
  };

  const handleCancel = async () => {
    if (match) {
      await api(`/api/pvp/match/${match.matchId}/cancel`, { method: 'DELETE' });
    }
    clearInterval(pollRef.current);
    setMatch(null);
    setPhase('lobby');
  };

  const handleReclaim = () => {
    clearInterval(pollRef.current);
    setMatch(null);
    setPhase('lobby');
  };

  const handleResult = (result) => {
    setPvpResult(result);
    setPhase('result');
  };

  if (!authOk) {
    return <div className="pvp-auth-msg">Sign in to play PvP matches.</div>;
  }

  const playerIsP1 = match && user && match.player1Id === user.id;

  if (phase === 'lobby') {
    return <PvpLobby user={user} balance={balance} onJoin={handleJoin} joining={joining} />;
  }
  if (phase === 'matchmaking') {
    return <PvpMatchmaking
      match={match}
      onCancel={handleCancel}
      onReclaim={handleReclaim}
      cancelQueueCalldata={match && match.cancelQueueCalldata}
    />;
  }
  if (phase === 'game' && match) {
    return <PvpGameScreen match={match} playerIsP1={playerIsP1} onResult={handleResult} />;
  }
  if (phase === 'result') {
    return <PvpResult result={pvpResult} onBack={() => { setMatch(null); setPhase('lobby'); }} onOpenReceipt={onOpenReceipt} />;
  }
  return null;
}

// UTGO_CONTRACT_ADDRESS exposed for PvpGameScreen (staging: undefined)
const UTGO_CONTRACT_ADDRESS = null; // injected from env in production

/* ============================================================
   Wallet helpers
   ============================================================ */
function fmtUtgo(weiStr) {
  if (!weiStr || weiStr === '0') return '0.00 UTGO';
  try {
    const n = Number(BigInt(weiStr)) / 1e18;
    return n.toFixed(2) + ' UTGO';
  } catch { return '0.00 UTGO'; }
}

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

/* ============================================================
   TipModal — send $UTGO to another user
   ============================================================ */
function TipModal({ toUser, onClose, onSuccess }) {
  const TIP_PRESETS = ['1', '5', '10'];
  const [amount, setAmount] = React.useState('1');
  const [customAmount, setCustomAmount] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [done, setDone] = React.useState(null);

  const selectedAmount = customAmount || amount;

  const handleSend = async () => {
    const amountFloat = parseFloat(selectedAmount);
    if (!amountFloat || amountFloat <= 0) {
      setErr('Enter a valid amount');
      return;
    }
    const amountWei = BigInt(Math.round(amountFloat * 1e18)).toString();
    setSending(true);
    setErr(null);
    try {
      // Prepare: get calldata + recipient addr
      const { ok: prepOk, body: prep } = await api('/api/wallet/tip/prepare', {
        method: 'POST',
        body: JSON.stringify({ toUserId: toUser.id, amount: amountWei }),
      });
      if (!prepOk) {
        setErr(prep && prep.error ? prep.error : 'Failed to prepare tip');
        setSending(false);
        return;
      }

      let txHash = '0xmock';
      const isMock = !window.usernode || !prep.calldata || !prep.contractAddr
        || (window.usernode.isMockEnabled && await window.usernode.isMockEnabled());
      if (!isMock && window.usernode && window.usernode.sendTransaction) {
        const tx = await window.usernode.sendTransaction({
          to: prep.contractAddr,
          data: prep.calldata,
        });
        txHash = tx && tx.hash ? tx.hash : '0xunknown';
      }

      // Confirm
      const { ok: confOk } = await api('/api/wallet/tip/confirm', {
        method: 'POST',
        body: JSON.stringify({ toUserId: toUser.id, amount: amountWei, txHash }),
      });
      if (!confOk) {
        setErr('Tip sent but confirmation failed — check your wallet history');
        setSending(false);
        return;
      }
      setDone({ txHash, amount: fmtUtgo(amountWei), isMock });
    } catch (e) {
      setErr(e && e.message ? e.message : 'Transaction failed');
    }
    setSending(false);
  };

  return (
    <div className="tip-modal-backdrop" onClick={onClose}>
      <div className="tip-modal" onClick={e => e.stopPropagation()}>
        <h3>Tip {toUser.username}</h3>
        {done ? (
          <div>
            <div style={{ color: C.emerald, fontWeight: 600, marginBottom: '0.5rem' }}>
              Sent {done.amount}! {done.isMock && <span style={{ color: C.muted, fontSize: '0.8rem' }}>(demo)</span>}
            </div>
            {done.txHash && !done.isMock && (
              <div style={{ fontSize: '0.72rem', color: C.muted, wordBreak: 'break-all', marginBottom: '0.75rem' }}>
                Tx: {done.txHash}
              </div>
            )}
            <button className="primary-btn" onClick={() => { onSuccess && onSuccess(); onClose(); }}>Done</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.75rem' }}>
              Quick amounts (UTGO):
            </div>
            <div className="tip-presets">
              {TIP_PRESETS.map(p => (
                <button
                  key={p}
                  className={'tip-preset-btn' + (amount === p && !customAmount ? ' active' : '')}
                  onClick={() => { setAmount(p); setCustomAmount(''); }}
                >{p}</button>
              ))}
            </div>
            <input
              className="tip-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Custom amount"
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setAmount(''); }}
            />
            {err && <div style={{ color: C.rose, fontSize: '0.82rem', marginBottom: '0.5rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="primary-btn" disabled={sending} onClick={handleSend} style={{ flex: 1 }}>
                {sending ? 'Sending…' : `Send ${selectedAmount || '?'} UTGO`}
              </button>
              <button
                className="primary-btn"
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
                onClick={onClose}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   WalletScreen — the full wallet management view
   ============================================================ */
function WalletScreen({ user, authOk, walletAddr, walletMock, onBack, onBalanceRefresh, onOpenReceipt }) {
  const [walletData, setWalletData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [claiming, setClaiming] = React.useState(false);
  const [claimResult, setClaimResult] = React.useState(null);
  const [buyingFreeze, setBuyingFreeze] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [freezeMsg, setFreezeMsg] = React.useState(null);

  const loadWallet = async () => {
    const demo = new URLSearchParams(window.location.search).get('demo');
    const path = '/api/wallet' + (demo ? `?demo=${encodeURIComponent(demo)}` : '');
    const { ok, body } = await api(path);
    if (ok && body) setWalletData(body);
    setLoading(false);
  };

  React.useEffect(() => { loadWallet(); }, []);

  const handleCopy = async () => {
    if (!walletData || !walletData.addr) return;
    try {
      await navigator.clipboard.writeText(walletData.addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleClaim = async () => {
    setClaiming(true);
    setClaimResult(null);
    try {
      const { ok, body } = await api('/api/wallet/rewards/claim', { method: 'POST' });
      if (!ok) {
        setClaimResult({ err: (body && body.error) || 'Failed to claim' });
        setClaiming(false);
        return;
      }
      // Mock or signed claim
      if (body.mock || !body.claimCalldata) {
        setClaimResult({ txHash: body.txHash || '0xstagingclaim', mock: true, amount: fmtUtgo(body.amountWei) });
        await loadWallet();
        onBalanceRefresh && onBalanceRefresh();
        setClaiming(false);
        return;
      }
      // Real on-chain claim
      const tx = await window.usernode.sendTransaction({
        to: body.contractAddr,
        data: body.claimCalldata,
      });
      const txHash = tx && tx.hash ? tx.hash : '0xunknown';
      await api('/api/wallet/rewards/claim/confirm', {
        method: 'POST',
        body: JSON.stringify({ txHash }),
      });
      setClaimResult({ txHash, mock: false, amount: fmtUtgo(body.amountWei) });
      await loadWallet();
      onBalanceRefresh && onBalanceRefresh();
    } catch (e) {
      setClaimResult({ err: e && e.message ? e.message : 'Transaction failed' });
    }
    setClaiming(false);
  };

  const handleBuyFreeze = async () => {
    setBuyingFreeze(true);
    setFreezeMsg(null);
    const { ok, body } = await api('/api/wallet/spend/streak-freeze', { method: 'POST' });
    if (ok && body) {
      setFreezeMsg(`Freeze purchased! You now have ${body.streakFreezes} freeze${body.streakFreezes === 1 ? '' : 's'}.`);
      await loadWallet();
    } else {
      setFreezeMsg((body && body.error) || 'Insufficient pending rewards');
    }
    setBuyingFreeze(false);
  };

  // DApp Mode: prove wallet ownership (challenge → signMessage → verify) and
  // disconnect (clear the proof). Connect itself happens automatically at app
  // load; this button (re)runs the cryptographic proof on demand.
  const [proving, setProving] = React.useState(false);
  const handleProve = async () => {
    setProving(true);
    try {
      const addr = (walletData && walletData.addr) || walletAddr;
      if (!addr) { setProving(false); return; }
      if (!window.usernode || !window.usernode.signMessage) {
        setFreezeMsg('This wallet cannot sign — identity stays linked (unproven).');
        setProving(false);
        return;
      }
      const { ok, body } = await api('/api/wallet/challenge');
      if (ok && body && body.message) {
        const sig = await window.usernode.signMessage(body.message);
        if (sig) {
          await api('/api/wallet/prove', { method: 'POST', body: JSON.stringify({ addr, nonce: body.nonce, signature: sig }) });
          await loadWallet();
        }
      }
    } catch (e) {}
    setProving(false);
  };
  const handleDisconnect = async () => {
    await api('/api/wallet/disconnect', { method: 'POST' }).catch(() => {});
    await loadWallet();
  };

  if (!authOk) {
    return (
      <div className="wallet-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="wallet-no-wallet" style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔐</div>
          <div>Sign in to PuzzleChain to access your wallet.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wallet-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading wallet…</p>
      </div>
    );
  }

  if (!walletData || !walletData.addr) {
    return (
      <div className="wallet-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>My Wallet</h2>
        <div className="wallet-no-wallet">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔗</div>
          <div>No wallet linked yet.</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Open this app inside Usernode with a linked wallet to see your balance.
          </div>
        </div>
      </div>
    );
  }

  const d = walletData;
  const isMock = d.mock || walletMock;
  const hasPending = d.pendingWei && d.pendingWei !== '0';
  const FREEZE_PRICE = '5.00 UTGO';

  return (
    <div className="wallet-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>My Wallet</h2>

      {isMock && (
        <div className="wallet-mock-badge">Demo wallet — balances are simulated</div>
      )}

      {/* Address + identity */}
      <div className="wallet-card">
        <div className="wallet-card-title">
          Connected Wallet
          {d.identityVerified
            ? <span className="dapp-identity-badge">✓ Verified identity</span>
            : <span className="dapp-identity-badge unproven">Linked (unproven)</span>}
        </div>
        <div className="wallet-addr-row">
          <span className="wallet-addr mono">{d.addr}</span>
          <button
            className="primary-btn"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', flexShrink: 0 }}
            onClick={handleCopy}
          >{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <div className="dapp-wallet-btns">
          {!d.identityVerified && (
            <button className="primary-btn" disabled={proving}
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
              onClick={handleProve}>
              {proving ? 'Signing…' : 'Prove ownership'}
            </button>
          )}
          <button className="primary-btn"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
            onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      {/* On-chain balance */}
      <div className="wallet-card">
        <div className="wallet-card-title">On-Chain Balance</div>
        <div className="wallet-balance-big">{fmtUtgo(d.balanceWei)}</div>
        {isMock && <div className="wallet-balance-sub">(simulated)</div>}
      </div>

      {/* Pending rewards */}
      <div className="wallet-card">
        <div className="wallet-card-title">Pending Puzzle Rewards</div>
        <div className="wallet-pending-big">{fmtUtgo(d.pendingWei)}</div>
        <div className="wallet-balance-sub">
          {fmtUtgo(d.lifetimeEarnedWei)} lifetime earned · {fmtUtgo(d.lifetimeClaimedWei)} claimed
        </div>
        {claimResult && !claimResult.err && (
          <div style={{ color: C.emerald, fontSize: '0.83rem', margin: '0.5rem 0' }}>
            Claimed {claimResult.amount}! {claimResult.mock && '(demo)'}
            {claimResult.txHash && !claimResult.mock && (
              <div style={{ fontSize: '0.7rem', color: C.muted, wordBreak: 'break-all' }}>
                Tx: {claimResult.txHash}
              </div>
            )}
          </div>
        )}
        {claimResult && claimResult.err && (
          <div style={{ color: C.rose, fontSize: '0.82rem', margin: '0.5rem 0' }}>{claimResult.err}</div>
        )}
        <div className="wallet-btn-row">
          <button
            className="primary-btn"
            disabled={!hasPending || claiming}
            onClick={handleClaim}
            style={!hasPending ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
          >
            {claiming ? 'Claiming…' : 'Claim to Wallet'}
          </button>
        </div>
      </div>

      {/* Streak freeze */}
      <div className="wallet-card">
        <div className="wallet-card-title">Streak Freeze</div>
        <div style={{ fontSize: '0.88rem', marginBottom: '0.6rem' }}>
          You have <strong style={{ color: C.gold }}>{d.streakFreezes}</strong> freeze{d.streakFreezes === 1 ? '' : 's'} banked.
          A freeze protects your streak against one missed day.
        </div>
        {freezeMsg && (
          <div style={{ fontSize: '0.82rem', color: C.emerald, marginBottom: '0.5rem' }}>{freezeMsg}</div>
        )}
        <button
          className="primary-btn"
          disabled={buyingFreeze || !hasPending}
          onClick={handleBuyFreeze}
          style={!hasPending ? { opacity: 0.45, cursor: 'not-allowed' } : { background: C.gold + 'cc' }}
        >
          {buyingFreeze ? 'Purchasing…' : `Buy Freeze (${FREEZE_PRICE})`}
        </button>
        {!hasPending && <div className="wallet-freeze-info">Earn rewards by solving daily puzzles first.</div>}
      </div>

      {/* Recent activity */}
      {d.recent && d.recent.length > 0 && (
        <div className="wallet-card">
          <div className="wallet-card-title">Recent Activity</div>
          {d.recent.map((ev, i) => {
            const isReward = ev.kind === 'reward';
            const isTipRecv = ev.kind === 'tip_received';
            const isTipSent = ev.kind === 'tip_sent';
            const label = isReward ? '🪙 Puzzle reward' : isTipRecv ? '💰 Tip received' : '→ Tip sent';
            const amtClass = isReward ? 'wallet-activity-earned' : isTipRecv ? 'wallet-activity-tip-recv' : 'wallet-activity-tip-sent';
            const prefix = isReward || isTipRecv ? '+' : '-';
            return (
              <div className="wallet-activity-row" key={i}>
                <span className="wallet-activity-kind">{label}</span>
                <span className={`wallet-activity-amt ${amtClass}`}>{prefix}{fmtUtgo(ev.amount_wei)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DApp Mode — Verified badge, session receipt, verified leaderboard
   ============================================================ */
function shortHash(h) {
  if (!h) return '—';
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}

// Compact "Verified" stamp shown on a finished result. Clicking opens the
// session receipt. `session` is the shape returned by /api/dapp/* endpoints.
function VerifiedBadge({ session, onOpenReceipt }) {
  if (!session) return null;
  const disputed = session.status === 'disputed';
  const anchored = session.anchorStatus === 'anchored';
  const mock = session.anchorStatus === 'mock';
  let label;
  if (disputed) label = "Couldn't be verified";
  else if (anchored) label = 'Verified ✓ — anchored on-chain';
  else if (mock) label = 'Verified ✓ — demo / not anchored';
  else if (session.anchorStatus === 'pending') label = 'Verified ✓ — anchor pending';
  else label = 'Verified ✓ — not anchored';
  return (
    <button
      className={`dapp-badge${disputed ? ' disputed' : ''}`}
      onClick={() => onOpenReceipt && onOpenReceipt(session.sessionId)}
      title="View session receipt"
    >
      <span className="dapp-badge-dot">{disputed ? '⚠' : '🔗'}</span>
      <span>{label}</span>
      <span className="dapp-badge-arrow">›</span>
    </button>
  );
}

// Full session receipt / audit view. Reads GET /api/dapp/sessions/:id.
function SessionReceipt({ sessionId, onBack }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const sid = sessionId || new URLSearchParams(window.location.search).get('sid') || 'DAPPDEMOOK';

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api(`/api/dapp/sessions/${encodeURIComponent(sid)}`);
      if (!alive) return;
      setData(ok && body ? body : { error: true });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [sid]);

  if (loading) {
    return (
      <div className="wallet-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading session receipt…</p>
      </div>
    );
  }
  if (!data || data.error || !data.session) {
    return (
      <div className="wallet-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Session Receipt</h2>
        <div className="wallet-no-wallet"><div>Session not found.</div></div>
      </div>
    );
  }
  const s = data.session;
  const ledger = data.ledger || [];
  const disputed = s.status === 'disputed';
  return (
    <div className="wallet-screen dapp-receipt">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>Session Receipt</h2>
      <div className={`dapp-verdict ${disputed ? 'bad' : 'ok'}`}>
        {disputed ? 'This result could not be verified' : 'Verified - replayed by the server'}
        {disputed && s.disputeReason && <div className="dapp-verdict-reason">Reason: {s.disputeReason}</div>}
      </div>

      <div className="wallet-card">
        <div className="wallet-card-title">Session</div>
        <div className="dapp-kv"><span>Game</span><span className="mono">{s.gameId}</span></div>
        <div className="dapp-kv"><span>Seed</span><span className="mono">{s.seed != null ? s.seed : '—'}</span></div>
        <div className="dapp-kv"><span>Score · Steps</span><span className="mono">{s.finalScore != null ? s.finalScore : '—'} · {s.finalSteps != null ? s.finalSteps : '—'}</span></div>
        <div className="dapp-kv"><span>Status</span><span className="mono">{s.status}</span></div>
      </div>

      <div className="wallet-card">
        <div className="wallet-card-title">Chain hash</div>
        <div className="dapp-hash mono">{s.chainHash || '—'}</div>
        <div className="dapp-kv" style={{ marginTop: '0.5rem' }}>
          <span>On-chain anchor</span>
          <span className="mono">
            {s.anchorStatus === 'anchored' ? 'anchored' : s.anchorStatus === 'mock' ? 'demo (not anchored)' : s.anchorStatus}
          </span>
        </div>
        {s.anchorTxHash && (
          <div className="dapp-kv"><span>Anchor tx</span><span className="mono">{shortHash(s.anchorTxHash)}</span></div>
        )}
      </div>

      {ledger.length > 0 && (
        <div className="wallet-card">
          <div className="wallet-card-title">Hash-chain ledger ({ledger.length})</div>
          <div className="dapp-ledger">
            {ledger.map(e => (
              <div className="dapp-ledger-row" key={e.sequence}>
                <span className="mono dapp-ledger-seq">#{e.sequence}</span>
                <span className="mono dapp-ledger-hash">{shortHash(e.chainHash)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.gameId && <VerifiedLeaderboard gameId={s.gameId} onOpenReceipt={onBack && ((sid2) => { window.location.search = `?screen=session&sid=${sid2}`; })} />}
    </div>
  );
}

// "Verified" leaderboard tab — replay-validated sessions only.
function VerifiedLeaderboard({ gameId, onOpenReceipt }) {
  const [state, setState] = React.useState({ loading: true, entries: [] });
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api(`/api/dapp/leaderboard/${gameId}`);
      if (!alive) return;
      setState({ loading: false, entries: (ok && body && body.entries) || [] });
    })();
    return () => { alive = false; };
  }, [gameId]);
  if (state.loading) return <div className="lboard"><div className="lboard-empty">Loading…</div></div>;
  return (
    <div className="lboard">
      <div className="lboard-title">Verified leaderboard <span className="dapp-verified-pill">replay-validated</span></div>
      {state.entries.length === 0 ? (
        <div className="lboard-empty">No verified results yet.</div>
      ) : (
        <div className="lboard-rows">
          {state.entries.map(e => (
            <button key={e.sessionId} className="lrow dapp-lrow" onClick={() => onOpenReceipt && onOpenReceipt(e.sessionId)}>
              <span className="lrank mono">#{e.rank}</span>
              <span className="lname">{e.username} {e.anchored && <span title="anchored on-chain">🔗</span>}</span>
              <span className="ltime mono">{e.score} pts</span>
              <span className="lsteps mono">{lbFmtTime(e.timeSecs)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Game registry
   (more games slot in here — lobby/lock/win/scoring auto-wire)
   ============================================================ */
/* ============================================================
   Social Components — Profile & Friends
   ============================================================ */

function ProfileScreen({ userId, user: loggedInUser, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTip, setShowTip] = useState(false);

  const loadProfile = async () => {
    const { ok, body } = await api(`/api/social/profile/${userId}`);
    if (ok && body) setProfile(body);
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const handleFollow = async () => {
    if (!profile) return;
    const { ok } = await api(`/api/social/follow/${profile.user.id}`, { method: 'POST' });
    if (ok) {
      setProfile(prev => ({ ...prev, following: true }));
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const { ok } = await api(`/api/social/unfollow/${profile.user.id}`, { method: 'DELETE' });
    if (ok) {
      setProfile(prev => ({ ...prev, following: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.rose, marginTop: '1rem' }}>Profile not found</p>
      </div>
    );
  }

  const isOwnProfile = loggedInUser && loggedInUser.id === profile.user.id;

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        padding: '1.5rem',
        marginTop: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{profile.user.username}</h2>
            <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0.25rem 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(profile.user.createdAt).toLocaleDateString()}
            </p>
            {isOwnProfile && <p style={{ color: C.emerald, fontSize: '0.8rem', margin: '0.5rem 0 0' }}>Your Profile</p>}
          </div>
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button
                className="primary-btn"
                style={{
                  background: profile.following ? C.surface : C.accent,
                  border: `1px solid ${profile.following ? C.border : C.accent}`,
                  color: profile.following ? C.text : 'white',
                  padding: '0.5rem 1rem',
                }}
                onClick={profile.following ? handleUnfollow : handleFollow}
              >
                {profile.following ? 'Unfollow' : 'Follow'}
              </button>
              <button
                className="primary-btn"
                disabled={!profile.walletLinked}
                title={!profile.walletLinked ? "This user hasn't set up a wallet yet" : `Tip ${profile.user.username}`}
                style={{
                  padding: '0.4rem 0.9rem',
                  background: profile.walletLinked ? C.gold + 'cc' : C.surface,
                  border: `1px solid ${profile.walletLinked ? C.gold : C.border}`,
                  color: profile.walletLinked ? C.bg : C.muted,
                  cursor: profile.walletLinked ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  opacity: profile.walletLinked ? 1 : 0.5,
                }}
                onClick={() => profile.walletLinked && setShowTip(true)}
              >
                🪙 Tip
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.totalScore}</div>
          </div>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Streak</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.emerald, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.currentStreak}</div>
          </div>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Played</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.gamesPlayed}</div>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <BadgeStrip
            badges={Array.isArray(profile.badges) ? profile.badges : []}
            achievements={profile.achievements || { types: [], milestones: [] }}
          />
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1rem', fontSize: '0.9rem' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{ color: C.muted }}>Followers:</span>{' '}
            <span style={{ fontWeight: 600, color: C.accent }}>{profile.followerCount}</span>
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{ color: C.muted }}>Following:</span>{' '}
            <span style={{ fontWeight: 600, color: C.accent }}>{profile.followingCount}</span>
          </p>
          {profile.tipsReceivedWei && profile.tipsReceivedWei !== '0' && (
            <p style={{ margin: '0.5rem 0' }}>
              <span style={{ color: C.muted }}>Tips received:</span>{' '}
              <span style={{ fontWeight: 600, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtUtgo(profile.tipsReceivedWei)}
              </span>
            </p>
          )}
          {profile.recentTippers && profile.recentTippers.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ color: C.muted, fontSize: '0.78rem', marginBottom: '0.25rem' }}>Recent tips:</div>
              {profile.recentTippers.slice(0, 3).map((t, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: C.text }}>
                  {t.fromUserId} → <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmtUtgo(t.amountWei)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showTip && (
        <TipModal
          toUser={profile.user}
          onClose={() => setShowTip(false)}
          onSuccess={loadProfile}
        />
      )}
    </div>
  );
}

function FriendsListScreen({ onSelectUser, onBack }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      const { ok, body } = await api('/api/social/friends');
      if (ok && body && body.friends) {
        setFriends(body.friends);
      }
      setLoading(false);
    };
    loadFriends();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading friends...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1.5rem 0 1rem' }}>Friends</h2>

      {friends.length === 0 ? (
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '14px',
          padding: '2rem',
          textAlign: 'center',
          color: C.muted
        }}>
          <p>You're not following anyone yet. Go to a profile and click Follow!</p>
        </div>
      ) : (
        <div>
          {friends.map(friend => (
            <div
              key={friend.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{friend.username}</div>
                <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.25rem' }}>
                  Score: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{friend.totalScore}</span>
                  {' · '}
                  Streak: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.emerald }}>{friend.currentStreak}</span>
                </div>
              </div>
              <button
                className="primary-btn"
                style={{
                  background: C.accent,
                  border: `1px solid ${C.accent}`,
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem'
                }}
                onClick={() => onSelectUser(friend.id)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Zuma — frog shooter (Classic, leaderboard)
   ============================================================ */
const ZUMA_W = 300, ZUMA_H = 400;
const ZUMA_BALL_R = 11;
const ZUMA_DIAM = ZUMA_BALL_R * 2 + 2;
const ZUMA_SHOT_SPEED = 300;
const FROG_X = 150, FROG_Y = 218;
const ZUMA_COLORS_ALL = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const ZUMA_PATH_S = [
  {x:28,y:32},{x:75,y:25},{x:135,y:22},{x:195,y:25},{x:250,y:34},
  {x:276,y:58},{x:278,y:100},{x:268,y:138},{x:245,y:162},
  {x:208,y:175},{x:165,y:180},{x:122,y:175},{x:82,y:162},
  {x:52,y:138},{x:28,y:108},{x:18,y:155},{x:22,y:195},
  {x:42,y:228},{x:78,y:248},{x:120,y:256},{x:162,y:258},
  {x:205,y:255},{x:245,y:242},{x:268,y:220},
  {x:274,y:268},{x:265,y:308},{x:242,y:338},{x:208,y:358},
  {x:170,y:370},{x:148,y:374},
];

const ZUMA_PATH_L3 = [
  {x:28,y:32},{x:75,y:25},{x:135,y:22},{x:195,y:25},{x:250,y:34},
  {x:276,y:58},{x:278,y:100},{x:268,y:138},{x:245,y:162},
  {x:208,y:175},{x:165,y:180},{x:122,y:175},{x:82,y:162},
  {x:52,y:138},{x:28,y:108},{x:18,y:155},{x:22,y:195},
  {x:42,y:228},{x:78,y:248},{x:120,y:256},{x:162,y:258},
  {x:205,y:255},{x:245,y:242},{x:268,y:220},
  {x:255,y:248},{x:225,y:262},{x:188,y:268},{x:150,y:270},
  {x:112,y:268},{x:78,y:260},{x:52,y:245},{x:32,y:270},
  {x:26,y:300},{x:32,y:328},{x:52,y:350},{x:88,y:368},
  {x:125,y:377},{x:148,y:380},
];

const ZUMA_LEVELS = [
  { path: ZUMA_PATH_S,  ballCount: 20, speed: 9,  colors: 4 },
  { path: ZUMA_PATH_S,  ballCount: 26, speed: 15, colors: 4 },
  { path: ZUMA_PATH_L3, ballCount: 32, speed: 23, colors: 5 },
];

function zumaComputePathData(waypoints) {
  const cumDists = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i-1].x;
    const dy = waypoints[i].y - waypoints[i-1].y;
    cumDists.push(cumDists[i-1] + Math.hypot(dx, dy));
  }
  return { waypoints, cumDists, totalLen: cumDists[cumDists.length - 1] };
}

function zumaPointAtDist(pd, dist) {
  const { waypoints: wps, cumDists: cd } = pd;
  if (dist <= 0) return wps[0];
  const last = cd.length - 1;
  if (dist >= cd[last]) return wps[last];
  let lo = 0, hi = last - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (cd[m+1] < dist) lo = m + 1; else hi = m;
  }
  const t = (dist - cd[lo]) / (cd[lo+1] - cd[lo]);
  return { x: wps[lo].x + t*(wps[lo+1].x - wps[lo].x), y: wps[lo].y + t*(wps[lo+1].y - wps[lo].y) };
}

function zumaBuildChain(count, numColors) {
  const balls = [];
  for (let i = 0; i < count; i++) {
    balls.push({ color: ZUMA_COLORS_ALL[Math.floor(Math.random() * numColors)], dist: -i * ZUMA_DIAM });
  }
  return balls;
}

function zumaRandColor(numColors) {
  return ZUMA_COLORS_ALL[Math.floor(Math.random() * numColors)];
}

function zumaCheckMatches(chain, idx) {
  if (chain.length === 0 || idx < 0 || idx >= chain.length) return 0;
  const color = chain[idx].color;
  let lo = idx, hi = idx;
  while (lo > 0 && chain[lo-1].color === color) lo--;
  while (hi < chain.length-1 && chain[hi+1].color === color) hi++;
  const runLen = hi - lo + 1;
  if (runLen < 3) return 0;
  chain.splice(lo, runLen);
  let extra = 0;
  if (lo > 0 && lo < chain.length) {
    const needed = chain[lo-1].dist - ZUMA_DIAM;
    const shift = needed - chain[lo].dist;
    if (shift > 1) {
      for (let i = lo; i < chain.length; i++) chain[i].dist += shift;
      if (chain[lo-1].color === chain[lo].color) extra += zumaCheckMatches(chain, lo);
    }
  }
  return runLen + extra;
}

function ZumaGame({ onWin, onStepChange, resetKey }) {
  const { useState, useEffect, useRef } = React;
  const [activeTab, setActiveTab] = useState('game');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [ballsPopped, setBallsPopped] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [activePowerups, setActivePowerups] = useState([]);
  const [lb, setLb] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState(false);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const submittedRef = useRef(false);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const bpRef = useRef(0);
  const chainRef = useRef([]);
  const shotRef = useRef(null);
  const frogAngleRef = useRef(-Math.PI / 2);
  const curColorRef = useRef(ZUMA_COLORS_ALL[0]);
  const nxtColorRef = useRef(ZUMA_COLORS_ALL[1]);
  const pathDataRef = useRef(null);
  const powerUpsRef = useRef([]);
  const activePowerupsRef = useRef([]);
  const baseShotSpeedRef = useRef(ZUMA_SHOT_SPEED);
  const wildColorLoadedRef = useRef(0);
  const chainClearLoadedRef = useRef(0);
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  function initLevel(lvlNum) {
    const lvl = ZUMA_LEVELS[lvlNum - 1];
    pathDataRef.current = zumaComputePathData(lvl.path);
    chainRef.current = zumaBuildChain(lvl.ballCount, lvl.colors);
    curColorRef.current = zumaRandColor(lvl.colors);
    nxtColorRef.current = zumaRandColor(lvl.colors);
    shotRef.current = null;
  }

  function init() {
    levelRef.current = 1;
    scoreRef.current = 0;
    bpRef.current = 0;
    elapsedRef.current = 0;
    startedRef.current = false;
    doneRef.current = false;
    submittedRef.current = false;
    powerUpsRef.current = [];
    activePowerupsRef.current = [];
    wildColorLoadedRef.current = 0;
    chainClearLoadedRef.current = 0;
    initLevel(1);
    setScore(0); setLevel(1); setBallsPopped(0);
    setStarted(false); setDone(false); setElapsedSecs(0); setActivePowerups([]);
  }

  useEffect(() => { init(); }, [resetKey]);

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => { elapsedRef.current++; setElapsedSecs(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [started, done]);

  const submitScore = async (finalScore, finalLevel) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      await api('/api/zuma/score', {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, level: finalLevel, timeSecs: elapsedRef.current }),
      });
    } catch (_) {}
  };

  function triggerEnd(cleared) {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const s = scoreRef.current;
    const bp = bpRef.current;
    const secs = elapsedRef.current;
    const lv = levelRef.current;
    submitScore(s, lv);
    onWinRef.current(s, bp, secs, {
      winnerLabel: cleared ? 'Cleared! 🎉' : 'Game Over',
      share: cleared
        ? '🐸 Zuma — ' + s + ' pts, all 3 levels cleared!'
        : '🐸 Zuma — ' + s + ' pts, level ' + lv,
    });
  }

  const loopRunning = activeTab === 'game' && !done;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(ZUMA_W * dpr);
    canvas.height = Math.round(ZUMA_H * dpr);

    function drawFrame() {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, ZUMA_W, ZUMA_H);

      const pd = pathDataRef.current;
      if (pd) {
        // Track outer
        ctx.beginPath();
        ctx.moveTo(pd.waypoints[0].x, pd.waypoints[0].y);
        for (let i = 1; i < pd.waypoints.length; i++) ctx.lineTo(pd.waypoints[i].x, pd.waypoints[i].y);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = ZUMA_BALL_R * 2 + 6;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
        // Track inner
        ctx.beginPath();
        ctx.moveTo(pd.waypoints[0].x, pd.waypoints[0].y);
        for (let i = 1; i < pd.waypoints.length; i++) ctx.lineTo(pd.waypoints[i].x, pd.waypoints[i].y);
        ctx.strokeStyle = '#0e1f33';
        ctx.lineWidth = ZUMA_BALL_R * 2 - 2;
        ctx.stroke();
        // Entry marker
        const entry = pd.waypoints[0];
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 8, 0, Math.PI*2);
        ctx.fillStyle = '#334155'; ctx.fill();
        // Chain balls (back to front — lower dist first)
        const chain = chainRef.current;
        for (let i = chain.length - 1; i >= 0; i--) {
          const ball = chain[i];
          if (ball.dist < 0 || ball.dist > pd.totalLen) continue;
          const pt = zumaPointAtDist(pd, ball.dist);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, ZUMA_BALL_R, 0, Math.PI*2);
          ctx.fillStyle = ball.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(pt.x-3, pt.y-3, 4, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        }
        // Power-ups in flight
        for (let i = 0; i < powerUpsRef.current.length; i++) {
          const pu = powerUpsRef.current[i];
          ctx.save();
          ctx.translate(pu.x, pu.y);
          const rotation = ((Date.now() - pu.spawnedAt) / 100) % (Math.PI * 2);
          ctx.rotate(rotation);
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POWERUP_ICONS[pu.type], 0, 0);
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(pu.x, pu.y + pu.radius + 3, pu.radius * 0.7, pu.radius * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shot ball
        const sh = shotRef.current;
        if (sh) {
          ctx.beginPath(); ctx.arc(sh.x, sh.y, ZUMA_BALL_R, 0, Math.PI*2);
          ctx.fillStyle = sh.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(sh.x-3, sh.y-3, 4, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        }
        // Skull at path end
        const skull = pd.waypoints[pd.waypoints.length - 1];
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', skull.x, skull.y);
      }

      // Frog shadow
      ctx.beginPath(); ctx.arc(FROG_X+2, FROG_Y+2, 18, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      // Frog body
      ctx.beginPath(); ctx.arc(FROG_X, FROG_Y, 18, 0, Math.PI*2);
      ctx.fillStyle = '#059669'; ctx.fill();
      ctx.strokeStyle = '#064e3b'; ctx.lineWidth = 2; ctx.stroke();
      // Eyes
      const angle = frogAngleRef.current;
      const ex = Math.cos(angle-0.5)*10+FROG_X, ey = Math.sin(angle-0.5)*10+FROG_Y;
      const ex2 = Math.cos(angle+0.5)*10+FROG_X, ey2 = Math.sin(angle+0.5)*10+FROG_Y;
      ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+Math.cos(angle), ey+Math.sin(angle), 2, 0, Math.PI*2); ctx.fillStyle='#111'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, 3.5, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex2+Math.cos(angle), ey2+Math.sin(angle), 2, 0, Math.PI*2); ctx.fillStyle='#111'; ctx.fill();
      // Ball loaded in frog
      ctx.beginPath(); ctx.arc(FROG_X, FROG_Y, 8, 0, Math.PI*2);
      ctx.fillStyle = curColorRef.current; ctx.fill();
      // Aim pointer
      ctx.beginPath();
      ctx.moveTo(FROG_X+Math.cos(angle)*20, FROG_Y+Math.sin(angle)*20);
      ctx.lineTo(FROG_X+Math.cos(angle)*32, FROG_Y+Math.sin(angle)*32);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke();
      // Next ball preview
      const nx = FROG_X+Math.cos(angle+Math.PI)*30, ny = FROG_Y+Math.sin(angle+Math.PI)*30;
      ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI*2);
      ctx.fillStyle = nxtColorRef.current; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText('next', nx, ny);

      // Start overlay
      if (!startedRef.current && !doneRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, ZUMA_W, ZUMA_H);
        ctx.font = 'bold 16px "Space Grotesk",system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e2e8f0'; ctx.fillText('Tap to shoot!', ZUMA_W/2, ZUMA_H/2);
        ctx.font = '13px "Space Grotesk",system-ui,sans-serif';
        ctx.fillStyle = '#64748b'; ctx.fillText('Move pointer to aim', ZUMA_W/2, ZUMA_H/2+24);
      }
      ctx.restore();
    }

    if (!loopRunning) { drawFrame(); return; }

    let alive = true, lastTs = null;
    const loop = (ts) => {
      if (!alive) return;
      rafRef.current = requestAnimationFrame(loop);
      if (!lastTs) { lastTs = ts; drawFrame(); return; }
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const chain = chainRef.current;
      const pd = pathDataRef.current;
      const lv = ZUMA_LEVELS[levelRef.current - 1];

      // Advance chain
      for (let i = 0; i < chain.length; i++) chain[i].dist += lv.speed * dt;

      // Game over: front ball crossed the skull
      if (chain.length > 0 && chain[0].dist >= pd.totalLen) {
        triggerEnd(false); drawFrame(); return;
      }

      // Level cleared: chain empty and no shot in flight
      if (chain.length === 0 && !shotRef.current) {
        scoreRef.current += 500 * levelRef.current;
        setScore(scoreRef.current);
        if (levelRef.current >= 3) { triggerEnd(true); drawFrame(); return; }
        levelRef.current++;
        setLevel(levelRef.current);
        initLevel(levelRef.current);
        drawFrame(); return;
      }

      // Update power-ups and handle frog collision
      const now = Date.now();
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        updatePowerup(pu, dt);
        if (!pu.caught && Math.hypot(pu.x - FROG_X, pu.y - FROG_Y) < POWERUP_RADIUS + 18) {
          pu.caught = true;
          const existing = activePowerupsRef.current.find(p => p.type === pu.type);
          if (existing) {
            existing.stacks += 1;
            existing.startedAt = now;
          } else {
            activePowerupsRef.current.push({ type: pu.type, startedAt: now, stacks: 1 });
          }
          if (pu.type === 'chain-clear') chainClearLoadedRef.current = existing ? existing.stacks : 1;
          if (pu.type === 'color-switch') wildColorLoadedRef.current = existing ? existing.stacks : 1;
          setActivePowerups([...activePowerupsRef.current]);
          powerUpsRef.current.splice(i, 1);
        } else if (pu.y > ZUMA_H + 50) {
          powerUpsRef.current.splice(i, 1);
        }
      }
      for (let i = activePowerupsRef.current.length - 1; i >= 0; i--) {
        const ap = activePowerupsRef.current[i];
        if (now - ap.startedAt > POWERUP_DURATION_MS) {
          if (ap.type === 'chain-clear') chainClearLoadedRef.current = 0;
          if (ap.type === 'color-switch') wildColorLoadedRef.current = 0;
          activePowerupsRef.current.splice(i, 1);
        }
      }

      // Update baseShotSpeed for faster-shot power-up
      const fasterPower = activePowerupsRef.current.find(p => p.type === 'faster-shot');
      if (fasterPower) {
        baseShotSpeedRef.current = ZUMA_SHOT_SPEED * Math.pow(1.4, fasterPower.stacks);
      } else {
        baseShotSpeedRef.current = ZUMA_SHOT_SPEED;
      }

      // Advance shot ball
      if (shotRef.current) {
        const sh = shotRef.current;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        if (sh.x < -20 || sh.x > ZUMA_W+20 || sh.y < -20 || sh.y > ZUMA_H+20) {
          shotRef.current = null;
        } else {
          for (let i = 0; i < chain.length; i++) {
            if (chain[i].dist < 0) continue;
            const pt = zumaPointAtDist(pd, chain[i].dist);
            const dx = sh.x - pt.x, dy = sh.y - pt.y;
            if (dx*dx + dy*dy < (ZUMA_BALL_R*2)*(ZUMA_BALL_R*2)) {
              if (chainClearLoadedRef.current > 0) {
                chain.length = 0;
                chainClearLoadedRef.current = 0;
              } else {
                chain.splice(i+1, 0, { color: sh.color, dist: chain[i].dist - ZUMA_DIAM });
                for (let j = i+2; j < chain.length; j++) {
                  const needed = chain[j-1].dist - ZUMA_DIAM;
                  if (chain[j].dist > needed) chain[j].dist = needed; else break;
                }
                const p = zumaCheckMatches(chain, i+1);
                if (p > 0) {
                  const bonus = p >= 6 ? (p-5)*50 : 0;
                  scoreRef.current += p*10 + bonus;
                  bpRef.current += p;
                  setScore(scoreRef.current);
                  setBallsPopped(bpRef.current);
                  onStepRef.current && onStepRef.current(bpRef.current);
                }
              }
              if (Math.random() < POWERUP_SPAWN_RATE) {
                const pt = zumaPointAtDist(pd, chain[i] ? chain[i].dist : chain[chain.length - 1] ? chain[chain.length - 1].dist : 0);
                powerUpsRef.current.push(spawnPowerup(pt.x, pt.y, POWERUP_TYPES.zuma));
              }
              shotRef.current = null;
              break;
            }
          }
        }
      }
      drawFrame();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopRunning, resetKey]);

  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = ZUMA_W / rect.width, sy = ZUMA_H / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left)*sx, y: (cy - rect.top)*sy };
  };

  const updateAim = e => {
    const c = canvasRef.current; if (!c) return;
    const { x, y } = getCanvasCoords(e, c);
    frogAngleRef.current = Math.atan2(y - FROG_Y, x - FROG_X);
  };

  const shoot = () => {
    if (doneRef.current || shotRef.current) return;
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    const lv = ZUMA_LEVELS[levelRef.current - 1];
    const angle = frogAngleRef.current;
    const fasterPower = activePowerupsRef.current.find(p => p.type === 'faster-shot');
    const currentSpeed = fasterPower ? ZUMA_SHOT_SPEED * Math.pow(1.4, fasterPower.stacks) : ZUMA_SHOT_SPEED;

    const useWildColor = wildColorLoadedRef.current > 0;
    const shotColor = useWildColor ? '#ffffff' : curColorRef.current;
    if (useWildColor) wildColorLoadedRef.current = 0;

    shotRef.current = {
      x: FROG_X + Math.cos(angle)*20, y: FROG_Y + Math.sin(angle)*20,
      vx: Math.cos(angle)*currentSpeed, vy: Math.sin(angle)*currentSpeed,
      color: shotColor,
    };
    curColorRef.current = nxtColorRef.current;
    nxtColorRef.current = zumaRandColor(lv.colors);
  };

  const loadLeaderboard = async () => {
    setLbLoading(true); setLbError(false);
    const { ok, body } = await api('/api/zuma/leaderboard');
    if (ok && body) setLb(body); else setLbError(true);
    setLbLoading(false);
  };

  const fmtS = s => String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

  return (
    React.createElement('div', null,
      activeTab === 'game' && React.createElement('div', null,
        React.createElement('div', { className: 'status-bar' },
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Score'),
            React.createElement('div', { className: 'pvalue mono' }, score.toLocaleString())
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Level'),
            React.createElement('div', { className: 'pvalue mono' }, level + '/3')
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Popped'),
            React.createElement('div', { className: 'pvalue mono' }, ballsPopped)
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Time'),
            React.createElement('div', { className: 'pvalue mono' }, fmtS(elapsedSecs))
          ),
          activePowerups.map((ap, idx) => {
            const now = Date.now();
            const elapsed = now - ap.startedAt;
            const remaining = Math.max(0, Math.ceil((POWERUP_DURATION_MS - elapsed) / 1000));
            return React.createElement('div', { key: idx, className: 'pill', style: { background: C.emerald + '22', border: `1px solid ${C.emerald}` } },
              React.createElement('div', { className: 'plabel', style: { fontSize: '0.75rem' } },
                POWERUP_ICONS[ap.type] + ' ' + remaining + 's' + (ap.stacks > 1 ? ' ×' + ap.stacks : '')
              )
            );
          })
        ),
        React.createElement('div', { className: 'zuma-wrap' },
          React.createElement('canvas', {
            ref: canvasRef,
            className: 'zuma-canvas',
            onMouseMove: e => updateAim(e),
            onClick: e => { updateAim(e); shoot(); },
            onTouchMove: e => { e.preventDefault(); updateAim(e); },
            onTouchEnd: () => shoot(),
          })
        ),
        React.createElement('div', { className: 'bounce-controls' },
          React.createElement('button', { onClick: () => init() }, '↺ New Game')
        )
      ),
      activeTab === 'leaderboard' && React.createElement('div', null,
        lbLoading && React.createElement('div', { className: 'snake-lb-empty' }, 'Loading…'),
        !lbLoading && lbError && React.createElement('div', { className: 'snake-lb-empty' }, 'Leaderboard unavailable — score saved locally.'),
        !lbLoading && !lbError && lb && (() => {
          const top = lb.top || [], me = lb.me || null;
          const meInTop = me && top.some(r => r.rank === me.rank);
          if (!top.length) return React.createElement('div', { className: 'snake-lb-empty' }, 'No scores yet — be the first!');
          return React.createElement('div', { className: 'snake-lb-list' },
            top.map(r =>
              React.createElement('div', { key: r.rank, className: 'snake-lb-row' + (me && r.rank === me.rank ? ' snake-lb-me' : '') },
                React.createElement('span', { className: 'snake-lb-rank' }, '#' + r.rank),
                React.createElement('span', { className: 'snake-lb-name' }, r.username || 'anon'),
                React.createElement('span', { className: 'snake-lb-score' }, Number(r.bestScore).toLocaleString())
              )
            ),
            me && !meInTop && React.createElement('div', null,
              React.createElement('div', { className: 'snake-lb-divider' }, '···'),
              React.createElement('div', { className: 'snake-lb-row snake-lb-me' },
                React.createElement('span', { className: 'snake-lb-rank' }, '#' + me.rank),
                React.createElement('span', { className: 'snake-lb-name' }, me.username || 'You'),
                React.createElement('span', { className: 'snake-lb-score' }, Number(me.bestScore).toLocaleString())
              )
            )
          );
        })()
      ),
      React.createElement('div', { className: 't2048-bottom-nav' },
        ['game', 'leaderboard'].map(tab =>
          React.createElement('button', {
            key: tab,
            className: 't2048-tab' + (activeTab === tab ? ' active' : ''),
            onClick: () => { setActiveTab(tab); if (tab === 'leaderboard') loadLeaderboard(); },
          }, tab.charAt(0).toUpperCase() + tab.slice(1))
        )
      )
    )
  );
}

// ---- Match-3 Campaign Game ----
function Match3Game({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, resetKey }) {
  const [phase, setPhase] = useState('campaign'); // 'campaign' | 'playing' | 'won' | 'lost'
  const [selectedPuzzle, setSelectedPuzzle] = useState(1);
  const [puzzleConfig, setPuzzleConfig] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [boardSeed, setBoardSeed] = useState(0);

  const secs = useElapsed(resetKey, !done && phase === 'playing');
  const secsRef = useRef(0);
  secsRef.current = secs;

  // Match-3 puzzle definitions (same as server)
  const MATCH3_PUZZLES = [
    { id: 1, name: 'Getting Started', target: 800, timeLimit: 120, moveLimit: 30, layers: 2, difficulty: 'Easy' },
    { id: 2, name: 'Gather Gems', target: 1200, timeLimit: 120, moveLimit: 28, layers: 3, difficulty: 'Easy' },
    { id: 3, name: 'Color Cascade', target: 1500, timeLimit: 120, moveLimit: 26, layers: 2, difficulty: 'Easy' },
    { id: 4, name: 'Tile Practice', target: 2000, timeLimit: 120, moveLimit: 35, layers: 3, difficulty: 'Easy' },
    { id: 5, name: 'Gem Master', target: 2500, timeLimit: 120, moveLimit: 32, layers: 2, difficulty: 'Easy' },
    { id: 6, name: 'Combo Chain', target: 1800, timeLimit: 120, moveLimit: 40, layers: 2, difficulty: 'Easy' },
    { id: 7, name: 'Rainbow Tiles', target: 2200, timeLimit: 120, moveLimit: 30, layers: 3, difficulty: 'Easy' },
    { id: 8, name: 'Momentum', target: 2700, timeLimit: 120, moveLimit: 28, layers: 2, difficulty: 'Easy' },
    { id: 9, name: 'Precision Match', target: 2000, timeLimit: 120, moveLimit: 25, layers: 3, difficulty: 'Easy' },
    { id: 10, name: 'Power Play', target: 2800, timeLimit: 120, moveLimit: 32, layers: 3, difficulty: 'Easy' },
    { id: 11, name: 'Rising Challenge', target: 3000, timeLimit: 110, moveLimit: 28, layers: 3, difficulty: 'Medium' },
    { id: 12, name: 'Locked Tiles', target: 3200, timeLimit: 110, moveLimit: 26, layers: 4, difficulty: 'Medium' },
    { id: 13, name: 'Strategic Moves', target: 3500, timeLimit: 110, moveLimit: 30, layers: 3, difficulty: 'Medium' },
    { id: 14, name: 'Gem Rush', target: 3800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 15, name: 'Pressure Cooker', target: 3200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 16, name: 'Ice Breaker', target: 4000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 17, name: 'Cascade Master', target: 3600, timeLimit: 110, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 18, name: 'Deep Focus', target: 4200, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 19, name: 'Tile Tactics', target: 3900, timeLimit: 100, moveLimit: 25, layers: 3, difficulty: 'Medium' },
    { id: 20, name: 'Gem Sculptor', target: 4400, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 21, name: 'Locked & Loaded', target: 4100, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 22, name: 'Precision Strike', target: 3800, timeLimit: 100, moveLimit: 23, layers: 3, difficulty: 'Medium' },
    { id: 23, name: 'Color Theory', target: 4300, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 24, name: 'Momentum Shift', target: 4600, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 25, name: 'Maze Solver', target: 4000, timeLimit: 100, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 26, name: 'Time Pressure', target: 3900, timeLimit: 90, moveLimit: 22, layers: 4, difficulty: 'Medium' },
    { id: 27, name: 'Champion\'s Path', target: 4500, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 28, name: 'Final Stand', target: 4800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 29, name: 'Gem Dynasty', target: 4200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 30, name: 'Gateway Challenge', target: 5000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 31, name: 'Expert Territory', target: 5200, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 32, name: 'Ice Fortress', target: 5400, timeLimit: 100, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 33, name: 'Avalanche', target: 5800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 34, name: 'Locked Labyrinth', target: 5600, timeLimit: 100, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 35, name: 'Inferno', target: 6000, timeLimit: 90, moveLimit: 22, layers: 5, difficulty: 'Hard' },
    { id: 36, name: 'Master Puzzle', target: 5900, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 37, name: 'Complexity', target: 6200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 38, name: 'Precision Required', target: 5800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 39, name: 'Final Test', target: 6400, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 40, name: 'Legendary Tier', target: 6600, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 41, name: 'Peak Performance', target: 6000, timeLimit: 90, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 42, name: 'Unrelenting', target: 6300, timeLimit: 100, moveLimit: 27, layers: 5, difficulty: 'Hard' },
    { id: 43, name: 'Titan\'s Trial', target: 6800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 44, name: 'Endgame', target: 6500, timeLimit: 90, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 45, name: 'Perfection Quest', target: 6900, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 46, name: 'Unstoppable', target: 6700, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 47, name: 'Ultra Challenge', target: 7000, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 48, name: 'Reality Bender', target: 6800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 49, name: 'Pandora\'s Box', target: 7100, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 50, name: 'Master Challenge', target: 7200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  ];

  // Load user progress
  useEffect(() => {
    (async () => {
      const { ok, body } = await api('/api/match3/progress');
      if (ok && body) {
        setUserProgress(body);
        setSelectedPuzzle(body.lastPlayedPuzzle || 1);
      }
    })();
  }, []);

  // Start a puzzle
  const startPuzzle = async (puzzleId) => {
    const { ok, body } = await api(`/api/match3/start/${puzzleId}`);
    if (ok && body) {
      setPuzzleConfig(body);
      setBoardSeed(body.boardSeed);
      setSelectedPuzzle(puzzleId);

      if (body.savedSession) {
        setTiles(body.savedSession.tiles || []);
        setBar(body.savedSession.bar || []);
        setScore(body.savedSession.score || 0);
        setMoves(body.savedSession.moves || 0);
      } else {
        // Generate fresh board (simple: 5 random tiles per layer)
        const config = body;
        const newTiles = [];
        let id = 1;
        for (let i = 0; i < config.layers * 5; i++) {
          newTiles.push({
            id: id++,
            type: i % 5,
            pos: i,
            locked: false,
            inBar: false,
            removed: false,
          });
        }
        setTiles(newTiles);
        setBar([]);
        setScore(0);
        setMoves(0);
      }

      setDone(false);
      setPhase('playing');
    }
  };

  // Handle tile click
  const selectTile = (tileId) => {
    if (phase !== 'playing' || done) return;
    if (bar.length >= 7) {
      onLose(moves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle} • ${moves} moves` });
      setDone(true);
      setPhase('lost');
      return;
    }

    const newBar = [...bar, tileId];
    const newMoves = moves + 1;

    // Check for match-3
    let matched = false;
    if (newBar.length >= 3) {
      for (let i = 0; i <= newBar.length - 3; i++) {
        const t1 = tiles.find(t => t.id === newBar[i]);
        const t2 = tiles.find(t => t.id === newBar[i + 1]);
        const t3 = tiles.find(t => t.id === newBar[i + 2]);
        if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type) {
          matched = true;
          // Remove matched tiles
          const toRemove = new Set([newBar[i], newBar[i + 1], newBar[i + 2]]);
          setTiles(tiles.map(t => toRemove.has(t.id) ? { ...t, removed: true } : t));
          setBar(newBar.filter(id => !toRemove.has(id)));
          const newScore = score + 300;
          setScore(newScore);
          setMoves(newMoves);
          onStepChange && onStepChange(newMoves);

          if (newScore >= puzzleConfig.target) {
            onWin(newScore, newMoves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle}: ${newScore}pts` });
            setDone(true);
            setPhase('won');
            api(`/api/match3/finish/${selectedPuzzle}`, {
              method: 'POST',
              body: JSON.stringify({ score: newScore, timeSecs: secsRef.current, moves: newMoves })
            }).then(({ ok }) => {
              if (ok) {
                api('/api/match3/abandon/' + selectedPuzzle, { method: 'POST' });
              }
            });
          }
          return;
        }
      }
    }

    if (!matched) {
      setBar(newBar);
      setMoves(newMoves);
      onStepChange && onStepChange(newMoves);
    }
  };

  // Autosave
  useAutosave(
    onSaveProgress,
    () => ({
      puzzleId: selectedPuzzle,
      tiles,
      bar,
      score,
      moves,
    }),
    !done && phase === 'playing'
  );

  if (phase === 'campaign' && userProgress) {
    // Campaign selection screen
    const easyPuzzles = MATCH3_PUZZLES.slice(0, 10);
    const mediumPuzzles = MATCH3_PUZZLES.slice(10, 30);
    const hardPuzzles = MATCH3_PUZZLES.slice(30, 50);

    return React.createElement(
      'div',
      { style: { padding: '1.5rem', maxWidth: '900px', margin: '0 auto' } },
      React.createElement('h2', { style: { marginBottom: '1.5rem', color: C.text } }, '🟩 Match-3 Campaign'),
      React.createElement('div', { style: { marginBottom: '2rem', padding: '1rem', background: C.card, borderRadius: '0.5rem', border: `1px solid ${C.border}` } },
        React.createElement('div', { style: { display: 'flex', gap: '2rem', marginBottom: '1rem' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Highest Puzzle'),
            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 700, color: C.gold } }, `${userProgress.highestPuzzle}/50`)
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Best Score'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.emerald } }, userProgress.bestScore.toLocaleString())
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Completed'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.accent } }, userProgress.totalCompleted)
          )
        ),
        userProgress.highestPuzzle > 0 && React.createElement(
          'button',
          {
            onClick: () => startPuzzle(Math.min(userProgress.lastPlayedPuzzle, 50)),
            style: {
              padding: '0.5rem 1rem',
              background: C.accent,
              color: C.bg,
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }
          },
          '▶ Resume Puzzle ' + Math.min(userProgress.lastPlayedPuzzle, 50)
        )
      ),
      ['Easy (1-10)', 'Medium (11-30)', 'Hard (31-50)'].map((tier, tierIdx) => {
        const puzzles = tierIdx === 0 ? easyPuzzles : tierIdx === 1 ? mediumPuzzles : hardPuzzles;
        const tierColor = tierIdx === 0 ? C.emerald : tierIdx === 1 ? C.gold : C.rose;
        return React.createElement(
          'div',
          { key: tier, style: { marginBottom: '2rem' } },
          React.createElement('h3', { style: { color: tierColor, marginBottom: '1rem', fontSize: '1.1rem' } }, tier),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' } },
            puzzles.map(p => {
              const isSolved = p.id <= userProgress.highestPuzzle;
              return React.createElement(
                'button',
                {
                  key: p.id,
                  onClick: () => isSolved && startPuzzle(p.id),
                  disabled: !isSolved,
                  style: {
                    padding: '1rem',
                    background: isSolved ? C.card : C.surface,
                    color: isSolved ? C.text : C.muted,
                    border: `1px solid ${isSolved ? C.accent : C.border}`,
                    borderRadius: '0.375rem',
                    cursor: isSolved ? 'pointer' : 'not-allowed',
                    opacity: isSolved ? 1 : 0.5,
                    transition: 'all 0.2s',
                  },
                  onMouseEnter: (e) => { if (isSolved) e.target.style.background = C.border; },
                  onMouseLeave: (e) => { e.target.style.background = C.card; }
                },
                React.createElement('div', { style: { fontWeight: 700 } }, isSolved ? '✓' : p.id),
                React.createElement('div', { style: { fontSize: '0.75rem', marginTop: '0.25rem' } }, p.name)
              );
            })
          )
        );
      })
    );
  }

  if (phase === 'playing' && puzzleConfig) {
    return React.createElement(
      'div',
      { style: { padding: '1rem', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
      React.createElement(
        'div',
        { className: 'status-bar', style: { marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' } },
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Score'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${score} / ${puzzleConfig.targetScore}`)
        ),
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Moves'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${moves} / ${puzzleConfig.moveLimit}`)
        ),
        React.createElement('div', { className: 'pill', style: { background: C.card, padding: '0.5rem 1rem', borderRadius: '999px' } },
          React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted } }, 'Time'),
          React.createElement('span', { style: { marginLeft: '0.5rem', fontWeight: 700 } }, `${secs}s`)
        )
      ),
      React.createElement(
        'div',
        { style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' } },
        tiles.map(t => {
          const colors = [C.rose, C.amber, C.emerald, C.accent, C.violet];
          return React.createElement(
            'button',
            {
              key: t.id,
              onClick: () => selectTile(t.id),
              disabled: t.removed || done,
              style: {
                padding: '2rem',
                background: t.removed ? C.surface : colors[t.type % 5],
                border: 'none',
                borderRadius: '0.375rem',
                cursor: t.removed ? 'default' : 'pointer',
                opacity: t.removed ? 0.2 : 1,
                fontSize: '2rem',
                transition: 'all 0.2s',
              }
            },
            t.removed ? '✓' : '●'
          );
        })
      ),
      React.createElement(
        'div',
        { style: { marginTop: '1.5rem', padding: '1rem', background: C.card, borderRadius: '0.5rem', minHeight: '60px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '0.75rem', color: C.muted, marginRight: '0.5rem' } }, 'Bar:'),
        bar.length > 0 ? bar.map(id => {
          const t = tiles.find(tile => tile.id === id);
          const colors = [C.rose, C.amber, C.emerald, C.accent, C.violet];
          return React.createElement('div', {
            key: id,
            style: {
              width: '40px',
              height: '40px',
              background: colors[t.type % 5],
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: C.bg,
            }
          }, t.type);
        }) : React.createElement('span', { style: { color: C.muted } }, '(empty)')
      )
    );
  }

  return React.createElement('div', { style: { padding: '1rem', color: C.text } }, 'Loading...');
}

/* ============================================================
   Chutes & Ladders — 2-player local (pass-and-play) classic game
   ============================================================ */
// Standard Milton-Bradley layout. Ladders climb (bottom -> top),
// chutes slide (top -> bottom). One flat map keyed by landing square.
const CNL_LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const CNL_CHUTES  = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const CNL_JUMPS   = Object.assign({}, CNL_LADDERS, CNL_CHUTES);

// Map a square number (1..100) to {row, col} on the boustrophedon board.
// row 0 is the BOTTOM row (squares 1..10), row 9 is the TOP (91..100).
// Even rows (0-indexed from bottom) run left->right; odd rows right->left.
function cnlRowCol(n) {
  const idx = n - 1;            // 0-based
  const row = Math.floor(idx / 10);
  const within = idx % 10;
  const col = (row % 2 === 0) ? within : (9 - within);
  return { row, col };
}

// Center of a square as a percentage of the board box (for SVG + pawns).
// Visual row 0 sits at the BOTTOM, so flip for top-origin coordinates.
function cnlCenterPct(n) {
  if (n <= 0) return { x: 50, y: 104 }; // off-board: just below the board
  const { row, col } = cnlRowCol(n);
  const visualRow = 9 - row;
  return { x: (col + 0.5) * 10, y: (visualRow + 0.5) * 10 };
}

// Local Chutes & Ladders board: hotseat 2-player, or vs Bot (P2 auto-rolls).
// `initialState` (a saved bot snapshot) offers an in-stage Resume banner.
function ChutesLaddersLocalGame({ onWin, onStepChange, resetKey, vsBot, initialState, onClearSave }) {
  const [p1Pos, setP1Pos]   = useState(0);
  const [p2Pos, setP2Pos]   = useState(0);
  const [player, setPlayer] = useState(1);
  const [die, setDie]       = useState(null);
  const [rolls, setRolls]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [rolling, setRolling]     = useState(false);
  const [done, setDone]     = useState(false);
  const [winner, setWinner] = useState(null);
  const [banner, setBanner] = useState('');
  // Resume offer for a saved bot game; null once dismissed/applied.
  const [resumeOffer, setResumeOffer] = useState(initialState || null);

  const animatingRef = useRef(false);
  const winTimerRef  = useRef(null);
  const timersRef    = useRef([]);

  const { secs, fmt } = useTimer(!done);
  const secsRef = useRef(0);
  secsRef.current = secs;
  const rollsRef = useRef(0);
  rollsRef.current = rolls;

  const pLabel = (who) => vsBot ? (who === 1 ? 'You' : 'Bot') : `Player ${who}`;

  // Expose a save snapshot to the Game Menu while this is an active bot game.
  useClassicSaveSource(vsBot && !done, () => ({
    p1Pos, p2Pos, currentPlayer: player, rolls, secs: secsRef.current,
  }));

  const applyResume = () => {
    const s = resumeOffer; if (!s) return;
    setP1Pos(s.p1Pos || 0); setP2Pos(s.p2Pos || 0);
    setPlayer(s.currentPlayer || 1); setRolls(s.rolls || 0);
    rollsRef.current = s.rolls || 0;
    setResumeOffer(null);
  };
  const dismissResume = () => { setResumeOffer(null); if (onClearSave) onClearSave(); };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
  };

  const resetGame = () => {
    animatingRef.current = false;
    clearTimers();
    setP1Pos(0); setP2Pos(0);
    setPlayer(1); setDie(null); setRolls(0);
    setAnimating(false); setRolling(false);
    setDone(false); setWinner(null); setBanner('');
  };

  useEffect(() => { resetGame(); }, [resetKey]);
  useEffect(() => () => clearTimers(), []);

  const p1Color = C.accent;
  const p2Color = C.rose;
  const activeColor = done ? C.muted : (player === 1 ? p1Color : p2Color);

  const setPos = (who, val) => { who === 1 ? setP1Pos(val) : setP2Pos(val); };

  const finishTurn = (who, landed) => {
    const jump = CNL_JUMPS[landed];
    const settle = () => {
      // Win check: must land exactly on 100 (no chute sits on 100).
      if (landed === 100) {
        setDone(true);
        setWinner(who);
        if (onClearSave) onClearSave();
        const label = `${pLabel(who)} win${vsBot && who === 1 ? '' : (vsBot ? 's' : 's')}! 🎉`;
        setBanner(label);
        const finalRolls = rollsRef.current;
        const finalSecs = secsRef.current;
        const score = Math.max(50, 300 - finalRolls * 5);
        const share = `🪜 Chutes & Ladders — ${pLabel(who)} won in ${finalRolls} rolls!`;
        winTimerRef.current = setTimeout(() => {
          winTimerRef.current = null;
          onWin(score, finalRolls, finalSecs, { winner: who, winnerLabel: label, share });
        }, 1300);
        return;
      }
      // Pass turn to the other player.
      animatingRef.current = false;
      setAnimating(false);
      setPlayer(who === 1 ? 2 : 1);
    };

    if (jump !== undefined) {
      // Brief pause so players see the landing, then climb/slide.
      const isLadder = CNL_LADDERS[landed] !== undefined;
      setBanner(isLadder ? 'Ladder up! 🪜' : 'Down the chute! 🛝');
      const t = setTimeout(() => {
        setPos(who, jump);
        const t2 = setTimeout(() => { setBanner(''); settle(); }, 320);
        timersRef.current.push(t2);
      }, 380);
      timersRef.current.push(t);
    } else {
      settle();
    }
  };

  const roll = (clickedWho) => {
    if (animatingRef.current || done || rolling) return;
    // Buttons pass which player tapped; ignore a tap that isn't the active player.
    if (clickedWho !== undefined && clickedWho !== player) return;
    const who = player;
    const value = Math.floor(Math.random() * 6) + 1;
    const from = who === 1 ? p1Pos : p2Pos;
    const newRolls = rolls + 1;

    setRolling(true);
    setDie(value);
    setBanner('');
    setRolls(newRolls);
    rollsRef.current = newRolls;
    onStepChange(newRolls);

    const rollT = setTimeout(() => {
      setRolling(false);

      // Overshoot 100 => stay put, pass turn.
      if (from + value > 100) {
        setBanner('Overshoot — stay put');
        const passT = setTimeout(() => {
          setBanner('');
          setPlayer(who === 1 ? 2 : 1);
        }, 700);
        timersRef.current.push(passT);
        return;
      }

      // Hop square-by-square to the landing square.
      animatingRef.current = true;
      setAnimating(true);
      const target = from + value;
      let cur = from;
      const hop = () => {
        if (!animatingRef.current) return;
        if (cur >= target) { finishTurn(who, target); return; }
        cur++;
        setPos(who, cur);
        const t = setTimeout(hop, 130);
        timersRef.current.push(t);
      };
      const t0 = setTimeout(hop, 130);
      timersRef.current.push(t0);
    }, 720);
    timersRef.current.push(rollT);
  };

  // Bot auto-rolls for Player 2 in Versus-Bot mode.
  useEffect(() => {
    if (!vsBot || done || resumeOffer) return;
    if (player !== 2 || animating || rolling) return;
    const t = setTimeout(() => roll(2), 650);
    return () => clearTimeout(t);
  }, [vsBot, player, animating, rolling, done, resumeOffer]);

  // Build the 10x10 cells (top row first for natural DOM order).
  const cells = [];
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    for (let col = 0; col < 10; col++) {
      const row = 9 - visualRow;              // bottom-origin board row
      const within = (row % 2 === 0) ? col : (9 - col);
      const n = row * 10 + within + 1;
      const mark = CNL_LADDERS[n] !== undefined ? '🪜'
        : CNL_CHUTES[n] !== undefined ? '🛝' : null;
      cells.push(
        <div
          key={n}
          className={'cnl-cell' + ((row + col) % 2 ? ' alt' : '') + (n === 100 ? ' cnl-goal' : '')}
        >
          <span>{n}</span>
          {mark && <span className="cnl-cell-mark">{mark}</span>}
        </div>
      );
    }
  }

  // SVG connector lines for every ladder/chute.
  const lines = Object.keys(CNL_JUMPS).map(k => {
    const from = parseInt(k, 10);
    const to = CNL_JUMPS[from];
    const a = cnlCenterPct(from);
    const b = cnlCenterPct(to);
    const isLadder = CNL_LADDERS[from] !== undefined;
    return (
      <line
        key={k}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={isLadder ? C.emerald : C.rose}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.6"
      />
    );
  });

  const p1c = cnlCenterPct(p1Pos);
  const p2c = cnlCenterPct(p2Pos);
  // Nudge pawns apart when sharing a square (incl. both off-board) so both stay visible.
  const sameCell = p1Pos === p2Pos;
  const p1x = sameCell ? p1c.x - 2.4 : p1c.x;
  const p2x = sameCell ? p2c.x + 2.4 : p2c.x;

  const bannerActive = !!banner;
  const bannerColor = done ? C.muted : activeColor;

  return (
    <div>
      {resumeOffer && (
        <ClassicResumeBanner onResume={applyResume} onDismiss={dismissResume} />
      )}
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Turn</div>
          <div className="pvalue" style={{ color: activeColor, fontSize: '0.95rem' }}>
            {done ? pLabel(winner) : pLabel(player)}
          </div>
        </div>
        <div className="pill">
          <div className="plabel">{pLabel(1)}</div>
          <div className="pvalue" style={{ color: p1Color, fontSize: '0.95rem' }}>{p1Pos}</div>
        </div>
        <div className="pill">
          <div className="plabel">{pLabel(2)}</div>
          <div className="pvalue" style={{ color: p2Color, fontSize: '0.95rem' }}>{p2Pos}</div>
        </div>
        <div className="pill">
          <div className="plabel">Rolls</div>
          <div className="pvalue">{rolls}</div>
        </div>
      </div>

      <div
        className="cnl-banner"
        style={{
          color: bannerColor,
          background: (bannerActive ? bannerColor : activeColor) + '22',
          border: `1px solid ${(bannerActive ? bannerColor : activeColor)}44`,
        }}
      >
        {done
          ? `Game over — ${pLabel(winner)} win${vsBot && winner === 1 ? '' : 's'}! 🎉`
          : (banner || `${pLabel(player)}'s turn`)}
      </div>

      <div className="cnl-board-wrap">
        <div className="cnl-board">{cells}</div>
        <svg className="cnl-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {lines}
        </svg>
        <div className="cnl-pawn" style={{ left: p1x + '%', top: p1c.y + '%', background: p1Color }} aria-label="Player 1 pawn" />
        <div className="cnl-pawn" style={{ left: p2x + '%', top: p2c.y + '%', background: p2Color }} aria-label="Player 2 pawn" />
      </div>

      <div className="cnl-die">
        <div className={'cnl-die-face' + (rolling ? ' rolling' : '')} style={{ borderColor: activeColor + '88' }}>
          {die == null ? '·' : die}
        </div>
      </div>

      <div className="cnl-roll-buttons">
        <button
          className="cnl-roll-btn"
          style={{ background: p1Color }}
          onClick={() => roll(1)}
          disabled={done || animating || rolling || player !== 1 || !!resumeOffer}
        >
          {vsBot ? 'Your' : 'Player 1 -'} Roll
        </button>
        {vsBot ? (
          <button className="cnl-roll-btn" style={{ background: p2Color, opacity: 0.85 }} disabled>
            {player === 2 && !done ? 'Bot rolling…' : 'Bot'}
          </button>
        ) : (
          <button
            className="cnl-roll-btn"
            style={{ background: p2Color }}
            onClick={() => roll(2)}
            disabled={done || animating || rolling || player !== 2}
          >
            Player 2 - Roll
          </button>
        )}
      </div>
    </div>
  );
}

// In-stage mode selector for Chutes & Ladders (shown on first launch from the
// lobby; the Game Menu's New Game also routes here via the mode picker).
function ChutesLaddersModeSelect({ game, onPick }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const modes = [
    { id: '2p',     icon: '👥', name: '2 Players',         desc: 'Pass and play on this device' },
    { id: 'bot',    icon: '🤖', name: 'Versus Bot',        desc: 'The computer rolls for Player 2' },
    { id: 'online', icon: '🌐', name: 'Online Multiplayer', desc: 'Play a friend via room code' },
  ];

  const handleStart = async () => {
    if (!mode) return;
    if (mode !== 'online') { onPick(mode, {}); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      const { ok, body } = await api('/api/classic/chutes-ladders/rooms', { method: 'POST' });
      setBusy(false);
      if (ok && body) onPick('online', { roomAction: 'create', roomId: body.id });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api('/api/classic/chutes-ladders/rooms/' + code + '/join', { method: 'POST' });
      setBusy(false);
      if (ok) onPick('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="mnc-mode-select">
      {modes.map(m => (
        <button key={m.id} className={'mnc-mode-btn' + (mode === m.id ? ' active' : '')} onClick={() => { setMode(m.id); setError(''); }}>
          <span className="mnc-mode-icon">{m.icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">{m.name}</span>
            <span className="mnc-mode-desc">{m.desc}</span>
          </span>
        </button>
      ))}
      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            </div>
          )}
        </div>
      )}
      {error && <div className="mnc-join-error">{error}</div>}
      {mode && <button className="mnc-mode-start-btn" onClick={handleStart} disabled={!canStart || busy}>{busy ? 'Please wait…' : 'Play'}</button>}
    </div>
  );
}

// Online Chutes & Ladders over classic_rooms. Server owns the dice; the client
// just sends a "roll" and renders the polled room state.
function ChutesLaddersOnlineGame({ onWin, onStepChange, roomId, myPlayerNum }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom('chutes-ladders', roomId);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const youWin = room.winner === String(myPlayerNum);
    const rolls = (room.state && room.state.rolls) || 0;
    const score = youWin ? Math.max(50, 300 - rolls * 5) : 0;
    const share = `🪜 Chutes & Ladders Online — ${youWin ? 'I won' : 'good game'} in ${rolls} rolls!`;
    onWin(score, movesRef.current, secsRef.current, { winnerLabel: youWin ? 'You win! 🎉' : 'Opponent wins', share });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} /><div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div></div>;
  }
  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }

  const status = room ? room.status : 'waiting';
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

  const st = room.state || {};
  const cur = st.currentPlayer || 1;
  const isMyTurn = status === 'active' && cur === myPlayerNum;
  const p1Color = C.accent, p2Color = C.rose;
  const myColor = myPlayerNum === 1 ? p1Color : p2Color;

  const doRoll = () => {
    if (!isMyTurn) return;
    movesRef.current += 1; onStepChange && onStepChange(movesRef.current);
    submitMove({ type: 'roll' });
  };

  // Reuse the static board renderer by mapping positions onto pawns.
  const cells = [];
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    for (let col = 0; col < 10; col++) {
      const row = 9 - visualRow;
      const within = (row % 2 === 0) ? col : (9 - col);
      const n = row * 10 + within + 1;
      const mark = CNL_LADDERS[n] !== undefined ? '🪜' : CNL_CHUTES[n] !== undefined ? '🛝' : null;
      cells.push(<div key={n} className={'cnl-cell' + ((row + col) % 2 ? ' alt' : '') + (n === 100 ? ' cnl-goal' : '')}><span>{n}</span>{mark && <span className="cnl-cell-mark">{mark}</span>}</div>);
    }
  }
  const lines = Object.keys(CNL_JUMPS).map(k => {
    const from = parseInt(k, 10), to = CNL_JUMPS[from];
    const a = cnlCenterPct(from), b = cnlCenterPct(to);
    const isLadder = CNL_LADDERS[from] !== undefined;
    return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isLadder ? C.emerald : C.rose} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />;
  });
  const p1c = cnlCenterPct(st.p1Pos || 0), p2c = cnlCenterPct(st.p2Pos || 0);
  const same = (st.p1Pos || 0) === (st.p2Pos || 0);
  const p1x = same ? p1c.x - 2.4 : p1c.x, p2x = same ? p2c.x + 2.4 : p2c.x;

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : 'Opponent wins')
    : isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill"><div className="plabel">You</div><div className="pvalue" style={{ color: myColor, fontSize: '0.95rem' }}>{myPlayerNum === 1 ? (st.p1Pos || 0) : (st.p2Pos || 0)}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} /><div className="plabel">Online</div></div>
      </div>
      {opponentDisconnected && <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Opponent connection lost — waiting for reconnect…</div>}
      <div className="cnl-board-wrap">
        <div className="cnl-board">{cells}</div>
        <svg className="cnl-svg" viewBox="0 0 100 100" preserveAspectRatio="none">{lines}</svg>
        <div className="cnl-pawn" style={{ left: p1x + '%', top: p1c.y + '%', background: p1Color }} />
        <div className="cnl-pawn" style={{ left: p2x + '%', top: p2c.y + '%', background: p2Color }} />
      </div>
      <div className="cnl-die">
        <div className="cnl-die-face" style={{ borderColor: myColor + '88' }}>{st.die == null ? '·' : st.die}</div>
      </div>
      <div className="cnl-roll-buttons">
        <button className="cnl-roll-btn" style={{ background: myColor }} onClick={doRoll} disabled={!isMyTurn}>
          {status === 'finished' ? 'Game over' : isMyTurn ? 'Roll' : 'Waiting…'}
        </button>
      </div>
    </div>
  );
}

// Chutes & Ladders wrapper — picks a mode (2P / Versus Bot / Online) and
// delegates. Honors the Game Menu's gameMode/gameModeOpts props.
function ChutesLaddersGame({ onWin, onStepChange, resetKey, gameMode, gameModeOpts, onModeChange }) {
  const [mode, setMode] = useState(gameMode || null);
  const [roomId, setRoomId] = useState((gameModeOpts && gameModeOpts.roomId) || null);
  const [myPlayerNum, setMyPlayerNum] = useState(gameModeOpts && gameModeOpts.roomAction === 'join' ? 2 : 1);
  const [resumeState, setResumeState] = useState(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const { loadState, clearState } = useClassicSave('chutes-ladders');

  // Sync mode from the Game Menu's New Game selection.
  useEffect(() => {
    setMode(gameMode || null);
    if (gameModeOpts && gameModeOpts.roomId) {
      setRoomId(gameModeOpts.roomId);
      setMyPlayerNum(gameModeOpts.roomAction === 'join' ? 2 : 1);
    }
  }, [gameMode, gameModeOpts, resetKey]);

  // Report active mode upward for the top-bar pill + Save visibility.
  useEffect(() => { onModeChange && onModeChange(mode); }, [mode]);

  // Check for a saved bot game when entering bot mode.
  useEffect(() => {
    let cancelled = false;
    if (mode === 'bot' && !resumeChecked) {
      loadState().then(s => { if (!cancelled) { setResumeState(s); setResumeChecked(true); } });
    } else if (mode !== 'bot') {
      setResumeChecked(false); setResumeState(null);
    }
    return () => { cancelled = true; };
  }, [mode]);

  if (!mode) {
    return <ChutesLaddersModeSelect game={{ id: 'chutes-ladders' }} onPick={(m, opts) => {
      if (m === 'online') { setRoomId(opts.roomId); setMyPlayerNum(opts.roomAction === 'join' ? 2 : 1); }
      setMode(m);
    }} />;
  }
  if (mode === 'online') {
    return <ChutesLaddersOnlineGame onWin={onWin} onStepChange={onStepChange} roomId={roomId} myPlayerNum={myPlayerNum} />;
  }
  if (mode === 'bot' && !resumeChecked) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>Loading…</div>;
  }
  return (
    <ChutesLaddersLocalGame
      onWin={onWin}
      onStepChange={onStepChange}
      resetKey={resetKey}
      vsBot={mode === 'bot'}
      initialState={mode === 'bot' ? resumeState : null}
      onClearSave={mode === 'bot' ? clearState : null}
    />
  );
}

// Declarative client game registry — the single source of truth for how each
// game is launched, wrapped, and scored on the client (mirrors the server's
// authoritative GAME_REGISTRY in server.js). Every entry MUST carry an `id`.
//
// Capability fields read by the App dispatch:
//   shell — how App renders the game body:
//     'daily'   → back-header game-wrap; receives savedProgress/onSaveProgress
//     'classic' → wrapped in ClassicShell + .cg-stage.cg-scroll (in-frame)
//     'self'    → game renders its own ClassicShell (full-screen, gesture-first)
//     'custom'  → App renders a bespoke screen (e.g. PvP Arena), not `component`
//   daily — true only for category 'daily' games: the single gate for the
//           per-day start/lock/finish/streak/resume machinery.
//   category — lobby tab grouping (maps 1:1 to the tabs).
const GAMES = [
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    category: 'daily',
    shell: 'daily',
    daily: true,
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
    shell: 'daily',
    daily: true,
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
    shell: 'daily',
    daily: true,
    desc: 'Solve a daily stack of crypto words — clues unlock as you go, or buy a hint.',
    tag: 'Web3',
    tagColor: C.emerald,
    component: CryptoWordleGame,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    category: 'classic',
    shell: 'classic',
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
    shell: 'classic',
    desc: 'Classic stone-pit strategy. Outsmart your opponent by capturing more stones.',
    tag: 'Strategy',
    tagColor: C.gold,
    component: MancalaGame,
    modes: ['bot', '2p', 'online'],
    supportsSave: true,
  },
  {
    id: 'chutes-ladders',
    name: 'Chutes & Ladders',
    icon: '🪜',
    category: 'classic',
    shell: 'classic',
    desc: 'Race up the board — climb ladders, dodge chutes. 2-player hotseat.',
    tag: 'Board',
    tagColor: C.emerald,
    component: ChutesLaddersGame,
    modes: ['bot', '2p', 'online'],
    supportsSave: true,
    menuModePicker: true,
  },
  {
    id: '2048',
    name: '2048',
    icon: '🔢',
    category: 'classic',
    shell: 'classic',
    desc: 'Slide tiles to merge numbers and reach 2048.',
    tag: 'Numbers',
    tagColor: C.emerald,
    component: T2048Game,
  },
  {
    id: 'knights-tour',
    name: "Knight's Tour",
    icon: '♞',
    category: 'classic',
    shell: 'classic',
    desc: "Move a chess knight to visit all 64 squares exactly once.",
    tag: 'Puzzle',
    tagColor: C.violet,
    component: KnightsTourGame,
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    category: 'classic',
    shell: 'self',
    desc: 'Swipe to steer, eat to grow, and chase a high score without crashing.',
    tag: 'Arcade',
    tagColor: C.emerald,
    component: SnakeGame,
  },
  {
    id: 'blockblast',
    name: 'Block Blast',
    icon: '🧱',
    category: 'classic',
    shell: 'self',
    desc: 'Drag blocks onto the grid and clear full lines. How long can you last?',
    tag: 'Puzzle',
    tagColor: C.accent,
    component: BlockBlastGame,
  },
  {
    id: 'diamondrush',
    name: 'Diamond Rush',
    icon: '💎',
    category: 'classic',
    shell: 'self',
    desc: 'Swap gems to line up 3+ and cascade your way to the target score.',
    tag: 'Match',
    tagColor: C.rose,
    component: DiamondRushGame,
  },
  {
    id: 'texas',
    name: "Texas Hold 'Em",
    icon: '🃏',
    category: 'classic',
    shell: 'self',
    desc: 'Heads-up poker vs the computer. Bet smart and take all the chips.',
    tag: 'Cards',
    tagColor: C.gold,
    component: TexasHoldemGame,
    modes: ['bot'],
    supportsSave: true,
  },
  {
    id: 'tilematching',
    name: 'Tile Match Puzzle',
    icon: '🀄',
    category: 'classic',
    shell: 'classic',
    desc: 'Click tiles off the layered board into your 7-slot bar — match three to clear them.',
    tag: 'Puzzle',
    tagColor: C.accent,
    component: TileMatchingGame,
  },
  {
    id: 'bounce',
    name: 'Bounce',
    icon: '🧱',
    category: 'classic',
    shell: 'classic',
    desc: "Smash every brick with a bouncing ball. Don't let it fall — climb the leaderboard.",
    tag: 'Arcade',
    tagColor: C.rose,
    component: BounceGame,
  },
  {
    id: 'zuma',
    name: 'Zuma',
    icon: '🐸',
    category: 'classic',
    shell: 'classic',
    desc: 'Shoot colored balls to match 3 in a row before the chain reaches the skull.',
    tag: 'Arcade',
    tagColor: C.emerald,
    component: ZumaGame,
  },
  {
    id: 'match3',
    name: 'Match-3 Puzzle',
    icon: '🟩',
    category: 'classic',
    shell: 'classic',
    desc: 'Classic match-3 campaign: progress through 50 puzzles and climb the leaderboard.',
    tag: 'Campaign',
    tagColor: C.gold,
    component: Match3Game,
  },
  {
    id: 'tilematchingdaily',
    name: 'Daily Tile Match Puzzle',
    icon: '🀄',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Today\'s layered tile board — 3 minutes to clear it.',
    tag: 'Puzzle',
    tagColor: C.accent,
    component: TileMatchingDailyGame,
  },
  {
    id: 'idle',
    name: 'Idle Empire',
    icon: '🐹',
    category: 'classic',
    shell: 'classic',
    desc: 'Tap, upgrade, and build your hamster empire with prestige rewards.',
    tag: 'Idle',
    tagColor: C.gold,
    component: IdleGame,
  },
  {
    id: 'pvp-arena',
    name: 'PvP Arena',
    icon: '⚔️',
    category: 'classic',
    shell: 'custom',
    desc: 'Stake $UTGO and compete head-to-head. Winner takes 90% of the pot.',
    tag: 'Wager',
    tagColor: C.rose,
    component: () => null,
  },
];

/* ============================================================
   Social: Feed & Posts
   ============================================================ */

function FeedScreen({ user, setScreen }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    const loadFeed = async () => {
      const { ok, body } = await api('/api/posts/feed?limit=20&offset=0');
      if (ok && body) setPosts(body.posts || []);
      setLoading(false);
    };
    loadFeed();
    const id = setInterval(loadFeed, 10000);
    return () => clearInterval(id);
  }, []);

  if (selectedPostId) {
    const post = posts.find(p => p.id === selectedPostId);
    if (post) {
      return (
        <PostDetail
          post={post}
          onBack={() => setSelectedPostId(null)}
        />
      );
    }
  }

  if (loading) return <div className="lobby" style={{ padding: '2rem', textAlign: 'center' }}>Loading feed...</div>;

  const gameNameMap = {};
  GAMES.forEach(g => gameNameMap[g.id] = g);

  return (
    <div className="lobby" style={{ maxWidth: '600px' }}>
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: '2rem' }}>
          <p>No posts yet. Play a game and share your wins!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(p => {
            const game = gameNameMap[p.gameId];
            return (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', '--accent': game?.tagColor || C.accent }}
                onClick={() => setSelectedPostId(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                    background: C.accent, color: '#fff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600'
                  }}>
                    {(p.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{p.username}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'now'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{game?.icon || '🎮'}</span>
                  <span style={{ fontWeight: '600' }}>{game?.name || p.gameId}</span>
                </div>
                <div style={{ color: C.gold, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {p.score} pts
                </div>
                {p.caption && <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{p.caption}</div>}
                <div style={{ fontSize: '0.8rem', color: C.muted }}>
                  💬 {p.commentCount} comment{p.commentCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PostDetail({ post, onBack }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      const { ok: userOk, body: userData } = await api('/api/daily');
      if (userOk) setUser(userData.user);

      const { ok, body } = await api(`/api/posts/${post.id}/comments?limit=50&offset=0`);
      if (ok && body) setComments(body.comments || []);
      setLoading(false);
    };
    loadPost();
  }, [post.id]);

  const addComment = async () => {
    if (!commentText.trim()) return;
    const { ok, body } = await api(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: commentText }),
    });
    if (ok && body) {
      setComments(prev => [body, ...prev]);
      setCommentText('');
    }
  };

  const deleteComment = async (commentId) => {
    const { ok } = await api(`/api/posts/${post.id}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const gameNameMap = {};
  GAMES.forEach(g => gameNameMap[g.id] = g);
  const game = gameNameMap[post.gameId];

  if (loading) return <div className="lobby" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="game-wrap">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: C.accent, color: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: '600'
            }}>
              {(post.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{post.username}</div>
              <div style={{ fontSize: '0.8rem', color: C.muted }}>
                {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'now'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{game?.icon || '🎮'}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{game?.name || post.gameId}</span>
          </div>
          <div style={{ color: C.gold, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
            {post.score} pts{post.timeSecs ? ` · ${Math.floor(post.timeSecs / 60)}:${String(post.timeSecs % 60).padStart(2, '0')}` : ''}
          </div>
          {post.caption && <div style={{ fontSize: '0.95rem', marginTop: '0.75rem' }}>{post.caption}</div>}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Comments ({comments.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {comments.map(c => (
              <div key={c.id} className="card" style={{ padding: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.username}</div>
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.4rem' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'now'}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{c.text}</div>
                  </div>
                  {user && user.id === c.userId && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.rose,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, 280))}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              style={{
                flex: 1,
                padding: '0.6rem 0.8rem',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                color: C.text,
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              onClick={addComment}
              style={{
                padding: '0.6rem 1rem',
                background: C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Root app
   ============================================================ */
function BadgesSection({ streak, attempts, open, onToggle }) {
  const badges = BADGE_DEFS.map(b => ({ ...b, earned: b.check(streak, attempts) }));
  return (
    <div className="badges-section">
      <button className="badges-toggle" onClick={onToggle}>
        Badges
        <span className="badges-toggle-arrow">{open ? '▾' : '▸'}</span>
      </button>
      <div className={'badges-grid' + (open ? ' open' : '')}>
        {badges.map(b => (
          <div key={b.id} className={'badge-chip' + (b.earned ? '' : ' dim')} title={b.desc}>
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState(() => {
    // Support ?screen=wallet / ?screen=session deep links for testing
    const params = new URLSearchParams(window.location.search);
    const s = params.get('screen');
    if (s === 'wallet') return 'wallet';
    if (s === 'account') return 'account';
    if (s === 'session' || params.get('demo') === 'dapp' || params.get('demo') === 'anchor') return 'session';
    return 'lobby';
  }); // 'lobby' | 'game' | 'locked' | 'profile' | 'friends' | 'wallet' | 'account' | 'session'
  // DApp session receipt being viewed (session id), and identity-verified flag.
  // ?demo=anchor deep-links to the staging-seeded anchored daily sudoku receipt.
  const [receiptSessionId, setReceiptSessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sid') || (params.get('demo') === 'anchor' ? 'DAPPDEMOSUDOKU' : null);
  });
  const openReceipt = (sid) => { setReceiptSessionId(sid); setScreen('session'); };
  const [walletVerified, setWalletVerified] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // Permanent earned streak-milestone day thresholds (e.g. [3, 7, 30]) — kept
  // even after a streak resets, so the lobby can show a collected-badges strip.
  const [badges, setBadges] = useState([]);
  // Non-streak achievement badges earned: { types: [...], milestones: [...] }.
  const [achievements, setAchievements] = useState({ types: [], milestones: [] });
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
  // Lobby tab: 'daily', 'classic', 'idle', 'pvp', or 'feed' — initialized from ?tab= URL param
  const [lobbyTab, setLobbyTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'classic' ? 'classic' : t === 'idle' ? 'idle' : t === 'pvp' ? 'pvp' : t === 'feed' ? 'feed' : 'daily';
  });
  // Incremented to trigger MinesweeperGame reset on Play Again
  const [playAgainKey, setPlayAgainKey] = useState(0);
  // Classic Games — Game Menu state. `classicGameMode` is the active mode of
  // the current classic game ('bot' | '2p' | 'online' | null); `classicLastResult`
  // is the most recent finished classic result so the menu's Post to Feed works
  // even after Play Again.
  const [classicGameMode, setClassicGameMode] = useState(null);
  const [classicGameModeOpts, setClassicGameModeOpts] = useState(null);
  const [classicLastResult, setClassicLastResult] = useState(null);
  // Social: profile viewing and friends list
  const [selectedUserId, setSelectedUserId] = useState(null);
  // Wallet state (app-level so PvP and nav share one source)
  const [walletAddr, setWalletAddr] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null); // wei string
  const [walletMock, setWalletMock] = useState(true);
  // Global off-chain MATCH token balance, shown in the nav and spent on hints.
  const [matchBalance, setMatchBalance] = useState(null); // integer, null = loading
  // Share modal for posting wins to feed
  const [shareModal, setShareModal] = useState({ show: false, caption: '' });
  // Badges section toggle (mobile: collapsed by default)
  const [badgesOpen, setBadgesOpen] = useState(false);
  // dApps-integration availability. Disabled (e.g. staging with an empty
  // APP_SECRET_KEY) → the related nav chip is hidden so the UI degrades
  // gracefully alongside the server.
  const [integration, setIntegration] = useState({ enabled: false, pubkey: null });

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
      setBadges(Array.isArray(body.badges) ? body.badges : []);
      setAchievements(body.achievements && Array.isArray(body.achievements.types)
        ? { types: body.achievements.types, milestones: body.achievements.milestones || [] }
        : { types: [], milestones: [] });
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
      setBadges([]);
      setAchievements({ types: [], milestones: [] });
    }
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, []);

  // Global MATCH token balance for the nav chip + hint spending. Re-fetchable so
  // the chip refreshes when returning to the lobby after a Tile Match earn/spend.
  const loadMatchBalance = React.useCallback(async () => {
    const { ok, body } = await api('/api/tilematch/wallet');
    if (ok && body && Number.isFinite(body.balance)) setMatchBalance(body.balance);
  }, []);
  useEffect(() => { loadMatchBalance(); }, [loadMatchBalance]);

  // dApps-integration status. Degrades gracefully: a failed/absent response
  // leaves the feature disabled (chip stays hidden) rather than erroring.
  useEffect(() => {
    api('/api/integration/status')
      .then(({ ok, body }) => {
        if (ok && body) setIntegration({ enabled: !!body.enabled, pubkey: body.pubkey || null });
      })
      .catch(() => {});
  }, []);

  // Wallet: read EVM address from the bridge, link it to the account, optionally
  // prove ownership (sign a challenge), and fetch balance. Extracted into one
  // callable so BOTH the on-mount effect and the Account screen's "Connect /
  // Verify" button run the identical flow. Returns { ok, addr, verified } so the
  // Account screen can show precise feedback; never throws.
  const connectAndVerifyWallet = React.useCallback(async () => {
    if (!window.usernode || !window.usernode.getNodeAddress) {
      return { ok: false, reason: 'unavailable' };
    }
    let addr = null;
    try { addr = await window.usernode.getNodeAddress(); } catch { return { ok: false, reason: 'unavailable' }; }
    if (!addr) return { ok: false, reason: 'unavailable' };
    setWalletAddr(addr);
    // Link address server-side so tipping lookups work (trust-on-report).
    try { await api('/api/wallet/link', { method: 'POST', body: JSON.stringify({ addr }) }); } catch {}

    // Optional cryptographic ownership proof — only if the wallet can sign.
    let verified = false;
    if (window.usernode.signMessage) {
      try {
        const { ok, body } = await api('/api/wallet/challenge');
        if (ok && body && body.message) {
          const sig = await window.usernode.signMessage(body.message);
          if (sig) {
            const { ok: pOk, body: pBody } = await api('/api/wallet/prove', {
              method: 'POST',
              body: JSON.stringify({ addr, nonce: body.nonce, signature: sig }),
            });
            if (pOk && pBody && pBody.verified) { verified = true; setWalletVerified(true); }
          }
        }
      } catch {}
    }

    // Fetch on-chain balance.
    try {
      const { ok, body } = await api(`/api/wallet/balance?addr=${encodeURIComponent(addr)}`);
      if (ok && body) { setWalletBalance(body.balance); setWalletMock(!!body.mock); }
    } catch {}

    return { ok: true, addr, verified };
  }, []);

  // Disconnect the verified-identity proof (public link is kept so received
  // tips still resolve). Used by the Account screen.
  const disconnectWallet = React.useCallback(async () => {
    await api('/api/wallet/disconnect', { method: 'POST' });
    setWalletVerified(false);
  }, []);

  // On mount: restore any existing identity/link state from the server first
  // (so the verified badge + linked address show even before the bridge
  // resolves or when it's unavailable), then run the connect/verify flow.
  useEffect(() => {
    api('/api/account').then(({ ok, body }) => {
      if (!ok || !body) return;
      if (body.identityVerified) setWalletVerified(true);
      if (body.walletAddr) setWalletAddr(prev => prev || body.walletAddr);
    }).catch(() => {});
    connectAndVerifyWallet();
  }, [connectAndVerifyWallet]);

  // Refresh balance on demand (called after claim/tip)
  const refreshWalletBalance = () => {
    if (!walletAddr) return;
    api(`/api/wallet/balance?addr=${encodeURIComponent(walletAddr)}`)
      .then(({ ok, body }) => {
        if (ok && body) { setWalletBalance(body.balance); setWalletMock(!!body.mock); }
      }).catch(() => {});
  };

  // Midnight UTC reached — reload state so everything unlocks.
  const onReset = () => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    loadDaily();
  };

  const launchGame = async (game) => {
    // Non-daily games (classic, idle, PvP) skip the per-day start/lock system.
    if (!game.daily) {
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
      return;
    }
    const existing = attempts[game.id];
    if (existing) {
      if (existing.finishedAt) {
        // Finished today — straight to the locked screen.
        setCurrentGame(game);
        setScreen('locked');
      } else {
        // Claimed but unfinished — resume into the saved board state. The row
        // is already claimed, so do NOT call /start again.
        setCurrentGame(game);
        setStepCount(existing.steps || 0);
        setWinData(null);
        setLoseData(null);
        setScreen('game');
      }
      return;
    }
    const { ok, status, body } = await api(`/api/daily/${game.id}/start`, { method: 'POST' });
    if (ok) {
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
    } else if (status === 409) {
      // Lost the race / already locked — show the locked screen.
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      if (body && body.attempt) setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setScreen(body && body.attempt && !body.attempt.finishedAt ? 'game' : 'locked');
    }
  };

  // Deep-link: ?game=<id> auto-opens that game once loaded. Combined with
  // ?mmode=daily it jumps straight into Mancala's Daily Challenge — used by the
  // Daily Challenge proposal tests and shareable links. Runs once after hydrate.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (loading || deepLinkedRef.current) return;
    const gid = new URLSearchParams(window.location.search).get('game');
    if (!gid) return;
    const g = GAMES.find(x => x.id === gid);
    if (g) { deepLinkedRef.current = true; launchGame(g); }
  }, [loading]);

  // Merge a stored attempt's persisted progress JSON with its steps/elapsed so
  // a game component can hydrate from a single savedProgress object.
  const progressFor = (attempt) => {
    if (!attempt || !attempt.progress) return null;
    return { ...attempt.progress, steps: attempt.steps, elapsedSecs: attempt.elapsedSecs };
  };

  // Autosave callback handed to every game: persists in-progress state for
  // today's claimed, unfinished attempt. Best-effort (keepalive) so it survives
  // a tab close. Never blocks gameplay.
  const handleSaveProgress = (progress, steps, secs) => {
    if (!currentGame) return;
    const gameId = currentGame.id;
    api(`/api/daily/${gameId}/progress`, {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({ progress, steps, elapsedSecs: secs }),
    }).catch(() => {});
    // Keep local mirror fresh so a same-session re-entry resumes correctly.
    setAttempts(prev => {
      const a = prev[gameId];
      if (!a || a.finishedAt) return prev;
      return { ...prev, [gameId]: { ...a, progress, steps, elapsedSecs: secs } };
    });
  };

  // POST the finished daily result to the server and reconcile client state.
  // Pulled out of handleWin so the win overlay's "couldn't sync — retrying"
  // button can re-run exactly the same submission. Returns true on success.
  // Best-effort: a network throw is treated as a failed sync (syncError), never
  // an uncaught rejection that would break the overlay.
  const submitDailyFinish = async (gameId, finalScore, steps, timeSecs) => {
    let ok = false, body = null;
    try {
      const res = await api(`/api/daily/${gameId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, steps, timeSecs }),
      });
      ok = res.ok; body = res.body;
    } catch (e) {
      console.error('[daily] finish submit threw:', e && e.message);
      ok = false;
    }
    // Local mirror so the lobby card locks even if the server didn't confirm.
    const stored = ok && body && body.attempt
      ? body.attempt
      : { gameId, score: finalScore, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
    if (ok) {
      // Reconcile against the server's authoritative streak + reward + new
      // achievement badges, and clear any prior sync-error flag.
      if (body && typeof body.streak === 'number') setStreak(body.streak);
      const newAch = (body && Array.isArray(body.newAchievements)) ? body.newAchievements : [];
      if (newAch.length) {
        setAchievements(prev => mergeAchievements(prev, newAch));
      }
      setWinData(prev => prev ? {
        ...prev,
        syncError: false,
        rewardWei: body && body.rewardWei,
        newAchievements: newAch,
        justAchievement: newAch.length ? achievementBadgeFor(newAch[0]) : prev.justAchievement,
      } : prev);
      // DApp Mode: surface the Verified badge, then anchor on-chain (best-effort).
      if (body && body.dapp) {
        setWinData(prev => prev ? { ...prev, dapp: body.dapp } : prev);
        dappAnchor(body.dapp).then(updated => {
          setWinData(prev => prev ? { ...prev, dapp: updated } : prev);
        }).catch(() => {});
      }
    } else {
      setWinData(prev => prev ? { ...prev, syncError: true } : prev);
    }
    return ok;
  };

  const handleWin = async (score, steps, timeSecs, meta) => {
    try {
      // Non-daily games skip the server, streak, and totalScore nav update.
      if (currentGame && !currentGame.daily) {
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
          winnerLabel: meta && meta.winnerLabel,
          isClassic: true,
          bestScore: meta && meta.bestScore,
          longestSnake: meta && meta.longestSnake,
          // Carry the game id so the win card's "Share to Feed" button can post
          // this classic result, mirroring the daily branch below.
          gameId: currentGame.id,
          canPost: true,
        });
        // Remember this result so the Game Menu's Post to Feed stays reachable
        // after Play Again.
        setClassicLastResult({ gameId: currentGame.id, score, steps, timeSecs });
        return;
      }
      // Declare gameId FIRST — referencing it before this line is a temporal
      // dead zone ReferenceError that previously killed the entire win flow
      // (no overlay, no finish call). Keep this above setWinData.
      const gameId = currentGame.id;
      // The streak this win lands in: the first finished game of the day extends
      // the consecutive-day streak by 1; a second game the same day reuses the
      // same day count (the multiplier is per-day, not per-game).
      const playedToday = Object.values(attempts).some(a => a && a.score != null);
      const effectiveStreak = playedToday ? streak : streak + 1;
      const multiplier = streakMultiplier(effectiveStreak);
      const finalScore = Math.round(score * multiplier);
      const bonus = finalScore - score;
      setStreak(effectiveStreak);
      // A badge unlocked the moment this win's streak lands exactly on a tier.
      const unlocked = justUnlockedBadge(effectiveStreak);
      if (unlocked) {
        setBadges(prev => (prev.includes(unlocked.min) ? prev : [...prev, unlocked.min].sort((a, b) => a - b)));
      }
      // Show the celebration overlay immediately — independent of the network
      // call below, so the player always gets a clear "Solved!" confirmation.
      setWinData({
        score, bonus, finalScore, steps, timeSecs, multiplier, effectiveStreak,
        activeBadge: activeBadge(effectiveStreak),
        justBadge: unlocked,
        share: meta && meta.share,
        hintsUsed: meta && meta.hintsUsed,
        wordsSolved: meta && meta.wordsSolved,
        wordsTotal: meta && meta.wordsTotal,
        canPost: true,
        gameId,
        syncError: false,
        newAchievements: [],
      });
      setTotalScore(t => t + finalScore);
      // Submit to the server (records result, streak, reward, badges, receipt).
      await submitDailyFinish(gameId, finalScore, steps, timeSecs);
    } catch (e) {
      // Never let a handler error swallow the win silently again. Surface a
      // minimal overlay so the player sees their solve was registered.
      console.error('[daily] handleWin failed:', e && e.message);
      setWinData(prev => prev || {
        score, finalScore: score, bonus: 0, steps, timeSecs,
        multiplier: 1, effectiveStreak: 0, share: meta && meta.share, syncError: true,
      });
    }
  };

  // Retry the finish submission for the current win (used by the overlay's
  // "couldn't sync — retrying" button).
  const retryDailyFinish = () => {
    if (!winData || winData.isClassic) return;
    const gameId = winData.gameId || (currentGame && currentGame.id);
    if (!gameId) return;
    setWinData(prev => prev ? { ...prev, syncError: false, syncing: true } : prev);
    submitDailyFinish(gameId, winData.finalScore, winData.steps, winData.timeSecs)
      .finally(() => setWinData(prev => prev ? { ...prev, syncing: false } : prev));
  };

  // Loss path (used by games that can be lost, e.g. Crypto Wordle). Records a
  // finished row with score 0 so the day stays locked, but does NOT touch the
  // streak. Existing win-only games never call this.
  const handleLose = async (steps, timeSecs, meta) => {
    try {
      // Non-daily games skip the server entirely.
      if (currentGame && !currentGame.daily) {
        setLoseData({
          steps,
          timeSecs,
          share: meta && meta.share,
          answer: meta && meta.answer,
          isClassic: true,
        });
        // A loss can still be posted ("Game Over" result). score 0.
        setClassicLastResult({ gameId: currentGame.id, score: 0, steps, timeSecs });
        return;
      }
      const gameId = currentGame.id;
      setLoseData({
        steps,
        timeSecs,
        share: meta && meta.share,
        answer: meta && meta.answer,
        hintsUsed: meta && meta.hintsUsed,
        wordsSolved: meta && meta.wordsSolved,
        wordsTotal: meta && meta.wordsTotal,
      });

      let ok = false, body = null;
      try {
        const res = await api(`/api/daily/${gameId}/finish`, {
          method: 'POST',
          body: JSON.stringify({ score: 0, steps, timeSecs }),
        });
        ok = res.ok; body = res.body;
      } catch (e) {
        console.error('[daily] lose submit threw:', e && e.message);
      }
      const stored = ok && body && body.attempt
        ? body.attempt
        : { gameId, score: 0, steps, timeSecs, finishedAt: new Date().toISOString() };
      setAttempts(prev => ({ ...prev, [gameId]: stored }));
    } catch (e) {
      console.error('[daily] handleLose failed:', e && e.message);
    }
  };

  const backToLobby = (tab) => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    setClassicGameMode(null);
    setClassicGameModeOpts(null);
    setClassicLastResult(null);
    if (tab) setLobbyTab(tab);
  };

  const playAgain = () => {
    setWinData(null);
    setLoseData(null);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
    // Keep classicLastResult so the Game Menu's Post to Feed stays reachable.
  };

  // Game Menu "New Game": optionally re-mount the current classic game in a
  // chosen mode (Versus Bot / 2 Players / Online), clearing the prior result.
  const handleNewGameMode = (mode, opts) => {
    setClassicGameMode(mode || null);
    setClassicGameModeOpts(opts || null);
    setClassicLastResult(null);
    setWinData(null);
    setLoseData(null);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
  };

  // Game Menu "Save Game": persist the active Versus-Bot game's snapshot via
  // the generic user_game_state store. Returns true on success.
  const handleSaveGame = async () => {
    if (!currentGame) return false;
    const snap = ClassicBridge.getSnapshot ? ClassicBridge.getSnapshot() : null;
    if (!snap) return false;
    const { ok } = await api(`/api/state/${currentGame.id}`, {
      method: 'PUT',
      body: JSON.stringify({ state: { mode: 'bot', savedAt: Date.now(), ...snap } }),
    }).catch(() => ({ ok: false }));
    return !!ok;
  };

  // Build the menu config passed into ClassicShell for classic games.
  const classicMenuConfig = (currentGame && currentGame.category === 'classic') ? {
    game: currentGame,
    gameMode: classicGameMode,
    lastResult: classicLastResult,
    onNewGameMode: handleNewGameMode,
    onSaveGame: handleSaveGame,
    onPostToFeed: (r) => setShareModal({ show: true, caption: '', gameId: r.gameId, score: r.score, steps: r.steps, timeSecs: r.timeSecs }),
  } : null;

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

  // Render the active game's body according to its declarative `shell` flag.
  // Collapses what used to be a thicket of id/category/SELF_SHELL_GAMES checks
  // into one switch — adding a game is now purely a matter of its registry entry.
  const renderGameBody = () => {
    if (!currentGame) return null;
    switch (currentGame.shell) {
      case 'custom':
        // Bespoke screen (e.g. PvP Arena) — App owns the layout, not `component`.
        return (
          <div className="game-wrap">
            <div className="game-head">
              <button className="back-btn" onClick={backToLobby}>← Back</button>
              <div className="game-title">
                <span>{currentGame.icon}</span> {currentGame.name}
              </div>
            </div>
            <PvpArena user={user} authOk={authOk} walletAddr={walletAddr} walletBalance={walletBalance} />
          </div>
        );
      case 'self':
        // Full-screen, gesture-first game that renders its own ClassicShell.
        return (
          <GameComponent
            game={currentGame}
            onBack={() => backToLobby('classic')}
            onWin={handleWin}
            onLose={handleLose}
            onStepChange={setStepCount}
            offset={offset}
            resetKey={playAgainKey}
            menuConfig={classicMenuConfig}
            gameMode={classicGameMode}
            gameModeOpts={classicGameModeOpts}
            onModeChange={setClassicGameMode}
          />
        );
      case 'classic':
        // In-frame classic game wrapped in the shared ClassicShell.
        return (
          <ClassicShell
            game={currentGame}
            onExit={() => backToLobby('classic')}
            onNewGame={() => setPlayAgainKey(k => k + 1)}
            menuConfig={classicMenuConfig}
          >
            <div className="cg-stage cg-scroll">
              <GameComponent
                onWin={handleWin}
                onLose={handleLose}
                onStepChange={setStepCount}
                offset={offset}
                resetKey={playAgainKey}
                gameMode={classicGameMode}
                gameModeOpts={classicGameModeOpts}
                onModeChange={setClassicGameMode}
              />
            </div>
          </ClassicShell>
        );
      case 'daily':
      default:
        // Daily puzzle (and any back-header game-wrap game): resumable, locked.
        return (
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
              savedProgress={progressFor(attempts[currentGame.id])}
              onSaveProgress={handleSaveProgress}
              matchBalance={matchBalance}
              onMatchBalanceChange={setMatchBalance}
              resetKey={playAgainKey}
            />
          </div>
        );
    }
  };

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
                {authOk && activeBadge(streak) && (
                  <span
                    className="streak-badge-icon"
                    title={`${activeBadge(streak).name} — ${activeBadge(streak).min}-day streak badge`}
                  >
                    {activeBadge(streak).icon}
                  </span>
                )}
                {activeMult > 1 && <span className="mult-badge">×{activeMult}</span>}
              </div>
            </div>
          </div>
          {authOk && (
            <span className="nav-match-chip" title="MATCH tokens — earned in games, spent on hints">
              🪙 {matchBalance == null ? '…' : matchBalance} MATCH
            </span>
          )}
          {authOk && walletBalance && (
            <button
              className="nav-wallet-chip"
              title="Open Wallet"
              onClick={() => setScreen('wallet')}
            >
              🪙 {fmtUtgo(walletBalance)}
              {walletMock && <span style={{ fontSize: '0.6rem', color: C.muted, marginLeft: '0.2rem' }}>(demo)</span>}
            </button>
          )}
          {authOk && (
            <button
              className="primary-btn nav-friends-btn"
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
              onClick={() => setScreen('friends')}
            >
              👥 Friends
            </button>
          )}
          {authOk && integration.enabled && (
            <span
              className="nav-integration-chip"
              title={`dApps integration active${integration.pubkey ? ' · ' + integration.pubkey : ''}`}
            >
              🔗 dApps
            </span>
          )}
          <AccountChip
            loading={loading}
            authOk={authOk}
            user={user}
            walletVerified={walletVerified}
            onOpen={() => setScreen('account')}
          />
        </div>
      </nav>

      {screen === 'profile' && selectedUserId && (
        <ProfileScreen
          userId={selectedUserId}
          user={user}
          onBack={() => { setScreen('lobby'); setSelectedUserId(null); }}
        />
      )}

      {screen === 'friends' && (
        <FriendsListScreen
          onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
          onBack={() => setScreen('lobby')}
        />
      )}

      {screen === 'wallet' && (
        <WalletScreen
          user={user}
          authOk={authOk}
          walletAddr={walletAddr}
          walletMock={walletMock}
          onBack={() => setScreen('lobby')}
          onBalanceRefresh={refreshWalletBalance}
          onOpenReceipt={openReceipt}
        />
      )}

      {screen === 'account' && (
        <AccountScreen
          user={user}
          authOk={authOk}
          walletAddr={walletAddr}
          walletVerified={walletVerified}
          integration={integration}
          onOpenFriends={() => setScreen('friends')}
          onBack={() => setScreen('lobby')}
          onVerify={connectAndVerifyWallet}
          onDisconnect={disconnectWallet}
        />
      )}

      {screen === 'session' && (
        <SessionReceipt
          sessionId={receiptSessionId}
          onBack={() => setScreen('lobby')}
        />
      )}

      {screen === 'lobby' && (
        <div className="lobby">
          <div className="lobby-head">
            <h1>
              {lobbyTab === 'daily' ? 'Daily Puzzles' : lobbyTab === 'classic' ? 'Classic Games' : 'Community Feed'}
            </h1>
            <p>
              {lobbyTab === 'daily'
                ? 'One attempt each, per day. Resets at midnight UTC.'
                : lobbyTab === 'classic'
                ? 'Play anytime — track your best scores.'
                : 'See what your friends have been playing'}
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
            {lobbyTab === 'daily' && authOk && (() => {
              // Union of permanent earned streak badges and any the live streak
              // now satisfies, so the strip is correct right after a win too.
              const earnedDays = Array.from(new Set([...badges, ...streakBadges(streak).map(b => b.min)]));
              return <BadgeStrip badges={earnedDays} achievements={achievements} />;
            })()}
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
            {authOk && (
              <button
                className={'lobby-tab' + (lobbyTab === 'feed' ? ' active' : '')}
                onClick={() => setLobbyTab('feed')}
              >Feed</button>
            )}
          </div>
          {lobbyTab === 'pvp' ? (
            <PvpArena user={user} authOk={authOk} walletAddr={walletAddr} walletBalance={walletBalance} onOpenReceipt={openReceipt} />
          ) : lobbyTab === 'feed' ? (
            <FeedScreen user={user} setScreen={setScreen} />
          ) : (
          <div className="grid">
            {GAMES.filter(g => g.category === lobbyTab).map(g => {
              // Only daily games carry the per-day finished/in-progress lock state.
              const a = attempts[g.id];
              const finished = !!g.daily && !!(a && a.finishedAt);
              const inProgress = !!g.daily && !!a && !finished;
              return (
                <div
                  key={g.id}
                  className={`card${finished ? ' done locked' : ''}${inProgress ? ' inprogress' : ''}`}
                  style={{ '--accent': g.tagColor }}
                  onClick={() => !loading && (g.shell === 'custom' ? setCurrentGame(g) : launchGame(g))}
                >
                  <div className="card-icon">{g.icon}</div>
                  <div className="card-name">{g.name}</div>
                  <div className="card-desc">{g.desc}</div>
                  {finished ? (
                    <div className="card-lock">
                      🔒 {a.score != null
                        ? <span>+{a.score} pts · resets in {fmtCountdown(
                            (nextResetUtc ? new Date(nextResetUtc).getTime() : 0) - (Date.now() + offset))}</span>
                        : <span>Played · locked until reset</span>}
                    </div>
                  ) : inProgress ? (
                    <div className="card-resume">▶ In progress · resume</div>
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
          )}
          {authOk && (
            <BadgesSection
              streak={streak}
              attempts={attempts}
              open={badgesOpen}
              onToggle={() => setBadgesOpen(b => !b)}
            />
          )}
          {lobbyTab === 'daily' && authOk && (
            <TodayChampions
              onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
            />
          )}
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

      {screen === 'game' && currentGame && !winData && !loseData && renderGameBody()}

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
              {Number.isFinite(winData.wordsTotal) && (
                <div className="score-row">
                  <span className="k">Words solved</span>
                  <span className="v mono">{winData.wordsSolved} / {winData.wordsTotal}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">Steps · Time</span>
                <span className="v mono">{winData.steps} · {fmtTime(winData.timeSecs)}</span>
              </div>
              {winData.hintsUsed > 0 && (
                <div className="score-row">
                  <span className="k">💡 Hints used</span>
                  <span className="v mono">{winData.hintsUsed}</span>
                </div>
              )}
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+{winData.finalScore}</span>
              </div>
              {winData.rewardWei && winData.rewardWei !== '0' && !winData.isClassic && (
                <div className="win-reward-row">
                  <span className="k">🪙 Token reward</span>
                  <span className="v">+{fmtUtgo(winData.rewardWei)}</span>
                </div>
              )}
              {winData.isClassic && winData.bestScore !== undefined && (
                <div className="score-row">
                  <span className="k">Best score</span>
                  <span className="v mono">{winData.bestScore}</span>
                </div>
              )}
              {winData.isClassic && winData.longestSnake !== undefined && (
                <div className="score-row">
                  <span className="k">Longest</span>
                  <span className="v mono">{winData.longestSnake} cells</span>
                </div>
              )}
            </div>
            {!winData.isClassic && winData.justBadge && (
              <div className="badge-unlock">
                <div className="bu-icon">{winData.justBadge.icon}</div>
                <div className="bu-title">Milestone reached!</div>
                <div className="bu-name">{winData.justBadge.name} · {winData.justBadge.min}-day streak</div>
              </div>
            )}
            {!winData.isClassic && !winData.justBadge && winData.activeBadge && (
              <div className="win-badge-row">
                <span className="wbr-icon">{winData.activeBadge.icon}</span>
                <span>{winData.activeBadge.name} badge active</span>
              </div>
            )}
            {!winData.isClassic && winData.justAchievement && (
              <div className="badge-unlock">
                <div className="bu-icon">{winData.justAchievement.icon}</div>
                <div className="bu-title">Badge unlocked!</div>
                <div className="bu-name">{winData.justAchievement.name}</div>
              </div>
            )}
            {!winData.isClassic && winData.syncError && (
              <div className="win-sync-note">
                Couldn't sync your result — your puzzle is still locked for today.
                <br />
                <button onClick={retryDailyFinish} disabled={winData.syncing}>
                  {winData.syncing ? 'Retrying…' : 'Retry sync'}
                </button>
              </div>
            )}
            {winData.dapp && <VerifiedBadge session={winData.dapp} onOpenReceipt={openReceipt} />}
            {currentGame && <Leaderboard gameId={currentGame.id} solved={true} />}
            <ShareButton text={winData.share} />
            {authOk && winData.gameId && (
              <button
                className="primary-btn"
                style={{ marginBottom: '0.6rem', background: C.emerald }}
                onClick={() => setShareModal({ show: true, caption: '', gameId: winData.gameId, score: winData.finalScore, steps: winData.steps, timeSecs: winData.timeSecs })}
              >
                📤 Share to Feed
              </button>
            )}
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
              {Number.isFinite(loseData.wordsTotal) && (
                <div className="score-row">
                  <span className="k">Words solved</span>
                  <span className="v mono">{loseData.wordsSolved} / {loseData.wordsTotal}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">{loseData.isClassic ? 'Steps' : 'Guesses'} · Time</span>
                <span className="v mono">{loseData.steps} · {fmtTime(loseData.timeSecs)}</span>
              </div>
              {loseData.hintsUsed > 0 && (
                <div className="score-row">
                  <span className="k">💡 Hints used</span>
                  <span className="v mono">{loseData.hintsUsed}</span>
                </div>
              )}
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+0</span>
              </div>
            </div>
            {currentGame && <Leaderboard gameId={currentGame.id} solved={false} />}
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

      {shareModal.show && (
        <div className="win-overlay">
          <div className="win-card">
            <h2>Share to Feed</h2>
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                placeholder="Add a caption (optional, max 280 chars)"
                value={shareModal.caption}
                onChange={(e) => setShareModal(prev => ({ ...prev, caption: e.target.value.slice(0, 280) }))}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  color: C.text,
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  minHeight: '80px',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.4rem', textAlign: 'right' }}>
                {shareModal.caption.length}/280
              </div>
            </div>
            <button
              className="primary-btn"
              onClick={async () => {
                const { ok } = await api('/api/posts', {
                  method: 'POST',
                  body: JSON.stringify({
                    gameId: shareModal.gameId,
                    score: shareModal.score,
                    steps: shareModal.steps,
                    timeSecs: shareModal.timeSecs,
                    caption: shareModal.caption || null,
                  }),
                });
                if (ok) {
                  setShareModal({ show: false, caption: '' });
                  // Show brief success message
                  setTimeout(() => backToLobby(), 1500);
                }
              }}
              style={{ marginBottom: '0.6rem' }}
            >
              ✓ Post to Feed
            </button>
            <button
              className="primary-btn"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
              onClick={() => setShareModal({ show: false, caption: '' })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
// Signal to the boot-shell watchdog (index.html) that React has mounted, so
// it clears the "taking longer than usual" timer and never flashes the card.
window.__puzzlechainMounted = true;
