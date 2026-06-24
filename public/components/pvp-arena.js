/* ============================================================
   PvP Arena components
   ============================================================ */
const PVP_TIERS = [
  { label: '10 UTGO',  value: 10,  color: C.emerald, payout: '18 UTGO' },
  { label: '50 UTGO',  value: 50,  color: C.gold,    payout: '90 UTGO' },
  { label: '100 UTGO', value: 100, color: C.rose,    payout: '180 UTGO' },
];

function PvpLobby({ user, balance, onJoin, joining }) {
  const balFmt = balance != null
    ? (Number(BigInt(balance)) / 1e18).toFixed(2) + ' UTGO'
    : '…';
  return (
    <div className="pvp-lobby">
      <div className="pvp-header">
        <div className="pvp-title">⚔️ PvP Arena</div>
        <div className="pvp-subtitle">Stake $UTGO and battle for the best tile-match score</div>
        <div className="pvp-balance">Balance: {balFmt}</div>
      </div>
      <div className="pvp-how">
        <div className="pvp-how-step">1. Choose a wager tier and get matched with an opponent</div>
        <div className="pvp-how-step">2. Both players clear the same seeded board — highest score wins, fastest time breaks ties</div>
        <div className="pvp-how-step">3. Winner claims 90% of the pot · 8% treasury · 2% burned 🔥</div>
      </div>
      <div className="pvp-tiers">
        {PVP_TIERS.map(t => (
          <div key={t.value} className="pvp-tier-card" style={{ '--pvp-color': t.color }}>
            <div className="pvp-tier-label">{t.label}</div>
            <div className="pvp-tier-payout">Win → {t.payout}</div>
            <button
              className="pvp-tier-btn"
              style={{ background: t.color }}
              disabled={joining !== null}
              onClick={() => onJoin(t.value)}
            >
              {joining === t.value ? 'Finding…' : 'Find Match'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PvpMatchmaking({ match, onCancel, onReclaim, cancelQueueCalldata }) {
  const { useState: useS, useEffect: useE } = React;
  const [secsLeft, setSecsLeft] = useS(() => {
    if (!match || !match.createdAt) return 120;
    const elapsed = Math.floor((Date.now() - new Date(match.createdAt).getTime()) / 1000);
    return Math.max(0, 120 - elapsed);
  });
  const [reclaiming, setReclaiming] = useS(false);

  useE(() => {
    if (secsLeft <= 0) return;
    const id = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secsLeft > 0]);

  const canReclaim = secsLeft === 0;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  const handleReclaim = async () => {
    setReclaiming(true);
    try {
      const cd = cancelQueueCalldata || (match && match.cancelQueueCalldata);
      if (cd && UTGO_CONTRACT_ADDRESS && window.usernode && window.usernode.sendTransaction) {
        await window.usernode.sendTransaction({ to: UTGO_CONTRACT_ADDRESS, data: cd });
      }
      onReclaim && onReclaim();
    } catch (e) {
      console.error('[pvp] reclaim failed:', e && e.message);
      onReclaim && onReclaim(); // fall back to cancel even if tx fails
    } finally {
      setReclaiming(false);
    }
  };

  return (
    <div className="pvp-matchmaking">
      <div className="pvp-mm-icon">⚔️</div>
      <div className="pvp-mm-pulse" />
      <div className="pvp-mm-title">Finding opponent…</div>
      <div className="pvp-mm-code">Room · {match && match.matchId}</div>
      <div className={`pvp-mm-countdown${canReclaim ? ' pvp-mm-countdown-expired' : ''}`}>{mm}:{ss}</div>
      <div className="pvp-mm-hint">
        {canReclaim
          ? 'Queue timed out — reclaim your deposit below'
          : `Waiting for a ${match && match.betTier ? match.betTier + ' UTGO' : ''} opponent`}
      </div>
      <div className="pvp-mm-btns">
        {canReclaim && (
          <button className="pvp-reclaim-btn" onClick={handleReclaim} disabled={reclaiming}>
            {reclaiming ? 'Reclaiming…' : 'Reclaim Deposit'}
          </button>
        )}
        <button className="pvp-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function PvpDepositScreen({ match, playerIsP1, onDeposit, depositing }) {
  const alreadyDeposited = playerIsP1 ? match.p1Deposited : match.p2Deposited;
  const oppDeposited = playerIsP1 ? match.p2Deposited : match.p1Deposited;
  const wagerFmt = match.wagerUtgo
    ? (Number(BigInt(match.wagerUtgo)) / 1e18).toFixed(2) + ' UTGO'
    : '?';
  return (
    <div className="pvp-deposit">
      <div className="pvp-deposit-title">Deposit Wager</div>
      <div className="pvp-deposit-amount">{wagerFmt}</div>
      <div className="pvp-deposit-hint">
        {alreadyDeposited
          ? (oppDeposited ? 'Both deposited — starting!' : 'Waiting for opponent to deposit…')
          : 'Deposit your wager to lock in the match'}
      </div>
      {!alreadyDeposited && (
        <button className="primary-btn" disabled={depositing} onClick={onDeposit}>
          {depositing ? 'Depositing…' : 'Deposit & Play'}
        </button>
      )}
    </div>
  );
}

function PvpGameScreen({ match, playerIsP1, onResult }) {
  const [depositing, setDepositing] = useState(false);
  const [deposited, setDeposited] = useState(
    playerIsP1 ? match.p1Deposited : match.p2Deposited
  );
  const [oppDeposited, setOppDeposited] = useState(
    playerIsP1 ? match.p2Deposited : match.p1Deposited
  );
  const [playing, setPlaying] = useState(deposited && oppDeposited);
  const [waiting, setWaiting] = useState(false);
  const [oppPct, setOppPct] = useState(null); // opponent tile-clear %, rounded to 10
  const [myRemaining, setMyRemaining] = useState(72);
  const pollRef = useRef(null);
  const resultPollRef = useRef(null);
  // Accumulate telemetry locally — useRef avoids stale closures in handleWin/handleLose
  const telemetryRef = useRef([]);

  // Poll for opponent deposit
  useEffect(() => {
    if (playing || !deposited) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      const oppNow = playerIsP1 ? body.p2Deposited : body.p1Deposited;
      if (oppNow) {
        setOppDeposited(true);
        setPlaying(true);
        clearInterval(pollRef.current);
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [deposited, playing]);

  // During play: poll every 2s for opponent progress + inactivity forfeit
  useEffect(() => {
    if (!playing || waiting) return;
    const poll = async () => {
      const rem = myRemaining;
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}?remaining=${rem}`);
      if (!ok) return;
      if (body.forfeitedBy) {
        clearInterval(resultPollRef.current);
        onResult({
          match: body,
          isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id),
          claimCalldata: body.claimCalldata,
          contractAddr: body.contractAddr,
        });
        return;
      }
      if (body.status === 'finished' || body.status === 'disputed') {
        clearInterval(resultPollRef.current);
        onResult({ match: body, isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id) });
        return;
      }
      // Update opponent progress bar (rounded to nearest 10%)
      const oppRem = playerIsP1 ? body.p2Remaining : body.p1Remaining;
      if (oppRem != null) {
        const cleared = 72 - oppRem;
        setOppPct(Math.round(cleared / 72 * 10) * 10);
      }
    };
    resultPollRef.current = setInterval(poll, 2000);
    return () => clearInterval(resultPollRef.current);
  }, [playing, waiting]);

  // Poll for opponent finish result while waiting
  useEffect(() => {
    if (!waiting) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      if (body.status === 'finished' || body.status === 'disputed') {
        clearInterval(pollRef.current);
        onResult({ match: body, isWinner: body.winnerId === (playerIsP1 ? match.player1Id : match.player2Id) });
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [waiting]);

  const handleDeposit = async () => {
    setDepositing(true);
    const isMock = !window.usernode || (window.usernode.isMockEnabled && window.usernode.isMockEnabled());
    if (!isMock && window.usernode && UTGO_CONTRACT_ADDRESS) {
      // Production: call on-chain deposit — skip for staging
    }
    await api(`/api/pvp/match/${match.matchId}/deposit-confirmed`, {
      method: 'POST',
      body: JSON.stringify({ txHash: '0xstaging' }),
    });
    setDeposited(true);
    setDepositing(false);
  };

  // Accumulate tile moves locally — no per-move API call
  const handleMoveTile = ({ tileType, moveSeq, tsClient }) => {
    telemetryRef.current.push({ tileType, moveSeq, tsClient });
  };

  const handleWin = async (score, steps, secs) => {
    clearInterval(resultPollRef.current);
    const { ok, body } = await api(`/api/pvp/match/${match.matchId}/finish`, {
      method: 'POST',
      body: JSON.stringify({
        score, steps, timeSecs: secs, remainingTiles: 0,
        telemetry: telemetryRef.current,
      }),
    });
    if (!ok) return;
    if (body.waiting) {
      setWaiting(true);
    } else {
      onResult({
        match: body.match,
        isWinner: body.isWinner,
        claimCalldata: body.claimCalldata,
        contractAddr: body.contractAddr,
        prize: body.prize,
        telemetrySummary: body.telemetrySummary,
        dapp: body.dapp,
      });
    }
  };

  const handleLose = async (steps, secs, meta) => {
    clearInterval(resultPollRef.current);
    if (meta && meta.isTimeUp) {
      // Time expired — submit finish with score 0
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          score: 0, steps, timeSecs: secs,
          remainingTiles: meta.remainingTiles || 0,
          telemetry: telemetryRef.current,
        }),
      });
      if (ok && body) {
        if (body.waiting) { setWaiting(true); return; }
        onResult({
          match: body.match,
          isWinner: body.isWinner,
          claimCalldata: body.claimCalldata,
          contractAddr: body.contractAddr,
          prize: body.prize,
          telemetrySummary: body.telemetrySummary,
          dapp: body.dapp,
        });
      }
    } else {
      // Bar full / manual forfeit
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}/forfeit`, { method: 'POST' });
      onResult({ isWinner: false, match: ok && body ? body : null });
    }
  };

  const handleStepChange = (n) => {
    setMyRemaining(Math.max(0, 72 - n));
  };

  const oppName = playerIsP1 ? (match.player2Name || 'Opponent') : (match.player1Name || 'Opponent');

  if (!deposited || !oppDeposited) {
    return (
      <PvpDepositScreen
        match={match}
        playerIsP1={playerIsP1}
        onDeposit={handleDeposit}
        depositing={depositing}
      />
    );
  }

  if (waiting) {
    return (
      <div className="pvp-waiting">
        <div className="pvp-mm-pulse" />
        <div className="pvp-waiting-title">Waiting for {oppName}…</div>
        <div className="pvp-waiting-hint">Your result has been submitted</div>
      </div>
    );
  }

  return (
    <div className="pvp-game-wrap game-wrap">
      <div className="pvp-vs-bar">
        <span>vs <span style={{ color: C.violet }}>{oppName}</span></span>
        <div className="pvp-opp-bar">
          <div className="pvp-opp-bar-label">{oppName} {oppPct !== null ? `${oppPct}%` : '—'}</div>
          <div className="pvp-opp-bar-track">
            <div className="pvp-opp-bar-fill" style={{ width: `${oppPct || 0}%` }} />
          </div>
        </div>
        <button className="pvp-forfeit-btn" onClick={() => handleLose(0, 0, {})}>Forfeit</button>
      </div>
      <TileMatchingDailyGame
        boardSeedOverride={match.boardSeed}
        onWin={handleWin}
        onLose={handleLose}
        onStepChange={handleStepChange}
        onMoveTile={handleMoveTile}
        resetKey={match.matchId}
        offset={0}
      />
    </div>
  );
}

function PvpResult({ result, onBack, onOpenReceipt }) {
  const { isWinner, match, claimCalldata, contractAddr, prize, telemetrySummary } = result || {};
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimErr, setClaimErr] = useState(null);
  const [txHash, setTxHash] = useState(null);
  // DApp Mode: surface + anchor the verified session minted from this match's
  // telemetry (server already replayed it).
  const [dappSession, setDappSession] = useState(result && result.dapp);
  useEffect(() => {
    if (result && result.dapp) {
      setDappSession(result.dapp);
      dappAnchor(result.dapp).then(setDappSession);
    }
  }, [result && result.dapp && result.dapp.sessionId]);

  const handleClaim = async () => {
    if (!claimCalldata || !contractAddr) return;
    setClaiming(true);
    setClaimErr(null);
    try {
      const tx = await window.usernode.sendTransaction({ to: contractAddr, data: claimCalldata });
      setTxHash(tx && tx.hash ? tx.hash : null);
      setClaimed(true);
    } catch (e) {
      setClaimErr(e && e.message ? e.message : 'Transaction failed');
    }
    setClaiming(false);
  };

  const myScore = match && (result.playerIsP1 !== false
    ? (match.p1Score != null ? match.p1Score : match.p2Score)
    : (match.p2Score != null ? match.p2Score : match.p1Score));
  const oppScore = match && (result.playerIsP1 !== false
    ? match.p2Score
    : match.p1Score);

  return (
    <div className="pvp-result">
      <div className="pvp-result-emoji">{isWinner ? '🏆' : '💀'}</div>
      <div className="pvp-result-title">{isWinner ? 'You Won!' : 'You Lost'}</div>

      {dappSession && <VerifiedBadge session={dappSession} onOpenReceipt={onOpenReceipt} />}

      {telemetrySummary && (
        <div className="pvp-telem-summary">
          <div className="pvp-telem-row">
            <span>Moves</span><span className="mono">{telemetrySummary.moveCount}</span>
          </div>
          <div className="pvp-telem-row">
            <span>Time</span><span className="mono">{telemetrySummary.timeTaken}s</span>
          </div>
          <div className="pvp-telem-row">
            <span>Tiles cleared</span><span className="mono">{telemetrySummary.tilesCleared}/72</span>
          </div>
        </div>
      )}

      {match && (
        <div className="score-rows" style={{ width: '100%', textAlign: 'left' }}>
          <div className="score-row">
            <span className="k">Your score</span>
            <span className="v mono">{myScore != null ? myScore : '—'}</span>
          </div>
          <div className="score-row">
            <span className="k">Opponent</span>
            <span className="v mono">{oppScore != null ? oppScore : '—'}</span>
          </div>
        </div>
      )}

      {isWinner && prize && (
        <div className="pvp-prize-anim">
          <div className="pvp-prize-title">Prize Distribution</div>
          <div className="pvp-prize-row pvp-prize-winner">
            <span>You (90%)</span><span className="mono">+{prize.winnerPrize} UTGO</span>
          </div>
          <div className="pvp-prize-row">
            <span>Treasury (8%)</span><span className="mono">{prize.treasuryFee} UTGO</span>
          </div>
          <div className="pvp-prize-row">
            <span>Burned (2%)</span><span className="mono">{prize.burned} UTGO 🔥</span>
          </div>
        </div>
      )}

      {claiming && (
        <div style={{ color: C.text, fontSize: '0.85rem', margin: '0.5rem 0' }}>
          Funds are being sent to your wallet…
        </div>
      )}
      {claimed && txHash && (
        <div style={{ color: C.emerald, fontSize: '0.8rem', wordBreak: 'break-all', margin: '0.25rem 0' }}>
          Tx: {txHash}
        </div>
      )}
      {claimErr && <div style={{ color: C.rose, fontSize: '0.8rem', margin: '0.25rem 0' }}>{claimErr}</div>}

      <div className="pvp-result-btns">
        {isWinner && claimCalldata && !claimed && (
          <button className="primary-btn" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Claiming…' : 'Claim Winnings'}
          </button>
        )}
        {claimed && <div style={{ color: C.emerald, fontWeight: 600 }}>Winnings claimed!</div>}
        <button
          className="primary-btn"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          onClick={onBack}
        >
          Back to Arena
        </button>
      </div>
    </div>
  );
}

function PvpArena({ user, authOk, walletAddr: appWalletAddr, walletBalance: appWalletBalance, onOpenReceipt }) {
  const [phase, setPhase] = useState('lobby'); // lobby | matchmaking | game | result
  const [match, setMatch] = useState(null);
  const [joining, setJoining] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  // Use app-level wallet addr/balance when available; fall back to own fetch
  const [localAddr, setLocalAddr] = useState(null);
  const [localBalance, setLocalBalance] = useState(null);
  const playerAddr = appWalletAddr || localAddr;
  const balance = appWalletBalance || localBalance;
  const pollRef = useRef(null);

  useEffect(() => {
    if (appWalletAddr) return; // already have it from app level
    if (!window.usernode || !window.usernode.getNodeAddress) return;
    window.usernode.getNodeAddress().then(addr => {
      if (!addr) return;
      setLocalAddr(addr);
      api(`/api/pvp/balance?addr=${encodeURIComponent(addr)}`)
        .then(({ ok, body }) => { if (ok && body) setLocalBalance(body.balance); })
        .catch(() => {});
    }).catch(() => {});
  }, [appWalletAddr]);

  // Poll for opponent joining while in matchmaking; also refresh cancelQueueCalldata
  useEffect(() => {
    if (phase !== 'matchmaking' || !match) return;
    const poll = async () => {
      const { ok, body } = await api(`/api/pvp/match/${match.matchId}`);
      if (!ok) return;
      if (body.status === 'active') {
        clearInterval(pollRef.current);
        setMatch(body);
        setPhase('game');
      } else {
        // Refresh cancelQueueCalldata when it becomes available after 120s
        setMatch(prev => prev ? { ...prev, cancelQueueCalldata: body.cancelQueueCalldata || prev.cancelQueueCalldata } : prev);
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [phase, match && match.matchId]);

  const handleJoin = async (betTier) => {
    if (!playerAddr) return;
    setJoining(betTier);
    const { ok, body } = await api('/api/pvp/join', {
      method: 'POST',
      body: JSON.stringify({ betTier, playerAddr }),
    });
    setJoining(null);
    if (!ok || !body) return;
    setMatch(body);
    setPhase(body.status === 'active' ? 'game' : 'matchmaking');
  };

  const handleCancel = async () => {
    if (match) {
      await api(`/api/pvp/match/${match.matchId}/cancel`, { method: 'DELETE' });
    }
    clearInterval(pollRef.current);
    setMatch(null);
    setPhase('lobby');
  };

  const handleReclaim = () => {
    clearInterval(pollRef.current);
    setMatch(null);
    setPhase('lobby');
  };

  const handleResult = (result) => {
    setPvpResult(result);
    setPhase('result');
  };

  if (!authOk) {
    return <div className="pvp-auth-msg">Sign in to play PvP matches.</div>;
  }

  const playerIsP1 = match && user && match.player1Id === user.id;

  if (phase === 'lobby') {
    return <PvpLobby user={user} balance={balance} onJoin={handleJoin} joining={joining} />;
  }
  if (phase === 'matchmaking') {
    return <PvpMatchmaking
      match={match}
      onCancel={handleCancel}
      onReclaim={handleReclaim}
      cancelQueueCalldata={match && match.cancelQueueCalldata}
    />;
  }
  if (phase === 'game' && match) {
    return <PvpGameScreen match={match} playerIsP1={playerIsP1} onResult={handleResult} />;
  }
  if (phase === 'result') {
    return <PvpResult result={pvpResult} onBack={() => { setMatch(null); setPhase('lobby'); }} onOpenReceipt={onOpenReceipt} />;
  }
  return null;
}

// UTGO_CONTRACT_ADDRESS exposed for PvpGameScreen (staging: undefined)
const UTGO_CONTRACT_ADDRESS = null; // injected from env in production
