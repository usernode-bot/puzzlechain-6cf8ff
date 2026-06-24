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