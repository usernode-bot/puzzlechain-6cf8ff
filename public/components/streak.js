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
