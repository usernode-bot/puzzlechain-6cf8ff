/* ============================================================
   #146 — dual-mode pairing (CLIENT-ONLY, purely presentational)
   ============================================================
   Five games exist in BOTH an endless free-play form and a once-a-day form,
   and until now each pair took two near-duplicate cards on the home grid —
   with nothing on either card saying the other existed. Worse: finishing
   today's daily dimmed its card to 55% and printed "🔒 … resets in", which
   reads as "this whole game is gone until tomorrow" even though the endless
   version was sitting right there under a different name.

   This table merges each pair into ONE card with two buttons. It is
   deliberately NOT a field on the GAMES entries: GAMES is kept in sync with
   server.js's GAME_REGISTRY by id/category/manifest, and nothing about this
   merge is server-visible. Every route, seed, lock, leaderboard and streak
   still keys off the real registry ids below.

   Shape: { key, name, icon, tag, tagColor, desc, regular, daily }, where each
   mode descriptor is { gameId, label, caption }. `daily.startMode` marks the
   Mancala form — its Daily Challenge is an in-component mode backed by its own
   /api/mancala/daily routes, NOT a daily_attempts row, so that card gets no
   played/resume badge (its own screen shows the lock state on open).
   ============================================================ */
const GAME_PAIRS = [
  {
    key: 'pair:tilematch',
    name: 'Tile Match Puzzle',
    icon: '🀄',
    tag: 'Puzzle',
    tagColor: GA.violet,
    desc: 'Clear layered tile boards into a 7-slot tray — three of a kind clears.',
    regular: {
      gameId: 'tilematching',
      label: 'Free Play',
      caption: 'Endless',
    },
    daily: {
      gameId: 'tilematchingdaily',
      label: 'Daily',
      caption: 'One try',
    },
  },
  {
    key: 'pair:minefinder',
    name: 'Mine Finder',
    icon: '💣',
    tag: 'Risk',
    tagColor: GA.coral,
    desc: 'Sweep a minefield using the numbers — one wrong tap ends the run.',
    regular: {
      gameId: 'minesweeper',
      label: 'Free Play',
      caption: '8×8, Lock In',
    },
    daily: {
      gameId: 'minefinder',
      label: 'Daily',
      caption: 'One run',
    },
  },
  {
    key: 'pair:snake',
    name: 'Snake',
    icon: '🐍',
    tag: 'Arcade',
    tagColor: GA.lime,
    desc: "Steer, eat, grow — don't hit a wall or your own tail.",
    regular: {
      gameId: 'snake',
      label: 'Free Play',
      caption: 'Any speed',
    },
    daily: {
      gameId: 'snakedaily',
      label: 'Daily',
      caption: '20 apples',
    },
  },
  {
    key: 'pair:bounce',
    name: 'Bounce',
    icon: '🧱',
    tag: 'Arcade',
    tagColor: GA.coral,
    desc: 'Smash every brick with a bouncing ball.',
    regular: {
      gameId: 'bounce',
      label: 'Free Play',
      caption: 'High score',
    },
    daily: {
      gameId: 'bouncedaily',
      label: 'Daily',
      caption: '3 balls',
    },
  },
  {
    key: 'pair:mancala',
    name: 'Mancala',
    icon: '🫘',
    tag: 'Strategy',
    tagColor: GA.amber,
    desc: 'Classic stone-pit strategy. Outsmart your opponent by capturing more stones.',
    regular: {
      gameId: 'mancala',
      label: 'Play',
      caption: 'Bot or 2P',
    },
    daily: {
      gameId: 'mancala',
      startMode: 'daily',
      label: 'Daily',
      caption: 'One a day',
    },
  },
];

// id → pair lookups for the grid walk. The Mancala pair appears in the regular
// map only (both its halves are the same registry entry).
const PAIR_BY_REGULAR_ID = {};
const PAIR_BY_DAILY_ID = {};
for (const p of GAME_PAIRS) {
  PAIR_BY_REGULAR_ID[p.regular.gameId] = p;
  if (!p.daily.startMode) PAIR_BY_DAILY_ID[p.daily.gameId] = p;
}

/* One merged lobby card: shared identity, then a button per mode. The card is
   NEVER given .done/.locked/.inprogress — only the daily button carries the
   per-day state, which is the entire point of the merge. */
function PairedGameCard({ pair, attempts, nextResetUtc, offset, loading, onPlayRegular, onPlayDaily }) {
  // Mancala's daily lives outside daily_attempts, so it has no card state.
  const a = pair.daily.startMode ? null : attempts[pair.daily.gameId];
  const finished = !!(a && a.finishedAt);
  const inProgress = !!a && !finished;
  const dailyState = finished ? 'played' : inProgress ? 'resume' : 'fresh';
  // #167 — these read inside HALF a card now (the two mode buttons sit side by
  // side), so the dynamic strings are kept as short as the static GAME_PAIRS
  // copy. The corner badge already spells out PLAYED / RESUME in full.
  const dailyLabel = finished
    ? `✓ +${a.score != null ? a.score : 0} pts`
    : inProgress
      ? '▶ Resume'
      : pair.daily.label;
  const dailyCaption = finished
    ? `↻ ${fmtCountdown((nextResetUtc ? new Date(nextResetUtc).getTime() : 0) - (Date.now() + offset))}`
    : inProgress
      ? 'Left off'
      : pair.daily.caption;
  return (
    <div
      className="card paired"
      style={{ '--accent': pair.tagColor }}
      role="group"
      aria-label={pair.name}
    >
      {!pair.daily.startMode && (
        <span className={'card-daily-badge' + (finished ? ' done' : inProgress ? ' resume' : ' fresh')}>
          {finished ? '✓ PLAYED' : inProgress ? '▶ RESUME' : 'NEW TODAY'}
        </span>
      )}
      <div className="card-icon">{pair.icon}</div>
      <div className="card-name">{pair.name}</div>
      <div className="card-desc">{pair.desc}</div>
      <span
        className="tag mono"
        style={{ background: pair.tagColor + '22', color: pair.tagColor }}
      >
        {pair.tag}
      </span>
      <div className="card-modes">
        <button
          className="card-mode-btn tappable regular"
          aria-label={`${pair.name} — ${pair.regular.label.replace(/^[^A-Za-z]+/, '')}`}
          {...tapProps(() => { if (!loading) onPlayRegular(pair); })}
        >
          <span className="cmb-label">{pair.regular.label}</span>
          <span className="cmb-caption">{pair.regular.caption}</span>
        </button>
        <button
          className={`card-mode-btn tappable daily ${dailyState}`}
          aria-label={`${pair.name} — ${dailyLabel.replace(/^[^A-Za-z]+/, '')}`}
          {...tapProps(() => { if (!loading) onPlayDaily(pair); })}
        >
          <span className="cmb-label">{dailyLabel}</span>
          <span className="cmb-caption">{dailyCaption}</span>
        </button>
      </div>
    </div>
  );
}
