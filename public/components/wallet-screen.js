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