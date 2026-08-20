/* ============================================================
   Account indicator — confirms the signed-in Usernode account. Renders
   nothing while the auth check is in flight, so "Signed out" only ever
   shows after sign-in has definitively failed.
   ============================================================ */
function AccountChip({ loading, authOk, user, onOpen }) {
  if (loading) return null;
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
      title={`Signed in as ${name} — tap to open your profile.`}
      onClick={onOpen}
    >
      <span className="avatar mono">{initial}</span>
      <span className="who">
        <span className="uname">{name}</span>
      </span>
    </button>
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
   Today's Top Scores — everyone who finished today's GAME OF THE DAY,
   ranked by score (fastest time breaks ties). The server resolves the
   featured game and returns its id so the board can name it. Reuses
   the per-game leaderboard styles. Tapping a row opens that player's
   profile via onSelectUser.
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

  const featured = state.gameId ? GAMES.find(g => g.id === state.gameId) : null;
  const gameLabel = featured ? featured.name : 'Game of the Day';
  const title = (
    <div className="lboard-title">
      Today's Top Scores
      <span className="lboard-count">🎯 {featured ? `${featured.icon} ` : ''}{gameLabel}{state.total > 0 ? ` · ${state.total} finished` : ''}</span>
    </div>
  );

  if (state.loading) {
    return <div className="lboard champions"><div className="lboard-title">Today's Top Scores</div><LbScopeTabs scope={scope} onChange={setScope} /><div className="lboard-empty">Loading…</div></div>;
  }

  const entries = state.entries || [];
  const me = state.me || null;
  const meVisible = me && entries.some(e => e.isCurrentUser);
  const row = (e, pinned) => (
    <div
      key={pinned ? 'me-pinned' : e.rank}
      className={`lrow${e.isCurrentUser ? ' me' : ''}${pinned ? ' pinned' : ''}${onSelectUser ? ' clickable' : ''}`}
      onClick={onSelectUser && e.userId ? () => onSelectUser(e.userId) : undefined}
    >
      <span className="lrank mono">#{e.rank}</span>
      <span className="lname">{e.username}{e.isCurrentUser ? ' (you)' : ''}</span>
      <span className="ltime mono">{e.score} pts</span>
      <span className="lsteps mono">{lbFmtTime(e.timeSecs)}</span>
    </div>
  );

  return (
    <div className="lboard champions">
      {title}
      <LbScopeTabs scope={scope} onChange={setScope} />
      {entries.length === 0 ? (
        <div className="lboard-empty">
          {scope === 'friends' ? LB_FRIENDS_EMPTY : `No one has finished today's ${gameLabel} yet — be the first!`}
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
   render dimmed so there's a visible collection to complete. Lives on
   the profile screen (the home Badges panel was retired).
   ============================================================ */
// Build the canonical badge-chip list (streak milestones + non-streak
// achievements + lifetime solve milestones) with earned/locked state derived
// from the server-backed `badges` (earned day thresholds) and `achievements`
// ({ types, milestones }). Consumed by the profile BadgeStrip.
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

function BadgeStrip({ badges, achievements, streak, solveCount }) {
  const chips = badgeChips(badges, achievements);
  const earnedCount = chips.filter(c => c.earned).length;
  // Next-milestone progress pills (formerly on the home Badges panel) —
  // rendered only when the caller supplies the live streak/solve counts,
  // i.e. on the viewer's own profile.
  const hints = (streak != null || solveCount != null)
    ? badgeProgressHints(streak || 0, solveCount || 0)
    : [];

  return (
    <div className="badge-strip-wrap">
      <div className="badge-strip-head">
        <span>Badges</span>
        <span className="badge-strip-count mono">{earnedCount} / {chips.length}</span>
      </div>
      {hints.length > 0 && (
        <div className="badge-progress">
          {hints.map(h => (
            <span key={h.key} className="badge-progress-pill">
              <span>{h.icon}</span> {h.text}
            </span>
          ))}
        </div>
      )}
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
// /api/daily), reset countdown, and a state-aware CTA. The full Today's
// Top Scores board renders directly below the hero, so the hero itself
// carries no leaderboard preview. Clicking anywhere routes through the
// normal launch flow, so the pre-game / resume / locked machinery is
// untouched.
function GotdHero({ game, attempt, authOk, nextResetUtc, offset, onReset, onPlay }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const finished = !!(attempt && attempt.finishedAt);
  const inProgress = !!attempt && !finished;
  return (
    <div className="gotd-hero" style={{ '--accent': game.tagColor }}>
      <div className="gotd-label mono">🎯 GAME OF THE DAY</div>
      <div className="gotd-main" onClick={onPlay}>
        <div className="gotd-icon">{game.icon}</div>
        <div className="gotd-info">
          <div className="gotd-name">{game.name}</div>
          <div className="gotd-desc">{game.desc}</div>
          <div className="gotd-meta mono">
            Next puzzle in {countdown} · 🌍 same deal for everyone · 🔥 keeps your streak
          </div>
        </div>
        <button className="primary-btn gotd-play" disabled={finished}>
          {finished ? `🔒 +${attempt.score != null ? attempt.score : 0}` : inProgress ? '▶ Resume' : 'Play'}
        </button>
      </div>
      {authOk === false && (
        <div className="gotd-signedout">Play today's deal free as a guest — sign in to join the board and keep a streak.</div>
      )}
    </div>
  );
}

// Home "in progress" row: resumable daily runs (claimed, unfinished attempts)
// and online matches where it's your turn. Horizontal card strip; each card
// re-enters through the normal launch/resume path.
// Hours until an active room's 48h turn timer forfeits it, from the server's
// lastMoveAt + turnTimeoutHours. Null when the room carries no timer info.
function roomExpiresInHours(room) {
  if (!room || !room.lastMoveAt || !Number.isFinite(room.turnTimeoutHours)) return null;
  const ms = new Date(room.lastMoveAt).getTime() + room.turnTimeoutHours * 3600 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / 3600000));
}

function InProgressRow({ items, onOpenDaily, onOpenRoom }) {
  if (!items.length) return null;
  return (
    <div className="inprog-row-wrap">
      <div className="home-section-title">In progress</div>
      <div className="inprog-row">
        {items.map((it) => {
          if (it.type === 'daily') {
            return (
              <div key={'d-' + it.game.id} className="inprog-card" onClick={() => onOpenDaily(it.game)}>
                <div className="ip-icon">{it.game.icon}</div>
                <div className="ip-name">{it.game.name}</div>
                <div className="ip-sub resume">▶ Resume run</div>
              </div>
            );
          }
          const expH = roomExpiresInHours(it.room);
          // #145 — a room still waiting for an opponent now surfaces here too.
          // Previously /api/rooms/mine only returned ACTIVE rooms, so a room you
          // created and left simply vanished from your side of the app.
          if (it.room.waiting) {
            return (
              <div key={'r-' + it.room.id} className="inprog-card room" onClick={() => onOpenRoom(it.room)}>
                <div className="ip-icon">{it.game.icon}</div>
                <div className="ip-name">{it.game.name}</div>
                <div className="ip-sub">⏳ Waiting for opponent</div>
                <div className="ip-sub resume mono">code {it.room.id}</div>
              </div>
            );
          }
          return (
            <div key={'r-' + it.room.id} className="inprog-card room" onClick={() => onOpenRoom(it.room)}>
              <div className="ip-icon">{it.game.icon}</div>
              <div className="ip-name">{it.game.name}</div>
              <div className={'ip-sub' + (it.room.myTurn ? ' turn' : '')}>
                {it.room.myTurn ? '🔔 Your turn' : '⏳ Their move'} · vs {it.room.opponentName}
              </div>
              {expH != null && (
                <div className={'ip-sub' + (expH <= 6 ? ' expiring' : '')}>
                  ⏱ expires in {expH}h
                </div>
              )}
            </div>
          );
        })}
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


/* #176 — ARCADE RUN HISTORY. The request asked arcade to keep "a history to
   share / replay", and this is it: the player's last runs on this game, with
   the band and score they scored, a Share line, and a Replay that re-derives
   that exact board from its stored seed.

   Only the seed and the numbers are stored, never a board — every generator in
   this app is seeded and deterministic, so a run is a few hundred bytes. That
   is also why Replay can exist at all. */
function ArcadeRuns({ gameId, authOk, onReplay }) {
  const [runs, setRuns] = useState(null);
  const [copied, setCopied] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!authOk) { setRuns([]); return undefined; }
    api(`/api/arcade/${gameId}/runs`)
      .then(({ ok, body }) => { if (alive) setRuns(ok && body ? body.runs || [] : []); })
      .catch(() => { if (alive) setRuns([]); });
    return () => { alive = false; };
  }, [gameId, authOk]);

  if (!authOk) return null;
  if (runs === null) return <div className="arun-empty">Loading your runs…</div>;
  if (!runs.length) {
    return <div className="arun-empty">No runs yet — your last 25 will show up here to share or replay.</div>;
  }
  const share = (r) => {
    const line = `Game Corner ${gameId} — Arcade ${arcadeBand(r.band).label}: ${r.score} pts` +
      (r.timeSecs ? ` in ${Math.floor(r.timeSecs / 60)}:${String(r.timeSecs % 60).padStart(2, '0')}` : '') +
      ` 🎮 ${location.origin}/?game=${encodeURIComponent(gameId)}&mode=arcade`;
    copyText(line);
    setCopied(r.id);
    setTimeout(() => setCopied(c => (c === r.id ? null : c)), 1600);
  };
  return (
    <div className="arun-list">
      <div className="pregame-bands-label">Your recent runs</div>
      {runs.map(r => (
        <div className="arun-row" key={r.id}>
          <span className={'arun-band ' + r.band}>{arcadeBand(r.band).label}</span>
          <span className="arun-score mono">{r.score}</span>
          <span className="arun-when">{cgAgo(r.at)}</span>
          <button className="arun-btn tappable" {...tapProps(() => share(r))}>
            {copied === r.id ? '✓ Copied' : '↗ Share'}
          </button>
          <button className="arun-btn tappable" {...tapProps(() => onReplay && onReplay(r))}>↻ Replay</button>
        </div>
      ))}
      <div className="pregame-band-note">
        A replay is the same board again, for practice — it never moves a best or a rank.
      </div>
    </div>
  );
}


function PreGameScreen({ game, attempt, best, streak, authOk, nextResetUtc, offset, onReset, onPlay, onHowTo, onChat,
                         playMode, storyProgress, storyBand, onStoryBand, arcadeBandId, onArcadeBand, arcadeBest,
                         onReplayRun }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const resuming = !!(attempt && !attempt.finishedAt);
  const m = game.manifest || {};
  /* #176 — ONE component, three fillings. The screen keeps a fixed rhetorical
     shape — what am I playing · where do I stand · what's at stake — and each
     mode answers those three its own way. Forking it per mode would have meant
     three screens to keep in step; leaving it daily-shaped would have left
     story and arcade staring at a reset countdown that means nothing to them. */
  const mode = playMode || (game.daily ? 'daily' : null);
  const isDaily = mode === 'daily';
  const isStory = mode === 'story';
  const isArcade = mode === 'arcade';
  const prog = (storyProgress && storyProgress[game.id]) || null;
  const bandTotal = prog ? prog.total : 0;
  const bandCleared = prog ? prog.cleared : 0;
  return (
    <div className="pregame-card" style={{ '--accent': game.tagColor || C.accent }}>
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
          <div className="l">{isArcade ? 'Best on this band' : 'Personal best'}</div>
          <div className="v mono">
            {isArcade
              ? (arcadeBest && arcadeBest.score ? `+${arcadeBest.score}` : '—')
              : (best && best.score != null ? `+${best.score}` : '—')}
          </div>
        </div>
        {/* Streak is a DAILY idea — consecutive days played — so it appears
            only there rather than showing a number that cannot move. */}
        {isDaily && (
          <div className="pregame-stat">
            <div className="l">Streak</div>
            <div className="v mono">{authOk ? `${streak}d` : '—'}</div>
          </div>
        )}
        {isStory && bandTotal > 0 && (
          <div className="pregame-stat">
            <div className="l">Cleared</div>
            <div className="v mono">{bandCleared}/{bandTotal}</div>
          </div>
        )}
        {isArcade && (
          <div className="pregame-stat">
            <div className="l">Your rank</div>
            <div className="v mono">{arcadeBest && arcadeBest.rank ? `#${arcadeBest.rank}` : '—'}</div>
          </div>
        )}
        {isDaily && nextResetUtc && (
          <div className="pregame-stat">
            <div className="l">New deal in</div>
            <div className="v mono">{countdown}</div>
          </div>
        )}
      </div>
      {isDaily && (
        <div className="pregame-deal">
          🌍 Everyone plays this <strong>exact deal</strong> today — one attempt, same board for all.
        </div>
      )}
      {isStory && bandTotal > 0 && (
        <div className="pregame-bands" role="group" aria-label="Choose a band">
          <div className="pregame-bands-label">Band</div>
          <div className="pregame-band-row">
            {Array.from({ length: bandTotal }, (_, i) => {
              const done = i < bandCleared;
              const locked = i > bandCleared;   // the ladder is walked in order
              return (
                <button
                  key={i}
                  className={'pregame-band tappable' + (i === storyBand ? ' on' : '') + (done ? ' done' : '') + (locked ? ' locked' : '')}
                  disabled={locked}
                  aria-label={`Band ${i + 1}${done ? ', cleared' : ''}`}
                  {...tapProps(() => { if (!locked) onStoryBand && onStoryBand(i); })}
                >{done ? '✓' : i + 1}</button>
              );
            })}
          </div>
          <div className="pregame-band-note">
            {bandCleared >= bandTotal
              ? 'Ladder complete — replay any band for practice. Points are paid once, on first clear.'
              : 'Clearing a band for the first time pays. Replays are for practice.'}
          </div>
        </div>
      )}
      {isArcade && (
        <div className="pregame-bands" role="group" aria-label="Choose a difficulty">
          <div className="pregame-bands-label">Difficulty</div>
          <div className="pregame-band-row wide">
            {ARCADE_BANDS.map(b => {
              /* All three are open from the first run. The recommendation is
                 STEERING, not gating: a player who picks Hard on a game they
                 have never touched gets a hard board and concludes the game is
                 broken, so the band matching their ladder progress is marked
                 rather than the others being locked. */
              const rec = bandTotal > 0 &&
                b.id === (bandCleared === 0 ? 'easy' : bandCleared >= bandTotal ? 'hard' : 'normal');
              return (
                <button
                  key={b.id}
                  className={'pregame-band wide tappable' + (b.id === arcadeBandId ? ' on' : '')}
                  aria-label={`${b.label}${rec ? ', recommended' : ''}`}
                  {...tapProps(() => onArcadeBand && onArcadeBand(b.id))}
                >
                  {b.label}{rec && <span className="rec">recommended</span>}
                </button>
              );
            })}
          </div>
          <div className="pregame-band-note">
            A fresh board every run. Beating your own best on this band scores;
            so does reaching the top 10, top 3 or #1 — once each.
          </div>
          <ArcadeRuns gameId={game.id} authOk={authOk} onReplay={onReplayRun} />
        </div>
      )}
      {resuming && (
        <div className="pregame-resume-note">▶ You have a run in progress — jump back in where you left off.</div>
      )}
      <button className="primary-btn pregame-play" onClick={onPlay}>
        {resuming ? '▶ Resume' : !authOk && game.daily ? 'Play as guest' : 'Play'}
      </button>
      {game.daily && !authOk && (
        <div className="pregame-signedout">
          Playing as a guest — finish today's board and sign in before midnight UTC
          to put your run on the leaderboard and start a streak.
        </div>
      )}
      <button className="pregame-howto-btn" onClick={onHowTo}>❓ How to play</button>
      {onChat && (
        <button className="pregame-howto-btn" onClick={onChat}>💬 Game chat</button>
      )}
    </div>
  );
}

/* PHASE 4 (#122) — a finished day is a RESULT screen, not a countdown screen.
   The lock icon and a giant "next puzzle in" clock was all you got for coming
   back; the reset time is now one line and the emphasis is your result, your
   personal best, today's board, and (new) a practice replay. Games that can
   snapshot their solved board also get a "View board" button — the review layer
   the win overlay already uses — wired by the caller through onReview. */
function LockedScreen({ game, attempt, nextResetUtc, offset, onReset, onBack, best, onReview, onPractice }) {
  const countdown = useCountdown(nextResetUtc, offset, onReset);
  const hasResult = attempt && attempt.score != null;
  const solved = !!(attempt && attempt.score != null && attempt.score > 0);
  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="locked-card">
      <div className="trophy">{solved ? '🏆' : '🎯'}</div>
      <h2>{solved ? "Today's result" : 'You played today'}</h2>
      <div className="sub">{game.name}</div>
      {hasResult && (
        <div className="locked-result">
          <div className="score-row"><span className="k">Score</span><span className="v">+{attempt.score}</span></div>
          {attempt.steps != null && (
            <div className="score-row"><span className="k">Steps</span><span className="v">{attempt.steps}</span></div>
          )}
          {attempt.timeSecs != null && (
            <div className="score-row"><span className="k">Time</span><span className="v">{fmtTime(attempt.timeSecs)}</span></div>
          )}
          {best && best.score != null && (
            <div className="score-row"><span className="k">Personal best</span><span className="v">+{best.score}</span></div>
          )}
        </div>
      )}
      <Leaderboard gameId={game.id} solved={solved} />
      {onReview && (
        <button className="primary-btn review-btn" onClick={onReview}>👁 View board</button>
      )}
      {onPractice && (
        <button className="primary-btn review-btn" onClick={onPractice}>
          🎲 Play again for fun <span className="practice-note">(not scored)</span>
        </button>
      )}
      <div className="reset-line">Next puzzle in <span className="mono">{countdown}</span></div>
      <button className="primary-btn" onClick={onBack}>Back to Lobby</button>
    </div>
  );
}
