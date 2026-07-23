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
  /* Friends + dApps chips move into the Account screen's Connections section
     on mobile. Scoped under .nav-right so they outrank the base chip rules
     defined later in this stylesheet regardless of source order. */
  .nav-right .nav-friends-btn { display: none; }
  .nav-right .nav-integration-chip { display: none; }
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
  font-size: 0.82rem; color: ${C.text}; background: ${C.accent}14;
  border: 1px solid ${C.accent}44; border-radius: 10px;
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
  position: fixed; inset: 0; background: #000000b3; z-index: 220;
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
  background: ${C.accent}22; color: ${C.accent}; font-weight: 700;
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
  font-size: 0.8rem; color: ${C.text}; background: ${C.emerald}14;
  border: 1px solid ${C.emerald}44; border-radius: 8px;
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
/* Hinted reveals in the daily puzzles */
.scell.hinted {
  color: ${C.gold};
  font-weight: 700;
  background: ${C.gold}1a;
}
.wcell.hinted {
  background: ${C.gold}33;
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

@media (orientation: landscape) and (max-height: 560px) {
  .cg-shell { --cg-board: min(70vh, 44vw, 460px); }
  .cg-stage { flex-direction: row; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .cg-sheet, .tm-grid .tm-tile, .dr-gem, .snake-cell { transition: none !important; }
  .badge-strip-body, .badge-chevron { transition: none !important; }
}

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
.wallet-no-wallet {
  text-align: center; padding: 2rem 1rem; color: ${C.muted}; font-size: 0.9rem;
}
.wallet-btn-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }
/* ---- Nav integration chip ---- */
.nav-integration-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: ${C.card}; border: 1px solid ${C.border};
  border-radius: 999px; padding: 0.3rem 0.7rem;
  font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;
  color: ${C.accent};
}
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
.badges-toggle .badge-strip-count { color: ${C.text}; margin-left: 0.5rem; font-weight: 700; }
/* Empty/early state + next-milestone progress hints (Bug C). */
.badges-empty { font-size: 0.8rem; color: ${C.muted}; margin: 0.1rem 0 0.6rem; }
.badges-retry-btn {
  all: unset;
  cursor: pointer;
  color: ${C.accent};
  font-weight: 700;
  text-decoration: underline;
}
.badges-retry-btn:hover { color: ${C.text}; }
.badge-progress { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 0.7rem; }
.badge-progress-pill {
  font-size: 0.72rem; font-weight: 600; color: ${C.muted};
  background: ${C.gold}0d; border: 1px solid ${C.gold}33;
  border-radius: 999px; padding: 0.2rem 0.55rem;
  display: inline-flex; gap: 0.3rem; align-items: center; white-space: nowrap;
}
/* Compact always-visible earned-badge row — mobile only (desktop shows the
   full grid which already includes earned chips). */
.badges-earned-row { display: none; }
/* Win overlay next-milestone progress. */
.win-progress { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; margin: 0.6rem 0; }
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
  .badges-toggle .badge-strip-count { margin-left: auto; }
  .badges-toggle:hover { color: ${C.text}; }
  .badges-toggle-arrow { font-size: 0.7rem; transition: transform 0.15s ease; }
  .badges-grid { display: none; }
  .badges-grid.open { display: flex; margin-top: 0.6rem; }
  .badges-earned-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
  .badges-earned-row.hide { display: none; }
}
/* ---- Phase 5 board games (Checkers / Reversi / Four in a Row / Gomoku / Ludo) ---- */
.brg-intro {
  font-size: 0.85rem; color: ${C.text}; background: ${C.accent}14;
  border: 1px solid ${C.accent}44; border-radius: 10px;
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
  aspect-ratio: 1; background: ${C.bg || '#0a0e1a'}; border-radius: 50%;
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
.ludo-cell.ring.start1 { background: ${C.accent}33; border-color: ${C.accent}; }
.ludo-cell.ring.start2 { background: ${C.rose}33; border-color: ${C.rose}; }
.ludo-cell.home1 { background: ${C.accent}22; border: 1px dashed ${C.accent}66; }
.ludo-cell.home2 { background: ${C.rose}22; border: 1px dashed ${C.rose}66; }
.ludo-cell.base1 { background: ${C.accent}18; border: 1px solid ${C.accent}55; border-radius: 50%; }
.ludo-cell.base2 { background: ${C.rose}18; border: 1px solid ${C.rose}55; border-radius: 50%; }
.ludo-cell.center { background: ${C.gold}22; border: 1px solid ${C.gold}; font-size: 0.8rem; }
.ludo-token {
  z-index: 2; width: 85%; height: 85%; border-radius: 50%; align-self: center; justify-self: center;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.ludo-token.p1 { background: ${C.accent}; }
.ludo-token.p2 { background: ${C.rose}; }
.ludo-token.movable { cursor: pointer; box-shadow: 0 0 0 2px ${C.gold}, 0 1px 3px rgba(0,0,0,0.5); animation: ludoPulse 0.9s ease-in-out infinite; }
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

/* ---- Pre-launch Game Mode Modal ---- */
.gm-modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(8, 10, 18, 0.72); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
  animation: gmFade 0.18s ease-out;
}
@keyframes gmFade { from { opacity: 0; } to { opacity: 1; } }
.gm-modal {
  position: relative; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 18px; padding: 1.4rem 1.2rem 1.2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
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
.p6-btn.on, .p6-btn.primary { border-color: ${C.accent}; background: rgba(99,102,241,.18); }
.p6-hint { color: ${C.muted}; font-size: 12px; text-align: center; margin-top: 14px; line-height: 1.5; }
.p6-banner {
  background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.4); color: ${C.gold};
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
  background: rgba(255,255,255,.04); border: 1.5px dashed ${C.dim}; box-shadow: none;
  color: ${C.dim}; font-size: 18px;
}

.kl-game { max-width: 400px; margin: 0 auto; }
.kl-top { display: flex; gap: 6px; justify-content: center; margin-bottom: 14px; }
.kl-gap { width: 14px; }
.kl-tab { display: flex; gap: 6px; justify-content: center; }
.kl-col { position: relative; width: 44px; }

.sp-game { max-width: 420px; margin: 0 auto; }
.sp-game .status-bar { flex-wrap: wrap; align-items: center; gap: 8px; }
.sp-tab { display: flex; gap: 3px; justify-content: center; }
.sp-col { position: relative; width: 34px; }
.sp-col .ce-card { width: 34px; height: 46px; border-radius: 5px; }
.sp-col .ce-card .ce-rank { font-size: 12px; }
.sp-col .ce-card .ce-suit { font-size: 10px; margin-top: 1px; }
.sp-col .ce-card.ce-slot.sm { font-size: 12px; }

.mj-game { display: flex; flex-direction: column; align-items: center; }
.mj-game .status-bar { align-items: center; gap: 8px; }
.mj-board { position: relative; margin: 4px auto 0; }
.mj-tile {
  position: absolute; width: 36px; height: 46px; border-radius: 6px; cursor: pointer;
  background: linear-gradient(180deg, #F8FAFF, #DDE4F2); border: 1px solid #B7C2D8;
  border-bottom-width: 3px; display: flex; align-items: center; justify-content: center;
  font-size: 19px; user-select: none; box-shadow: 2px 3px 4px rgba(0,0,0,.45);
}
.mj-tile.blocked { filter: brightness(.62); cursor: default; }
.mj-tile.sel { outline: 2px solid ${C.gold}; outline-offset: 1px; filter: brightness(1.08); }
.mj-tile.up1 { border-color: #A3B0CB; }
.mj-tile.up2, .mj-tile.up3 { border-color: #8E9DBD; }

.ng-game { max-width: 420px; margin: 0 auto; }
.ng-modes { display: flex; gap: 6px; margin-left: auto; }
.ng-wrap {
  display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto;
  justify-content: center; gap: 4px;
}
.ng-corner { grid-row: 1; grid-column: 1; }
.ng-colclues { grid-row: 1; grid-column: 2; display: grid; grid-template-columns: repeat(8, 34px); gap: 2px; }
.ng-colclue {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  color: ${C.muted}; font-family: 'JetBrains Mono', monospace; font-size: 12px; gap: 1px; padding-bottom: 2px;
}
.ng-rowclues { grid-row: 2; grid-column: 1; display: grid; grid-template-rows: repeat(8, 34px); gap: 2px; }
.ng-rowclue {
  display: flex; align-items: center; justify-content: flex-end; padding-right: 6px;
  color: ${C.muted}; font-family: 'JetBrains Mono', monospace; font-size: 12px; min-width: 34px;
}
.ng-grid { grid-row: 2; grid-column: 2; display: grid; grid-template-columns: repeat(8, 34px); grid-auto-rows: 34px; gap: 2px; }
.ng-cell {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: ${C.muted}; font-size: 14px;
}
.ng-cell:nth-child(8n+4), .ng-cell:nth-child(8n+5) { border-left-color: ${C.dim}; }
.ng-cell.fill { background: ${C.accent}; border-color: ${C.accent}; }
.ng-cell.mark { color: ${C.dim}; }

.mf-game { max-width: 420px; margin: 0 auto; }
.mf-game .status-bar { align-items: center; gap: 8px; }
.mf-grid { display: grid; grid-template-columns: repeat(9, 36px); grid-auto-rows: 36px; gap: 3px; justify-content: center; }
.mf-cell {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 5px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px; color: ${C.text};
  user-select: none;
}
.mf-cell:not(.rev):hover { border-color: ${C.accent}; }
.mf-cell.rev { background: rgba(255,255,255,.05); border-color: ${C.dim}; cursor: default; }
.mf-cell.rev.mine { background: rgba(251,113,133,.15); }
.mf-cell.boom { background: rgba(251,113,133,.45); border-color: ${C.rose}; }

.an-game { max-width: 420px; margin: 0 auto; text-align: center; }
.an-dots { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.an-dot {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.muted}; border-radius: 999px;
  padding: 3px 10px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
}
.an-dot.solved { border-color: ${C.emerald}; color: ${C.emerald}; }
.an-dot.cur { border-color: ${C.accent}; color: ${C.text}; }
.an-slots { display: flex; gap: 5px; justify-content: center; margin-bottom: 16px; }
.an-slot {
  width: 40px; height: 48px; border-radius: 8px; border: 1.5px dashed ${C.dim};
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: ${C.text};
}
.an-slot.has { border-style: solid; border-color: ${C.accent}; background: rgba(99,102,241,.12); }
.an-slots.bad .an-slot.has { border-color: ${C.rose}; background: rgba(251,113,133,.12); animation: an-shake .4s; }
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
.cp-cell.goal { background: rgba(52,211,153,.16); box-shadow: inset 0 0 0 2px rgba(52,211,153,.5); }
.cp-crate.ongoal { filter: hue-rotate(60deg) brightness(1.2); }
.cp-pad {
  display: grid; grid-template-columns: repeat(3, 52px); gap: 6px; justify-content: center; margin-bottom: 10px;
}
.cp-pad .p6-btn { padding: 10px 0; }

.ds-game { max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.ds-next {
  position: relative; height: 30px; color: ${C.muted}; font-size: 12px; margin-bottom: 6px;
  display: flex; align-items: flex-start; gap: 8px; padding-left: 0;
}
.ds-next { min-width: 120px; }
.ds-next .ds-mini { position: absolute; width: 8px; height: 8px; border-radius: 2px; }
.ds-next .ds-last { color: ${C.gold}; }
.ds-grid {
  display: grid; grid-template-columns: repeat(9, 30px); grid-auto-rows: 30px; gap: 2px;
  background: rgba(255,255,255,.03); border: 1px solid ${C.border}; border-radius: 8px; padding: 6px;
  margin-bottom: 12px;
}
.ds-cell { background: ${C.card}; border-radius: 3px; border: 1px solid transparent; cursor: pointer; }
.ds-cell.hover { opacity: .5; }
.ds-cell.ghost { background: transparent; border-style: dashed; }
.ds-pad { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }


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
.gotd-lb { border-top: 1px solid ${C.border}; margin-top: 14px; padding-top: 10px; }
.gotd-lb-title { color: ${C.muted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.gotd-lb-row { display: flex; gap: 10px; align-items: center; padding: 3px 0; font-size: 13px; }
.gotd-lb-row .r { color: ${C.muted}; width: 28px; }
.gotd-lb-row .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gotd-lb-row .t { color: ${C.emerald}; }
.gotd-lb-row.me .n { color: ${C.gold}; font-weight: 700; }
.gotd-lb-more { color: ${C.dim}; font-size: 11.5px; margin-top: 4px; }
.gotd-signedout { color: ${C.muted}; font-size: 12.5px; margin-top: 12px; }

.home-links { display: flex; gap: 8px; margin-bottom: 1.2rem; flex-wrap: wrap; }
.home-link-btn {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.text};
  border-radius: 999px; padding: 7px 14px; font-family: inherit; font-size: 13px;
  font-weight: 600; cursor: pointer;
}
.home-link-btn:hover { border-color: ${C.accent}; }
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

.chat-overlay {
  position: fixed; inset: 0; background: rgba(4, 6, 12, 0.72); z-index: 240;
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
.chat-msg.mine { align-self: flex-end; border-color: ${C.accent}55; background: rgba(99,102,241,0.10); }
.chat-msg.hidden-msg { background: none; border-style: dashed; }
.chat-tombstone { color: ${C.dim}; font-size: 12px; font-style: italic; }
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
  move:      { f: 320, d: 0.05, t: 'square',   g: 0.05 },
  click:     { f: 440, d: 0.04, t: 'triangle', g: 0.05 },
  merge:     { f: 540, d: 0.09, t: 'sine',     g: 0.07 },
  clear:     { f: 660, d: 0.10, t: 'sine',     g: 0.08 },
  capture:   { f: 740, d: 0.12, t: 'triangle', g: 0.08 },
  deal:      { f: 380, d: 0.05, t: 'square',   g: 0.05 },
  chip:      { f: 500, d: 0.06, t: 'square',   g: 0.06 },
  win:       { f: 784, d: 0.22, t: 'sine',     g: 0.09 },
  lose:      { f: 150, d: 0.30, t: 'sawtooth', g: 0.08 },
  // Bounce-specific cues
  bwall:     { f: 290, d: 0.03, t: 'square',   g: 0.06 },
  bpaddle:   { f: 360, d: 0.07, t: 'triangle', g: 0.07 },
  bbrick:    { f: 580, d: 0.11, t: 'sine',     g: 0.09 },
  blevel:    { f: 880, d: 0.28, t: 'sine',     g: 0.10 },
  bpowerup:  { f: 720, d: 0.14, t: 'triangle', g: 0.08 },
  bdie:      { f: 190, d: 0.35, t: 'sawtooth', g: 0.10 },
  bgameover: { f: 140, d: 0.55, t: 'sawtooth', g: 0.11 },
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
// Bumped on every fetch/decode kicked off — lets a superseded in-flight
// request (e.g. a second startBackgroundMusic(url) call for a different
// track before the first one finished decoding) recognize it's stale and
// skip starting a source, instead of both requests racing to call
// _bgStartSource() and briefly double-firing playback.
let _bgMusicToken = 0;

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
  const token = ++_bgMusicToken;
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => new Promise((resolve, reject) => {
      // decodeAudioData has both promise and legacy-callback forms — support both.
      let p;
      try { p = ctx.decodeAudioData(buf, resolve, reject); } catch (e) { reject(e); return; }
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    }))
    .then(decoded => {
      // A newer startBackgroundMusic() call superseded this one while we were
      // decoding — drop the stale result instead of racing it into _bgStartSource().
      if (token !== _bgMusicToken) return;
      _bgMusicLoading = false;
      _bgMusicBuffer = decoded;
      // Only begin if no stop/pause arrived while we were decoding.
      if (!_bgMusicStopped) _bgStartSource();
    })
    .catch(() => { if (token === _bgMusicToken) _bgMusicLoading = false; });
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
    if (ok && body && body.state && body.state.mode === 'bot') {
      return { ...body.state };
    }
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
  solo:   { icon: '🎯', name: 'Classic Solo',      desc: 'Play solo and chase your best score' },
  bot:    { icon: '🤖', name: 'Versus Bot',        desc: 'Play against the computer' },
  '2p':   { icon: '👥', name: '2 Players',         desc: 'Pass and play on this device' },
  online: { icon: '🌐', name: 'Online Race',       desc: 'Race a friend via room code — highest score wins' },
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

// Unified pre-launch mode-selection modal for multi-mode classic games
// (today: 2048 + Block Blast, modes ['solo','online']). Shows the game's
// modes, an Online create/join sub-panel, and — for games with a global
// leaderboard — a "Top players" preview. Calls onStart(mode, opts) to launch.
function GameModeModal({ game, onStart, onClose }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const modes = game.modes || [];

  const handlePlay = async () => {
    if (!mode || busy) return;
    if (mode !== 'online') { onStart(mode, {}); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${game.id}/rooms`, { method: 'POST' });
      setBusy(false);
      if (ok && body) onStart('online', { roomAction: 'create', roomId: body.id });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api(`/api/classic/${game.id}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) onStart('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()} style={{ '--accent': game.tagColor || C.accent }}>
        <button className="gm-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="gm-modal-head">
          <span className="gm-modal-icon">{game.icon}</span>
          <div>
            <div className="gm-modal-title">{game.name}</div>
            <div className="gm-modal-desc">{game.desc}</div>
          </div>
        </div>
        <div className="gm-modal-label">Choose a mode</div>
        <div className="gm-modes">
          {modes.map(m => {
            const meta = CLASSIC_MODE_META[m] || { icon: '🎮', name: m, desc: '' };
            return (
              <button key={m} className={'gm-mode-btn' + (mode === m ? ' active' : '')}
                onClick={() => { setMode(m); setOnlineAction(null); setError(''); }}>
                <span className="gm-mode-icon">{meta.icon}</span>
                <span className="gm-mode-text">
                  <span className="gm-mode-name">{meta.name}</span>
                  <span className="gm-mode-desc">{meta.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {mode === 'online' && (
          <div className="gm-online">
            <div className="gm-online-actions">
              <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
              <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
            </div>
            {onlineAction === 'join' && (
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            )}
            {onlineAction === 'create' && (
              <div className="gm-online-hint">A room code will be generated — share it with a friend, then they pick Join Room.</div>
            )}
          </div>
        )}
        {error && <div className="mnc-join-error">{error}</div>}
        <button className="gm-play-btn" onClick={handlePlay} disabled={!canStart || busy}>
          {busy ? 'Please wait…' : 'Play'}
        </button>
        {game.leaderboard && (
          <div className="gm-modal-lb"><ClassicLeaderboard gameId={game.id} /></div>
        )}
      </div>
    </div>
  );
}

// The Menu tab of the ClassicShell bottom sheet: New Game, Save Game (bot
// only), and Post to Feed (after a result).
function ClassicGameMenuSection({ game, gameMode, lastResult, onNewGameMode, onSaveGame, onPostToFeed, onClose }) {
  const [picking, setPicking] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'plain'
  const modes = game.modes || [];
  const usePicker = !!game.menuModePicker && modes.length > 0;
  // Default new-game mode for games without an inline picker.
  const defaultMode = modes.length === 1 ? modes[0] : null;

  const doSave = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    const result = await onSaveGame();
    if (result && result.ok) {
      setSaveStatus('plain');
      setTimeout(() => setSaveStatus(null), 1500);
    } else {
      setSaveStatus(null);
    }
  };

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'plain' ? 'Saved ✓'
    : '💾 Save Game';

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
          <button className="cg-sheet-action" onClick={doSave} disabled={saveStatus === 'saving'}>{saveLabel}</button>
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
      <span>
        💾 You have a saved game.
      </span>
      <div className="cg-resume-actions">
        <button onClick={onResume}>Resume</button>
        <button className="ghost" onClick={onDismiss}>New</button>
      </div>
    </div>
  );
}

// game: { icon, name }; onExit/onNewGame callbacks; sheetSections: [{ id, label, render }]
// menuConfig (optional): wires the first "Menu" tab — New Game / Save / Post to Feed.
function ClassicShell({ game, onExit, onNewGame, sheetSections, children, menuConfig, onHowTo, onChat }) {
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
        {onChat && <button className="cg-btn" onClick={() => { cgSound('click'); onChat(); }} title="Game chat" aria-label="Game chat">💬</button>}
        {onHowTo && <button className="cg-btn" onClick={() => { cgSound('click'); onHowTo(); }} title="How to play" aria-label="How to play">?</button>}
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

// Submit a finished classic-game run to the global leaderboard. Best-effort:
// a network failure never blocks gameplay. `extra` is optional game-specific
// stats (e.g. { bestTimeSecs, bestLevel }). Returns the server's
// { bestScore, rank, gamesPlayed } or null.
async function submitClassicScore(gameId, score, extra) {
  try {
    const { ok, body } = await api(`/api/classic/${gameId}/score`, {
      method: 'POST',
      body: JSON.stringify({ score: Math.max(0, Math.round(score || 0)), extra: extra || undefined }),
    });
    return ok ? body : null;
  } catch { return null; }
}

// Reusable global leaderboard for the score-based classic games. Lazily fetches
// /api/classic/:gameId/leaderboard, highlights the caller, and pins their row
// when outside the top N. `valueFmt` formats a row's headline number.
/* ---- Leaderboard scope tabs (phase 4) --------------------------------------
   Global | Friends pills shared by every board. `?lbscope=friends` in the URL
   preselects the Friends view (used by proposal tests and deep links). */
function lbInitialScope() {
  try {
    return new URLSearchParams(window.location.search).get('lbscope') === 'friends'
      ? 'friends' : 'global';
  } catch { return 'global'; }
}
function LbScopeTabs({ scope, onChange }) {
  return (
    <div className="lb-scope-tabs">
      <button
        className={'lb-scope-tab' + (scope === 'global' ? ' active' : '')}
        onClick={() => onChange('global')}
      >🌍 Global</button>
      <button
        className={'lb-scope-tab' + (scope === 'friends' ? ' active' : '')}
        onClick={() => onChange('friends')}
      >👥 Friends</button>
    </div>
  );
}
const LB_FRIENDS_EMPTY = 'No friends on this board yet — follow players from their profiles.';

function ClassicLeaderboard({ gameId, url, valueLabel = 'Score', valueFmt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Friends scope only exists on the generic classic endpoint — boards with a
  // custom `url` (snake, breakout, …) stay single-scope.
  const [scope, setScope] = useState(url ? 'global' : lbInitialScope());
  const fmt = valueFmt || ((r) => `${r.bestScore} pts`);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    const path = url || `/api/classic/${gameId}/leaderboard${scope === 'friends' ? '?scope=friends' : ''}`;
    api(path).then(({ ok, body }) => {
      if (cancelled) return;
      if (ok && body) setData(body); else setError(true);
      setLoading(false);
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [gameId, scope]);

  const scopeTabs = !url && <LbScopeTabs scope={scope} onChange={setScope} />;
  if (loading) return <div><h4>Leaderboard</h4>{scopeTabs}<div className="cg-sheet-empty">Loading…</div></div>;
  if (error) return <div><h4>Leaderboard</h4>{scopeTabs}<div className="cg-sheet-empty">Couldn't load leaderboard.</div></div>;
  const entries = (data && data.entries) || [];
  const me = data && data.me;
  const meInTop = me && entries.some(e => e.rank === me.rank);
  if (entries.length === 0) {
    return (
      <div>
        <h4>Leaderboard</h4>
        {scopeTabs}
        <div className="cg-sheet-empty">
          {scope === 'friends' ? LB_FRIENDS_EMPTY : 'No scores yet — play to rank!'}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h4>Leaderboard <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.78rem' }}>· {valueLabel}</span></h4>
      {scopeTabs}
      <div className="snake-lb">
        {entries.map(r => (
          <div key={r.rank} className={'snake-lb-row' + (me && r.rank === me.rank ? ' snake-lb-me' : '')}>
            <div className="snake-lb-rank">#{r.rank}</div>
            <div className="snake-lb-name">{r.username}{me && r.rank === me.rank ? ' (you)' : ''}</div>
            <div className="snake-lb-score">{fmt(r)}</div>
          </div>
        ))}
        {me && !meInTop && (
          <div className="snake-lb-row snake-lb-me" style={{ marginTop: '0.4rem' }}>
            <div className="snake-lb-rank">#{me.rank}</div>
            <div className="snake-lb-name">{me.username || 'you'} (you)</div>
            <div className="snake-lb-score">{fmt(me)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sheet-section builder so any ClassicShell game can add a Leaderboard tab.
function cgLeaderboardSection(gameId, opts) {
  return {
    id: 'leaderboard', label: 'Leaderboard',
    render: () => <ClassicLeaderboard gameId={gameId} url={opts && opts.url} valueLabel={(opts && opts.valueLabel) || 'Score'} valueFmt={opts && opts.valueFmt} />,
  };
}

// Generic online-race host for score-based classic games (2048, Block Blast).
// Each player plays their OWN board; whoever posts the higher final score wins.
// Lifecycle: waiting → countdown → playing → submitted → result. `renderBoard`
// is a render-prop that gets { onEnd(score) } and renders the solo board,
// calling onEnd exactly once when that board's game ends.
function ClassicRaceGame({ game, roomId, myPlayerNum, renderBoard, onExitLobby }) {
  const { room, pollingError } = useClassicRoom(game.id, roomId);
  const [phase, setPhase] = useState('waiting');
  const [count, setCount] = useState(3);
  const [myScore, setMyScore] = useState(null);
  const [canClaim, setCanClaim] = useState(false);
  const submittedRef = useRef(false);

  const oppScore = room ? (myPlayerNum === 1 ? room.p2Score : room.p1Score) : null;
  const oppName = room ? (myPlayerNum === 1 ? room.player2Name : room.player1Name) : null;

  // Start the countdown once both players are present and the room is active.
  useEffect(() => {
    if (phase === 'waiting' && room && room.status === 'active' && room.player2Id) {
      setPhase('countdown');
    }
    if (room && room.status === 'finished' && submittedRef.current && phase === 'submitted') {
      setPhase('result');
    }
  }, [room && room.status, room && room.player2Id]);

  // 3-2-1-Go countdown.
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCount(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(id); setPhase('playing'); }
      else setCount(n);
    }, 900);
    return () => clearInterval(id);
  }, [phase]);

  // Allow claiming the win if the opponent stalls 60s after I've finished.
  useEffect(() => {
    if (phase !== 'submitted') return;
    const id = setTimeout(() => setCanClaim(true), 60000);
    return () => clearTimeout(id);
  }, [phase]);

  const handleEnd = async (score) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setMyScore(score);
    setPhase('submitted');
    submitClassicScore(game.id, score); // also count toward global leaderboard
    try {
      const { ok, body } = await api(`/api/classic/${game.id}/rooms/${roomId}/score`, {
        method: 'POST', body: JSON.stringify({ score }),
      });
      if (ok && body && body.status === 'finished') setPhase('result');
    } catch {}
  };

  const claimWin = async () => {
    await api(`/api/classic/${game.id}/rooms/${roomId}/finish`, {
      method: 'POST', body: JSON.stringify({ winner: String(myPlayerNum) }),
    }).catch(() => {});
    setPhase('result');
  };

  if (pollingError === 'room_not_found') {
    return <div className="cg-stage" style={{ textAlign: 'center', padding: '2rem', color: C.rose }}>Room not found.</div>;
  }

  if (phase === 'waiting') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="mnc-spinner" />
        <div className="gm-race-title">Online Race</div>
        <div className="gm-race-sub">Waiting for opponent to join…</div>
        {room && (
          <div className="gm-race-code">Room code: <b>{room.id}</b></div>
        )}
        <button className="gm-play-btn" style={{ maxWidth: 220 }} onClick={onExitLobby}>Cancel</button>
      </div>
    );
  }
  if (phase === 'countdown') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="gm-race-title">Get ready!</div>
        <div className="gm-countdown">{count}</div>
        <div className="gm-race-sub">Race to the highest score</div>
      </div>
    );
  }
  if (phase === 'playing') {
    return (
      <div className="cg-stage cg-scroll">
        <div className="gm-opp-chip">🆚 {oppName || 'Opponent'}: <b>{oppScore != null ? oppScore : '…'}</b></div>
        {renderBoard({ onEnd: handleEnd })}
      </div>
    );
  }
  if (phase === 'submitted') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="mnc-spinner" />
        <div className="gm-race-title">Your score: {myScore}</div>
        <div className="gm-race-sub">Waiting for {oppName || 'opponent'} to finish…</div>
        <div className="gm-race-code">Their score so far: <b>{oppScore != null ? oppScore : '—'}</b></div>
        {canClaim && <button className="gm-play-btn" style={{ maxWidth: 260 }} onClick={claimWin}>Opponent stalled — claim win</button>}
        <button className="gm-link-btn" onClick={onExitLobby}>Leave race</button>
      </div>
    );
  }
  // result
  const youWin = room && room.winner === String(myPlayerNum);
  const mine = room ? (myPlayerNum === 1 ? room.p1Score : room.p2Score) : myScore;
  const theirs = room ? (myPlayerNum === 1 ? room.p2Score : room.p1Score) : oppScore;
  return (
    <div className="cg-stage gm-race-center">
      <div style={{ fontSize: '2.4rem' }}>{youWin ? '🏆' : '🤝'}</div>
      <div className="gm-race-title">{youWin ? 'You win!' : (mine === theirs ? 'Draw' : 'Opponent wins')}</div>
      <div className="gm-race-scores">
        <div><span>You</span><b>{mine != null ? mine : '—'}</b></div>
        <div><span>{oppName || 'Opponent'}</span><b>{theirs != null ? theirs : '—'}</b></div>
      </div>
      <button className="gm-play-btn" style={{ maxWidth: 220 }} onClick={onExitLobby}>Back to lobby</button>
    </div>
  );
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

// Server-issued daily seeds (phase 2), keyed by gameId. Populated by loadDaily
// from GET /api/daily (or GET /api/public/daily when signed out) BEFORE any
// game can mount, and refreshed from the /start response so a client that sat
// on the lobby across the UTC reset still mounts the new day's board. When a
// seed is missing (partial deploy, network hiccup) the legacy day-number
// derivation below keeps the board renderable — and because the server's
// generation policy currently issues that same legacy value, both paths agree.
let SERVER_DAILY_SEEDS = {};
function serverDailySeed(gameId) {
  const s = SERVER_DAILY_SEEDS[gameId];
  return Number.isFinite(s) ? s : null;
}

// A fresh seeded RNG for (today, gameId). Everyone on the same UTC day gets the
// identical board for each game — the precondition for a fair leaderboard.
// Prefers the server-issued seed; mulberry32 stays the downstream generator
// either way, so game code is untouched by the server-seed flip.
function dailyRng(offset, gameId) {
  const srv = serverDailySeed(gameId);
  const seed = srv != null ? srv : ((utcDayNum(offset) + hashStr(gameId)) >>> 0);
  return mulberry32(seed >>> 0);
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


// Shared hint bar for every daily puzzle. Hints are FREE (the MATCH currency
// is retired) but capped per day and counted server-side. Behaviour-free: the
// parent owns the hint state and passes a `buy` handler (kept identical across
// all four daily games so the control looks and feels the same everywhere).
function HintBar({ hintsLeft, exhausted, buying, onBuy, msg, label }) {
  return (
    <div className="cw-hint-bar">
      <button
        className="cw-hint-btn"
        onClick={onBuy}
        disabled={buying || exhausted}
      >
        {exhausted
          ? `💡 ${label || 'No more hints'}`
          : <>💡 Hint{Number.isFinite(hintsLeft) ? ` · ${hintsLeft} left` : ''}</>}
      </button>
      {msg && <span className="cw-hint-msg">{msg}</span>}
    </div>
  );
}

// Shared hint state hook for the daily games that use a generic "reveal"
// (Sudoku cell, Word Hunt start, Tile Match nudge). Reads today's
// server-authoritative count and performs the atomic capped use — free, no
// currency involved. `onReveal(usedIndex)` applies the game-specific reveal
// and should return false to abort (e.g. nothing left to reveal). Crypto
// Wordle keeps its own bespoke per-round logic and does not use this hook.
function useDailyHints({ gameId, maxHints }) {
  const { useState, useEffect } = React;
  const [hintsPurchased, setHintsPurchased] = useState(0);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api(`/api/daily/${gameId}/hint`);
      if (!alive || !ok || !body) return;
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
    })();
    return () => { alive = false; };
  }, []);

  const exhausted = maxHints != null && hintsPurchased >= maxHints;
  const hintsLeft = maxHints != null ? Math.max(0, maxHints - hintsPurchased) : null;

  // onReveal(index) must apply the reveal and return true; returning false
  // aborts (the server counter has already advanced, which only means one
  // fewer free hint today — never a lost purchase).
  const buy = async (onReveal) => {
    if (buying || exhausted) return;
    setBuying(true);
    setMsg('');
    const { ok, status, body } = await api(`/api/daily/${gameId}/hint`, {
      method: 'POST', body: JSON.stringify({ maxHints }),
    });
    setBuying(false);
    if (ok && body) {
      const idx = (Number.isFinite(body.hintsPurchased) ? body.hintsPurchased : hintsPurchased + 1) - 1;
      const applied = onReveal ? onReveal(idx) : true;
      if (applied === false) return;
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
      return;
    }
    if (status === 409 && body && body.code === 'no_more_hints') {
      setMsg('No more hints');
    } else {
      setMsg('Could not use hint');
    }
  };

  return { hintsPurchased, hintsLeft, exhausted, buying, msg, buy };
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

// The nearest streak badge the player has NOT yet reached (lowest min > streak),
// or null when every streak tier is already earned. Used for the "X/Y days →
// Name" progress hint so a player who finished today sees concrete progress
// even when no badge unlocked this run.
function nextStreakBadge(streak) {
  return STREAK_BADGES.find(b => b.min > streak) || null;
}

// The nearest lifetime-solve milestone the player has NOT yet reached
// (lowest count > solveCount), or null when all are earned. Drives the
// "X/Y solves → Name" progress hint.
function nextSolveMilestone(solveCount) {
  return SOLVE_MILESTONE_BADGES.find(b => b.count > (solveCount || 0)) || null;
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
  // Server-confirmed streak milestones arrive in newAchievements as
  // { type: 'streak_milestone', metadata: { streak: <days> } }; resolve to the
  // STREAK_BADGES entry so the win overlay can celebrate it like any other
  // badge. We normalise its shape to { name, icon } (STREAK_BADGES has no
  // `desc`), so the overlay can render it uniformly.
  if (ach.type === 'streak_milestone') {
    const days = ach.metadata && +ach.metadata.streak;
    const b = STREAK_BADGES.find(x => x.min === days);
    return b ? { ...b, desc: `${b.min}-day streak` } : null;
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
  const { puzzle, solution } = init;
  const dayNum = useRef(utcDayNum(offset)).current;

  // Hydrate from a resumed attempt when the saved board is for today's puzzle.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress
    : null;
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map(row => row.slice()) : puzzle.map(row => row.slice())
  );
  // Cells revealed by a paid hint — locked like givens, persisted across resume.
  const [hintedCells, setHintedCells] = useState(() =>
    new Set(resumed && Array.isArray(resumed.hintedCells) ? resumed.hintedCells : [])
  );
  const [selected, setSelected] = useState(null); // [r, c]
  const [errors, setErrors] = useState(() => sudokuConflicts(grid));
  // Steps is a free counter (not encoded in the grid), so restore it whenever
  // the attempt carries one — even if the board itself couldn't be rehydrated.
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const cellKey = (r, c) => r * 6 + c;
  const isGiven = (r, c) => puzzle[r][c] !== 0;
  const isLocked = (r, c) => isGiven(r, c) || hintedCells.has(cellKey(r, c));

  // Paid hints: total empty cells in the puzzle is the per-day cap.
  const totalEmpty = useRef(puzzle.flat().filter(v => v === 0).length).current;
  const hints = useDailyHints({ gameId: 'sudoku', maxHints: totalEmpty });
  const emptyCells = () => {
    const out = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (grid[r][c] === 0) out.push([r, c]);
    return out;
  };
  const noEmpty = grid.flat().every(v => v !== 0);

  // Idle/leave autosave (timer advance + tab close). Per-move saves happen in place().
  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs, hintedCells };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, grid: stateRef.current.grid, hintedCells: [...stateRef.current.hintedCells] },
      steps: stateRef.current.steps, secs: stateRef.current.secs,
    }),
    !done
  );

  const saveNow = (ng, ns, hc) =>
    onSaveProgress && onSaveProgress({ dayNum, grid: ng, hintedCells: [...hc] }, ns, secs);

  // Reveal one correct cell — the selected empty cell if any, else a random one.
  const buyHint = () => {
    if (done || noEmpty) return;
    hints.buy(() => {
      let target = null;
      if (selected && grid[selected[0]][selected[1]] === 0 && !isGiven(selected[0], selected[1])) {
        target = selected;
      } else {
        const empties = emptyCells();
        if (!empties.length) return true; // nothing to reveal (server already charged)
        target = empties[Math.floor(Math.random() * empties.length)];
      }
      const [r, c] = target;
      const ng = grid.map(row => row.slice());
      ng[r][c] = solution[r][c];
      const hc = new Set(hintedCells); hc.add(cellKey(r, c));
      setGrid(ng);
      setHintedCells(hc);
      setErrors(sudokuConflicts(ng));
      saveNow(ng, steps, hc);
      if (sudokuSolved(ng)) {
        setDone(true);
        const score = Math.max(1200 - steps * 15 - secs * 2, 200);
        onWin(score, steps, secs);
      }
      return true;
    });
  };

  const place = (val) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (isLocked(r, c)) return;

    const ng = grid.map(row => row.slice());
    ng[r][c] = val;
    setGrid(ng);

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    // recompute conflict highlighting from the full grid
    setErrors(sudokuConflicts(ng));

    // persist this move immediately
    saveNow(ng, newSteps, hintedCells);

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
            const hinted = hintedCells.has(cellKey(r, c));
            const locked = given || hinted;
            const isSel = selKey === key;
            const isHl = !isSel && selected &&
              (selected[0] === r || selected[1] === c || boxAt(r, c) === selBox);
            const isErr = errors.has(key);
            const cls = ['scell'];
            if (given) cls.push('given'); else if (hinted) cls.push('hinted'); else if (v !== 0) cls.push('user');
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
                onClick={() => !locked && !done && setSelected([r, c])}
              >
                {v !== 0 ? v : ''}
              </div>
            );
          })
        )}
      </div>

      {!done && (
        <HintBar
          hintsLeft={hints.hintsLeft}
          exhausted={hints.exhausted || noEmpty}
          buying={hints.buying}
          onBuy={buyHint}
          msg={hints.msg}
          label={noEmpty ? 'Board full' : 'No more hints'}
        />
      )}

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
      setMsg({ ok: true, text: 'Disconnected. Your public wallet link is kept on your account.' });
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

          {/* Connections — Friends + dApps + balances, shown here only on narrow
              viewports (hidden ≥561px via CSS, where they live in the top bar). */}
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
  const [scope, setScope] = useState(lbInitialScope);

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    (async () => {
      const { ok, body } = await api(`/api/daily/${gameId}/leaderboard${scope === 'friends' ? '?scope=friends' : ''}`);
      if (!alive) return;
      if (ok && body) setState({ loading: false, ...body });
      else setState({ loading: false, entries: [], me: null, total: 0, error: true });
    })();
    return () => { alive = false; };
  }, [gameId, scope]);

  if (state.loading) {
    return <div className="lboard"><div className="lboard-title">Today's leaderboard</div><LbScopeTabs scope={scope} onChange={setScope} /><div className="lboard-empty">Loading…</div></div>;
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
      <LbScopeTabs scope={scope} onChange={setScope} />
      {entries.length === 0 ? (
        <div className="lboard-empty">
          {scope === 'friends' ? LB_FRIENDS_EMPTY : "Be the first to solve today's puzzle."}
        </div>
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
  const [scope, setScope] = useState(lbInitialScope);

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    (async () => {
      const { ok, body } = await api(`/api/daily/leaderboard/today${scope === 'friends' ? '?scope=friends' : ''}`);
      if (!alive) return;
      if (ok && body) setState({ loading: false, ...body });
      else setState({ loading: false, entries: [], me: null, total: 0, error: true });
    })();
    return () => { alive = false; };
  }, [scope]);

  if (state.loading) {
    return <div className="lboard champions"><div className="lboard-title">Today's Champions</div><LbScopeTabs scope={scope} onChange={setScope} /><div className="lboard-empty">Loading…</div></div>;
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
      <LbScopeTabs scope={scope} onChange={setScope} />
      {entries.length === 0 ? (
        <div className="lboard-empty">
          {scope === 'friends' ? LB_FRIENDS_EMPTY : "No one has solved today's puzzles yet — be the first!"}
        </div>
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
   Rating ladder (phase 4) — Elo standings for the head-to-head
   games, fed by online room/match results. Shows rating, current
   win streak, and this week's movement per player.
   ============================================================ */
const LADDER_GAMES = [
  'chutes-ladders', 'mancala', '2048', 'blockblast',
  // Phase 5 board games (rules modules over classic_rooms).
  'checkers', 'reversi', 'fourinarow', 'gomoku', 'ludo',
];

function LadderScreen() {
  const [gameId, setGameId] = useState(LADDER_GAMES[0]);
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    api(`/api/ladder/${gameId}`).then(({ ok, body }) => {
      if (!alive) return;
      setState(ok && body
        ? { loading: false, ...body }
        : { loading: false, entries: [], me: null, movers: [], error: true });
    }).catch(() => { if (alive) setState({ loading: false, entries: [], me: null, movers: [] }); });
    return () => { alive = false; };
  }, [gameId]);

  const games = GAMES.filter(g => LADDER_GAMES.includes(g.id));
  const entries = state.entries || [];
  const me = state.me || null;
  const meVisible = me && entries.some(e => e.isCurrentUser);
  const delta = (d) => d > 0
    ? <span className="ladder-delta up mono">▲{d}</span>
    : d < 0
    ? <span className="ladder-delta down mono">▼{-d}</span>
    : <span className="ladder-delta flat mono">—</span>;
  const row = (e, pinned) => (
    <div key={pinned ? 'me-pinned' : e.rank} className={`lrow${e.isCurrentUser ? ' me' : ''}${pinned ? ' pinned' : ''}`}>
      <span className="lrank mono">#{e.rank}</span>
      <span className="lname">{e.username}{e.isCurrentUser ? ' (you)' : ''}</span>
      <span className="ladder-streak mono" title="Current win streak">{e.winStreak > 0 ? `🔥${e.winStreak}` : '·'}</span>
      <span className="ltime mono" title="Elo rating">{e.elo}</span>
      {delta(e.weeklyDelta)}
    </div>
  );

  return (
    <div className="lboard ladder">
      <div className="ladder-games">
        {games.map(g => (
          <button
            key={g.id}
            className={'lb-scope-tab' + (gameId === g.id ? ' active' : '')}
            onClick={() => setGameId(g.id)}
          >{g.icon} {g.name}</button>
        ))}
      </div>
      <p className="ladder-note">
        Everyone starts at 1000 — win online matches to climb. 🔥 is the current
        win streak; ▲▼ show this week's rating movement.
      </p>
      {state.loading ? (
        <div className="lboard-empty">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="lboard-empty">
          No rated matches yet — play someone online (room code) to start this ladder.
        </div>
      ) : (
        <>
          {(state.movers || []).length > 0 && (
            <div className="ladder-movers">
              📈 <strong>Weekly movers:</strong>{' '}
              {state.movers.map(m => `${m.username} +${m.weeklyDelta}`).join(' · ')}
            </div>
          )}
          <div className="lboard-rows">
            {entries.map(e => row(e, false))}
            {me && !meVisible && row(me, true)}
          </div>
        </>
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
// Build the canonical badge-chip list (streak milestones + non-streak
// achievements + lifetime solve milestones) with earned/locked state derived
// from the server-backed `badges` (earned day thresholds) and `achievements`
// ({ types, milestones }). Shared by the profile BadgeStrip and the lobby
// BadgesSection so both render an identical, permanent collection.
function badgeChips(badges, achievements) {
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
  return chips;
}

function BadgeStrip({ badges, achievements }) {
  const chips = badgeChips(badges, achievements);
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
/* ============================================================
   Shell-owned game chrome (phase 3) — How-to-Play + pre-game screen
   ============================================================ */

// First-open tracking for the auto-shown How-to-Play cards, persisted per
// browser in localStorage (deliberately per-device: the how-to is an
// onboarding aid, not server state).
const HOWTO_SEEN_KEY = 'pc_howto_seen_v1';
function howtoSeen(gameId) {
  try { return !!(JSON.parse(localStorage.getItem(HOWTO_SEEN_KEY) || '{}'))[gameId]; }
  catch { return false; }
}
function markHowtoSeen(gameId) {
  try {
    const seen = JSON.parse(localStorage.getItem(HOWTO_SEEN_KEY) || '{}');
    seen[gameId] = true;
    localStorage.setItem(HOWTO_SEEN_KEY, JSON.stringify(seen));
  } catch {}
}

// How-to-Play modal, rendered from the game's manifest `howToPlay` cards.
// Shell-owned: auto-shown on a player's first-ever open of each game and
// always reachable from the "?" in the in-game header. Timed dailies can't
// tick under the auto-show — it appears on the PRE-GAME screen, and the game
// (with its timer) only mounts after Play.
function HowToPlayModal({ game, onClose }) {
  const cards = game.howToPlay || [];
  return (
    <div className="howto-overlay" onClick={onClose}>
      <div className="howto-card" onClick={(e) => e.stopPropagation()}>
        <div className="howto-head">
          <span className="howto-icon">{game.icon}</span>
          <h3>How to play {game.name}</h3>
        </div>
        <div className="howto-list">
          {cards.map((c, i) => (
            <div className="howto-step" key={i}>
              <div className="howto-step-num mono">{i + 1}</div>
              <div>
                <div className="howto-step-title">{c.title}</div>
                <div className="howto-step-body">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="primary-btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

// Manifest chip copy for the pre-game screen.
const SESSION_LENGTH_LABEL = { short: '≈ 1–3 min', medium: '≈ 3–10 min', long: '10+ min' };
const INPUT_LABEL = { tap: '👆 Tap', drag: '✋ Drag', swipe: '👉 Swipe', keyboard: '⌨️ Type' };

// Standard pre-game screen (shell-owned chrome, phase 3): game identity,
// manifest chips, personal best, streak, and the daily-challenge context
// (countdown + same-deal-for-everyone). Consume-on-start only fires when the
// player hits Play — peeking at this screen never burns the day's attempt.
/* ============================================================
   Phase 7 — Game of the Day hero, home in-progress row, chat
   ============================================================ */

// Game of the Day hero card: today's featured game (from daily_featured via
// /api/daily), reset countdown, state-aware CTA, and a top-3 leaderboard
// preview. Clicking anywhere routes through the normal launch flow, so the
// pre-game / resume / locked machinery is untouched.
function GotdHero({ game, attempt, authOk, nextResetUtc, offset, onReset, onPlay }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let alive = true;
    api(`/api/daily/${game.id}/leaderboard`)
      .then(({ ok, body }) => { if (alive && ok && body) setPreview(body); })
      .catch(() => {});
    return () => { alive = false; };
  }, [game.id]);

  const finished = !!(attempt && attempt.finishedAt);
  const inProgress = !!attempt && !finished;
  const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="gotd-hero" style={{ '--accent': game.tagColor }}>
      <div className="gotd-label mono">🎯 GAME OF THE DAY</div>
      <div className="gotd-main" onClick={onPlay}>
        <div className="gotd-icon">{game.icon}</div>
        <div className="gotd-info">
          <div className="gotd-name">{game.name}</div>
          <div className="gotd-desc">{game.desc}</div>
          <div className="gotd-meta mono">
            Next puzzle in {countdown} · 🌍 same deal for everyone
          </div>
        </div>
        <button className="primary-btn gotd-play" disabled={finished}>
          {finished ? `🔒 +${attempt.score != null ? attempt.score : 0}` : inProgress ? '▶ Resume' : 'Play'}
        </button>
      </div>
      {preview && Array.isArray(preview.entries) && preview.entries.length > 0 && (
        <div className="gotd-lb">
          <div className="gotd-lb-title">Today's fastest</div>
          {preview.entries.slice(0, 3).map((e) => (
            <div key={e.rank} className={'gotd-lb-row' + (e.isCurrentUser ? ' me' : '')}>
              <span className="r mono">#{e.rank}</span>
              <span className="n">{e.username}</span>
              <span className="t mono">{e.timeSecs != null ? fmtT(e.timeSecs) : '—'}</span>
            </div>
          ))}
          {preview.total > 3 && <div className="gotd-lb-more">{preview.total} solved today</div>}
        </div>
      )}
      {authOk === false && (
        <div className="gotd-signedout">Sign in inside Usernode to play today's deal and join the board.</div>
      )}
    </div>
  );
}

// Home "in progress" row: resumable daily runs (claimed, unfinished attempts)
// and online matches where it's your turn. Horizontal card strip; each card
// re-enters through the normal launch/resume path.
function InProgressRow({ items, onOpenDaily, onOpenRoom }) {
  if (!items.length) return null;
  return (
    <div className="inprog-row-wrap">
      <div className="home-section-title">In progress</div>
      <div className="inprog-row">
        {items.map((it) =>
          it.type === 'daily' ? (
            <div key={'d-' + it.game.id} className="inprog-card" onClick={() => onOpenDaily(it.game)}>
              <div className="ip-icon">{it.game.icon}</div>
              <div className="ip-name">{it.game.name}</div>
              <div className="ip-sub resume">▶ Resume run</div>
            </div>
          ) : (
            <div key={'r-' + it.room.id} className="inprog-card room" onClick={() => onOpenRoom(it.room)}>
              <div className="ip-icon">{it.game.icon}</div>
              <div className="ip-name">{it.game.name}</div>
              <div className={'ip-sub' + (it.room.myTurn ? ' turn' : '')}>
                {it.room.myTurn ? '🔔 Your turn' : '⏳ Their move'} · vs {it.room.opponentName}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Per-game public chat room (phase 7): one room per game, 10s polling, report-
// to-hide moderation (3 distinct reports auto-hide a message server-side).
function ChatPanel({ game, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const listRef = useRef(null);
  const lastIdRef = useRef(0);

  const merge = (incoming) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = prev.concat(incoming.filter((m) => !seen.has(m.id)));
      return merged.slice(-200);
    });
  };

  useEffect(() => {
    let alive = true;
    const load = async (initial) => {
      const q = initial || !lastIdRef.current ? '' : `?after=${lastIdRef.current}`;
      const { ok, body } = await api(`/api/chat/${game.id}${q}`);
      if (alive && ok && body) {
        merge(body.messages || []);
        setLoaded(true);
      }
    };
    load(true);
    const t = setInterval(() => load(false), 10000);
    return () => { alive = false; clearInterval(t); };
  }, [game.id]);

  useEffect(() => {
    lastIdRef.current = messages.length ? messages[messages.length - 1].id : 0;
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const body = input.trim();
    if (!body || busy) return;
    setBusy(true);
    const { ok, body: resp } = await api(`/api/chat/${game.id}`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (ok && resp && resp.message) {
      merge([resp.message]);
      setInput('');
    } else {
      setNotice('Could not send — try again.');
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const report = async (m) => {
    if (!window.confirm('Report this message? 3 reports hide it for everyone.')) return;
    const { ok, body } = await api(`/api/chat/messages/${m.id}/report`, { method: 'POST' });
    if (ok && body) {
      if (body.hidden) {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, hidden: true, body: null, username: null } : x)));
      } else {
        setNotice('Reported — thanks for keeping the room clean.');
        setTimeout(() => setNotice(''), 2500);
      }
    }
  };

  const myId = user && user.id;
  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-panel" onClick={(e) => e.stopPropagation()}>
        <div className="chat-head">
          <div className="chat-title">
            <span>{game.icon}</span> {game.name} · Chat
          </div>
          <button className="chat-close" onClick={onClose} aria-label="Close chat">✕</button>
        </div>
        <div className="chat-list" ref={listRef}>
          {!loaded && <div className="chat-empty">Loading room…</div>}
          {loaded && messages.length === 0 && (
            <div className="chat-empty">No messages yet — say hi to today's players.</div>
          )}
          {messages.map((m) =>
            m.hidden ? (
              <div key={m.id} className="chat-msg hidden-msg">
                <span className="chat-tombstone">🚫 Hidden by community reports</span>
              </div>
            ) : (
              <div key={m.id} className={'chat-msg' + (myId && m.userId === myId ? ' mine' : '')}>
                <div className="chat-msg-top">
                  <span className="chat-author">{m.username}</span>
                  {(!myId || m.userId !== myId) && (
                    <button className="chat-report" title="Report" onClick={() => report(m)}>🚩</button>
                  )}
                </div>
                <div className="chat-body">{m.body}</div>
              </div>
            )
          )}
        </div>
        {notice && <div className="chat-notice">{notice}</div>}
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Message this game's room…"
            value={input}
            maxLength={500}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <button className="chat-send" onClick={send} disabled={busy || !input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}


function PreGameScreen({ game, attempt, best, streak, authOk, nextResetUtc, offset, onReset, onPlay, onHowTo, onChat }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const resuming = !!(attempt && !attempt.finishedAt);
  const m = game.manifest || {};
  return (
    <div className="pregame-card">
      <div className="pregame-icon">{game.icon}</div>
      <h2>{game.name}</h2>
      <div className="sub">{game.desc}</div>
      <div className="pregame-chips">
        {m.sessionLength && SESSION_LENGTH_LABEL[m.sessionLength] && (
          <span className="pregame-chip">⏱ {SESSION_LENGTH_LABEL[m.sessionLength]}</span>
        )}
        {m.input && INPUT_LABEL[m.input] && <span className="pregame-chip">{INPUT_LABEL[m.input]}</span>}
        {m.undo === 'free' && <span className="pregame-chip">↩︎ Undo allowed</span>}
        {m.undo === 'booster' && <span className="pregame-chip">↩︎ Limited boosters</span>}
      </div>
      <div className="pregame-stats">
        <div className="pregame-stat">
          <div className="l">Personal best</div>
          <div className="v mono">{best && best.score != null ? `+${best.score}` : '—'}</div>
        </div>
        <div className="pregame-stat">
          <div className="l">Streak</div>
          <div className="v mono">{authOk ? `${streak}d` : '—'}</div>
        </div>
        {game.daily && nextResetUtc && (
          <div className="pregame-stat">
            <div className="l">New deal in</div>
            <div className="v mono">{countdown}</div>
          </div>
        )}
      </div>
      {game.daily && (
        <div className="pregame-deal">
          🌍 Everyone plays this <strong>exact deal</strong> today — one attempt, same board for all.
        </div>
      )}
      {resuming && (
        <div className="pregame-resume-note">▶ You have a run in progress — jump back in where you left off.</div>
      )}
      <button className="primary-btn pregame-play" onClick={onPlay} disabled={game.daily && !authOk}>
        {resuming ? '▶ Resume' : 'Play'}
      </button>
      {game.daily && !authOk && (
        <div className="pregame-signedout">Signed out — open PuzzleChain inside Usernode to play today's deal.</div>
      )}
      <button className="pregame-howto-btn" onClick={onHowTo}>❓ How to play</button>
      {onChat && (
        <button className="pregame-howto-btn" onClick={onChat}>💬 Game chat</button>
      )}
    </div>
  );
}

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
  // First-cell hints bought for not-yet-found words (cell indices), persisted.
  const [hintedStarts, setHintedStarts] = useState(() =>
    new Set(resumed && Array.isArray(resumed.hintedStarts) ? resumed.hintedStarts : [])
  );
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
  stateRef.current = { found, steps, secs, hintedStarts };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, found: [...stateRef.current.found], hintedStarts: [...stateRef.current.hintedStarts] },
      steps: stateRef.current.steps, secs: stateRef.current.secs,
    }),
    !done
  );

  // Paid hint: highlight the first cell of one random not-yet-found word.
  const hints = useDailyHints({ gameId: 'wordhunt', maxHints: total });
  const buyHint = () => {
    if (done) return;
    hints.buy(() => {
      // Words still unfound and not already hinted.
      const candidates = words.filter(w => {
        if (found.has(w)) return false;
        const cells = locateWord(letters, w);
        return cells && cells.length && !hintedStarts.has(cells[0]);
      });
      if (!candidates.length) return true; // nothing to reveal (server already charged)
      const w = candidates[Math.floor(Math.random() * candidates.length)];
      const cells = locateWord(letters, w);
      const hs = new Set(hintedStarts); hs.add(cells[0]);
      setHintedStarts(hs);
      onSaveProgress && onSaveProgress(
        { dayNum, found: [...found], hintedStarts: [...hs] }, steps, secsRef.current
      );
      return true;
    });
  };
  const hintsExhausted = found.size >= total ||
    words.every(w => found.has(w) || (locateWord(letters, w) && hintedStarts.has(locateWord(letters, w)[0])));

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
      onSaveProgress && onSaveProgress({ dayNum, found: [...nf], hintedStarts: [...hintedStarts] }, newSteps, secsRef.current);

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
            else if (hintedStarts.has(i)) cls.push('hinted');
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

      {!done && (
        <HintBar
          hintsLeft={hints.hintsLeft}
          exhausted={hints.exhausted || hintsExhausted}
          buying={hints.buying}
          onBuy={buyHint}
          msg={hints.msg}
          label="No more hints"
        />
      )}

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

function CryptoWordleGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
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

  // Hint state. Hints are FREE (the MATCH currency is retired) but
  // hintsPurchased stays a server-authoritative DAILY count so a reload can't
  // reset it and the server-side cap still applies.
  const [hintsPurchased, setHintsPurchased] = useState(0);
  const [buying, setBuying] = useState(false);
  const [hintMsg, setHintMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api('/api/cryptowordle/hint');
      if (!alive || !ok || !body) return;
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
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
  // Daily cap sent to the server: total clues available across all rounds.
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
      // Apply the revealed clue to the active round and persist immediately so a
      // reload can't lose a reveal while the server counter already advanced.
      const nextHbr = hintsByRound.map((n, i) => (i === activeIdx ? (n || 0) + 1 : n));
      setHintsByRound(nextHbr);
      onSaveProgress && onSaveProgress(buildProgress(roundGuesses, nextHbr), totalSteps, secs);
      return;
    }
    if (status === 409 && body && body.code === 'no_more_hints') {
      setHintMsg('No more clues');
    } else {
      setHintMsg('Could not use hint');
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
            <HintBar
              hintsLeft={cluesLeft}
              exhausted={cluesLeft <= 0}
              buying={buying}
              onBuy={buyHint}
              msg={hintMsg}
              label="No more clues"
            />
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
// Tab ids stay stable (drive activeTab state + history reload); only the
// displayed label changed ("History" -> "My Best Runs").
const MS_TAB_LABELS = { game: 'Game', history: 'My Best Runs', leaderboard: 'Leaderboard', settings: 'Settings' };

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
      submitClassicScore('minesweeper', baseScore, { safeRevealed: newSafeRevealed, timeSecs: secs });
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
    submitClassicScore('minesweeper', finalScore, { safeRevealed, timeSecs: secs });
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
        <div style={{ padding: '0.25rem' }}>
          <ClassicLeaderboard gameId="minesweeper" />
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
            {MS_TAB_LABELS[tab]}
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
  const [refreshTick, setRefreshTick]   = useState(0);

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

  // Midnight UTC reached while the locked screen is showing — re-hydrate so
  // the Daily Challenge unlocks without requiring a manual page reload.
  const countdown = useCountdown(nextReset, offset, () => {
    setPhase('loading');
    setRefreshTick(t => t + 1);
  });

  // Hydrate state on mount (and again whenever refreshTick bumps, i.e. after
  // the daily reset fires): derive board, learn record/streak/lock, and (if
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
  }, [refreshTick]);

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
function T2048Solo({ onWin, onLose, onStepChange, resetKey, onRaceEnd }) {
  const raceMode = !!onRaceEnd;
  const _saved = raceMode ? null : t2048LoadSavedBoard();

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
      if (onRaceEnd) { onRaceEnd(newScore); return; }
      submitClassicScore('2048', newScore, { highTile: maxT });
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
    if (onRaceEnd) { onRaceEnd(score); return; }
    submitClassicScore('2048', score, { highTile: maxT });
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

      {activeTab === 'leaderboard' && (
        <div style={{ padding: '0.5rem 0.25rem' }}>
          <ClassicLeaderboard gameId="2048" />
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

      {!raceMode && (
        <div className="t2048-bottom-nav">
          {['game', 'leaderboard', 'history', 'stats'].map(tab => (
            <button
              key={tab}
              className={'t2048-tab' + (activeTab === tab ? ' active' : '')}
              onClick={() => { setActiveTab(tab); if (tab !== 'game') setHistory(t2048LoadHistory()); }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 2048 entry: solo board, or the online-race host when launched via the mode
// modal in Online Race mode.
function T2048Game({ onWin, onLose, onStepChange, resetKey, gameMode, gameModeOpts, onBack }) {
  if (gameMode === 'online' && gameModeOpts && gameModeOpts.roomId) {
    return (
      <ClassicRaceGame
        game={{ id: '2048', name: '2048', icon: '🔢', tagColor: C.emerald }}
        roomId={gameModeOpts.roomId}
        myPlayerNum={gameModeOpts.roomAction === 'join' ? 2 : 1}
        onExitLobby={() => onBack && onBack()}
        renderBoard={({ onEnd }) => (
          <T2048Solo onRaceEnd={onEnd} onStepChange={onStepChange} resetKey={resetKey} />
        )}
      />
    );
  }
  return <T2048Solo onWin={onWin} onLose={onLose} onStepChange={onStepChange} resetKey={resetKey} />;
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
    api('/api/snake/score', { method: 'POST', body: JSON.stringify({ score: sc, length: st.current.snake.length, timeSecs: secsRef.current }) }).catch(() => {});
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
    cgLeaderboardSection('snake', { url: '/api/snake/leaderboard' }),
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
// Block Blast board (no ClassicShell) — shared by solo + online race. On
// game-over it calls onEnd(score, placed, secs); the parent decides what to do
// (solo submits the global score + shows the overlay; the race host posts to
// the room). The board itself never touches scoring endpoints.
function BlockBlastBoard({ onStepChange, resetKey, onEnd }) {
  const onEndRef = useRef(onEnd); onEndRef.current = onEnd;
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
        onEndRef.current && onEndRef.current(sc, placedRef.current, secsRef.current);
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
  return (
    <>
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
    </>
  );
}

// Block Blast entry — solo (own board + leaderboard sheet) or the online-race
// host. Both wrap the shared BlockBlastBoard in the standard ClassicShell.
function BlockBlastGame({ onWin, onStepChange, resetKey, game, onBack, menuConfig, gameMode, gameModeOpts }) {
  const [nkey, setNkey] = useState(0);
  const boardKey = `${resetKey || 0}:${nkey}`;
  const hist = cgLoadHistory(BB_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const sheet = [
    cgLeaderboardSection('blockblast'),
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">{r.lines} lines</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Games' },
    ]),
    cgRulesSection(['Drag a block from the tray onto the grid.', 'Fill a full row or column to clear it and score.', 'Clear several lines at once for bonus points.', 'Game ends when none of the three pieces fit.']),
  ];

  if (gameMode === 'online' && gameModeOpts && gameModeOpts.roomId) {
    return (
      <ClassicShell game={game} onExit={onBack} sheetSections={[cgLeaderboardSection('blockblast')]} menuConfig={menuConfig}>
        <ClassicRaceGame
          game={game}
          roomId={gameModeOpts.roomId}
          myPlayerNum={gameModeOpts.roomAction === 'join' ? 2 : 1}
          onExitLobby={() => onBack && onBack()}
          renderBoard={({ onEnd }) => <BlockBlastBoard onStepChange={onStepChange} resetKey={boardKey} onEnd={(sc) => onEnd(sc)} />}
        />
      </ClassicShell>
    );
  }

  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => setNkey(k => k + 1)} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <BlockBlastBoard
          onStepChange={onStepChange}
          resetKey={boardKey}
          onEnd={(sc, placed, secs) => {
            submitClassicScore('blockblast', sc);
            onWin(sc, placed, secs, { winnerLabel: 'Game Over', share: `🧱 Block Blast — ${sc} pts` });
          }}
        />
      </div>
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
    submitClassicScore('diamondrush', sc, { level: 1, movesUsed: START_MOVES - mv, targetReached: win ? 1 : 0 });
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
    cgLeaderboardSection('diamondrush'),
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
  // Menu state ('play' | 'leaderboard')
  const [tmMenuTab, setTmMenuTab] = useState('play');
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
    // Fire-and-forget: submit score
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
    // Fire-and-forget: submit score
    submitScore(selectedLevel, completedLevels.size + 1, ns);
    onWin(ns, newTotalMoves, totalS, { share });
  };

  // ---- Level selector screen ----
  if (phase === 'select') {
    const menuContent = () => {
      if (tmMenuTab === 'leaderboard') return <TileMatchLeaderboard />;
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
        </div>
        <div className="tm-menu-tabs">
          {['play', 'leaderboard'].map(tab => (
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

const TM_DAILY_HINT_CAP = 5; // paid hints per day for the Daily Tile Match

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
  const [hintsApplied, setHintsApplied] = useState(0); // count, persisted
  const [hintTileId, setHintTileId] = useState(null);  // transient highlight
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
    // Server-issued seed first (phase 2); legacy dayNum derivation as fallback.
    const srvSeed = serverDailySeed('tilematchingdaily');
    const seed = boardSeedOverride != null ? boardSeedOverride
      : (srvSeed != null ? srvSeed : (dayNum * 31 + 7));
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
      setHintsApplied(Number.isFinite(resume.hintsApplied) ? resume.hintsApplied : 0);
      // A resumed run's earlier taps predate this mount — the move log is
      // incomplete, so the finish can't be replay-validated (tier B instead).
      if (onMoveTile) onMoveTile({ replayBreak: 'resume', tsClient: Date.now() });
    } else {
      setTiles(freshTiles);
      setBar([]);
      setMoves(0);
      setSecs(0);
      setBoosters({ ...TM_DAILY_CONFIG.boosters });
      setHintsApplied(0);
    }
    setHintTileId(null);
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
  tmStateRef.current = { tiles, bar, moves, boosters, secs, hintsApplied };
  const buildTmProgress = () => ({
    progress: {
      dayNum,
      tiles: tmStateRef.current.tiles,
      bar: tmStateRef.current.bar,
      moves: tmStateRef.current.moves,
      boosters: tmStateRef.current.boosters,
      hintsApplied: tmStateRef.current.hintsApplied,
    },
    steps: tmStateRef.current.moves,
    secs: tmStateRef.current.secs,
  });
  useAutosave(onSaveProgress, buildTmProgress, !done);
  useEffect(() => {
    if (done || !hydratedRef.current || tiles.length === 0 || !onSaveProgress) return;
    const s = buildTmProgress();
    onSaveProgress(s.progress, s.steps, s.secs);
  }, [tiles, bar, moves, boosters, hintsApplied, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paid hint: highlight a recommended next tile. Prefer a free tile whose type
  // already has ≥2 copies in the bar (completes a triple), else any free tile
  // whose type has another free copy on the board, else any free tile.
  const tmHints = useDailyHints({ gameId: 'tilematchingdaily', maxHints: TM_DAILY_HINT_CAP });
  const recommendTile = () => {
    const free = tiles.filter(t => !t.removed && !t.inBar && !tmIsLocked(t, tiles));
    if (!free.length) return null;
    const byId = {};
    tiles.forEach(t => { byId[t.id] = t; });
    const barCounts = {};
    bar.forEach(id => { const t = byId[id]; if (t) barCounts[t.type] = (barCounts[t.type] || 0) + 1; });
    // 1) completes a triple already started in the bar
    let pick = free.find(t => (barCounts[t.type] || 0) >= 2);
    if (pick) return pick;
    // 2) a type that has at least two free copies (progress toward a triple)
    const freeCounts = {};
    free.forEach(t => { freeCounts[t.type] = (freeCounts[t.type] || 0) + 1; });
    pick = free.find(t => freeCounts[t.type] >= 2);
    return pick || free[0];
  };
  const buyTmHint = () => {
    if (done) return;
    tmHints.buy(() => {
      const pick = recommendTile();
      if (!pick) return true; // nothing to suggest (server already charged)
      setHintTileId(pick.id);
      setHintsApplied(n => n + 1);
      setTimeout(() => setHintTileId(cur => (cur === pick.id ? null : cur)), 2500);
      return true;
    });
  };

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
    // Boosters aren't modeled by the server replay engine — mark the run
    // replay-ineligible (finish falls back to tier-B heuristics).
    if (onMoveTile) onMoveTile({ replayBreak: 'undo', tsClient: Date.now() });
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
    if (onMoveTile) onMoveTile({ replayBreak: 'shuffle', tsClient: Date.now() });
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
    if (onMoveTile) onMoveTile({ replayBreak: 'clear-slot', tsClient: Date.now() });
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
          const isHint = hintTileId === tile.id;
          const tt = TM_TILE_TYPES[tile.type % TM_TILE_TYPES.length];
          return (
            <div
              key={tile.id}
              className={`tm-tile${locked ? ' locked' : ' available'}${isFlash ? ' flash' : ''}${isHint ? ' hint-target' : ''}`}
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

      {!done && (
        <HintBar
          hintsLeft={tmHints.hintsLeft}
          exhausted={tmHints.exhausted || boardTiles.length === 0}
          buying={tmHints.buying}
          onBuy={buyTmHint}
          msg={tmHints.msg}
          label="No more hints"
        />
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
      submitClassicScore('knights-tour', score, { timeSecs: finalSecs, moves: m });
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

      {activeTab === 'leaderboard' && (
        <div style={{ padding: '0.25rem' }}>
          <ClassicLeaderboard gameId="knights-tour" valueFmt={(r) => `${r.bestScore} pts`} />
        </div>
      )}

      <div className="kt-bottom-nav">
        {['game', 'leaderboard', 'history'].map(tab => (
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
// Looping background-music asset (served by express.static from public/audio).
const BOUNCE_MUSIC_URL = '/audio/bounce-bg.mp3';

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
  // Audio: `soundOn` mirrors the shared cgPrefs.sound master switch (controls
  // both SFX and music); `musicPaused` is the player's in-game music pause
  // that leaves SFX untouched.
  const [soundOn, setSoundOn] = useState(() => cgPrefs.sound);
  const [musicPaused, setMusicPaused] = useState(false);

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

  // Background music: plays once the ball has been launched, sound is
  // enabled, the player hasn't paused it, and the round isn't over. Starting
  // only after `started` (the first launch) means it's triggered by a user
  // gesture, satisfying browser autoplay policy. Stops if the player leaves
  // the game tab for the leaderboard.
  useEffect(() => {
    const shouldPlay = started && !done && soundOn && !musicPaused && activeTab === 'game';
    if (shouldPlay) startBackgroundMusic(BOUNCE_MUSIC_URL);
    else stopBackgroundMusic();
  }, [started, done, soundOn, musicPaused, activeTab]);

  // Always silence the track when leaving the game (unmount → back to lobby).
  useEffect(() => () => stopBackgroundMusic(), []);

  // Toggle the shared sound master switch (persists to localStorage via
  // cgPrefs) and mirror it into local state so the component re-renders.
  const toggleSound = () => {
    const next = !cgPrefs.sound;
    cgSetPref('sound', next);
    setSoundOn(next);
  };

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
    setMusicPaused(false);
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
    cgSound('deal', 1.2);
  };
  const launchRef = useRef(launch);
  launchRef.current = launch;

  const endGame = () => {
    cgSound('bgameover');
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
    cgSound('blevel');
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
    cgSound('bdie');
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

      if (ball.x - BOUNCE_BALL_R < 0) { ball.x = BOUNCE_BALL_R; ball.vx = Math.abs(ball.vx); cgSound('bwall'); }
      else if (ball.x + BOUNCE_BALL_R > BOUNCE_W) { ball.x = BOUNCE_W - BOUNCE_BALL_R; ball.vx = -Math.abs(ball.vx); cgSound('bwall'); }
      if (ball.y - BOUNCE_BALL_R < 0) { ball.y = BOUNCE_BALL_R; ball.vy = Math.abs(ball.vy); cgSound('bwall'); }

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
        cgSound('bpaddle');
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
                cgSound('bbrick', 1.3);
              }
            }
            laserLoadedRef.current -= 1;
          } else {
            b.alive = false;
            brokenRef.current += 1;
            scoreRef.current += b.points;
            cgSound('bbrick');
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
        cgSound('bpowerup');
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

          <div className="bounce-audio-row">
            <button onClick={toggleSound}>
              {soundOn ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
            <button
              onClick={() => setMusicPaused(p => !p)}
              disabled={!soundOn}
            >
              {!soundOn ? '🔇 Off' : musicPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
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
function SessionReceipt({ sessionId, onBack, onOpenReceipt }) {
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

      {s.gameId && <VerifiedLeaderboard gameId={s.gameId} onOpenReceipt={onOpenReceipt} />}
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
        </div>
      </div>
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
                  onMouseLeave: (e) => { e.target.style.background = isSolved ? C.card : C.surface; }
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

const CNL_STREAK_KEY = 'puzzlechain_cnl_streak';

// Chutes & Ladders wrapper — picks a mode (2P / Versus Bot / Online) and
// delegates. Honors the Game Menu's gameMode/gameModeOpts props.
/* ============================================================
   Phase 5 board games — Checkers, Reversi, Four in a Row, Gomoku,
   Ludo. Online head-to-head only: the SERVER is the referee (rules
   modules in lib/board-rules.js over classic_rooms), so these
   components only render polled state and submit move intents —
   there are no client-side rules to drift out of sync.
   ============================================================ */

// Create/Join setup for the online-only board games (reuses the Mancala
// mode-select styling).
function OnlineRoomSetup({ gameId, onReady }) {
  const [action, setAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (action === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${gameId}/rooms`, { method: 'POST' });
      setBusy(false);
      if (ok && body) onReady(body.id, 1);
      else setError('Could not create room. Try again.');
    } else if (action === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api(`/api/classic/${gameId}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) onReady(code, 2);
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  return (
    <div className="mnc-mode-select">
      <div className="brg-intro">
        🌐 Online head-to-head — play a friend via room code. Wins count on the <strong>Ladder</strong>.
      </div>
      <div className="mnc-online-actions">
        <div className="mnc-mode-sub">
          <button className={'mnc-difficulty-pill' + (action === 'create' ? ' active' : '')} onClick={() => { setAction('create'); setError(''); }}>Create Room</button>
          <button className={'mnc-difficulty-pill' + (action === 'join' ? ' active' : '')} onClick={() => { setAction('join'); setError(''); }}>Join Room</button>
        </div>
        {action === 'join' && (
          <div className="mnc-join-form">
            <input
              className="mnc-join-input"
              placeholder="Room code (e.g. AB3K7P)"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={8}
            />
          </div>
        )}
      </div>
      {error && <div className="mnc-join-error">{error}</div>}
      {action && (
        <button
          className="mnc-mode-start-btn"
          onClick={start}
          disabled={busy || (action === 'join' && joinCode.trim().length < 4)}
        >{busy ? 'Please wait…' : action === 'create' ? 'Create & share code' : 'Join game'}</button>
      )}
    </div>
  );
}

// ---- Per-game board views ----------------------------------------------
// Each gets { st, myPlayerNum, isMyTurn, submit } — pure render + intent.

function ckOwnerOf(v) { return v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0; }

function CheckersBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const [sel, setSel] = useState(null);
  const board = st.board || [];
  const click = (i) => {
    if (!isMyTurn) return;
    const owner = ckOwnerOf(board[i]);
    if (owner === myPlayerNum) { setSel(i === sel ? null : i); return; }
    if (sel != null && board[i] === 0) { submit({ from: sel, to: i }); setSel(null); }
  };
  return (
    <div>
      {st.mustJumpFrom != null && isMyTurn && (
        <div className="brg-note">Chain jump! Continue with the same piece.</div>
      )}
      <div className="ck-board">
        {board.map((v, i) => {
          const r = Math.floor(i / 8), c = i % 8;
          const dark = (r + c) % 2 === 1;
          const owner = ckOwnerOf(v);
          return (
            <div key={i} className={'ck-cell' + (dark ? ' dark' : '') + (sel === i ? ' sel' : '')} onClick={() => dark && click(i)}>
              {owner !== 0 && (
                <div className={'ck-piece p' + owner + (v > 2 ? ' king' : '')}>{v > 2 ? '♛' : ''}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="brg-legend">
        <span><span className="ck-piece-mini p1" /> Player 1 (moves down)</span>
        <span><span className="ck-piece-mini p2" /> Player 2 (moves up)</span>
      </div>
    </div>
  );
}

function ReversiBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  const p1 = board.filter(x => x === 1).length;
  const p2 = board.filter(x => x === 2).length;
  return (
    <div>
      <div className="brg-note">
        <span className="rv-count"><span className="rv-disc-mini d1" /> {p1}</span>
        <span className="rv-count"><span className="rv-disc-mini d2" /> {p2}</span>
        {st.passed && <span style={{ marginLeft: '0.6rem' }}>Opponent had no move — you go again.</span>}
      </div>
      <div className="rv-board">
        {board.map((v, i) => (
          <div key={i} className="rv-cell" onClick={() => isMyTurn && v === 0 && submit({ cell: i })}>
            {v !== 0 && <div className={'rv-disc d' + v} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FourInARowView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  return (
    <div>
      <div className="fir-board">
        {board.map((v, i) => (
          <div
            key={i}
            className={'fir-cell' + (st.lastMove === i ? ' last' : '')}
            onClick={() => isMyTurn && submit({ col: i % 7 })}
          >
            {v !== 0 && <div className={'fir-disc d' + v} />}
          </div>
        ))}
      </div>
      <div className="brg-legend">
        <span><span className="fir-disc-mini d1" /> Player 1</span>
        <span><span className="fir-disc-mini d2" /> Player 2</span>
        <span style={{ color: C.muted }}>Tap a column to drop</span>
      </div>
    </div>
  );
}

function GomokuBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const board = st.board || [];
  return (
    <div className="gmk-scroll">
      <div className="gmk-board">
        {board.map((v, i) => (
          <div
            key={i}
            className={'gmk-cell' + (st.lastMove === i ? ' last' : '')}
            onClick={() => isMyTurn && v === 0 && submit({ cell: i })}
          >
            {v !== 0 && <div className={'gmk-stone s' + v} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Ludo board geometry — 15×15 grid mirror of the server module's relative
// track (lib/board-rules.js): 52-cell ring, per-player 6-cell home column,
// center home. [col,row] pairs; ring index 0 = P1 start, 26 = P2 start.
const LUDO_RING_XY = [
  [1,6],[2,6],[3,6],[4,6],[5,6], [6,5],[6,4],[6,3],[6,2],[6,1],[6,0], [7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5], [9,6],[10,6],[11,6],[12,6],[13,6],[14,6], [14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8], [8,9],[8,10],[8,11],[8,12],[8,13],[8,14], [7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9], [5,8],[4,8],[3,8],[2,8],[1,8],[0,8], [0,7],[0,6],
];
const LUDO_HOME_XY = {
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  2: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};
const LUDO_BASE_XY = { 1: [[2,2],[4,2],[2,4],[4,4]], 2: [[10,10],[12,10],[10,12],[12,12]] };
const LUDO_START_ABS = { 1: 0, 2: 26 };

function ludoTokenXY(player, pos, tokenIdx) {
  if (pos === -1) return LUDO_BASE_XY[player][tokenIdx];
  if (pos >= 51 && pos <= 56) return LUDO_HOME_XY[player][pos - 51];
  if (pos >= 57) return [7, 7];
  return LUDO_RING_XY[(LUDO_START_ABS[player] + pos) % 52];
}

function LudoBoardView({ st, myPlayerNum, isMyTurn, submit }) {
  const phase = st.phase || 'roll';
  const myTokens = (myPlayerNum === 1 ? st.p1 : st.p2) || [];
  const canMoveToken = (pos) => {
    if (phase !== 'move' || !isMyTurn || st.die == null) return false;
    if (pos >= 57) return false;
    if (pos === -1) return st.die === 6;
    return pos + st.die <= 57;
  };
  const cells = [];
  // Ring
  LUDO_RING_XY.forEach(([x, y], i) => {
    const safe = i === 0 || i === 26;
    const startOwner = i === 0 ? 1 : i === 26 ? 2 : 0;
    cells.push(
      <div key={'r' + i} className={'ludo-cell ring' + (safe ? ' safe' : '') + (startOwner ? ' start' + startOwner : '')}
           style={{ gridColumn: x + 1, gridRow: y + 1 }}>{safe ? '★' : ''}</div>
    );
  });
  // Home columns + center + bases
  for (const p of [1, 2]) {
    LUDO_HOME_XY[p].forEach(([x, y], i) => {
      cells.push(<div key={'h' + p + i} className={'ludo-cell home' + p} style={{ gridColumn: x + 1, gridRow: y + 1 }} />);
    });
    LUDO_BASE_XY[p].forEach(([x, y], i) => {
      cells.push(<div key={'b' + p + i} className={'ludo-cell base' + p} style={{ gridColumn: x + 1, gridRow: y + 1 }} />);
    });
  }
  cells.push(<div key="center" className="ludo-cell center" style={{ gridColumn: 8, gridRow: 8 }}>🏁</div>);
  // Tokens (offset stacked tokens slightly so pile-ups stay visible)
  const tokens = [];
  for (const p of [1, 2]) {
    const toks = (p === 1 ? st.p1 : st.p2) || [];
    toks.forEach((pos, i) => {
      const [x, y] = ludoTokenXY(p, pos, i);
      const mine = p === myPlayerNum;
      const movable = mine && canMoveToken(pos);
      tokens.push(
        <div
          key={'t' + p + i}
          className={'ludo-token p' + p + (movable ? ' movable' : '')}
          style={{
            gridColumn: x + 1, gridRow: y + 1,
            transform: `translate(${(i % 2) * 5 - 2}px, ${Math.floor(i / 2) * 5 - 2}px)`,
          }}
          onClick={() => movable && submit({ type: 'move', token: i })}
        >{i + 1}</div>
      );
    });
  }
  return (
    <div>
      <div className="ludo-board">{cells}{tokens}</div>
      <div className="cnl-die"><div className="cnl-die-face">{st.die == null ? '·' : st.die}</div></div>
      {st.lastEvent === 'no-move' && <div className="brg-note">No legal move for that roll — turn passed.</div>}
      {st.lastEvent === 'capture' && <div className="brg-note">💥 Capture! Token sent back to base.</div>}
      <div className="cnl-roll-buttons">
        <button
          className="cnl-roll-btn"
          style={{ background: myPlayerNum === 1 ? C.accent : C.rose }}
          onClick={() => submit({ type: 'roll' })}
          disabled={!isMyTurn || phase !== 'roll'}
        >
          {!isMyTurn ? 'Waiting…' : phase === 'roll' ? 'Roll' : 'Pick a highlighted token'}
        </button>
      </div>
      <div className="brg-legend">
        <span>🎲 6 leaves base & rolls again</span>
        <span>★ safe cells</span>
        <span>Exact roll to finish</span>
      </div>
    </div>
  );
}

const BOARD_VIEWS = {
  checkers: CheckersBoardView,
  reversi: ReversiBoardView,
  fourinarow: FourInARowView,
  gomoku: GomokuBoardView,
  ludo: LudoBoardView,
};

// Polling room shell shared by all five board games (mirrors the Chutes &
// Ladders online flow: waiting screen → status bar → board → finish → onWin).
function BoardOnlineRoom({ gameId, roomId, myPlayerNum, onWin, onStepChange }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom(gameId, roomId);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const name = (GAMES.find(g => g.id === gameId) || {}).name || gameId;
    const draw = room.winner === 'draw';
    const youWin = room.winner === String(myPlayerNum);
    onWin(youWin ? 200 : 0, movesRef.current, secsRef.current, {
      winnerLabel: draw ? "It's a draw 🤝" : youWin ? 'You win! 🎉' : 'Opponent wins',
      share: `♟️ ${name} online — ${draw ? 'we drew!' : youWin ? 'I won!' : 'good game!'}`,
    });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} /><div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div></div>;
  }
  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }
  if (room && room.status === 'waiting') {
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
  const isMyTurn = room.status === 'active' && (st.currentPlayer || 1) === myPlayerNum;
  const myColor = myPlayerNum === 1 ? C.accent : C.rose;
  const turnLabel = room.status === 'finished'
    ? (room.winner === 'draw' ? 'Draw' : room.winner === String(myPlayerNum) ? 'You win! 🎉' : 'Opponent wins')
    : isMyTurn ? 'Your turn' : "Opponent's turn";
  const View = BOARD_VIEWS[gameId];
  const submit = (move) => {
    movesRef.current += 1;
    onStepChange && onStepChange(movesRef.current);
    submitMove({ move });
  };

  return (
    <div>
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Turn</div><div className="pvalue" style={{ color: isMyTurn ? myColor : C.muted, fontSize: '0.82rem' }}>{turnLabel}</div></div>
        <div className="pill"><div className="plabel">You</div><div className="pvalue" style={{ color: myColor, fontSize: '0.82rem' }}>P{myPlayerNum}</div></div>
        <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className={'mnc-conn-dot ' + (opponentDisconnected ? 'amber' : 'green')} /><div className="plabel">Online</div></div>
      </div>
      {opponentDisconnected && <div style={{ textAlign: 'center', color: C.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Opponent connection lost — waiting for reconnect…</div>}
      <View st={st} myPlayerNum={myPlayerNum} isMyTurn={isMyTurn} submit={submit} />
    </div>
  );
}

// Top-level component per board game: create/join setup, then the room.
function BoardRoomGame({ gameId, onWin, onStepChange, resetKey, gameModeOpts }) {
  // A pre-seated room (phase 7 in-progress row) skips the create/join setup:
  // the home your-turn card passes { roomId, myPlayerNum } through the classic
  // game-mode opts to land straight back in the live match.
  const [roomInfo, setRoomInfo] = useState(() =>
    gameModeOpts && gameModeOpts.roomId && gameModeOpts.myPlayerNum
      ? { roomId: gameModeOpts.roomId, myPlayerNum: gameModeOpts.myPlayerNum }
      : null
  );
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) setRoomInfo(null);
    else mounted.current = true;
  }, [resetKey]);
  if (!roomInfo) {
    return <OnlineRoomSetup gameId={gameId} onReady={(roomId, myPlayerNum) => setRoomInfo({ roomId, myPlayerNum })} />;
  }
  return <BoardOnlineRoom gameId={gameId} roomId={roomInfo.roomId} myPlayerNum={roomInfo.myPlayerNum} onWin={onWin} onStepChange={onStepChange} />;
}

function CheckersGame(props)   { return <BoardRoomGame gameId="checkers" {...props} />; }
function ReversiGame(props)    { return <BoardRoomGame gameId="reversi" {...props} />; }
function FourInARowGame(props) { return <BoardRoomGame gameId="fourinarow" {...props} />; }
function GomokuGame(props)     { return <BoardRoomGame gameId="gomoku" {...props} />; }
function LudoGame(props)       { return <BoardRoomGame gameId="ludo" {...props} />; }

function ChutesLaddersGame({ onWin, onStepChange, resetKey, gameMode, gameModeOpts, onModeChange }) {
  const [mode, setMode] = useState(gameMode || null);
  const [roomId, setRoomId] = useState((gameModeOpts && gameModeOpts.roomId) || null);
  const [myPlayerNum, setMyPlayerNum] = useState(
    gameModeOpts && gameModeOpts.myPlayerNum
      ? gameModeOpts.myPlayerNum
      : gameModeOpts && gameModeOpts.roomAction === 'join' ? 2 : 1
  );
  const [resumeState, setResumeState] = useState(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const { loadState, clearState } = useClassicSave('chutes-ladders');

  // Intercept onWin to track win streak in localStorage and submit to the server.
  // playerWon: meta.winner===1 for local/bot (player 1 = the human); score>0 for online.
  const handleWin = (score, steps, secs, meta) => {
    const playerWon = meta && meta.winner !== undefined ? meta.winner === 1 : score > 0;
    const prevStreak = parseInt(localStorage.getItem(CNL_STREAK_KEY) || '0', 10);
    const newStreak = playerWon ? prevStreak + 1 : 0;
    try { localStorage.setItem(CNL_STREAK_KEY, String(newStreak)); } catch (e) {}
    submitClassicScore('chutes-ladders', newStreak, { mode: mode || 'bot' });
    onWin(score, steps, secs, meta);
  };

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
    return <ChutesLaddersOnlineGame onWin={handleWin} onStepChange={onStepChange} roomId={roomId} myPlayerNum={myPlayerNum} />;
  }
  if (mode === 'bot' && !resumeChecked) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>Loading…</div>;
  }
  return (
    <ChutesLaddersLocalGame
      onWin={handleWin}
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

/* ============================================================
   Hash Rush — crypto-themed lane dodger (self-shell canvas game)
   ============================================================ */
const HR_HISTORY_KEY = 'puzzlechain_hashrush_history';
const HR_LANES = 3;
const HR_START_SPEED = 150;     // px/s downward
const HR_SPEED_STEP = 28;       // +px/s every ramp
const HR_RAMP_SECS = 30;        // ramp every N seconds
const HR_MAX_SPEED = HR_START_SPEED * 3;
const HR_TOKEN_SCORE = 10;
const HR_BOOST_MULT = 2;
const HR_BOOST_SECS = 5;
const HR_LIVES = 3;

function HashRushGame({ onWin, onStepChange, resetKey, game, onBack, menuConfig }) {
  const [phase, setPhase] = useState('idle'); // idle | playing | dead
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(HR_LIVES);
  const [mult, setMult] = useState(1);
  const [boostLeft, setBoostLeft] = useState(0);
  const [finalRank, setFinalRank] = useState(null);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const stateRef = useRef(null);
  const submittedRef = useRef(false);
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  const fresh = () => ({
    lane: 1, objs: [], elapsed: 0, score: 0, lives: HR_LIVES, tokens: 0,
    speed: HR_START_SPEED, boost: 0, spawnT: 0, spawnEvery: 0.85, dead: false,
  });

  const reset = () => {
    stateRef.current = fresh();
    setScore(0); setLives(HR_LIVES); setMult(1); setBoostLeft(0); setFinalRank(null);
    submittedRef.current = false;
  };

  useEffect(() => { reset(); setPhase('idle'); }, [resetKey]);

  // Lane shift (-1 left, +1 right).
  const shift = (dir) => {
    const s = stateRef.current; if (!s || s.dead) return;
    s.lane = Math.max(0, Math.min(HR_LANES - 1, s.lane + dir));
    cgSound('move');
  };

  // Input: tap halves, swipe, arrow keys.
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onPointer = (e) => {
      if (phase === 'idle') { startGame(); return; }
      const rect = el.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      shift(x < rect.width / 2 ? -1 : 1);
    };
    el.addEventListener('pointerdown', onPointer);
    return () => el.removeEventListener('pointerdown', onPointer);
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); shift(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); shift(1); }
      else if ((e.key === ' ' || e.key === 'Enter') && phase === 'idle') { e.preventDefault(); startGame(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const endGame = () => {
    const s = stateRef.current; if (!s) return;
    s.dead = true;
    setPhase('dead');
    cgSound('lose'); cgHaptic([20, 40, 20]);
    const finalScore = Math.round(s.score);
    cgSaveHistory(HR_HISTORY_KEY, { score: finalScore, tokens: s.tokens, secs: Math.round(s.elapsed), ts: Date.now() });
    if (!submittedRef.current) {
      submittedRef.current = true;
      submitClassicScore('hashrush', finalScore, { tokens: s.tokens, timeSecs: Math.round(s.elapsed) })
        .then(r => { if (r && r.rank) setFinalRank(r.rank); });
      onWinRef.current(finalScore, s.tokens, Math.round(s.elapsed), {
        winnerLabel: 'Game Over', share: `⛏️ Hash Rush — ${finalScore} pts, ${s.tokens} hashes mined`,
      });
    }
  };

  const startGame = () => {
    reset();
    setPhase('playing');
    cgSound('click');
  };

  // Main loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let running = true;
    lastTsRef.current = 0;

    const sizeCanvas = () => {
      const wrap = wrapRef.current; if (!wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    const spawn = (s, W) => {
      const lane = Math.floor(Math.random() * HR_LANES);
      const roll = Math.random();
      let type = 'token';
      if (roll < 0.30) type = 'block';
      else if (roll < 0.42) type = 'boost';
      s.objs.push({ lane, y: -30, type });
    };

    const step = (s, dt, W, H) => {
      s.elapsed += dt;
      s.speed = Math.min(HR_MAX_SPEED, HR_START_SPEED + Math.floor(s.elapsed / HR_RAMP_SECS) * HR_SPEED_STEP);
      if (s.boost > 0) { s.boost = Math.max(0, s.boost - dt); }
      s.spawnT += dt;
      const every = Math.max(0.45, s.spawnEvery - s.elapsed * 0.004);
      if (s.spawnT >= every) { s.spawnT = 0; spawn(s, W); }

      const minerY = H * 0.82;
      const laneW = W / HR_LANES;
      for (const o of s.objs) {
        o.y += s.speed * dt;
        if (o.hit) continue;
        // collision band around the miner
        if (o.lane === s.lane && Math.abs(o.y - minerY) < 30) {
          o.hit = true;
          if (o.type === 'token') {
            const m = s.boost > 0 ? HR_BOOST_MULT : 1;
            s.score += HR_TOKEN_SCORE * m; s.tokens += 1;
            cgSound('clear');
          } else if (o.type === 'boost') {
            s.boost = HR_BOOST_SECS; cgSound('clear');
          } else if (o.type === 'block') {
            s.lives -= 1; cgSound('lose'); cgHaptic(30);
            if (s.lives <= 0) { s.dead = true; }
          }
        }
      }
      // Drop collected/offscreen objects.
      s.objs = s.objs.filter(o => !o.hit && o.y < H + 40);

      // sync HUD (throttled by React batching)
      setScore(Math.round(s.score));
      setLives(s.lives);
      setMult(s.boost > 0 ? HR_BOOST_MULT : 1);
      setBoostLeft(s.boost > 0 ? Math.ceil(s.boost) : 0);
      if (onStepRef.current) onStepRef.current(s.tokens);
    };

    const draw = (s, W, H) => {
      ctx.clearRect(0, 0, W, H);
      // background lanes
      const laneW = W / HR_LANES;
      for (let i = 0; i < HR_LANES; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(i * laneW, 0, laneW, H);
      }
      // objects
      for (const o of s.objs) {
        const cx = o.lane * laneW + laneW / 2;
        ctx.font = '26px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (o.type === 'block') {
          ctx.fillStyle = 'rgba(244,63,94,0.85)';
          ctx.fillRect(cx - laneW * 0.4, o.y - 16, laneW * 0.8, 32);
          ctx.fillStyle = '#fff'; ctx.fillText('🚫', cx, o.y);
        } else {
          ctx.fillText(o.type === 'boost' ? '⚡' : '⛏️', cx, o.y);
        }
      }
      // miner
      const minerY = H * 0.82;
      const mx = s.lane * laneW + laneW / 2;
      ctx.font = '34px serif';
      if (s.boost > 0) {
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
      }
      ctx.fillText('⛏️', mx, minerY - 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(99,102,241,0.9)';
      ctx.fillRect(mx - 18, minerY + 14, 36, 6);
    };

    const frame = (ts) => {
      if (!running) return;
      const s = stateRef.current;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (dt > 0.05) dt = 0.05;
      step(s, dt, W, H);
      draw(s, W, H);
      if (s.dead) { endGame(); return; }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      window.removeEventListener('resize', sizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const hist = cgLoadHistory(HR_HISTORY_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const sheet = [
    cgLeaderboardSection('hashrush'),
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">{r.tokens} ⛏️ · {r.secs}s</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Runs' },
    ]),
    cgRulesSection([
      'Tap the left/right half of the screen (or ← → keys) to change lane.',
      'Collect ⛏️ hash tokens to score — each is worth 10 points.',
      'Grab ⚡ Compute Boost for 5 seconds of 2× scoring.',
      'Dodge 🚫 invalid blocks — three hits and the run ends.',
      'It speeds up the longer you survive. Chase a high score!',
    ]),
  ];

  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => startGame()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <CgStatus items={[
          { l: 'Score', v: score },
          { l: 'Lives', v: '❤️'.repeat(lives) || '—' },
          { l: 'Mult', v: '×' + mult },
        ]} />
        <div className="hr-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} className="hr-canvas" />
          {boostLeft > 0 && phase === 'playing' && (
            <div className="hr-boost-badge">⚡ Boost {boostLeft}s</div>
          )}
          {phase === 'idle' && (
            <div className="hr-overlay">
              <div className="hr-overlay-title">⛏️ Hash Rush</div>
              <div className="hr-overlay-sub">Mine hashes, dodge invalid blocks.</div>
              <button className="gm-play-btn" style={{ maxWidth: 200 }} onClick={startGame}>Start mining</button>
            </div>
          )}
          {phase === 'dead' && (
            <div className="hr-overlay">
              <div className="hr-overlay-title">Game Over</div>
              <div className="hr-overlay-score">{score} pts</div>
              {finalRank && <div className="hr-overlay-sub">Global rank #{finalRank}</div>}
              <button className="gm-play-btn" style={{ maxWidth: 200 }} onClick={startGame}>Mine again</button>
            </div>
          )}
        </div>
      </div>
    </ClassicShell>
  );
}

/* ============================================================
   Phase 6 — Shared card/tile engine + Lane A daily games
   ------------------------------------------------------------
   A small client-side engine every card/tile daily rides:
   seeded deck building + Fisher-Yates shuffling (mulberry32 via
   dailyRng, same PRNG family as lib/dapp.js's tile-match board
   generator), a shared <CeCard> renderer, and a layered-tile
   layout helper (free-tile rule + reverse-deal solvable dealing,
   the same layer/overlap model as lib/dapp.js's tileBoard).
   All phase-6 games are tier B server-side (snapshot + timing
   heuristics through settleDailySession); their onStepChange
   calls feed the shared daily run log automatically.
   ============================================================ */

// ---- Card primitives -------------------------------------------------------
const CE_SUIT_GLYPH = ['♠', '♥', '♦', '♣'];
const CE_RANK_LABEL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ceIsRed = (card) => card.s === 1 || card.s === 2;

// Fisher-Yates over a seeded rng — the engine's single shuffle primitive.
function ceShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build n standard decks as {id, s (suit 0-3), r (rank 0=A..12=K), up}.
// `suits` restricts the suit pool (Spider's 1-suit variant passes [0]).
function ceDeck(nDecks, suits, rng) {
  const cards = [];
  let id = 0;
  for (let d = 0; d < nDecks; d++) {
    for (const s of (suits || [0, 1, 2, 3])) {
      for (let r = 0; r < 13; r++) cards.push({ id: id++, s, r, up: false });
    }
  }
  return rng ? ceShuffle(cards, rng) : cards;
}

// Shared card renderer. Face-down cards show a patterned back; face-up cards
// show rank + suit in red/black. `sel` draws the selection ring.
function CeCard({ card, sel, dim, onClick, style }) {
  const cls = ['ce-card'];
  if (!card.up) cls.push('down');
  else cls.push(ceIsRed(card) ? 'red' : 'black');
  if (sel) cls.push('sel');
  if (dim) cls.push('dim');
  return (
    <div className={cls.join(' ')} style={style} onClick={onClick}>
      {card.up && (
        <React.Fragment>
          <div className="ce-rank">{CE_RANK_LABEL[card.r]}</div>
          <div className="ce-suit">{CE_SUIT_GLYPH[card.s]}</div>
        </React.Fragment>
      )}
    </div>
  );
}

// An empty pile slot (foundation / empty column / stock base).
function CeSlot({ label, onClick, className }) {
  return (
    <div className={'ce-card ce-slot' + (className ? ' ' + className : '')} onClick={onClick}>
      {label || ''}
    </div>
  );
}

/* ---- Klondike Solitaire (daily) -------------------------------------------
   Classic single-deck patience: 7 tableau columns, draw-1 stock with
   unlimited recycles, 4 foundations by suit. Tap a face-up card to select
   it (and the run below it), tap a destination to move; tapping the
   selected card again sends it to a foundation when legal. */

function klDeal(rng) {
  const deck = ceDeck(1, null, rng);
  const tab = [];
  let idx = 0;
  for (let p = 0; p < 7; p++) {
    const col = [];
    for (let i = 0; i <= p; i++) {
      const c = deck[idx++];
      col.push({ ...c, up: i === p });
    }
    tab.push(col);
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, up: false }));
  return { stock, waste: [], found: [[], [], [], []], tab, moves: 0 };
}

function klValidState(st) {
  return st && Array.isArray(st.stock) && Array.isArray(st.waste) &&
    Array.isArray(st.found) && st.found.length === 4 &&
    Array.isArray(st.tab) && st.tab.length === 7 && Number.isFinite(st.moves);
}

function KlondikeGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const freshDeal = useRef(null);
  if (!freshDeal.current) freshDeal.current = klDeal(dailyRng(offset, 'klondike'));
  const resumed = savedProgress && savedProgress.dayNum === dayNum && klValidState(savedProgress.st)
    ? savedProgress.st : null;

  const [st, setSt] = useState(() => resumed || freshDeal.current);
  const [sel, setSel] = useState(null); // {z:'waste'} | {z:'tab',p,i} | {z:'found',p}
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { st, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, st: stateRef.current.st }, steps: stateRef.current.st.moves, secs: stateRef.current.secs }),
    !done
  );
  const commit = (next) => {
    setSt(next);
    setSel(null);
    onStepChange(next.moves);
    const won = next.found.every((f) => f.length === 13);
    // Don't autosave the winning move — the finish call is about to close the
    // attempt, and a progress write racing it 409s against the finished row.
    if (!won && onSaveProgress) onSaveProgress({ dayNum, st: next }, next.moves, secs);
    if (won) {
      setDone(true);
      const score = Math.max(1600 - next.moves * 3 - secs, 300);
      onWin(score, next.moves, secs, {
        share: `PuzzleChain Klondike Solitaire — solved today's deal in ${fmt} (${next.moves} moves) 🃏`,
      });
    }
  };

  const clone = () => ({
    stock: st.stock.slice(), waste: st.waste.slice(),
    found: st.found.map((f) => f.slice()), tab: st.tab.map((c) => c.slice()),
    moves: st.moves,
  });

  const tapStock = () => {
    if (done) return;
    const n = clone();
    if (n.stock.length) {
      const c = n.stock.pop();
      n.waste.push({ ...c, up: true });
    } else if (n.waste.length) {
      n.stock = n.waste.slice().reverse().map((c) => ({ ...c, up: false }));
      n.waste = [];
    } else return;
    n.moves++;
    commit(n);
  };

  const canTab = (card, destTop) =>
    destTop ? (ceIsRed(card) !== ceIsRed(destTop) && card.r === destTop.r - 1) : card.r === 12;
  const canFound = (card, f) =>
    f.length ? (card.s === f[f.length - 1].s && card.r === f[f.length - 1].r + 1) : card.r === 0;

  // The selected run (array of cards) plus a mutator that removes it.
  const takeSel = (n, s) => {
    if (s.z === 'waste') return [n.waste.pop()];
    if (s.z === 'found') return [n.found[s.p].pop()];
    const run = n.tab[s.p].splice(s.i);
    const col = n.tab[s.p];
    if (col.length && !col[col.length - 1].up) col[col.length - 1] = { ...col[col.length - 1], up: true };
    return run;
  };
  const selCards = (s) => {
    if (!s) return [];
    if (s.z === 'waste') return st.waste.slice(-1);
    if (s.z === 'found') return st.found[s.p].slice(-1);
    return st.tab[s.p].slice(s.i);
  };

  const tryFoundation = (s) => {
    const cards = selCards(s);
    if (cards.length !== 1) return false;
    const fi = st.found.findIndex((f) => canFound(cards[0], f));
    if (fi < 0) return false;
    const n = clone();
    n.found[fi].push({ ...takeSel(n, s)[0], up: true });
    n.moves++;
    commit(n);
    return true;
  };

  const moveSelToTab = (p) => {
    const cards = selCards(sel);
    if (!cards.length) return false;
    const destTop = st.tab[p].length ? st.tab[p][st.tab[p].length - 1] : null;
    if (!canTab(cards[0], destTop)) return false;
    const n = clone();
    n.tab[p] = n.tab[p].concat(takeSel(n, sel));
    n.moves++;
    commit(n);
    return true;
  };
  const moveSelToFound = (fi) => {
    const cards = selCards(sel);
    if (cards.length !== 1 || !canFound(cards[0], st.found[fi])) return false;
    const n = clone();
    n.found[fi].push({ ...takeSel(n, sel)[0], up: true });
    n.moves++;
    commit(n);
    return true;
  };

  const isSel = (z, p, i) => sel && sel.z === z && sel.p === p && (z !== 'tab' || sel.i === i);

  const tapWaste = () => {
    if (done || !st.waste.length) return;
    if (isSel('waste')) { if (!tryFoundation(sel)) setSel(null); return; }
    if (sel) { setSel({ z: 'waste' }); return; }
    setSel({ z: 'waste' });
  };
  const tapFound = (fi) => {
    if (done) return;
    if (sel && !isSel('found', fi)) { if (moveSelToFound(fi)) return; }
    if (isSel('found', fi)) { setSel(null); return; }
    if (st.found[fi].length) setSel({ z: 'found', p: fi });
  };
  const tapTab = (p, i) => {
    if (done) return;
    const col = st.tab[p];
    // Tap on empty column or anywhere in a column while a selection exists →
    // try to move there first.
    if (sel && !isSel('tab', p, i)) {
      if (moveSelToTab(p)) return;
    }
    if (i == null || i < 0 || !col[i] || !col[i].up) { setSel(null); return; }
    if (isSel('tab', p, i)) {
      // Second tap on the same card: auto-send to a foundation (top card only).
      if (i === col.length - 1 && tryFoundation(sel)) return;
      setSel(null);
      return;
    }
    setSel({ z: 'tab', p, i });
  };

  const maxCol = Math.max(...st.tab.map((c) => c.length), 1);
  return (
    <div className="kl-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{st.moves}</div></div>
        <div className="pill"><div className="plabel">Home</div><div className="pvalue">{st.found.reduce((a, f) => a + f.length, 0)}/52</div></div>
      </div>
      <div className="kl-top">
        {st.stock.length
          ? <CeCard card={{ s: 0, r: 0, up: false }} onClick={tapStock} />
          : <CeSlot label="↻" onClick={tapStock} />}
        {st.waste.length
          ? <CeCard card={st.waste[st.waste.length - 1]} sel={isSel('waste')} onClick={tapWaste} />
          : <CeSlot />}
        <div className="kl-gap" />
        {st.found.map((f, fi) => (
          f.length
            ? <CeCard key={fi} card={f[f.length - 1]} sel={isSel('found', fi)} onClick={() => tapFound(fi)} />
            : <CeSlot key={fi} label={CE_SUIT_GLYPH[fi]} onClick={() => tapFound(fi)} />
        ))}
      </div>
      <div className="kl-tab">
        {st.tab.map((col, p) => (
          <div
            key={p}
            className="kl-col"
            style={{ height: 62 + (maxCol - 1) * 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) tapTab(p, col.length ? col.length - 1 : null); }}
          >
            {col.length === 0 && <CeSlot onClick={() => tapTab(p, null)} />}
            {col.map((c, i) => (
              <CeCard
                key={c.id}
                card={c}
                sel={sel && sel.z === 'tab' && sel.p === p && i >= sel.i}
                onClick={() => tapTab(p, i)}
                style={{ position: 'absolute', top: i * (col.length > 12 ? 14 : 20), left: 0, zIndex: i }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="p6-hint">Tap a card, then its destination. Tap a selected card again to send it home.</div>
    </div>
  );
}

/* ---- Spider Solitaire (daily, 1 suit) --------------------------------------
   104 spade cards over 10 columns. Move any descending run; complete
   K→A runs clear to the foundation; deal a row from the stock. */

function spDeal(rng) {
  const deck = ceDeck(8, [0], rng); // 8 × A..K of one suit = 104
  const cols = [];
  let idx = 0;
  for (let p = 0; p < 10; p++) {
    const size = p < 4 ? 6 : 5;
    const col = [];
    for (let i = 0; i < size; i++) {
      const c = deck[idx++];
      col.push({ ...c, up: i === size - 1 });
    }
    cols.push(col);
  }
  return { cols, stock: deck.slice(idx).map((c) => ({ ...c, up: false })), done8: 0, moves: 0 };
}

function spValidState(st) {
  return st && Array.isArray(st.cols) && st.cols.length === 10 &&
    Array.isArray(st.stock) && Number.isFinite(st.done8) && Number.isFinite(st.moves);
}

// Remove any completed K→A run from a column (mutates), returns count removed.
function spSweep(n) {
  let swept = 0;
  for (let p = 0; p < 10; p++) {
    const col = n.cols[p];
    if (col.length < 13) continue;
    const tail = col.slice(-13);
    let run = tail.every((c) => c.up) && tail[0].r === 12;
    if (run) for (let i = 1; i < 13; i++) if (tail[i].r !== tail[i - 1].r - 1) { run = false; break; }
    if (run) {
      n.cols[p] = col.slice(0, -13);
      const nc = n.cols[p];
      if (nc.length && !nc[nc.length - 1].up) nc[nc.length - 1] = { ...nc[nc.length - 1], up: true };
      swept++;
    }
  }
  return swept;
}

function SpiderGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const freshDeal = useRef(null);
  if (!freshDeal.current) freshDeal.current = spDeal(dailyRng(offset, 'spider'));
  const resumed = savedProgress && savedProgress.dayNum === dayNum && spValidState(savedProgress.st)
    ? savedProgress.st : null;

  const [st, setSt] = useState(() => resumed || freshDeal.current);
  const [sel, setSel] = useState(null); // {p, i}
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { st, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, st: stateRef.current.st }, steps: stateRef.current.st.moves, secs: stateRef.current.secs }),
    !done
  );

  const commit = (n) => {
    n.done8 += spSweep(n);
    setSt(n);
    setSel(null);
    onStepChange(n.moves);
    const won = n.done8 >= 8;
    if (!won && onSaveProgress) onSaveProgress({ dayNum, st: n }, n.moves, secs);
    if (won) {
      setDone(true);
      const score = Math.max(2000 - n.moves * 3 - secs, 300);
      onWin(score, n.moves, secs, {
        share: `PuzzleChain Spider Solitaire — cleared today's deal in ${fmt} (${n.moves} moves) 🕷️`,
      });
    }
  };
  const clone = () => ({ cols: st.cols.map((c) => c.slice()), stock: st.stock.slice(), done8: st.done8, moves: st.moves });

  // A selection is valid if cards i..end are all face-up and strictly descending.
  const runOk = (col, i) => {
    if (!col[i] || !col[i].up) return false;
    for (let k = i + 1; k < col.length; k++) if (!col[k].up || col[k].r !== col[k - 1].r - 1) return false;
    return true;
  };

  const dealRow = () => {
    if (done || !st.stock.length) return;
    const n = clone();
    for (let p = 0; p < 10 && n.stock.length; p++) {
      const c = n.stock.pop();
      n.cols[p] = n.cols[p].concat({ ...c, up: true });
    }
    n.moves++;
    commit(n);
  };

  const tapCol = (p, i) => {
    if (done) return;
    const col = st.cols[p];
    if (sel && sel.p !== p) {
      // Attempt the move onto column p.
      const moving = st.cols[sel.p].slice(sel.i);
      const destTop = col.length ? col[col.length - 1] : null;
      if (!destTop || destTop.r === moving[0].r + 1) {
        const n = clone();
        const run = n.cols[sel.p].splice(sel.i);
        const src = n.cols[sel.p];
        if (src.length && !src[src.length - 1].up) src[src.length - 1] = { ...src[src.length - 1], up: true };
        n.cols[p] = n.cols[p].concat(run);
        n.moves++;
        commit(n);
        return;
      }
    }
    if (i == null || !runOk(col, i)) { setSel(null); return; }
    if (sel && sel.p === p && sel.i === i) { setSel(null); return; }
    setSel({ p, i });
  };

  const maxCol = Math.max(...st.cols.map((c) => c.length), 1);
  return (
    <div className="sp-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{st.moves}</div></div>
        <div className="pill"><div className="plabel">Runs</div><div className="pvalue">{st.done8}/8</div></div>
        <button className="p6-btn" onClick={dealRow} disabled={!st.stock.length}>
          Deal +10 ({Math.floor(st.stock.length / 10)})
        </button>
      </div>
      <div className="sp-tab">
        {st.cols.map((col, p) => (
          <div
            key={p}
            className="sp-col"
            style={{ height: 46 + (maxCol - 1) * 13 }}
            onClick={(e) => { if (e.target === e.currentTarget) tapCol(p, col.length ? col.length - 1 : null); }}
          >
            {col.length === 0 && <CeSlot className="sm" onClick={() => tapCol(p, null)} />}
            {col.map((c, i) => (
              <CeCard
                key={c.id}
                card={c}
                sel={sel && sel.p === p && i >= sel.i}
                onClick={() => tapCol(p, i)}
                style={{ position: 'absolute', top: i * 13, left: 0, zIndex: i }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="p6-hint">One suit: any descending run moves. Build K→A to clear a run — 8 clears win.</div>
    </div>
  );
}

/* ---- Mahjong Solitaire (daily) ----------------------------------------------
   60-tile stepped pyramid. A tile is free when nothing rests on it and its
   left or right side is open. The deal is generated by reverse-removal, so
   today's board is always solvable in at least one order. */

const MJ_LAYOUT = (() => {
  const pos = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) pos.push({ x: c * 2, y: r * 2, z: 0 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) pos.push({ x: 2 + c * 2, y: 1 + r * 2, z: 1 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) pos.push({ x: 4 + c * 2, y: 2 + r * 2, z: 2 });
  pos.push({ x: 6, y: 3, z: 3 });
  pos.push({ x: 8, y: 3, z: 3 });
  return pos; // 32 + 18 + 8 + 2 = 60 slots
})();
const MJ_FACES = ['🌸', '🎋', '🌊', '🔥', '⛰️', '🌙', '☀️', '⭐', '🐉', '🐢', '🦅', '🎐', '🍂', '❄️', '🌈', '🪷'];

function mjIsFree(i, removed) {
  const p = MJ_LAYOUT[i];
  for (let j = 0; j < MJ_LAYOUT.length; j++) {
    if (j === i || removed[j]) continue;
    const q = MJ_LAYOUT[j];
    if (q.z === p.z + 1 && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2) return false;
  }
  let left = false, right = false;
  for (let j = 0; j < MJ_LAYOUT.length; j++) {
    if (j === i || removed[j]) continue;
    const q = MJ_LAYOUT[j];
    if (q.z !== p.z || Math.abs(q.y - p.y) >= 2) continue;
    if (q.x === p.x - 2) left = true;
    if (q.x === p.x + 2) right = true;
  }
  return !(left && right);
}

// Reverse-deal: repeatedly pick two currently-free slots and give them the
// same face, then remove them. Playing back in that order solves the board,
// so the deal is guaranteed winnable. Conceptual sibling of lib/dapp.js's
// tileBoard (same layered-board model, solvability added).
function mjDeal(rng, present) {
  const faces = new Array(MJ_LAYOUT.length).fill(-1);
  const removed = MJ_LAYOUT.map((_, i) => !present[i]);
  let remaining = present.filter(Boolean).length;
  let pairIdx = 0;
  while (remaining >= 2) {
    const free = [];
    for (let i = 0; i < MJ_LAYOUT.length; i++) if (!removed[i] && mjIsFree(i, removed)) free.push(i);
    let a, b;
    if (free.length >= 2) {
      const ai = Math.floor(rng() * free.length);
      a = free.splice(ai, 1)[0];
      b = free[Math.floor(rng() * free.length)];
    } else {
      const rest = [];
      for (let i = 0; i < removed.length; i++) if (!removed[i]) rest.push(i);
      a = rest[0]; b = rest[1];
    }
    faces[a] = pairIdx % MJ_FACES.length;
    faces[b] = pairIdx % MJ_FACES.length;
    pairIdx++;
    removed[a] = true;
    removed[b] = true;
    remaining -= 2;
  }
  return faces;
}

// Any free matching pair left on the board?
function mjHasMove(faces, removed) {
  const free = [];
  for (let i = 0; i < MJ_LAYOUT.length; i++) if (!removed[i] && mjIsFree(i, removed)) free.push(i);
  for (let a = 0; a < free.length; a++) {
    for (let b = a + 1; b < free.length; b++) {
      if (faces[free[a]] === faces[free[b]]) return true;
    }
  }
  return false;
}

function MahjongSolitaireGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const seedBase = useRef(null);
  if (seedBase.current == null) {
    const srv = serverDailySeed('mahjongsol');
    seedBase.current = srv != null ? srv : ((utcDayNum(offset) + hashStr('mahjongsol')) >>> 0);
  }
  const resumed = savedProgress && savedProgress.dayNum === dayNum &&
    Array.isArray(savedProgress.faces) && savedProgress.faces.length === MJ_LAYOUT.length &&
    Array.isArray(savedProgress.removed)
    ? savedProgress : null;

  const [faces, setFaces] = useState(() =>
    resumed ? resumed.faces.slice() : mjDeal(mulberry32(seedBase.current), MJ_LAYOUT.map(() => true))
  );
  const [removed, setRemoved] = useState(() =>
    resumed ? resumed.removed.map(Boolean) : MJ_LAYOUT.map(() => false)
  );
  const [shuffles, setShuffles] = useState(resumed && Number.isFinite(resumed.shuffles) ? resumed.shuffles : 2);
  const [sel, setSel] = useState(null);
  const [pairs, setPairs] = useState(resumed && Number.isFinite(resumed.pairs) ? resumed.pairs : 0);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const remaining = removed.filter((r) => !r).length;
  const stuck = !done && remaining > 0 && !mjHasMove(faces, removed);

  const stateRef = useRef({});
  stateRef.current = { faces, removed, shuffles, pairs, secs };
  const buildProgress = () => ({
    dayNum,
    faces: stateRef.current.faces,
    removed: stateRef.current.removed.map((r) => (r ? 1 : 0)),
    shuffles: stateRef.current.shuffles,
    pairs: stateRef.current.pairs,
  });
  useAutosave(
    onSaveProgress,
    () => ({ progress: buildProgress(), steps: stateRef.current.pairs, secs: stateRef.current.secs }),
    !done
  );
  const saveNow = (f, rm, sh, pr) =>
    onSaveProgress && onSaveProgress(
      { dayNum, faces: f, removed: rm.map((r) => (r ? 1 : 0)), shuffles: sh, pairs: pr },
      pr, secs
    );

  const tap = (i) => {
    if (done || removed[i] || !mjIsFree(i, removed)) return;
    if (sel === i) { setSel(null); return; }
    if (sel != null && faces[sel] === faces[i]) {
      const rm = removed.slice();
      rm[sel] = true;
      rm[i] = true;
      const pr = pairs + 1;
      setRemoved(rm);
      setSel(null);
      setPairs(pr);
      onStepChange(pr);
      const won = rm.every(Boolean);
      if (!won) saveNow(faces, rm, shuffles, pr);
      if (won) {
        setDone(true);
        const score = Math.max(1500 - secs * 2 - (2 - shuffles) * 150, 300);
        onWin(score, pr, secs, {
          share: `PuzzleChain Mahjong Solitaire — cleared today's board in ${fmt} 🀄`,
        });
      }
      return;
    }
    setSel(i);
  };

  const doShuffle = () => {
    if (done || shuffles <= 0 || remaining === 0) return;
    // Re-deal the remaining slots with a fresh (still deterministic-ish) seed;
    // the reverse-deal keeps the rest of the board solvable.
    const rng = mulberry32((seedBase.current + remaining * 7919 + shuffles * 104729) >>> 0);
    const nf = mjDeal(rng, removed.map((r) => !r));
    const merged = faces.map((f, i) => (removed[i] ? f : nf[i]));
    const sh = shuffles - 1;
    setFaces(merged);
    setShuffles(sh);
    setSel(null);
    saveNow(merged, removed, sh, pairs);
  };

  // Out of moves and out of shuffles → the day is lost.
  useEffect(() => {
    if (stuck && shuffles <= 0 && !done) {
      setDone(true);
      onLose && onLose(pairs, secs, {
        share: `PuzzleChain Mahjong Solitaire — today's board got the better of me 🀄`,
        answer: `${remaining} tiles were left with no free pair.`,
      });
    }
  }, [stuck, shuffles, done]);

  const TW = 36, TH = 46;
  const boardW = 15 * (TW / 2) + TW;
  const boardH = 7 * (TH / 2) + TH + 12;
  return (
    <div className="mj-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Tiles</div><div className="pvalue">{remaining}/60</div></div>
        <button className="p6-btn" onClick={doShuffle} disabled={shuffles <= 0}>🔀 Shuffle ({shuffles})</button>
      </div>
      {stuck && shuffles > 0 && (
        <div className="p6-banner">No free pair left — use a shuffle to keep going.</div>
      )}
      <div className="mj-board" style={{ width: boardW, height: boardH }}>
        {MJ_LAYOUT.map((p, i) => {
          if (removed[i]) return null;
          const free = mjIsFree(i, removed);
          return (
            <div
              key={i}
              className={'mj-tile' + (free ? '' : ' blocked') + (sel === i ? ' sel' : '') + (p.z > 0 ? ' up' + p.z : '')}
              style={{
                left: p.x * (TW / 2),
                top: p.y * (TH / 2) - p.z * 5,
                zIndex: p.z * 100 + p.y,
              }}
              onClick={() => tap(i)}
            >{MJ_FACES[faces[i]]}</div>
          );
        })}
      </div>
      <div className="p6-hint">Tap two matching free tiles (uncovered, with an open side) to clear them.</div>
    </div>
  );
}

/* ---- Nonogram (daily) --------------------------------------------------------
   8×8 picture-logic puzzle. Fill cells so every row and column matches its
   run clues; any grid satisfying all clues wins. */

function ngClues(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

function ngGenerate(rng) {
  let g = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    g = [];
    let filled = 0;
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const v = rng() < 0.55 ? 1 : 0;
        row.push(v);
        filled += v;
      }
      g.push(row);
    }
    if (filled < 22 || filled > 44) continue;
    const rowsOk = g.every((row) => row.some((v) => v === 1));
    const colsOk = g[0].every((_, c) => g.some((row) => row[c] === 1));
    if (rowsOk && colsOk) return g;
  }
  return g;
}

function NonogramGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const target = useRef(null);
  if (!target.current) target.current = ngGenerate(dailyRng(offset, 'nonogram'));
  const rowClues = useRef(target.current.map(ngClues)).current;
  const colClues = useRef(target.current[0].map((_, c) => ngClues(target.current.map((row) => row[c])))).current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress : null;
  // 0 = blank, 1 = filled, 2 = marked ✗
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map((row) => row.slice()) : Array.from({ length: 8 }, () => new Array(8).fill(0))
  );
  const [mode, setMode] = useState('fill'); // 'fill' | 'mark'
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { grid, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, grid: stateRef.current.grid }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  const solved = (g) => {
    for (let r = 0; r < 8; r++) {
      const got = ngClues(g[r].map((v) => (v === 1 ? 1 : 0)));
      if (got.length !== rowClues[r].length || got.some((v, k) => v !== rowClues[r][k])) return false;
    }
    for (let c = 0; c < 8; c++) {
      const got = ngClues(g.map((row) => (row[c] === 1 ? 1 : 0)));
      if (got.length !== colClues[c].length || got.some((v, k) => v !== colClues[c][k])) return false;
    }
    return true;
  };

  const tap = (r, c) => {
    if (done) return;
    const g = grid.map((row) => row.slice());
    const cur = g[r][c];
    if (mode === 'fill') g[r][c] = cur === 1 ? 0 : 1;
    else g[r][c] = cur === 2 ? 0 : 2;
    const ns = steps + 1;
    setGrid(g);
    setSteps(ns);
    onStepChange(ns);
    const won = solved(g);
    if (!won && onSaveProgress) onSaveProgress({ dayNum, grid: g }, ns, secs);
    if (won) {
      setDone(true);
      const score = Math.max(1400 - ns * 4 - secs * 2, 250);
      onWin(score, ns, secs, {
        share: `PuzzleChain Nonogram — solved today's 8×8 picture in ${fmt} 🖼️`,
      });
    }
  };

  return (
    <div className="ng-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Steps</div><div className="pvalue">{steps}</div></div>
        <div className="ng-modes">
          <button className={'p6-btn' + (mode === 'fill' ? ' on' : '')} onClick={() => setMode('fill')}>⬛ Fill</button>
          <button className={'p6-btn' + (mode === 'mark' ? ' on' : '')} onClick={() => setMode('mark')}>✗ Mark</button>
        </div>
      </div>
      <div className="ng-wrap">
        <div className="ng-corner" />
        <div className="ng-colclues">
          {colClues.map((cl, c) => (
            <div key={c} className="ng-colclue">{cl.map((v, k) => <span key={k}>{v}</span>)}</div>
          ))}
        </div>
        <div className="ng-rowclues">
          {rowClues.map((cl, r) => (
            <div key={r} className="ng-rowclue">{cl.join(' ')}</div>
          ))}
        </div>
        <div className="ng-grid">
          {grid.map((row, r) =>
            row.map((v, c) => (
              <div
                key={r + '-' + c}
                className={'ng-cell' + (v === 1 ? ' fill' : '') + (v === 2 ? ' mark' : '')}
                onClick={() => tap(r, c)}
              >{v === 2 ? '✗' : ''}</div>
            ))
          )}
        </div>
      </div>
      <div className="p6-hint">Numbers are runs of filled cells, in order. Match every row and column clue.</div>
    </div>
  );
}

/* ---- Mine Finder (daily) -----------------------------------------------------
   9×9 with 10 mines, same board for everyone. A safe opening area is
   revealed for you; one wrong tap ends the day. */

function mfBuild(rng) {
  const idxs = ceShuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  const mines = new Set(idxs.slice(0, 10));
  const counts = new Array(81).fill(0);
  for (let i = 0; i < 81; i++) {
    if (mines.has(i)) { counts[i] = -1; continue; }
    const r = Math.floor(i / 9), c = i % 9;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9 && mines.has(rr * 9 + cc)) n++;
    }
    counts[i] = n;
  }
  // Deterministic safe opening: the zero-cell whose flood region is largest.
  let best = -1, bestSize = -1;
  const seen = new Set();
  for (let i = 0; i < 81; i++) {
    if (counts[i] !== 0 || seen.has(i)) continue;
    const region = mfFlood(i, counts);
    for (const j of region) seen.add(j);
    if (region.size > bestSize) { bestSize = region.size; best = i; }
  }
  if (best < 0) best = counts.findIndex((v) => v >= 0); // no zeros: any safe cell
  return { mines, counts, start: best };
}

function mfFlood(startIdx, counts) {
  const out = new Set([startIdx]);
  const queue = [startIdx];
  while (queue.length) {
    const i = queue.pop();
    if (counts[i] !== 0) continue;
    const r = Math.floor(i / 9), c = i % 9;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= 9 || cc < 0 || cc >= 9) continue;
      const j = rr * 9 + cc;
      if (!out.has(j) && counts[j] >= 0) { out.add(j); queue.push(j); }
    }
  }
  return out;
}

function MineFinderGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const board = useRef(null);
  if (!board.current) board.current = mfBuild(dailyRng(offset, 'minefinder'));
  const { mines, counts, start } = board.current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.revealed)
    ? savedProgress : null;
  const [revealed, setRevealed] = useState(() =>
    new Set(resumed ? resumed.revealed : [...mfFlood(start, counts)])
  );
  const [flags, setFlags] = useState(() => new Set(resumed && Array.isArray(resumed.flags) ? resumed.flags : []));
  const [flagMode, setFlagMode] = useState(false);
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const [boom, setBoom] = useState(-1);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { revealed, flags, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, revealed: [...stateRef.current.revealed], flags: [...stateRef.current.flags] },
      steps: stateRef.current.steps, secs: stateRef.current.secs,
    }),
    !done
  );
  const saveNow = (rv, fl, ns) =>
    onSaveProgress && onSaveProgress({ dayNum, revealed: [...rv], flags: [...fl] }, ns, secs);

  const tap = (i) => {
    if (done || revealed.has(i)) return;
    const ns = steps + 1;
    setSteps(ns);
    onStepChange(ns);
    if (flagMode) {
      const fl = new Set(flags);
      if (fl.has(i)) fl.delete(i); else fl.add(i);
      setFlags(fl);
      saveNow(revealed, fl, ns);
      return;
    }
    if (flags.has(i)) return; // flagged cells don't reveal by accident
    if (mines.has(i)) {
      setBoom(i);
      setDone(true);
      const rv = new Set(revealed);
      for (const m of mines) rv.add(m);
      setRevealed(rv);
      onLose && onLose(ns, secs, {
        share: `PuzzleChain Mine Finder — today's field got me 💥`,
        answer: 'You hit a mine — the field is revealed above.',
      });
      return;
    }
    const rv = new Set(revealed);
    if (counts[i] === 0) for (const j of mfFlood(i, counts)) rv.add(j);
    else rv.add(i);
    setRevealed(rv);
    const won = rv.size >= 71;
    if (!won) saveNow(rv, flags, ns);
    if (won) {
      setDone(true);
      const score = Math.max(1000 - secs * 3 - ns * 2, 200);
      onWin(score, ns, secs, {
        share: `PuzzleChain Mine Finder — swept today's field in ${fmt} 🚩`,
      });
    }
  };

  return (
    <div className="mf-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Mines</div><div className="pvalue">{Math.max(10 - flags.size, 0)}</div></div>
        <div className="pill"><div className="plabel">Steps</div><div className="pvalue">{steps}</div></div>
        <button className={'p6-btn' + (flagMode ? ' on' : '')} onClick={() => setFlagMode(!flagMode)}>🚩 Flag</button>
      </div>
      <div className="mf-grid">
        {counts.map((v, i) => {
          const isRev = revealed.has(i);
          const isMine = mines.has(i);
          const cls = ['mf-cell'];
          if (isRev) cls.push('rev');
          if (isRev && isMine) cls.push('mine');
          if (i === boom) cls.push('boom');
          return (
            <div key={i} className={cls.join(' ')} onClick={() => tap(i)}>
              {isRev
                ? (isMine ? '💣' : (v > 0 ? v : ''))
                : (flags.has(i) ? '🚩' : '')}
            </div>
          );
        })}
      </div>
      <div className="p6-hint">Numbers count adjacent mines. Toggle 🚩 Flag mode to mark suspects — same field for everyone today.</div>
    </div>
  );
}

/* ---- Anagram Sprint (daily) --------------------------------------------------
   Unscramble five words back-to-back. Tap the shuffled letters to build
   your answer; wrong submissions cost steps, not the day. */

const AN_POOL_5 = ['APPLE', 'BEACH', 'CANDY', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HONEY', 'IVORY', 'JUICE', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN', 'PIANO', 'QUEEN', 'RIVER', 'STONE', 'TIGER', 'WHALE', 'ZEBRA', 'CLOUD', 'BRAVE', 'SPARK', 'TRAIL'];
const AN_POOL_6 = ['ANCHOR', 'BASKET', 'CAMERA', 'DRAGON', 'FOREST', 'GARDEN', 'HAMMER', 'ISLAND', 'JUNGLE', 'KERNEL', 'LEGEND', 'MARBLE', 'NECTAR', 'ORCHID', 'PLANET', 'RIDDLE', 'SILVER', 'TEMPLE', 'VELVET', 'WINTER', 'WIZARD', 'YELLOW', 'BREEZE', 'CASTLE', 'FALCON'];
const AN_POOL_7 = ['ANTIQUE', 'BALLOON', 'CAPTAIN', 'DOLPHIN', 'EMERALD', 'FORTUNE', 'GRANITE', 'HARVEST', 'IMAGINE', 'JOURNEY', 'KINGDOM', 'LIBRARY', 'MACHINE', 'NETWORK', 'OCTOPUS', 'PYRAMID', 'RAINBOW', 'SUNRISE', 'THUNDER', 'VILLAGE', 'WHISPER', 'CRYSTAL', 'LANTERN', 'PENGUIN', 'MONSOON'];

function anPickWords(rng) {
  const pick = (pool) => pool[Math.floor(rng() * pool.length)];
  const words = [];
  const used = new Set();
  const take = (pool) => {
    let w = pick(pool);
    for (let g = 0; g < 20 && used.has(w); g++) w = pick(pool);
    used.add(w);
    words.push(w);
  };
  take(AN_POOL_5); take(AN_POOL_5); take(AN_POOL_6); take(AN_POOL_6); take(AN_POOL_7);
  return words;
}

function anScramble(word, rng) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const idx = ceShuffle(Array.from({ length: word.length }, (_, i) => i), rng);
    const s = idx.map((i) => word[i]).join('');
    if (s !== word) return idx.map((i) => ({ ch: word[i], used: false }));
  }
  // Degenerate scramble (e.g. repeated letters): rotate by one.
  const rot = (word.slice(1) + word[0]).split('');
  return rot.map((ch) => ({ ch, used: false }));
}

function AnagramsGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const deal = useRef(null);
  if (!deal.current) {
    const rng = dailyRng(offset, 'anagrams');
    const words = anPickWords(rng);
    deal.current = { words, tiles: words.map((w) => anScramble(w, rng)) };
  }
  const { words, tiles } = deal.current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Number.isFinite(savedProgress.solved)
    ? savedProgress : null;
  const [wordIdx, setWordIdx] = useState(() => Math.min(resumed ? resumed.solved : 0, words.length - 1));
  const [solvedCount, setSolvedCount] = useState(resumed ? resumed.solved : 0);
  const [picked, setPicked] = useState([]); // [{tileIdx, ch}]
  const [flash, setFlash] = useState(false);
  const [steps, setSteps] = useState(() => (savedProgress && Number.isFinite(savedProgress.steps) ? savedProgress.steps : 0));
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { solvedCount, steps, secs };
  useAutosave(
    onSaveProgress,
    () => ({ progress: { dayNum, solved: stateRef.current.solvedCount }, steps: stateRef.current.steps, secs: stateRef.current.secs }),
    !done
  );

  const word = words[wordIdx];
  const rack = tiles[wordIdx];
  const usedSet = new Set(picked.map((p) => p.tileIdx));

  const tapTile = (i) => {
    if (done || usedSet.has(i) || picked.length >= word.length) return;
    setPicked(picked.concat({ tileIdx: i, ch: rack[i].ch }));
  };
  const backspace = () => setPicked(picked.slice(0, -1));
  const submit = () => {
    if (done || picked.length !== word.length) return;
    const ns = steps + 1;
    setSteps(ns);
    onStepChange(ns);
    const guess = picked.map((p) => p.ch).join('');
    if (guess === word) {
      const sc = solvedCount + 1;
      setSolvedCount(sc);
      setPicked([]);
      const won = sc >= words.length;
      if (!won && onSaveProgress) onSaveProgress({ dayNum, solved: sc }, ns, secs);
      if (won) {
        setDone(true);
        const score = Math.max(1300 - ns * 25 - secs * 2, 250);
        onWin(score, ns, secs, {
          share: `PuzzleChain Anagram Sprint — unscrambled all ${words.length} words in ${fmt} 🔀`,
        });
      } else {
        setWordIdx(sc);
      }
    } else {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      if (onSaveProgress) onSaveProgress({ dayNum, solved: solvedCount }, ns, secs);
    }
  };

  return (
    <div className="an-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Word</div><div className="pvalue">{Math.min(solvedCount + 1, words.length)}/{words.length}</div></div>
        <div className="pill"><div className="plabel">Tries</div><div className="pvalue">{steps}</div></div>
      </div>
      <div className="an-dots">
        {words.map((w, i) => (
          <span key={i} className={'an-dot' + (i < solvedCount ? ' solved' : i === wordIdx && !done ? ' cur' : '')}>
            {i < solvedCount ? w : w.length}
          </span>
        ))}
      </div>
      <div className={'an-slots' + (flash ? ' bad' : '')}>
        {Array.from({ length: word.length }, (_, i) => (
          <div key={i} className={'an-slot' + (picked[i] ? ' has' : '')} onClick={backspace}>
            {picked[i] ? picked[i].ch : ''}
          </div>
        ))}
      </div>
      <div className="an-rack">
        {rack.map((t, i) => (
          <button key={i} className={'an-tile' + (usedSet.has(i) ? ' used' : '')} onClick={() => tapTile(i)}>
            {t.ch}
          </button>
        ))}
      </div>
      <div className="an-actions">
        <button className="p6-btn" onClick={backspace} disabled={!picked.length}>⌫ Undo letter</button>
        <button className="p6-btn primary" onClick={submit} disabled={picked.length !== word.length}>Submit</button>
      </div>
      <div className="p6-hint">Tap letters to build the word, tap a slot to take one back. Wrong guesses cost tries, never the day.</div>
    </div>
  );
}

/* ---- Crate Push (daily) --------------------------------------------------------
   Push every crate onto a goal pad. One hand-built warehouse per day
   (picked by the daily seed); moves are undoable and the room restartable. */

const CP_LEVELS = [
  ['#######',
   '#     #',
   '# .$@ #',
   '#     #',
   '#######'],
  ['#######',
   '#  .  #',
   '#  $  #',
   '#  @  #',
   '#     #',
   '#######'],
  ['########',
   '#      #',
   '# .$@$.#',
   '#      #',
   '########'],
  ['#######',
   '#. $  #',
   '#  @  #',
   '#  $ .#',
   '#######'],
  ['########',
   '#   #  #',
   '# @$  .#',
   '#   #  #',
   '########'],
  ['#######',
   '#  .  #',
   '# $$  #',
   '# .@  #',
   '#######'],
  ['########',
   '#  ..  #',
   '#  $$  #',
   '#      #',
   '#  @   #',
   '########'],
  ['#########',
   '#       #',
   '# @$  . #',
   '#       #',
   '# .  $  #',
   '#       #',
   '#########'],
  ['#######',
   '#     #',
   '# $.$ #',
   '# . . #',
   '#  $  #',
   '#  @  #',
   '#######'],
  ['########',
   '# @    #',
   '# $$$  #',
   '# ...  #',
   '#      #',
   '########'],
];

function cpParse(rows) {
  const walls = new Set(), goals = new Set();
  const crates = [];
  let player = null;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const key = x + ',' + y;
      if (ch === '#') walls.add(key);
      if (ch === '.' || ch === '*' || ch === '+') goals.add(key);
      if (ch === '$' || ch === '*') crates.push([x, y]);
      if (ch === '@' || ch === '+') player = [x, y];
    }
  }
  return { walls, goals, crates, player, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

function CratePushGame({ onWin, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const levelIdx = useRef(null);
  if (levelIdx.current == null) levelIdx.current = Math.floor(dailyRng(offset, 'cratepush')() * CP_LEVELS.length);
  const level = useRef(cpParse(CP_LEVELS[levelIdx.current])).current;

  const resumed = savedProgress && savedProgress.dayNum === dayNum &&
    Array.isArray(savedProgress.player) && Array.isArray(savedProgress.crates)
    ? savedProgress : null;
  const [player, setPlayer] = useState(() => (resumed ? resumed.player.slice() : level.player.slice()));
  const [crates, setCrates] = useState(() =>
    (resumed ? resumed.crates : level.crates).map((c) => c.slice())
  );
  const [moves, setMoves] = useState(resumed && Number.isFinite(resumed.moves) ? resumed.moves : 0);
  const [hist, setHist] = useState([]);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { player, crates, moves, secs, done };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: { dayNum, player: stateRef.current.player, crates: stateRef.current.crates, moves: stateRef.current.moves },
      steps: stateRef.current.moves, secs: stateRef.current.secs,
    }),
    !done
  );
  const saveNow = (p, cr, m) =>
    onSaveProgress && onSaveProgress({ dayNum, player: p, crates: cr, moves: m }, m, secs);

  const crateAt = (cr, x, y) => cr.findIndex(([cx, cy]) => cx === x && cy === y);

  const move = (dx, dy) => {
    const cur = stateRef.current;
    if (cur.done) return;
    const [px, py] = cur.player;
    const nx = px + dx, ny = py + dy;
    if (level.walls.has(nx + ',' + ny)) return;
    const cr = cur.crates.map((c) => c.slice());
    const ci = crateAt(cr, nx, ny);
    if (ci >= 0) {
      const cx = nx + dx, cy = ny + dy;
      if (level.walls.has(cx + ',' + cy) || crateAt(cr, cx, cy) >= 0) return;
      cr[ci] = [cx, cy];
    }
    const m = cur.moves + 1;
    setHist((h) => h.concat([{ player: cur.player, crates: cur.crates, moves: cur.moves }]).slice(-200));
    setPlayer([nx, ny]);
    setCrates(cr);
    setMoves(m);
    onStepChange(m);
    const won = cr.every(([cx, cy]) => level.goals.has(cx + ',' + cy));
    if (!won) saveNow([nx, ny], cr, m);
    if (won) {
      setDone(true);
      const score = Math.max(1200 - m * 6 - secs * 2, 250);
      onWin(score, m, secs, {
        share: `PuzzleChain Crate Push — shifted today's warehouse in ${m} moves (${fmt}) 📦`,
      });
    }
  };

  const undo = () => {
    if (done || !hist.length) return;
    const prev = hist[hist.length - 1];
    setHist(hist.slice(0, -1));
    setPlayer(prev.player.slice());
    setCrates(prev.crates.map((c) => c.slice()));
    setMoves(prev.moves);
    onStepChange(prev.moves);
    saveNow(prev.player, prev.crates, prev.moves);
  };
  const restart = () => {
    if (done) return;
    setHist([]);
    setPlayer(level.player.slice());
    setCrates(level.crates.map((c) => c.slice()));
    setMoves(0);
    onStepChange(0);
    saveNow(level.player, level.crates, 0);
  };

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cells = [];
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const key = x + ',' + y;
      const wall = level.walls.has(key);
      const goal = level.goals.has(key);
      const crate = crateAt(crates, x, y) >= 0;
      const isP = player[0] === x && player[1] === y;
      cells.push(
        <div key={key} className={'cp-cell' + (wall ? ' wall' : '') + (goal ? ' goal' : '')}>
          {crate ? <span className={'cp-crate' + (goal ? ' ongoal' : '')}>📦</span> : isP ? '🧍' : ''}
        </div>
      );
    }
  }

  return (
    <div className="cp-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Moves</div><div className="pvalue">{moves}</div></div>
        <div className="pill"><div className="plabel">Room</div><div className="pvalue">#{levelIdx.current + 1}</div></div>
      </div>
      <div className="cp-grid" style={{ gridTemplateColumns: `repeat(${level.w}, 34px)` }}>{cells}</div>
      <div className="cp-pad">
        <div />
        <button className="p6-btn" onClick={() => move(0, -1)}>▲</button>
        <div />
        <button className="p6-btn" onClick={() => move(-1, 0)}>◀</button>
        <button className="p6-btn" onClick={() => move(0, 1)}>▼</button>
        <button className="p6-btn" onClick={() => move(1, 0)}>▶</button>
      </div>
      <div className="an-actions">
        <button className="p6-btn" onClick={undo} disabled={!hist.length}>↶ Undo</button>
        <button className="p6-btn" onClick={restart}>⟲ Restart</button>
      </div>
      <div className="p6-hint">Push every crate onto a green pad. You can push one crate at a time — never pull.</div>
    </div>
  );
}

/* ---- Drop Stack (daily) ---------------------------------------------------------
   Place today's fixed sequence of 40 falling pieces without topping out.
   Turn-based: line up each piece, then drop it — same order for everyone. */

const DS_W = 9, DS_H = 14, DS_PIECES = 40;
const DS_SHAPES = [
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#38BDF8' },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#FBBF24' },
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: '#A78BFA' },
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#34D399' },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#FB7185' },
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#818CF8' },
  { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#F59E0B'  },
];

function dsSequence(rng) {
  const seq = [];
  while (seq.length < DS_PIECES) {
    seq.push(...ceShuffle([0, 1, 2, 3, 4, 5, 6], rng));
  }
  return seq.slice(0, DS_PIECES);
}

// Rotate a shape's cells 90° clockwise `rot` times, normalized to (0,0).
function dsCells(shapeIdx, rot) {
  let cells = DS_SHAPES[shapeIdx].cells;
  for (let k = 0; k < (rot % 4 + 4) % 4; k++) {
    const maxY = Math.max(...cells.map(([, y]) => y));
    cells = cells.map(([x, y]) => [maxY - y, x]);
  }
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function DropStackGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(utcDayNum(offset)).current;
  const seq = useRef(null);
  if (!seq.current) seq.current = dsSequence(dailyRng(offset, 'dropstack'));

  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.grid)
    ? savedProgress : null;
  const [grid, setGrid] = useState(() =>
    resumed ? resumed.grid.map((row) => row.slice()) : Array.from({ length: DS_H }, () => new Array(DS_W).fill(0))
  );
  const [pieceIdx, setPieceIdx] = useState(resumed && Number.isFinite(resumed.pieceIdx) ? resumed.pieceIdx : 0);
  const [lines, setLines] = useState(resumed && Number.isFinite(resumed.lines) ? resumed.lines : 0);
  const [points, setPoints] = useState(resumed && Number.isFinite(resumed.points) ? resumed.points : 0);
  const [col, setCol] = useState(3);
  const [rot, setRot] = useState(0);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  const stateRef = useRef({});
  stateRef.current = { grid, pieceIdx, lines, points, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: {
        dayNum, grid: stateRef.current.grid, pieceIdx: stateRef.current.pieceIdx,
        lines: stateRef.current.lines, points: stateRef.current.points,
      },
      steps: stateRef.current.pieceIdx, secs: stateRef.current.secs,
    }),
    !done
  );

  const shapeIdx = pieceIdx < DS_PIECES ? seq.current[pieceIdx] : 0;
  const cells = dsCells(shapeIdx, rot);
  const shapeW = Math.max(...cells.map(([x]) => x)) + 1;
  const clampedCol = Math.min(Math.max(col, 0), DS_W - shapeW);

  const canPlace = (g, atCol, yOff) =>
    cells.every(([dx, dy]) => {
      const x = atCol + dx, y = yOff + dy;
      return x >= 0 && x < DS_W && y < DS_H && (y < 0 || g[y][x] === 0);
    }) && cells.every(([, dy]) => yOff + dy >= 0);

  const landingY = (g, atCol) => {
    if (!canPlace(g, atCol, 0)) return -1;
    let y = 0;
    while (canPlace(g, atCol, y + 1)) y++;
    return y;
  };

  const drop = () => {
    if (done || pieceIdx >= DS_PIECES) return;
    const g = grid.map((row) => row.slice());
    const y = landingY(g, clampedCol);
    const np = pieceIdx + 1;
    if (y < 0) {
      // Piece can't enter the well — topped out; the day is lost.
      setDone(true);
      onLose && onLose(pieceIdx, secs, {
        share: `PuzzleChain Drop Stack — topped out after ${pieceIdx} pieces 🧱`,
        answer: `The stack reached the top with ${DS_PIECES - pieceIdx} pieces left.`,
      });
      return;
    }
    for (const [dx, dy] of cells) g[y + dy][clampedCol + dx] = shapeIdx + 1;
    let cleared = 0;
    for (let r = DS_H - 1; r >= 0; r--) {
      if (g[r].every((v) => v !== 0)) {
        g.splice(r, 1);
        g.unshift(new Array(DS_W).fill(0));
        cleared++;
        r++;
      }
    }
    const gained = [0, 100, 250, 450, 700][cleared] || 0;
    const nl = lines + cleared, npts = points + gained;
    setGrid(g);
    setPieceIdx(np);
    setLines(nl);
    setPoints(npts);
    setRot(0);
    setCol(3);
    onStepChange(np);
    const won = np >= DS_PIECES;
    if (!won && onSaveProgress) onSaveProgress({ dayNum, grid: g, pieceIdx: np, lines: nl, points: npts }, np, secs);
    if (won) {
      setDone(true);
      const score = npts + 200 + nl * 10;
      onWin(score, np, secs, {
        share: `PuzzleChain Drop Stack — placed all ${DS_PIECES} pieces, ${nl} lines, ${npts + 200 + nl * 10} pts 🧱`,
      });
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setCol((c) => Math.max(c - 1, 0)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setCol((c) => Math.min(c + 1, DS_W - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setRot((r) => r + 1); }
      if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); drop(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ghostY = landingY(grid, clampedCol);
  const ghost = new Set();
  const hover = new Set();
  if (!done && pieceIdx < DS_PIECES) {
    for (const [dx, dy] of cells) {
      hover.add(dy * DS_W + (clampedCol + dx));
      if (ghostY >= 0) ghost.add((ghostY + dy) * DS_W + (clampedCol + dx));
    }
  }
  const nextIdx = pieceIdx + 1 < DS_PIECES ? seq.current[pieceIdx + 1] : null;

  return (
    <div className="ds-game">
      <div className="status-bar">
        <div className="pill"><div className="plabel">Time</div><div className="pvalue time">{fmt}</div></div>
        <div className="pill"><div className="plabel">Piece</div><div className="pvalue">{Math.min(pieceIdx + 1, DS_PIECES)}/{DS_PIECES}</div></div>
        <div className="pill"><div className="plabel">Lines</div><div className="pvalue">{lines}</div></div>
        <div className="pill"><div className="plabel">Points</div><div className="pvalue">{points}</div></div>
      </div>
      <div className="ds-next">
        Next: {nextIdx != null
          ? dsCells(nextIdx, 0).map(([x, y], k) => (
            <span key={k} className="ds-mini" style={{ background: DS_SHAPES[nextIdx].color, left: 42 + x * 10, top: 4 + y * 10 }} />
          ))
          : <span className="ds-last">last piece</span>}
      </div>
      <div className="ds-grid">
        {grid.map((row, r) =>
          row.map((v, c) => {
            const i = r * DS_W + c;
            const cls = ['ds-cell'];
            let bg = v ? DS_SHAPES[v - 1].color : null;
            if (!v && hover.has(i)) { cls.push('hover'); bg = DS_SHAPES[shapeIdx].color; }
            else if (!v && ghost.has(i)) cls.push('ghost');
            return (
              <div
                key={i}
                className={cls.join(' ')}
                style={bg ? { background: bg } : (ghost.has(i) && !v ? { borderColor: DS_SHAPES[shapeIdx].color } : undefined)}
                onClick={() => setCol(Math.min(Math.max(c - Math.floor(shapeW / 2), 0), DS_W - shapeW))}
              />
            );
          })
        )}
      </div>
      <div className="ds-pad">
        <button className="p6-btn" onClick={() => setCol((c) => Math.max(c - 1, 0))}>◀</button>
        <button className="p6-btn" onClick={() => setRot((r) => r + 1)}>⟳ Rotate</button>
        <button className="p6-btn" onClick={() => setCol((c) => Math.min(c + 1, DS_W - 1))}>▶</button>
        <button className="p6-btn primary" onClick={drop}>⬇ Drop</button>
      </div>
      <div className="p6-hint">Line up each piece (tap the well or use ◀ ▶ ⟳), then Drop. Clear lines for points — top out and the day is lost.</div>
    </div>
  );
}

// Each entry also carries the Game Corner harness `manifest` (phase 2),
// mirrored by id in server.js's GAME_REGISTRY — machine-relevant fields
// (scoreDirection / tieBreak / sessionLength / input / undo) must match the
// server; `howToPlay` card copy lives ONLY here (display strings are the
// client's). Phase 3's shell-owned pre-game chrome renders these cards; until
// then they're declarative metadata.
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
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'free' },
    howToPlay: [
      { title: 'Fill the grid', body: 'Tap a cell, then pick a number 1–6. Every row, column, and 2×3 box must contain each number exactly once.' },
      { title: 'Change your mind freely', body: 'Tap a filled cell to overwrite it — wrong entries cost steps, not the game.' },
      { title: 'Score', body: 'Faster solves with fewer steps score higher. Everyone gets the same board today.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'drag', undo: 'none' },
    howToPlay: [
      { title: 'Find the words', body: 'Drag across the letter grid to select a word — horizontally, vertically, or diagonally, forwards or backwards.' },
      { title: 'Clear the list', body: 'Find every listed word to solve the puzzle. Stray drags count as steps, so aim carefully.' },
      { title: 'Score', body: 'Faster solves with fewer steps score higher. Everyone hunts the same grid today.' },
    ],
    component: WordHuntGame,
  },
  {
    id: 'cryptowordle',
    name: 'Crypto Wordle',
    icon: '🟩',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Solve a daily stack of crypto words — clues unlock as you go, or use a free hint.',
    tag: 'Web3',
    tagColor: C.emerald,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'keyboard', undo: 'none' },
    howToPlay: [
      { title: 'Guess the word', body: 'Type a guess and submit. Green = right letter, right spot; gold = right letter, wrong spot.' },
      { title: 'Work the stack', body: "Today's puzzle is a stack of crypto words — solve one to unlock the next. Clues unlock as you go, and free hints are capped per day." },
      { title: 'Careful', body: 'Run out of guesses on any word and the day is lost — the board locks until the next UTC reset.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Clear the field', body: 'Tap to reveal a cell; numbers tell you how many mines touch it. Long-press to flag suspected mines.' },
      { title: 'Cash out or push on', body: 'Cash Out early to bank a smaller multiplier, or keep clearing for a bigger score — one mine ends the run.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Sow your stones', body: 'Tap one of your pits to scoop its stones and drop them one-by-one counter-clockwise. Landing in your store banks a stone and earns another turn.' },
      { title: 'Capture', body: 'Land your last stone in an empty pit on your side to capture it plus everything opposite. Most stones banked when a side empties wins.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Roll and race', body: 'Tap to roll the die and move up the board. Ladders lift you ahead; chutes drop you back.' },
      { title: 'First to 100 wins', body: 'Play the bot, a hotseat friend, or online via room code. Win streaks climb the leaderboard.' },
    ],
    component: ChutesLaddersGame,
    modes: ['bot', '2p', 'online'],
    supportsSave: true,
    menuModePicker: true,
    leaderboard: true,
    leaderboardOpts: { valueLabel: 'Best Streak' },
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'long', input: 'swipe', undo: 'none' },
    howToPlay: [
      { title: 'Slide and merge', body: 'Swipe to slide every tile. Two matching tiles merge into their sum — chase 2048 and beyond.' },
      { title: "Don't jam the board", body: 'A new tile appears after every move. The run ends when no merges are left.' },
    ],
    component: T2048Game,
    modes: ['solo', 'online'],
    preLaunchModal: true,
    leaderboard: true,
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'free' },
    howToPlay: [
      { title: 'Tour the board', body: 'Move the knight in its L-shape to squares it has never visited. Visit all 64 exactly once for a full tour.' },
      { title: 'Undo freely', body: 'Stuck? Step back with Undo and try a different route — longer tours score higher.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'swipe', undo: 'none' },
    howToPlay: [
      { title: 'Steer the snake', body: 'Swipe (or use arrow keys) to change direction. Eat food to grow and score.' },
      { title: 'Stay alive', body: 'Hitting a wall or your own tail ends the run. Longer snakes and faster modes score more.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'drag', undo: 'none' },
    howToPlay: [
      { title: 'Place the pieces', body: 'Drag each offered block onto the grid anywhere it fits. Fill a full row or column to clear it.' },
      { title: 'Keep space open', body: 'The run ends when no offered piece fits. Multi-line clears and combos score big.' },
    ],
    component: BlockBlastGame,
    modes: ['solo', 'online'],
    preLaunchModal: true,
    leaderboard: true,
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Swap to match', body: 'Tap two adjacent gems to swap them. Line up 3 or more of a kind to clear them.' },
      { title: 'Chase cascades', body: 'Cleared gems drop new ones — chains cascade for bonus points. Hit the target score before time runs out.' },
    ],
    component: DiamondRushGame,
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'booster' },
    howToPlay: [
      { title: 'Pick free tiles', body: 'Tap any uncovered tile to move it into your 7-slot bar. Three of a kind in the bar clear automatically.' },
      { title: 'Mind the bar', body: 'If the bar fills with no match, the round is lost. Undo, shuffle, and clear-slot boosters are limited — spend them wisely.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'drag', undo: 'none' },
    howToPlay: [
      { title: 'Keep it up', body: 'Drag the paddle to keep the ball in play and smash every brick.' },
      { title: 'Clear the wall', body: 'Some bricks take multiple hits. Lose the ball and the run ends — full clears score best.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Shoot to match', body: 'Aim and tap to fire a colored ball into the moving chain. Three or more of a color clear.' },
      { title: 'Beat the chain', body: 'Clear the whole chain before it reaches the skull. Gaps and combos multiply your score.' },
    ],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'long', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Swap to match', body: 'Tap two adjacent pieces to swap. Match 3+ to clear them and rack up points.' },
      { title: 'Beat each level', body: 'Every level has a target score under move and time limits. 50 levels — progress saves as you go.' },
    ],
    component: Match3Game,
  },
  {
    id: 'hashrush',
    name: 'Hash Rush',
    icon: '⛏️',
    category: 'classic',
    shell: 'self',
    desc: 'Dodge invalid blocks, collect hash tokens — how long can your miner survive?',
    tag: 'Crypto',
    tagColor: C.gold,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'swipe', undo: 'none' },
    howToPlay: [
      { title: 'Dodge and collect', body: 'Steer your miner between lanes — grab hash tokens, dodge the invalid blocks.' },
      { title: 'Survive', body: 'The chain speeds up the longer you last. One collision ends the run.' },
    ],
    component: HashRushGame,
    leaderboard: true,
  },
  // Phase 5 board games — online head-to-head over classic_rooms; the server
  // referees every move (rules modules in lib/board-rules.js) and wins settle
  // on the rating ladder.
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '⛃',
    category: 'classic',
    shell: 'classic',
    desc: 'Classic draughts vs a friend online — jump, chain captures, crown your kings.',
    tag: 'Board',
    tagColor: C.accent,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'long', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Move diagonally', body: 'Tap your piece, then a dark square ahead of it. Jump over an adjacent enemy piece to capture it.' },
      { title: 'Chain your jumps', body: 'After a capture, the same piece may keep jumping while captures are available.' },
      { title: 'Crown kings', body: 'Reach the far row to crown a king — kings move and capture in all four diagonals. Take every enemy piece (or leave them no move) to win.' },
    ],
    component: CheckersGame,
    modes: ['online'],
  },
  {
    id: 'reversi',
    name: 'Reversi',
    icon: '⚫',
    category: 'classic',
    shell: 'classic',
    desc: 'Flip your way to a majority — outflank your opponent online.',
    tag: 'Board',
    tagColor: C.emerald,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Outflank to flip', body: 'Place a disc so a straight line of enemy discs is trapped between yours — they all flip to your color.' },
      { title: 'Every move must flip', body: 'You can only play cells that flip at least one disc. No legal move? Your turn passes automatically.' },
      { title: 'Majority wins', body: 'When neither player can move, the most discs on the board wins.' },
    ],
    component: ReversiGame,
    modes: ['online'],
  },
  {
    id: 'fourinarow',
    name: 'Four in a Row',
    icon: '🔴',
    category: 'classic',
    shell: 'classic',
    desc: 'Drop discs and line up four before your opponent does.',
    tag: 'Board',
    tagColor: C.rose,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Drop a disc', body: 'Tap a column — your disc falls to the lowest empty slot.' },
      { title: 'Line up four', body: 'Four of your discs in a row — across, down, or diagonally — wins. A full board with no line is a draw.' },
    ],
    component: FourInARowGame,
    modes: ['online'],
  },
  {
    id: 'gomoku',
    name: 'Gomoku',
    icon: '⚪',
    category: 'classic',
    shell: 'classic',
    desc: 'Five stones in a row on a 15×15 board — pure placement strategy.',
    tag: 'Board',
    tagColor: C.violet,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Take turns placing stones', body: 'Tap any empty intersection to place a stone. Stones never move once placed.' },
      { title: 'Five in a row wins', body: 'First to line up five (or more) stones — across, down, or diagonally — wins the game.' },
    ],
    component: GomokuGame,
    modes: ['online'],
  },
  {
    id: 'ludo',
    name: 'Ludo',
    icon: '🎲',
    category: 'classic',
    shell: 'classic',
    desc: 'Race all four tokens home — roll sixes, capture rivals, play it safe on the stars.',
    tag: 'Board',
    tagColor: C.gold,
    manifest: { scoreDirection: 'higher', tieBreak: 'first-to-score', sessionLength: 'long', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Roll, then move', body: 'Roll the die, then tap a highlighted token. You need a 6 to leave base — and a 6 earns another roll.' },
      { title: 'Capture and stay safe', body: "Land on an opponent's token to send it back to base. Star cells are safe — no captures there." },
      { title: 'Bring all four home', body: 'Race around the board into your home column. You need an exact roll to finish each token; first with all four home wins.' },
    ],
    component: LudoGame,
    modes: ['online'],
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
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'short', input: 'tap', undo: 'booster' },
    howToPlay: [
      { title: 'Pick free tiles', body: 'Tap any uncovered tile to move it into your 7-slot bar. Three of a kind clear automatically.' },
      { title: 'Beat the clock', body: 'Clear the whole layered board in 3 minutes. A full bar with no match loses the day.' },
      { title: 'Boosters', body: 'Undo, shuffle, and clear-slot are limited per day — everyone plays the same board, so spend them wisely.' },
    ],
    component: TileMatchingDailyGame,
  },
  // Phase 6 Lane A dailies — shared card/tile engine games. All daily,
  // shell 'daily', tier B server-side (see GAME_REGISTRY). Names follow the
  // spec's IP-hygiene rules: generic public-domain game names only.
  {
    id: 'klondike',
    name: 'Klondike Solitaire',
    icon: '🃏',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'The classic patience deal — everyone plays the same shuffle today.',
    tag: 'Cards',
    tagColor: C.accent,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Build down, alternate colors', body: 'Tap a face-up card, then its destination. Tableau piles build downward in alternating colors; only a King moves to an empty column.' },
      { title: 'Send cards home', body: 'Foundations build up by suit from Ace to King. Tap a selected top card again to auto-send it home. Tap the stock to draw; it recycles when empty.' },
      { title: 'Score', body: 'Fill all four foundations to win. Fewer moves and faster solves score higher — same deal for everyone today.' },
    ],
    component: KlondikeGame,
  },
  {
    id: 'spider',
    name: 'Spider Solitaire',
    icon: '🕷️',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'One-suit spider: build eight King-to-Ace runs to clear the board.',
    tag: 'Cards',
    tagColor: C.violet,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'long', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Move descending runs', body: 'Tap a face-up card to pick up it and the run below, then tap a column whose top card is one rank higher (or any empty column).' },
      { title: 'Complete runs', body: 'A full King-to-Ace run clears off the board. Clear eight runs to win. Deal a fresh row of ten from the stock when you\'re stuck.' },
      { title: 'Score', body: 'Fewer moves and faster clears score higher. Everyone gets the same 104-card deal today.' },
    ],
    component: SpiderGame,
  },
  {
    id: 'mahjongsol',
    name: 'Mahjong Solitaire',
    icon: '🎴',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Clear the layered tile pyramid by pairing free matching tiles.',
    tag: 'Tiles',
    tagColor: C.emerald,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'booster' },
    howToPlay: [
      { title: 'Pair free tiles', body: 'A tile is free when nothing rests on top of it and its left or right side is open. Tap two matching free tiles to clear them.' },
      { title: 'Plan your order', body: 'Today\'s deal is always solvable in at least one order — but a careless order can dead-end you. Two shuffles are your safety net.' },
      { title: 'Score', body: 'Clear all 60 tiles to win. Faster clears with unused shuffles score higher; run out of moves and shuffles and the day is lost.' },
    ],
    component: MahjongSolitaireGame,
  },
  {
    id: 'nonogram',
    name: 'Nonogram',
    icon: '🖼️',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Fill the 8×8 grid so every row and column matches its number clues.',
    tag: 'Logic',
    tagColor: C.accent,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'free' },
    howToPlay: [
      { title: 'Read the clues', body: 'Each number is a run of filled cells in that row or column, in order, with at least one gap between runs.' },
      { title: 'Fill and mark', body: 'Use ⬛ Fill for cells you\'re sure of and ✗ Mark for cells that must stay empty. Both toggle freely — mistakes cost steps, not the day.' },
      { title: 'Score', body: 'The puzzle solves when every clue is satisfied. Fewer taps and faster solves score higher.' },
    ],
    component: NonogramGame,
  },
  {
    id: 'minefinder',
    name: 'Mine Finder',
    icon: '🚩',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Sweep the daily minefield — one wrong tap ends the day.',
    tag: 'Risk',
    tagColor: C.rose,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Count the numbers', body: 'Each number counts the mines touching that cell. A safe opening area is revealed for you — work outward from it.' },
      { title: 'Flag suspects', body: 'Toggle 🚩 Flag mode to mark cells you believe are mines. Flagged cells can\'t be revealed by a stray tap.' },
      { title: 'Careful', body: 'Reveal all 71 safe cells to win. Tap a mine and the day is lost — everyone sweeps the same field today.' },
    ],
    component: MineFinderGame,
  },
  {
    id: 'anagrams',
    name: 'Anagram Sprint',
    icon: '🔀',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Unscramble five words back-to-back against the clock.',
    tag: 'Word',
    tagColor: C.gold,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'short', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Rebuild the word', body: 'Tap the scrambled letters in order to build your answer; tap a slot (or ⌫) to take a letter back.' },
      { title: 'Five in a row', body: 'Solve all five words — two 5-letter, two 6-letter, and one 7-letter. Wrong submissions cost tries, never the day.' },
      { title: 'Score', body: 'Fewer tries and faster sprints score higher. Everyone unscrambles the same five words today.' },
    ],
    component: AnagramsGame,
  },
  {
    id: 'cratepush',
    name: 'Crate Push',
    icon: '📦',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Push every crate onto a goal pad in today\'s warehouse.',
    tag: 'Puzzle',
    tagColor: C.emerald,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'free' },
    howToPlay: [
      { title: 'Push, never pull', body: 'Move with the arrows (or arrow keys). Walking into a crate pushes it one cell — you can\'t pull, and you can\'t push two at once.' },
      { title: 'Don\'t get cornered', body: 'A crate shoved against a wall corner may be stuck for good. Undo steps back freely, or Restart the room.' },
      { title: 'Score', body: 'Park every crate on a green pad to win. Fewer moves and faster solves score higher.' },
    ],
    component: CratePushGame,
  },
  {
    id: 'dropstack',
    name: 'Drop Stack',
    icon: '🧊',
    category: 'daily',
    shell: 'daily',
    daily: true,
    desc: 'Place today\'s fixed sequence of 40 falling pieces without topping out.',
    tag: 'Puzzle',
    tagColor: C.violet,
    manifest: { scoreDirection: 'higher', tieBreak: 'time-then-steps', sessionLength: 'medium', input: 'tap', undo: 'none' },
    howToPlay: [
      { title: 'Line up, then drop', body: 'Move the hovering piece with ◀ ▶ (or tap the well), rotate with ⟳, then hit Drop. Pieces fall instantly — no timer pressure.' },
      { title: 'Clear lines', body: 'Complete a full row to clear it: 100 points for one line, up to 700 for four at once.' },
      { title: 'Survive the sequence', body: 'Everyone gets the same 40-piece order today. Place them all to win; stack past the top and the day is lost.' },
    ],
    component: DropStackGame,
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
    // Pause background polling while a post is open — no reason to refetch
    // the whole feed list behind a detail view the user is actively reading.
    if (selectedPostId) return;
    const id = setInterval(loadFeed, 10000);
    return () => clearInterval(id);
  }, [selectedPostId]);

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
// Next-milestone progress hints so a player who finished today sees concrete
// progress even when no badge unlocked this run (e.g. "🔥 2/3 days → On Fire",
// "7/10 solves → Solver"). Each is the nearest UNEARNED milestone of its kind.
function badgeProgressHints(streak, solveCount) {
  const hints = [];
  const ns = nextStreakBadge(streak);
  if (ns) hints.push({ key: 'streak', icon: '🔥', text: `${streak}/${ns.min} days → ${ns.name}` });
  const nm = nextSolveMilestone(solveCount);
  if (nm) hints.push({ key: 'solve', icon: nm.icon, text: `${solveCount || 0}/${nm.count} solves → ${nm.name}` });
  return hints;
}

// Lobby Badges panel — renders the SAME permanent collection as the profile's
// BadgeStrip (streak milestones + non-streak achievements + solve milestones),
// fed by the server-backed `badges`/`achievements` state already loaded from
// /api/daily. Earned badges stay lit forever (they come from persisted
// user_achievements rows, not the live streak/today's attempts), so the lobby
// and profile now show identical earned/locked states.
//
// Discoverability: a header with the earned count is always visible; on mobile
// a compact always-visible row of EARNED chips shows when collapsed (so a
// player sees their badges without expanding), and the toggle reveals the full
// dimmed collection. An empty-state line + next-milestone progress hints make
// it clear how to earn the next one.
function BadgesSection({ badges, achievements, streak, solveCount, open, onToggle }) {
  const chips = badgeChips(badges, achievements);
  const earnedCount = chips.filter(c => c.earned).length;
  const earnedChips = chips.filter(c => c.earned);
  const hints = badgeProgressHints(streak || 0, solveCount || 0);
  return (
    <div className="badges-section">
      <button className="badges-toggle" onClick={onToggle}>
        Badges
        <span className="badge-strip-count mono">{earnedCount} / {chips.length}</span>
        <span className="badges-toggle-arrow">{open ? '▾' : '▸'}</span>
      </button>
      {earnedCount === 0 && (
        <div className="badges-empty">Solve a daily puzzle to earn your first badge.</div>
      )}
      {hints.length > 0 && (
        <div className="badge-progress">
          {hints.map(h => (
            <span key={h.key} className="badge-progress-pill">
              <span>{h.icon}</span> {h.text}
            </span>
          ))}
        </div>
      )}
      {/* Mobile-only compact strip of earned badges, shown while collapsed. */}
      {earnedCount > 0 && (
        <div className={'badges-earned-row' + (open ? ' hide' : '')}>
          {earnedChips.map(c => (
            <div key={c.key} className="badge-chip" title={`${c.name} — ${c.sub}`}>
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className={'badges-grid' + (open ? ' open' : '')}>
        {chips.map(c => (
          <div
            key={c.key}
            className={'badge-chip' + (c.earned ? '' : ' dim')}
            title={`${c.name}${c.earned ? '' : ' (locked)'} — ${c.sub}`}
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Lightweight placeholder shown in the lobby badge slot when the real panel
// can't load (signed out, or the backend was briefly unreachable). Keeps the
// "Badges" header so the slot is recognizable, and explains the empty space
// instead of leaving an unexplained blank gap. `state` is 'signedout' | 'error';
// the 'error' case offers a retry that re-runs the daily load.
function BadgesPlaceholder({ state, onRetry }) {
  const isError = state === 'error';
  return (
    <div className="badges-section">
      <div className="badges-toggle" style={{ cursor: 'default' }}>Badges</div>
      <div className="badges-empty">
        {isError
          ? 'Couldn’t load your badges.'
          : 'Sign in to track your badges.'}
        {isError && onRetry && (
          <>
            {' '}
            <button type="button" className="badges-retry-btn" onClick={onRetry}>Retry</button>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState(() => {
    // Support ?screen=account / ?screen=session deep links for testing
    const params = new URLSearchParams(window.location.search);
    const s = params.get('screen');
    if (s === 'account') return 'account';
    if (s === 'session' || params.get('demo') === 'dapp' || params.get('demo') === 'anchor') return 'session';
    return 'lobby';
  }); // 'lobby' | 'game' | 'locked' | 'profile' | 'friends' | 'account' | 'session'
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
  // Lifetime won-solve count (server-computed), used to drive the
  // "X/Y solves → Solver" next-milestone progress hint.
  const [solveCount, setSolveCount] = useState(0);
  // Outcome of the last /api/daily load, used to explain an empty badge slot:
  // 'ok' (real panel renders), 'signedout' (401 — no/expired token), or
  // 'error' (5xx / network — backend unreachable, offer retry).
  const [badgeLoadState, setBadgeLoadState] = useState('ok');
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
  // Lobby view (phase 7 home reorg): 'home' is the single scrolling home
  // (GotD hero → in-progress → all games); 'feed' and 'ladder' are the two
  // remaining sub-screens. Legacy ?tab=daily/classic deep links land on home.
  const [lobbyTab, setLobbyTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'feed' ? 'feed' : t === 'ladder' ? 'ladder' : 'home';
  });
  // Game of the Day (phase 7): { date, gameId, seed } from daily_featured.
  const [featured, setFeatured] = useState(null);
  // The viewer's active online matches (your-turn row), from /api/rooms/mine.
  const [myRooms, setMyRooms] = useState([]);
  // Game whose public chat room is open (null = closed).
  const [chatGame, setChatGame] = useState(null);
  // Incremented to trigger MinesweeperGame reset on Play Again
  const [playAgainKey, setPlayAgainKey] = useState(0);
  // Classic Games — Game Menu state. `classicGameMode` is the active mode of
  // the current classic game ('bot' | '2p' | 'online' | null); `classicLastResult`
  // is the most recent finished classic result so the menu's Post to Feed works
  // even after Play Again.
  const [classicGameMode, setClassicGameMode] = useState(null);
  const [classicGameModeOpts, setClassicGameModeOpts] = useState(null);
  const [classicLastResult, setClassicLastResult] = useState(null);
  // Pre-launch game-mode modal (multi-mode classic games, e.g. 2048 / Block Blast)
  const [preLaunchGame, setPreLaunchGame] = useState(null);
  // Shell-owned chrome (phase 3): all-time personal bests per daily game
  // (from /api/daily), and the game whose How-to-Play modal is open (null =
  // closed). The modal renders above every screen/shell.
  const [bests, setBests] = useState({});
  const [howToGame, setHowToGame] = useState(null);
  // Social: profile viewing and friends list
  const [selectedUserId, setSelectedUserId] = useState(null);
  // Wallet identity state (linked/verified address shown on the Account screen)
  const [walletAddr, setWalletAddr] = useState(null);
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

  // Per-run daily move log (phase 2). Every daily game feeds move events with
  // client timestamps into this ref — the Daily Tile Match via its native
  // onMoveTile (engine-shaped { tileType } moves, replay-eligible), the other
  // dailies via their onStepChange calls (timestamp-only events for the
  // server's tier-B timing heuristics). `replayOk` goes false when the run
  // can't be fully replayed server-side: a resume (earlier moves predate this
  // mount) or a booster (not modeled by the replay engine). Submitted with
  // /finish; reset by launchGame so a retry re-sends the same log.
  const dailyRunLog = useRef({ moves: [], replayOk: true });
  const recordDailyMove = (m) => {
    const log = dailyRunLog.current;
    if (m && m.replayBreak) log.replayOk = false;
    if (log.moves.length < 800) {
      log.moves.push({ ...m, tsClient: m && m.tsClient != null ? m.tsClient : Date.now() });
    }
  };

  // Hydrate today's locked/result state from the server on mount, and
  // recompute the score from finished attempts so it survives reloads.
  const loadDaily = async () => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const path = '/api/daily' + (demo ? `?demo=${encodeURIComponent(demo)}` : '');
    const { ok, status, body } = await api(path);
    if (ok && body) {
      setBadgeLoadState('ok');
      setAuthOk(true);
      setUser(body.user || null);
      setAttempts(body.attempts || {});
      setNextResetUtc(body.nextResetUtc);
      setStreak(typeof body.streak === 'number' ? body.streak : 0);
      setSolveCount(Number.isFinite(body.solveCount) ? body.solveCount : 0);
      setBadges(Array.isArray(body.badges) ? body.badges : []);
      setAchievements(body.achievements && Array.isArray(body.achievements.types)
        ? { types: body.achievements.types, milestones: body.achievements.milestones || [] }
        : { types: [], milestones: [] });
      // Server-issued daily seeds — must land before any daily game mounts
      // (they do: games launch from the lobby, which renders after loading).
      SERVER_DAILY_SEEDS = body.seeds || {};
      setBests(body.bests || {});
      setFeatured(body.featured || null);
      setOffset(new Date(body.serverNowUtc).getTime() - Date.now());
      const sum = Object.values(body.attempts || {})
        .reduce((acc, a) => acc + (a.score || 0), 0);
      setTotalScore(sum);
    } else {
      // 401 (no/expired token) or 5xx (DB down): can't confirm the account,
      // so persistence isn't guaranteed — reflect that in the nav.
      // Distinguish "signed out" (401) from a transient backend failure so the
      // badge slot can explain the empty space instead of rendering nothing.
      setBadgeLoadState(status === 401 ? 'signedout' : 'error');
      setAuthOk(false);
      setUser(null);
      setStreak(0);
      setSolveCount(0);
      setBadges([]);
      setAchievements({ types: [], milestones: [] });
      // Signed-out (or backend hiccup): the public read surface still supplies
      // server time, the reset countdown, and today's board seeds, so the
      // signed-out lobby stays anchored to server time.
      try {
        const pub = await api('/api/public/daily');
        if (pub.ok && pub.body) {
          SERVER_DAILY_SEEDS = pub.body.seeds || {};
          if (pub.body.nextResetUtc) setNextResetUtc(pub.body.nextResetUtc);
          if (pub.body.serverNowUtc) setOffset(new Date(pub.body.serverNowUtc).getTime() - Date.now());
          if (pub.body.featured) setFeatured(pub.body.featured);
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, []);

  // Home in-progress row (phase 7): the viewer's active online matches.
  // Refetched on every return to the lobby so a just-made move updates the
  // your-turn flag without waiting for a reload.
  useEffect(() => {
    if (loading || !authOk || screen !== 'lobby') return;
    api('/api/rooms/mine')
      .then(({ ok, body }) => { if (ok && body) setMyRooms(body.rooms || []); })
      .catch(() => {});
  }, [loading, authOk, screen]);

  // ?chat=<gameId> deep link opens that game's chat room once the daily load
  // (and any ?demo= fixture seeding inside it) has settled. Proposal tests use
  // it; it's also a handy share target.
  useEffect(() => {
    if (loading) return;
    const cid = new URLSearchParams(window.location.search).get('chat');
    if (!cid) return;
    const g = GAMES.find((x) => x.id === cid);
    if (g) setChatGame(g);
  }, [loading]);

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

  // Midnight UTC reached — reload state so everything unlocks.
  const onReset = () => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    loadDaily();
  };

  // Opening a game lands on the shell-owned PRE-GAME screen (phase 3) — the
  // day's attempt is only claimed when the player hits Play (startDailyRun),
  // so browsing the pre-game screen never burns the attempt. The How-to-Play
  // cards auto-open on a player's first-ever open of each game; because timed
  // dailies only mount (and start their clock) after Play, the auto-shown
  // how-to can never eat into the timer.
  const launchGame = (game) => {
    if (!game.daily) {
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
      // Classic games mount immediately, so the first-open how-to overlays
      // the running game (none of the in-scope classics are hard-timed).
      if (game.howToPlay && game.howToPlay.length && !howtoSeen(game.id)) setHowToGame(game);
      return;
    }
    const existing = attempts[game.id];
    if (existing && existing.finishedAt) {
      // Finished today — straight to the locked screen.
      setCurrentGame(game);
      setScreen('locked');
      return;
    }
    setCurrentGame(game);
    setWinData(null);
    setLoseData(null);
    setScreen('pregame');
    if (game.howToPlay && game.howToPlay.length && !howtoSeen(game.id)) setHowToGame(game);
  };

  // Claim (or resume) the day's single attempt and mount the game. Extracted
  // from launchGame so the pre-game screen's Play button owns consume-on-start.
  const startDailyRun = async (game) => {
    const existing = attempts[game.id];
    if (existing) {
      if (existing.finishedAt) {
        setCurrentGame(game);
        setScreen('locked');
      } else {
        // Claimed but unfinished — resume into the saved board state. The row
        // is already claimed, so do NOT call /start again. A resumed run's
        // earlier moves predate this page load, so its finish can't be
        // replay-validated (server falls back to tier-B heuristics).
        dailyRunLog.current = { moves: [], replayOk: false };
        setCurrentGame(game);
        setStepCount(existing.steps || 0);
        setWinData(null);
        setLoseData(null);
        setScreen('game');
      }
      return;
    }
    const { ok, status, body } = await api(`/api/daily/${game.id}/start`, { method: 'POST' });
    // Merge the seed issued with the claim — covers a client that sat on the
    // lobby across the UTC reset, whose mount-time seeds are yesterday's.
    if (body && Number.isFinite(body.seed)) SERVER_DAILY_SEEDS[game.id] = body.seed;
    if (ok) {
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      dailyRunLog.current = { moves: [], replayOk: true };
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
      dailyRunLog.current = { moves: [], replayOk: false };
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
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('game');
    if (!gid) return;
    const g = GAMES.find(x => x.id === gid);
    if (!g) return;
    deepLinkedRef.current = true;
    const mmode = params.get('mmode');
    // Multi-mode classic games open the pre-launch modal unless a mode is
    // pinned via ?mmode= (then launch straight into it).
    if (g.preLaunchModal && !mmode) { setPreLaunchGame(g); return; }
    if (g.preLaunchModal && mmode) { setClassicGameMode(mmode); }
    // ?play=1 skips the pre-game screen (and the first-open how-to) and
    // claims/mounts immediately — used by proposal tests that assert on
    // in-game UI, and by "jump straight in" share links.
    if (params.get('play') === '1') {
      if (g.daily) { startDailyRun(g); return; }
      launchGame(g);
      setHowToGame(null); // suppress the classic first-open auto-show too
      return;
    }
    launchGame(g);
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
      // Attach the per-run move log (phase 2): engine-shaped moves make the
      // finish replay-validatable (tier A); timestamp-only events feed the
      // server's tier-B timing heuristics. The ref survives until the next
      // launchGame, so the overlay's retry re-sends the identical log.
      const log = dailyRunLog.current;
      const moves = log.moves.slice(0, 800);
      const res = await api(`/api/daily/${gameId}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          score: finalScore, steps, timeSecs,
          moves,
          replay: log.replayOk && moves.some(m => Number.isInteger(m.tileType)),
        }),
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
      if (body && Number.isFinite(body.solveCount)) setSolveCount(body.solveCount);
      const newAch = (body && Array.isArray(body.newAchievements)) ? body.newAchievements : [];
      if (newAch.length) {
        setAchievements(prev => mergeAchievements(prev, newAch));
        // Reflect any server-confirmed streak milestones in the permanent
        // `badges` state too (their day thresholds), so the lobby's streak
        // chips light immediately even if the client's optimistic streak math
        // missed the exact tier.
        const streakDays = newAch
          .filter(a => a && a.type === 'streak_milestone' && a.metadata && Number.isFinite(+a.metadata.streak))
          .map(a => +a.metadata.streak);
        if (streakDays.length) {
          setBadges(prev => Array.from(new Set([...prev, ...streakDays])).sort((a, b) => a - b));
        }
      }
      setWinData(prev => {
        if (!prev) return prev;
        // De-dup the win overlay: the client-side fast-path already shows
        // `justBadge` for the streak tier this win landed on. Pick the first
        // NEW achievement that isn't that same streak badge so we never show
        // one badge twice. If the only new achievement IS the streak badge the
        // fast-path missed (stale client streak), this surfaces it as the
        // server backstop.
        const shownMin = prev.justBadge && prev.justBadge.min;
        const firstNew = newAch.find(a => {
          if (a && a.type === 'streak_milestone') return +(a.metadata && a.metadata.streak) !== shownMin;
          return true;
        });
        return {
          ...prev,
          syncError: false,
          newAchievements: newAch,
          justAchievement: firstNew ? achievementBadgeFor(firstNew) : prev.justAchievement,
        };
      });
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
      // Personal-best comparison for the end screen (phase 3), captured BEFORE
      // merging this win into the bests map.
      const prevBest = bests[gameId] && Number.isFinite(bests[gameId].score) ? bests[gameId].score : null;
      setBests(prev => {
        const cur = prev[gameId] || {};
        return {
          ...prev,
          [gameId]: {
            score: cur.score != null ? Math.max(cur.score, finalScore) : finalScore,
            timeSecs: cur.timeSecs != null && timeSecs != null ? Math.min(cur.timeSecs, timeSecs) : (cur.timeSecs != null ? cur.timeSecs : timeSecs),
          },
        };
      });
      // A badge unlocked the moment this win's streak lands exactly on a tier.
      const unlocked = justUnlockedBadge(effectiveStreak);
      if (unlocked) {
        setBadges(prev => (prev.includes(unlocked.min) ? prev : [...prev, unlocked.min].sort((a, b) => a - b)));
      }
      // Show the celebration overlay immediately — independent of the network
      // call below, so the player always gets a clear "Solved!" confirmation.
      setWinData({
        score, bonus, finalScore, steps, timeSecs, multiplier, effectiveStreak,
        prevBest,
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
    setPreLaunchGame(null);
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
  // the generic user_game_state store.
  const handleSaveGame = async () => {
    if (!currentGame) return { ok: false };
    const snap = ClassicBridge.getSnapshot ? ClassicBridge.getSnapshot() : null;
    if (!snap) return { ok: false };
    const { ok } = await api(`/api/state/${currentGame.id}`, {
      method: 'PUT',
      body: JSON.stringify({ state: { mode: 'bot', savedAt: Date.now(), ...snap } }),
    }).catch(() => ({ ok: false }));
    return { ok: !!ok };
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
      case 'classic': {
        // In-frame classic game wrapped in the shared ClassicShell.
        const classicSections = currentGame.leaderboard
          ? [cgLeaderboardSection(currentGame.id, currentGame.leaderboardOpts)]
          : [];
        return (
          <ClassicShell
            game={currentGame}
            onExit={() => backToLobby('classic')}
            onNewGame={() => setPlayAgainKey(k => k + 1)}
            menuConfig={classicMenuConfig}
            sheetSections={classicSections}
            onHowTo={currentGame.howToPlay && currentGame.howToPlay.length > 0
              ? () => setHowToGame(currentGame) : undefined}
            onChat={authOk ? () => setChatGame(currentGame) : undefined}
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
                onBack={() => backToLobby('classic')}
              />
            </div>
          </ClassicShell>
        );
      }
      case 'daily':
      default: {
        // Daily puzzle (and any back-header game-wrap game): resumable, locked.
        // The Daily Tile Match reports its own engine-shaped moves through
        // onMoveTile; the other dailies get their onStepChange calls recorded
        // as timestamp-only events (recording BOTH for the tile match would
        // double every tap in the log and skew the timing heuristics).
        const logsOwnMoves = currentGame.id === 'tilematchingdaily';
        return (
          <div className="game-wrap">
            <div className="game-head">
              <button className="back-btn" onClick={backToLobby}>← Back</button>
              <div className="game-title">
                <span>{currentGame.icon}</span> {currentGame.name}
              </div>
              {authOk && (
                <button
                  className="help-btn"
                  title="Game chat"
                  aria-label="Game chat"
                  onClick={() => setChatGame(currentGame)}
                >💬</button>
              )}
              {currentGame.howToPlay && currentGame.howToPlay.length > 0 && (
                <button
                  className="help-btn"
                  title="How to play"
                  aria-label="How to play"
                  onClick={() => setHowToGame(currentGame)}
                >?</button>
              )}
            </div>
            <GameComponent
              onWin={handleWin}
              onLose={handleLose}
              onStepChange={logsOwnMoves ? setStepCount : (n) => {
                recordDailyMove({ k: 'step' });
                setStepCount(n);
              }}
              onMoveTile={logsOwnMoves ? recordDailyMove : undefined}
              offset={offset}
              savedProgress={progressFor(attempts[currentGame.id])}
              onSaveProgress={handleSaveProgress}
              resetKey={playAgainKey}
            />
          </div>
        );
      }
    }
  };

  // Reward level surfaced in the nav + lobby. Suppressed when signed out so we
  // never show a multiplier the server can't back.
  const activeMult = authOk ? streakMultiplier(streak) : 1;
  const tierAhead = authOk && streak > 0 ? nextTierInfo(streak) : null;

  // Phase 7 home derivations. featuredGame resolves the server's daily_featured
  // row against the client registry; inProgressItems merges resumable daily
  // runs with the viewer's active online matches for the in-progress row.
  const featuredGame = featured ? GAMES.find((g) => g.id === featured.gameId) : null;
  const inProgressItems = [
    ...GAMES.filter((g) => g.daily && attempts[g.id] && !attempts[g.id].finishedAt)
      .map((g) => ({ type: 'daily', game: g })),
    ...myRooms
      .map((r) => ({ type: 'room', room: r, game: GAMES.find((g) => g.id === r.gameId) }))
      .filter((x) => x.game),
  ];
  // Re-enter an active online match from the in-progress row: pre-seat the
  // player (roomId + seat number) through the classic game-mode opts so
  // BoardRoomGame / Chutes & Ladders skip the create/join setup screen.
  const resumeRoom = (room) => {
    const g = GAMES.find((x) => x.id === room.gameId);
    if (!g || loading) return;
    setClassicGameMode('online');
    setClassicGameModeOpts({ roomId: room.id, myPlayerNum: room.myPlayerNum });
    launchGame(g);
  };

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
          onOpenReceipt={openReceipt}
        />
      )}

      {screen === 'lobby' && (
        <div className="lobby">
          {lobbyTab === 'feed' ? (
            <React.Fragment>
              <button className="home-back-btn" onClick={() => setLobbyTab('home')}>← Home</button>
              <div className="lobby-head">
                <h1>Community Feed</h1>
                <p>See what your friends have been playing</p>
              </div>
              <FeedScreen user={user} setScreen={setScreen} />
            </React.Fragment>
          ) : lobbyTab === 'ladder' ? (
            <React.Fragment>
              <button className="home-back-btn" onClick={() => setLobbyTab('home')}>← Home</button>
              <div className="lobby-head">
                <h1>Rating Ladder</h1>
                <p>Head-to-head Elo — win online matches to climb.</p>
              </div>
              {/* Gated on !loading so a ?demo=ladder fixture (seeded inside
                  loadDaily's /api/daily call) lands before the ladder fetches. */}
              {!loading && <LadderScreen />}
            </React.Fragment>
          ) : (
            /* Phase 7 home: GotD hero → in-progress row → all-games grid.
               The old three-tab lobby is retired; Feed and Ladder are now
               screens behind the quick links below. */
            <React.Fragment>
              <div className="lobby-head">
                <h1>Game Corner</h1>
                <p>One shared board per game, per day. Resets at midnight UTC.</p>
                {authOk && streak > 0 && (
                  <p className="lobby-hint">
                    🔥 {streak}-day streak · {tierAhead
                      ? `${tierAhead.daysAway} more daily win${tierAhead.daysAway === 1 ? '' : 's'} → ×${tierAhead.mult} points`
                      : `max ×${activeMult} multiplier active`}
                  </p>
                )}
              </div>
              {featuredGame ? (
                <GotdHero
                  game={featuredGame}
                  attempt={attempts[featuredGame.id]}
                  authOk={authOk}
                  nextResetUtc={nextResetUtc}
                  offset={offset}
                  onReset={onReset}
                  onPlay={() => { if (!loading) launchGame(featuredGame); }}
                />
              ) : nextResetUtc ? (
                <p className="reset-countdown mono">
                  Next puzzle in {fmtHoursMins(
                    new Date(nextResetUtc).getTime() - (Date.now() + offset))}
                </p>
              ) : null}
              {authOk && (
                <InProgressRow
                  items={inProgressItems}
                  onOpenDaily={(g) => { if (!loading) launchGame(g); }}
                  onOpenRoom={resumeRoom}
                />
              )}
              <div className="home-links">
                <button className="home-link-btn" onClick={() => setLobbyTab('ladder')}>🏆 Ladder</button>
                {authOk && <button className="home-link-btn" onClick={() => setLobbyTab('feed')}>📣 Feed</button>}
              </div>
              {authOk ? (
                (() => {
                  // Persistent, collapsible badge panel (unchanged from the
                  // tabbed lobby) — union of permanently earned streak badges
                  // and any the LIVE streak now satisfies.
                  const earnedDays = Array.from(new Set([...badges, ...streakBadges(streak).map(b => b.min)]));
                  return (
                    <BadgesSection
                      badges={earnedDays}
                      achievements={achievements}
                      streak={streak}
                      solveCount={solveCount}
                      open={badgesOpen}
                      onToggle={() => setBadgesOpen(b => !b)}
                    />
                  );
                })()
              ) : (
                <BadgesPlaceholder state={badgeLoadState} onRetry={loadDaily} />
              )}
              {(() => {
                const gameCard = (g) => {
                  // Only daily games carry the per-day finished/in-progress lock state.
                  const a = attempts[g.id];
                  const finished = !!g.daily && !!(a && a.finishedAt);
                  const inProgress = !!g.daily && !!a && !finished;
                  return (
                    <div
                      key={g.id}
                      className={`card${finished ? ' done locked' : ''}${inProgress ? ' inprogress' : ''}`}
                      style={{ '--accent': g.tagColor }}
                      onClick={() => {
                        if (loading) return;
                        if (g.preLaunchModal) { setPreLaunchGame(g); return; }
                        launchGame(g);
                      }}
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
                };
                return (
                  <React.Fragment>
                    <div className="home-section-title">Daily Puzzles</div>
                    <div className="grid">{GAMES.filter(g => g.category === 'daily').map(gameCard)}</div>
                    <div className="home-section-title">Classic Games</div>
                    <div className="grid">{GAMES.filter(g => g.category === 'classic').map(gameCard)}</div>
                  </React.Fragment>
                );
              })()}
              {authOk && !loading && (
                <TodayChampions
                  onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
                />
              )}
            </React.Fragment>
          )}
        </div>
      )}

      {screen === 'pregame' && currentGame && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={backToLobby}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <PreGameScreen
            game={currentGame}
            attempt={attempts[currentGame.id]}
            best={bests[currentGame.id]}
            streak={streak}
            authOk={authOk}
            nextResetUtc={nextResetUtc}
            offset={offset}
            onReset={onReset}
            onPlay={() => startDailyRun(currentGame)}
            onHowTo={() => setHowToGame(currentGame)}
            onChat={authOk ? () => setChatGame(currentGame) : undefined}
          />
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

      {preLaunchGame && (
        <GameModeModal
          game={preLaunchGame}
          onClose={() => setPreLaunchGame(null)}
          onStart={(mode, opts) => {
            const g = preLaunchGame;
            setPreLaunchGame(null);
            setClassicGameMode(mode === 'solo' ? null : mode);
            setClassicGameModeOpts(opts || null);
            launchGame(g);
          }}
        />
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
              {!winData.isClassic && winData.prevBest !== undefined && (
                winData.prevBest == null || winData.finalScore > winData.prevBest ? (
                  <div className="score-row bonus">
                    <span className="k">🏅 New personal best!</span>
                    <span className="v mono">+{winData.finalScore}</span>
                  </div>
                ) : (
                  <div className="score-row">
                    <span className="k">Personal best</span>
                    <span className="v mono">+{winData.prevBest}</span>
                  </div>
                )
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
            {!winData.isClassic && (() => {
              // Next-milestone progress so every solve shows forward motion even
              // when nothing unlocked this run. Streak progress is based on the
              // streak this win landed in; solve progress on the lifetime count.
              const hints = badgeProgressHints(winData.effectiveStreak || 0, solveCount);
              if (!hints.length) return null;
              return (
                <div className="win-progress">
                  {hints.map(h => (
                    <span key={h.key} className="badge-progress-pill">
                      <span>{h.icon}</span> {h.text}
                    </span>
                  ))}
                </div>
              );
            })()}
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
            {shareModal.posted ? (
              <>
                <div className="trophy">✅</div>
                <h2>Shared!</h2>
                <div className="sub">Your result is live in the Community Feed.</div>
                <button
                  className="primary-btn"
                  onClick={() => { setShareModal({ show: false, caption: '' }); backToLobby(); }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
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
                    // Land on a "Shared!" confirmation the player dismisses themselves,
                    // instead of silently closing the modal and auto-navigating away.
                    if (ok) setShareModal(prev => ({ ...prev, posted: true }));
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
              </>
            )}
          </div>
        </div>
      )}

      {chatGame && (
        <ChatPanel
          game={chatGame}
          user={user}
          onClose={() => setChatGame(null)}
        />
      )}

      {howToGame && (
        <HowToPlayModal
          game={howToGame}
          onClose={() => { markHowtoSeen(howToGame.id); setHowToGame(null); }}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
// Signal to the boot-shell watchdog (index.html) that React has mounted, so
// it clears the "taking longer than usual" timer and never flashes the card.
window.__puzzlechainMounted = true;
