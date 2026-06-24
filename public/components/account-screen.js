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

function AccountScreen({ user, walletAddr, walletVerified, authOk, onBack, onVerify, onDisconnect }) {
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [confirmDisc, setConfirmDisc] = React.useState(false);
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
        </>
      )}
    </div>
  );
}
