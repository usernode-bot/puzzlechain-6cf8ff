const GAMES = [
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    category: 'daily',
    desc: 'Fill the 6×6 grid so every row, column, and box has 1–6.',
    tag: 'Logic',
    tagColor: C.accent,
    component: SudokuGame,
  },
  {
    id: 'wordhunt',
    name: 'Word Hunt',
    icon: '🔤',
    category: 'daily',
    desc: 'Find every hidden word in the letter grid.',
    tag: 'Word',
    tagColor: C.violet,
    component: WordHuntGame,
  },
  {
    id: 'cryptowordle',
    name: 'Crypto Wordle',
    icon: '🟩',
    category: 'daily',
    desc: 'Guess the daily 5-letter Web3 term in 6 tries.',
    tag: 'Web3',
    tagColor: C.emerald,
    component: CryptoWordleGame,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    category: 'classic',
    desc: 'Clear the 8×8 grid of mines. Cash Out early to lock in a risk multiplier.',
    tag: 'Risk',
    tagColor: C.rose,
    component: MinesweeperGame,
  },
  {
    id: 'mancala',
    name: 'Mancala',
    icon: '🫘',
    category: 'classic',
    desc: 'Classic stone-pit strategy. Outsmart your opponent by capturing more stones.',
    tag: 'Strategy',
    tagColor: C.gold,
    component: MancalaGame,
  },
  {
    id: '2048',
    name: '2048',
    icon: '🔢',
    category: 'classic',
    desc: 'Slide tiles to merge numbers and reach 2048.',
    tag: 'Numbers',
    tagColor: C.emerald,
    component: T2048Game,
  },
  {
    id: 'knights-tour',
    name: "Knight's Tour",
    icon: '♞',
    category: 'classic',
    desc: "Move a chess knight to visit all 64 squares exactly once.",
    tag: 'Puzzle',
    tagColor: C.violet,
    component: KnightsTourGame,
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    category: 'classic',
    desc: 'Swipe to steer, eat to grow, and chase a high score without crashing.',
    tag: 'Arcade',
    tagColor: C.emerald,
    component: SnakeGame,
  },
  {
    id: 'blockblast',
    name: 'Block Blast',
    icon: '🧱',
    category: 'classic',
    desc: 'Drag blocks onto the grid and clear full lines. How long can you last?',
    tag: 'Puzzle',
    tagColor: C.accent,
    component: BlockBlastGame,
  },
  {
    id: 'diamondrush',
    name: 'Diamond Rush',
    icon: '💎',
    category: 'classic',
    desc: 'Swap gems to line up 3+ and cascade your way to the target score.',
    tag: 'Match',
    tagColor: C.rose,
    component: DiamondRushGame,
  },
  {
    id: 'texas',
    name: "Texas Hold 'Em",
    icon: '🃏',
    category: 'classic',
    desc: 'Heads-up poker vs the computer. Bet smart and take all the chips.',
    tag: 'Cards',
    tagColor: C.gold,
    component: TexasHoldemGame,
  },
  {
    id: 'tilematching',
    name: 'Tile Match Puzzle',
    icon: '🀄',
    category: 'classic',
    desc: 'Click tiles off the layered board into your 7-slot bar — match three to clear them.',
    tag: 'Puzzle',
    tagColor: '#6366f1',
    component: TileMatchingGame,
  },
  {
    id: 'bounce',
    name: 'Bounce',
    icon: '🧱',
    category: 'classic',
    desc: "Smash every brick with a bouncing ball. Don't let it fall — climb the leaderboard.",
    tag: 'Arcade',
    tagColor: C.rose,
    component: BounceGame,
  },
  {
    id: 'zuma',
    name: 'Zuma',
    icon: '🐸',
    category: 'classic',
    desc: 'Shoot colored balls to match 3 in a row before the chain reaches the skull.',
    tag: 'Arcade',
    tagColor: C.emerald,
    component: ZumaGame,
  },
  {
    name: 'Match-3 Puzzle',
    icon: '🟩',
    category: 'classic',
    desc: 'Classic match-3 campaign: progress through 50 puzzles and climb the leaderboard.',
    tag: 'Campaign',
    tagColor: '#f59e0b',
    component: Match3Game,
  },
  {
    id: 'tilematchingdaily',
    name: 'Daily Tile Match Puzzle',
    icon: '🀄',
    category: 'daily',
    desc: 'Today\'s layered tile board — 3 minutes to clear it.',
    tag: 'Puzzle',
    tagColor: '#6366f1',
    component: TileMatchingDailyGame,
  },
  {
    id: 'idle',
    name: 'Idle Empire',
    icon: '🐹',
    category: 'classic',
    desc: 'Tap, upgrade, and build your hamster empire with prestige rewards.',
    tag: 'Idle',
    tagColor: C.gold,
    component: IdleGame,
  },
  {
    id: 'pvp-arena',
    name: 'PvP Arena',
    icon: '⚔️',
    category: 'classic',
    desc: 'Stake $UTGO and compete head-to-head. Winner takes 90% of the pot.',
    tag: 'Wager',
    tagColor: C.rose,
    component: () => null,
  },
];

// Games that render their own ClassicShell (full-screen, gesture-first).
const SELF_SHELL_GAMES = new Set(['snake', 'blockblast', 'diamondrush', 'texas']);

/* ============================================================
   Root app
   ============================================================ */
function App() {
  const [screen, setScreen] = useState(() => {
    // Support ?screen=wallet / ?screen=session deep links for testing
    const params = new URLSearchParams(window.location.search);
    const s = params.get('screen');
    if (s === 'wallet') return 'wallet';
    if (s === 'account') return 'account';
    if (s === 'session' || params.get('demo') === 'dapp' || params.get('demo') === 'anchor') return 'session';
    return 'lobby';
  }); // 'lobby' | 'game' | 'locked' | 'profile' | 'friends' | 'wallet' | 'account' | 'session'
  // DApp session receipt being viewed (session id), and identity-verified flag.
  // ?demo=anchor deep-links to the staging-seeded anchored daily sudoku receipt.
  const [receiptSessionId, setReceiptSessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sid') || (params.get('demo') === 'anchor' ? 'DAPPDEMOSUDOKU' : null);
  });
  const openReceipt = (sid) => { setReceiptSessionId(sid); setScreen('session'); };
  const [walletVerified, setWalletVerified] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // Permanent earned streak-milestone day thresholds (e.g. [3, 7, 30]) — kept
  // even after a streak resets, so the lobby can show a collected-badges strip.
  const [badges, setBadges] = useState([]);
  const [winData, setWinData] = useState(null);
  const [loseData, setLoseData] = useState(null);
  // Server-backed per-day attempt state, keyed by game id.
  // { [gameId]: { score, steps, timeSecs, startedAt, finishedAt } }
  const [attempts, setAttempts] = useState({});
  const [nextResetUtc, setNextResetUtc] = useState(null);
  const [offset, setOffset] = useState(0); // serverNow - clientNow (ms)
  const [loading, setLoading] = useState(true);
  const [stepCount, setStepCount] = useState(0);
  const [user, setUser] = useState(null);       // { username, id, usernodePubkey }
  const [authOk, setAuthOk] = useState(true);    // false → signed-out / DB unreachable
  const [, setTick] = useState(0); // 1s heartbeat to keep lobby countdowns live
  // Lobby tab: 'daily', 'classic', 'idle', or 'pvp' — initialized from ?tab= URL param
  const [lobbyTab, setLobbyTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'classic' ? 'classic' : t === 'idle' ? 'idle' : t === 'pvp' ? 'pvp' : 'daily';
  });
  // Incremented to trigger MinesweeperGame reset on Play Again
  const [playAgainKey, setPlayAgainKey] = useState(0);
  // Social: profile viewing and friends list
  const [selectedUserId, setSelectedUserId] = useState(null);
  // Wallet state (app-level so PvP and nav share one source)
  const [walletAddr, setWalletAddr] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null); // wei string
  const [walletMock, setWalletMock] = useState(true);
  // Share modal for posting wins to feed
  const [shareModal, setShareModal] = useState({ show: false, caption: '' });
  // dApps-integration availability. Disabled (e.g. staging with an empty
  // APP_SECRET_KEY) → the related nav chip is hidden so the UI degrades
  // gracefully alongside the server.
  const [integration, setIntegration] = useState({ enabled: false, pubkey: null });

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Hydrate today's locked/result state from the server on mount, and
  // recompute the score from finished attempts so it survives reloads.
  const loadDaily = async () => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const path = '/api/daily' + (demo ? `?demo=${encodeURIComponent(demo)}` : '');
    const { ok, body } = await api(path);
    if (ok && body) {
      setAuthOk(true);
      setUser(body.user || null);
      setAttempts(body.attempts || {});
      setNextResetUtc(body.nextResetUtc);
      setStreak(typeof body.streak === 'number' ? body.streak : 0);
      setBadges(Array.isArray(body.badges) ? body.badges : []);
      setOffset(new Date(body.serverNowUtc).getTime() - Date.now());
      const sum = Object.values(body.attempts || {})
        .reduce((acc, a) => acc + (a.score || 0), 0);
      setTotalScore(sum);
    } else {
      // 401 (no/expired token) or 5xx (DB down): can't confirm the account,
      // so persistence isn't guaranteed — reflect that in the nav.
      setAuthOk(false);
      setUser(null);
      setStreak(0);
      setBadges([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, []);

  // dApps-integration status. Degrades gracefully: a failed/absent response
  // leaves the feature disabled (chip stays hidden) rather than erroring.
  useEffect(() => {
    api('/api/integration/status')
      .then(({ ok, body }) => {
        if (ok && body) setIntegration({ enabled: !!body.enabled, pubkey: body.pubkey || null });
      })
      .catch(() => {});
  }, []);

  // Wallet: read EVM address from the bridge, link it to the account, optionally
  // prove ownership (sign a challenge), and fetch balance. Extracted into one
  // callable so BOTH the on-mount effect and the Account screen's "Connect /
  // Verify" button run the identical flow. Returns { ok, addr, verified } so the
  // Account screen can show precise feedback; never throws.
  const connectAndVerifyWallet = React.useCallback(async () => {
    if (!window.usernode || !window.usernode.getNodeAddress) {
      return { ok: false, reason: 'unavailable' };
    }
    let addr = null;
    try { addr = await window.usernode.getNodeAddress(); } catch { return { ok: false, reason: 'unavailable' }; }
    if (!addr) return { ok: false, reason: 'unavailable' };
    setWalletAddr(addr);
    // Link address server-side so tipping lookups work (trust-on-report).
    try { await api('/api/wallet/link', { method: 'POST', body: JSON.stringify({ addr }) }); } catch {}

    // Optional cryptographic ownership proof — only if the wallet can sign.
    let verified = false;
    if (window.usernode.signMessage) {
      try {
        const { ok, body } = await api('/api/wallet/challenge');
        if (ok && body && body.message) {
          const sig = await window.usernode.signMessage(body.message);
          if (sig) {
            const { ok: pOk, body: pBody } = await api('/api/wallet/prove', {
              method: 'POST',
              body: JSON.stringify({ addr, nonce: body.nonce, signature: sig }),
            });
            if (pOk && pBody && pBody.verified) { verified = true; setWalletVerified(true); }
          }
        }
      } catch {}
    }

    // Fetch on-chain balance.
    try {
      const { ok, body } = await api(`/api/wallet/balance?addr=${encodeURIComponent(addr)}`);
      if (ok && body) { setWalletBalance(body.balance); setWalletMock(!!body.mock); }
    } catch {}

    return { ok: true, addr, verified };
  }, []);

  // Disconnect the verified-identity proof (public link is kept so received
  // tips still resolve). Used by the Account screen.
  const disconnectWallet = React.useCallback(async () => {
    await api('/api/wallet/disconnect', { method: 'POST' });
    setWalletVerified(false);
  }, []);

  // On mount: restore any existing identity/link state from the server first
  // (so the verified badge + linked address show even before the bridge
  // resolves or when it's unavailable), then run the connect/verify flow.
  useEffect(() => {
    api('/api/account').then(({ ok, body }) => {
      if (!ok || !body) return;
      if (body.identityVerified) setWalletVerified(true);
      if (body.walletAddr) setWalletAddr(prev => prev || body.walletAddr);
    }).catch(() => {});
    connectAndVerifyWallet();
  }, [connectAndVerifyWallet]);

  // Refresh balance on demand (called after claim/tip)
  const refreshWalletBalance = () => {
    if (!walletAddr) return;
    api(`/api/wallet/balance?addr=${encodeURIComponent(walletAddr)}`)
      .then(({ ok, body }) => {
        if (ok && body) { setWalletBalance(body.balance); setWalletMock(!!body.mock); }
      }).catch(() => {});
  };

  // Midnight UTC reached — reload state so everything unlocks.
  const onReset = () => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    loadDaily();
  };

  const launchGame = async (game) => {
    // Classic games and idle games skip the daily system; PvP Arena is handled specially
    if (game.category === 'classic' || game.category === 'idle' || game.id === 'pvp-arena') {
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
      return;
    }
    const existing = attempts[game.id];
    if (existing) {
      if (existing.finishedAt) {
        // Finished today — straight to the locked screen.
        setCurrentGame(game);
        setScreen('locked');
      } else {
        // Claimed but unfinished — resume into the saved board state. The row
        // is already claimed, so do NOT call /start again.
        setCurrentGame(game);
        setStepCount(existing.steps || 0);
        setWinData(null);
        setLoseData(null);
        setScreen('game');
      }
      return;
    }
    const { ok, status, body } = await api(`/api/daily/${game.id}/start`, { method: 'POST' });
    if (ok) {
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
    } else if (status === 409) {
      // Lost the race / already locked — show the locked screen.
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      if (body && body.attempt) setAttempts(prev => ({ ...prev, [game.id]: body.attempt }));
      setCurrentGame(game);
      setScreen(body && body.attempt && !body.attempt.finishedAt ? 'game' : 'locked');
    }
  };

  // Merge a stored attempt's persisted progress JSON with its steps/elapsed so
  // a game component can hydrate from a single savedProgress object.
  const progressFor = (attempt) => {
    if (!attempt || !attempt.progress) return null;
    return { ...attempt.progress, steps: attempt.steps, elapsedSecs: attempt.elapsedSecs };
  };

  // Autosave callback handed to every game: persists in-progress state for
  // today's claimed, unfinished attempt. Best-effort (keepalive) so it survives
  // a tab close. Never blocks gameplay.
  const handleSaveProgress = (progress, steps, secs) => {
    if (!currentGame) return;
    const gameId = currentGame.id;
    api(`/api/daily/${gameId}/progress`, {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({ progress, steps, elapsedSecs: secs }),
    }).catch(() => {});
    // Keep local mirror fresh so a same-session re-entry resumes correctly.
    setAttempts(prev => {
      const a = prev[gameId];
      if (!a || a.finishedAt) return prev;
      return { ...prev, [gameId]: { ...a, progress, steps, elapsedSecs: secs } };
    });
  };

  const handleWin = async (score, steps, timeSecs, meta) => {
    // Classic games skip server, streak, and totalScore nav update
    if (currentGame && currentGame.category === 'classic') {
      const cashoutMultiplier = (meta && meta.cashoutMultiplier) || 1;
      setWinData({
        score,
        bonus: 0,
        finalScore: score,
        steps,
        timeSecs,
        multiplier: cashoutMultiplier,
        effectiveStreak: 0,
        share: meta && meta.share,
        cashOut: meta && meta.cashOut,
        winnerLabel: meta && meta.winnerLabel,
        isClassic: true,
        bestScore: meta && meta.bestScore,
        longestSnake: meta && meta.longestSnake,
      });
      return;
    }
    // The streak this win lands in: the first finished game of the day extends
    // the consecutive-day streak by 1; a second game the same day reuses the
    // same day count (the multiplier is per-day, not per-game).
    const playedToday = Object.values(attempts).some(a => a && a.score != null);
    const effectiveStreak = playedToday ? streak : streak + 1;
    const multiplier = streakMultiplier(effectiveStreak);
    const finalScore = Math.round(score * multiplier);
    const bonus = finalScore - score;
    setStreak(effectiveStreak);
    // A badge unlocked the moment this win's streak lands exactly on a tier.
    const unlocked = justUnlockedBadge(effectiveStreak);
    if (unlocked) {
      setBadges(prev => (prev.includes(unlocked.min) ? prev : [...prev, unlocked.min].sort((a, b) => a - b)));
    }
    setWinData({
      score, bonus, finalScore, steps, timeSecs, multiplier, effectiveStreak,
      activeBadge: activeBadge(effectiveStreak),
      justBadge: unlocked,
      share: meta && meta.share,
      canPost: true,
      gameId: gameId,
    });

    const gameId = currentGame.id;
    const { ok, body } = await api(`/api/daily/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify({ score: finalScore, steps, timeSecs }),
    });
    const stored = ok && body && body.attempt
      ? body.attempt
      : { score: finalScore, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
    setTotalScore(t => t + finalScore);
    // Reconcile against the server's authoritative streak (now that today is
    // finished) so a reload and the live nav badge agree.
    if (ok && body && typeof body.streak === 'number') setStreak(body.streak);
    // Store reward amount from server so win overlay can show it
    if (ok && body && body.rewardWei) {
      setWinData(prev => prev ? { ...prev, rewardWei: body.rewardWei } : prev);
    }
    // DApp Mode: surface the Verified badge for the pilot game, then anchor the
    // session's chain hash on-chain (best-effort; degrades to a mock anchor).
    if (ok && body && body.dapp) {
      setWinData(prev => prev ? { ...prev, dapp: body.dapp } : prev);
      dappAnchor(body.dapp).then(updated => {
        setWinData(prev => prev ? { ...prev, dapp: updated } : prev);
      });
    }
  };

  // Loss path (used by games that can be lost, e.g. Crypto Wordle). Records a
  // finished row with score 0 so the day stays locked, but does NOT touch the
  // streak. Existing win-only games never call this.
  const handleLose = async (steps, timeSecs, meta) => {
    // Classic games skip server entirely
    if (currentGame && currentGame.category === 'classic') {
      setLoseData({
        steps,
        timeSecs,
        share: meta && meta.share,
        answer: meta && meta.answer,
        isClassic: true,
      });
      return;
    }
    setLoseData({
      steps,
      timeSecs,
      share: meta && meta.share,
      answer: meta && meta.answer,
    });

    const gameId = currentGame.id;
    const { ok, body } = await api(`/api/daily/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify({ score: 0, steps, timeSecs }),
    });
    const stored = ok && body && body.attempt
      ? body.attempt
      : { score: 0, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
  };

  const backToLobby = (tab) => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    if (tab) setLobbyTab(tab);
  };

  const playAgain = () => {
    setWinData(null);
    setLoseData(null);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
  };

  const GameComponent = currentGame ? currentGame.component : null;

  // Reward level surfaced in the nav + lobby. Suppressed when signed out so we
  // never show a multiplier the server can't back.
  const activeMult = authOk ? streakMultiplier(streak) : 1;
  const tierAhead = authOk && streak > 0 ? nextTierInfo(streak) : null;

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <div className="nav-brand"><span className="logo">⬢</span> PuzzleChain</div>
        <div className="nav-right">
          <div className="nav-stats">
            <div className="nav-stat">
              <div className="label">Score</div>
              <div className="value score mono">{totalScore}</div>
            </div>
            <div className="nav-stat">
              <div className="label">Streak</div>
              <div className="value streak mono">
                {streak}
                {authOk && activeBadge(streak) && (
                  <span
                    className="streak-badge-icon"
                    title={`${activeBadge(streak).name} — ${activeBadge(streak).min}-day streak badge`}
                  >
                    {activeBadge(streak).icon}
                  </span>
                )}
                {activeMult > 1 && <span className="mult-badge">×{activeMult}</span>}
              </div>
            </div>
          </div>
          {authOk && walletBalance && (
            <button
              className="nav-wallet-chip"
              title="Open Wallet"
              onClick={() => setScreen('wallet')}
            >
              🪙 {fmtUtgo(walletBalance)}
              {walletMock && <span style={{ fontSize: '0.6rem', color: C.muted, marginLeft: '0.2rem' }}>(demo)</span>}
            </button>
          )}
          {authOk && (
            <button
              className="primary-btn"
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
              onClick={() => setScreen('friends')}
            >
              👥 Friends
            </button>
          )}
          {authOk && integration.enabled && (
            <span
              className="nav-integration-chip"
              title={`dApps integration active${integration.pubkey ? ' · ' + integration.pubkey : ''}`}
            >
              🔗 dApps
            </span>
          )}
          <AccountChip
            loading={loading}
            authOk={authOk}
            user={user}
            walletVerified={walletVerified}
            onOpen={() => setScreen('account')}
          />
        </div>
      </nav>

      {screen === 'profile' && selectedUserId && (
        <ProfileScreen
          userId={selectedUserId}
          user={user}
          onBack={() => { setScreen('lobby'); setSelectedUserId(null); }}
        />
      )}

      {screen === 'friends' && (
        <FriendsListScreen
          onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
          onBack={() => setScreen('lobby')}
        />
      )}

      {screen === 'wallet' && (
        <WalletScreen
          user={user}
          authOk={authOk}
          walletAddr={walletAddr}
          walletMock={walletMock}
          onBack={() => setScreen('lobby')}
          onBalanceRefresh={refreshWalletBalance}
          onOpenReceipt={openReceipt}
        />
      )}

      {screen === 'account' && (
        <AccountScreen
          user={user}
          authOk={authOk}
          walletAddr={walletAddr}
          walletVerified={walletVerified}
          onBack={() => setScreen('lobby')}
          onVerify={connectAndVerifyWallet}
          onDisconnect={disconnectWallet}
        />
      )}

      {screen === 'session' && (
        <SessionReceipt
          sessionId={receiptSessionId}
          onBack={() => setScreen('lobby')}
        />
      )}

      {screen === 'lobby' && (
        <div className="lobby">
          <div className="lobby-head">
            <h1>
              {lobbyTab === 'daily' ? 'Daily Puzzles' : lobbyTab === 'classic' ? 'Classic Games' : 'Community Feed'}
            </h1>
            <p>
              {lobbyTab === 'daily'
                ? 'One attempt each, per day. Resets at midnight UTC.'
                : lobbyTab === 'classic'
                ? 'Play anytime — track your best scores.'
                : 'See what your friends have been playing'}
            </p>
            {lobbyTab === 'daily' && authOk && streak > 0 && (
              <p className="lobby-hint">
                🔥 {streak}-day streak · {tierAhead
                  ? `${tierAhead.daysAway} more daily win${tierAhead.daysAway === 1 ? '' : 's'} → ×${tierAhead.mult} points`
                  : `max ×${activeMult} multiplier active`}
              </p>
            )}
            {lobbyTab === 'daily' && nextResetUtc && (
              <p className="reset-countdown mono">
                Next puzzle in {fmtHoursMins(
                  new Date(nextResetUtc).getTime() - (Date.now() + offset))}
              </p>
            )}
            {lobbyTab === 'daily' && authOk && (() => {
              // Union of permanent earned badges and any the live streak now
              // satisfies, so the strip is correct right after a win too.
              const earned = new Set([...badges, ...streakBadges(streak).map(b => b.min)]);
              if (earned.size === 0) return null;
              const live = activeBadge(streak);
              return (
                <div className="badge-strip">
                  {STREAK_BADGES.filter(b => earned.has(b.min)).map(b => (
                    <span
                      key={b.id}
                      className={`badge-chip${live && live.min === b.min ? ' active' : ''}`}
                      title={`${b.name} · ${b.min}-day streak`}
                    >
                      <span className="badge-chip-icon">{b.icon}</span>
                      {b.name}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="lobby-tabs">
            <button
              className={'lobby-tab' + (lobbyTab === 'daily' ? ' active' : '')}
              onClick={() => setLobbyTab('daily')}
            >Daily Puzzle</button>
            <button
              className={'lobby-tab' + (lobbyTab === 'classic' ? ' active' : '')}
              onClick={() => setLobbyTab('classic')}
            >Classic Games</button>
            {authOk && (
              <button
                className={'lobby-tab' + (lobbyTab === 'feed' ? ' active' : '')}
                onClick={() => setLobbyTab('feed')}
              >Feed</button>
            )}
          </div>
          {lobbyTab === 'pvp' ? (
            <PvpArena user={user} authOk={authOk} walletAddr={walletAddr} walletBalance={walletBalance} onOpenReceipt={openReceipt} />
          ) : lobbyTab === 'feed' ? (
            <FeedScreen user={user} setScreen={setScreen} />
          ) : (
          <div className="grid">
            {GAMES.filter(g => g.category === lobbyTab).map(g => {
              const isClassicOrIdle = g.category === 'classic' || g.category === 'idle';
              const a = attempts[g.id];
              const finished = !isClassicOrIdle && !!(a && a.finishedAt);
              const inProgress = !isClassicOrIdle && !!a && !finished;
              return (
                <div
                  key={g.id}
                  className={`card${finished ? ' done locked' : ''}${inProgress ? ' inprogress' : ''}`}
                  style={{ '--accent': g.tagColor }}
                  onClick={() => !loading && (g.id === 'pvp-arena' ? setCurrentGame(g) : launchGame(g))}
                >
                  <div className="card-icon">{g.icon}</div>
                  <div className="card-name">{g.name}</div>
                  <div className="card-desc">{g.desc}</div>
                  {finished ? (
                    <div className="card-lock">
                      🔒 {a.score != null
                        ? <span>+{a.score} pts · resets in {fmtCountdown(
                            (nextResetUtc ? new Date(nextResetUtc).getTime() : 0) - (Date.now() + offset))}</span>
                        : <span>Played · locked until reset</span>}
                    </div>
                  ) : inProgress ? (
                    <div className="card-resume">▶ In progress · resume</div>
                  ) : (
                    <span
                      className="tag mono"
                      style={{ background: g.tagColor + '22', color: g.tagColor }}
                    >
                      {g.tag}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {screen === 'locked' && currentGame && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={backToLobby}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <LockedScreen
            game={currentGame}
            attempt={attempts[currentGame.id]}
            nextResetUtc={nextResetUtc}
            offset={offset}
            onReset={onReset}
            onBack={backToLobby}
          />
        </div>
      )}

      {screen === 'game' && currentGame && !winData && !loseData && currentGame.id === 'pvp-arena' && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={backToLobby}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <PvpArena user={user} authOk={authOk} walletAddr={walletAddr} walletBalance={walletBalance} />
        </div>
      )}

      {screen === 'game' && currentGame && !winData && !loseData && currentGame.id !== 'pvp-arena' && (
        currentGame.category === 'classic' ? (
          SELF_SHELL_GAMES.has(currentGame.id) ? (
            <GameComponent
              game={currentGame}
              onBack={() => backToLobby('classic')}
              onWin={handleWin}
              onLose={handleLose}
              onStepChange={setStepCount}
              offset={offset}
              resetKey={playAgainKey}
            />
          ) : (
            <ClassicShell
              game={currentGame}
              onExit={() => backToLobby('classic')}
              onNewGame={() => setPlayAgainKey(k => k + 1)}
            >
              <div className="cg-stage cg-scroll">
                <GameComponent
                  onWin={handleWin}
                  onLose={handleLose}
                  onStepChange={setStepCount}
                  offset={offset}
                  resetKey={playAgainKey}
                />
              </div>
            </ClassicShell>
          )
        ) : (
          <div className="game-wrap">
            <div className="game-head">
              <button className="back-btn" onClick={backToLobby}>← Back</button>
              <div className="game-title">
                <span>{currentGame.icon}</span> {currentGame.name}
              </div>
            </div>
            <GameComponent
              onWin={handleWin}
              onLose={handleLose}
              onStepChange={setStepCount}
              offset={offset}
              savedProgress={progressFor(attempts[currentGame.id])}
              onSaveProgress={handleSaveProgress}
              resetKey={playAgainKey}
            />
          </div>
        )
      )}


      {screen === 'game' && winData && (
        <WinOverlay
          winData={winData}
          currentGame={currentGame}
          authOk={authOk}
          onOpenReceipt={openReceipt}
          onPlayAgain={playAgain}
          onBackToLobby={backToLobby}
          onShareToFeed={(data) => setShareModal({ show: true, caption: '', ...data })}
        />
      )}

      {screen === 'game' && loseData && (
        <LoseOverlay
          loseData={loseData}
          currentGame={currentGame}
          onPlayAgain={playAgain}
          onBackToLobby={backToLobby}
        />
      )}

      {shareModal.show && (
        <ShareToFeedModal
          shareModal={shareModal}
          setShareModal={setShareModal}
          onDone={() => backToLobby()}
        />
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
// Signal to the boot-shell watchdog (index.html) that React has mounted, so
// it clears the "taking longer than usual" timer and never flashes the card.
window.__puzzlechainMounted = true;