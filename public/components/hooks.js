const { useState, useEffect, useRef } = React;

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
