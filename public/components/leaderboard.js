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