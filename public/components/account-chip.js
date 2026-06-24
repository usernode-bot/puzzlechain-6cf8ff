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
