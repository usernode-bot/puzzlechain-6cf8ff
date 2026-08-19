/* ============================================================
   Root app
   ============================================================ */
// Next-milestone progress hints so a player who finished today sees concrete
// progress even when no badge unlocked this run (e.g. "🔥 2/3 days → On Fire",
// "7/10 solves → Solver"). Each is the nearest UNEARNED milestone of its kind.
function badgeProgressHints(streak, solveCount) {
  const hints = [];
  const ns = nextStreakBadge(streak);
  if (ns) hints.push({ key: 'streak', icon: '🔥', text: `${streak}/${ns.min} days → ${ns.name}` });
  const nm = nextSolveMilestone(solveCount);
  if (nm) hints.push({ key: 'solve', icon: nm.icon, text: `${solveCount || 0}/${nm.count} solves → ${nm.name}` });
  return hints;
}

function App() {
  const [screen, setScreen] = useState(() => {
    // Support ?screen=friends / ?screen=session deep links for testing.
    // ?screen=account (the retired Account screen) now lands on the viewer's
    // own profile — but the user id isn't known until /api/daily resolves,
    // so it's handled by the pendingSelfProfile effect below.
    const params = new URLSearchParams(window.location.search);
    const s = params.get('screen');
    if (s === 'friends') return 'friends';
    if (s === 'session' || params.get('demo') === 'dapp' || params.get('demo') === 'anchor') return 'session';
    return 'lobby';
  }); // 'lobby' | 'game' | 'locked' | 'profile' | 'friends' | 'session'
  // DApp session receipt being viewed (session id), and identity-verified flag.
  // ?demo=anchor deep-links to the staging-seeded anchored daily sudoku receipt.
  const [receiptSessionId, setReceiptSessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sid') || (params.get('demo') === 'anchor' ? 'DAPPDEMOSUDOKU' : null);
  });
  const openReceipt = (sid) => { setReceiptSessionId(sid); setScreen('session'); };
  const [currentGame, setCurrentGame] = useState(null);
  /* #176 — which of the three play modes the current game was opened in.
     null means "no play-mode axis": the head-to-head games, whose axis is the
     opponent picker inside the game. `arcadeBandId` is only meaningful while
     playMode === 'arcade'; `storyBand` only while playMode === 'story'. */
  const [playMode, setPlayMode] = useState(null);
  const [arcadeBandId, setArcadeBandId] = useState('normal');
  const [storyBand, setStoryBand] = useState(0);
  // gameId -> { cleared, total } for the card state line and the story picker.
  const [storyProgress, setStoryProgress] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // Permanent earned streak-milestone day thresholds (e.g. [3, 7, 30]) — kept
  // even after a streak resets, so the lobby can show a collected-badges strip.
  const [badges, setBadges] = useState([]);
  // Non-streak achievement badges earned: { types: [...], milestones: [...] }.
  const [achievements, setAchievements] = useState({ types: [], milestones: [] });
  // Lifetime won-solve count (server-computed), used to drive the
  // "X/Y solves → Solver" next-milestone progress hint.
  const [solveCount, setSolveCount] = useState(0);
  const [winData, setWinData] = useState(null);
  const [loseData, setLoseData] = useState(null);
  // Server-backed per-day attempt state, keyed by game id.
  // { [gameId]: { score, steps, timeSecs, startedAt, finishedAt } }
  const [attempts, setAttempts] = useState({});
  const [nextResetUtc, setNextResetUtc] = useState(null);
  const [offset, setOffset] = useState(0); // serverNow - clientNow (ms)
  const [loading, setLoading] = useState(true);
  // Live step count from the running game. Held in a REF, not state (slice 1):
  // nothing renders it, and the old useState re-rendered the whole App tree on
  // every tap of every game — a measurable part of the input latency the grid
  // dailies were reported for. Kept because launch/resume seed it and future
  // chrome may want to read it.
  const stepCountRef = useRef(0);
  const setStepCount = (n) => { stepCountRef.current = typeof n === 'number' ? n : 0; };
  const [user, setUser] = useState(null);       // { username, id, usernodePubkey }
  const [authOk, setAuthOk] = useState(true);    // false → signed-out / DB unreachable
  const [, setTick] = useState(0); // 1s heartbeat to keep lobby countdowns live
  // Lobby view (phase 7 home reorg): 'home' is the single scrolling home
  // (GotD hero → in-progress → all games); 'ladder' is the one remaining
  // sub-screen. Legacy ?tab=daily/classic/feed deep links land on home (the
  // Community Feed was retired — chat, share cards, and Friends boards are
  // the social surface now).
  const [lobbyTab, setLobbyTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'ladder' ? 'ladder' : 'home';
  });
  // End-screen board review (slice 4): true while the results card is tucked
  // into its minibar and the finished board is on show underneath.
  const [reviewMode, setReviewMode] = useState(() =>
    new URLSearchParams(window.location.search).get('review') === '1'
  );
  /* PHASE 4 (#133) — practice replay. Replays TODAY'S exact puzzle with the
     score shown but never recorded: no /start, no /finish, no /progress, no
     dailyRunLog entry, and handleWin/handleLose bail out early so streak,
     badges, bests and leaderboards cannot move. */
  const [practiceMode, setPracticeMode] = useState(() =>
    new URLSearchParams(window.location.search).get('practice') === '1'
  );
  const [practiceResult, setPracticeResult] = useState(null);
  // #122 — is the locked-day review board on show (vs the result card)?
  const [lockedReview, setLockedReview] = useState(() =>
    new URLSearchParams(window.location.search).get('review') === '1'
  );
  // PHASE 4 (#132) — force the offline-sync card so its reworded copy is
  // reachable by a screenshot/proposal test without unplugging the network.
  const [syncFailDemo] = useState(() =>
    new URLSearchParams(window.location.search).get('syncfail') === '1'
  );
  // Merged-grid filter (slice 2). The retired ?tab=daily / ?tab=classic deep
  // links now preselect the matching chip instead of being ignored, which is
  // also what keeps the existing "/?tab=classic" proposal checks meaningful.
  const [homeFilter, setHomeFilter] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'daily' || t === 'classic' ? t : 'all';
  });
  // Game of the Day (phase 7): { date, gameId, seed } from daily_featured.
  const [featured, setFeatured] = useState(null);
  // The viewer's active online matches (your-turn row), from /api/rooms/mine.
  const [myRooms, setMyRooms] = useState([]);
  // Game whose public chat room is open (null = closed).
  const [chatGame, setChatGame] = useState(null);
  // Phase 8 "make it count": banner shown after a pending anonymous run was
  // retroactively committed on an authenticated load.
  const [commitNotice, setCommitNotice] = useState(null);
  // What's-new sheet + the dismissible "New this week" strip. Dismissal is
  // deliberately per-page-load (plain state, no persistence): ✕ hides the
  // strip for this visit only, and it reappears on the next refresh — the
  // strip's "See all ›" is the only entry point to the weekly sheet.
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wnDismissed, setWnDismissed] = useState(false);
  const dismissWhatsNew = () => setWnDismissed(true);
  // Incremented to trigger MinesweeperGame reset on Play Again
  const [playAgainKey, setPlayAgainKey] = useState(0);
  // Classic Games — Game Menu state. `classicGameMode` is the active mode of
  // the current classic game ('bot' | '2p' | 'online' | null); `classicLastResult`
  // is the most recent finished classic result so the menu's Post to Feed works
  // even after Play Again.
  const [classicGameMode, setClassicGameMode] = useState(null);
  const [classicGameModeOpts, setClassicGameModeOpts] = useState(null);
  const [classicLastResult, setClassicLastResult] = useState(null);
  // Pre-launch game-mode modal (multi-mode classic games, e.g. 2048 / Block Blast)
  const [preLaunchGame, setPreLaunchGame] = useState(null);
  // Shell-owned chrome (phase 3): all-time personal bests per daily game
  // (from /api/daily), and the game whose How-to-Play modal is open (null =
  // closed). The modal renders above every screen/shell.
  const [bests, setBests] = useState({});
  const [howToGame, setHowToGame] = useState(null);
  // Social: profile viewing and friends list
  const [selectedUserId, setSelectedUserId] = useState(null);
  // ?screen=account / ?screen=profile deep links open the viewer's OWN
  // profile, which needs the user id from /api/daily — remembered here and
  // consumed once the load settles.
  const pendingSelfProfile = useRef((() => {
    const s = new URLSearchParams(window.location.search).get('screen');
    return s === 'account' || s === 'profile';
  })());

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ============================================================
     PHASE 4 (#134, part two) — browser/platform history.
     There was NO pushState / replaceState / popstate anywhere in this file, so
     the device back gesture exited the app instead of unwinding a screen — from
     a game, a profile, the Friends list, the Ladder, and every overlay. One
     reducer owns it:
       • every navigable state pushes one entry;
       • popstate DERIVES state from the event (never navigates imperatively),
         so back unwinds review → results → screen → home one step at a time;
       • a change caused BY a pop must not push again (navLock);
       • existing deep-link params survive — the URL keeps them so a mid-flow
         reload lands in the same place.
     ============================================================ */
  const navLock = useRef(false);
  const navReady = useRef(false);

  /* The single description of "where am I", used for both push and restore.
     EVERY field must be a primitive: this object is JSON.stringify'd on each
     render, and one DOM-bearing value (a stray SyntheticEvent — see #150)
     throws "Converting circular structure to JSON", which with no error
     boundary above it unmounted the entire root. `navPrimitive` is the
     barrier; the `nav-state-primitives` self-test asserts it holds. */
  const navState = {
    screen: navPrimitive(screen),
    gameId: currentGame ? navPrimitive(currentGame.id) : null,
    lobbyTab: navPrimitive(lobbyTab),
    selectedUserId: navPrimitive(selectedUserId),
    reviewMode: !!reviewMode,
    practiceMode: !!practiceMode,
    overlay: settingsOpen ? 'settings' : howToGame ? 'howto' : chatGame ? 'chat' : whatsNewOpen ? 'whatsnew' : null,
    overlayArg: navPrimitive(howToGame ? howToGame.id : chatGame ? (chatGame.id || chatGame) : null),
  };
  const navKey = JSON.stringify(navState);

  useEffect(() => {
    if (navLock.current) { navLock.current = false; return; }
    try {
      // Keep the query string intact so ?game=, ?tab=, ?theme=, ?chat= … all
      // still work after a reload mid-flow.
      const url = window.location.pathname + window.location.search + window.location.hash;
      if (!navReady.current) {
        navReady.current = true;
        window.history.replaceState({ un: navState }, '', url);
      } else {
        window.history.pushState({ un: navState }, '', url);
      }
    } catch {}
  }, [navKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state && e.state.un;
      navLock.current = true;
      if (!s) {
        // Popped past our first entry — land on home rather than a blank state.
        setScreen('lobby'); setCurrentGame(null); setReviewMode(false);
        setSettingsOpen(false); setHowToGame(null); setChatGame(null); setWhatsNewOpen(false);
        return;
      }
      // Overlays first: closing one is the cheapest back step.
      setSettingsOpen(s.overlay === 'settings');
      setWhatsNewOpen(s.overlay === 'whatsnew');
      setHowToGame(s.overlay === 'howto' ? (GAMES.find(g => g.id === s.overlayArg) || null) : null);
      setChatGame(s.overlay === 'chat' ? (GAMES.find(g => g.id === s.overlayArg) || null) : null);
      setLobbyTab(s.lobbyTab || 'home');
      setSelectedUserId(s.selectedUserId || null);
      setReviewMode(!!s.reviewMode);
      setPracticeMode(!!s.practiceMode);
      if (s.screen === 'game' || s.screen === 'pregame' || s.screen === 'locked') {
        const g = GAMES.find(x => x.id === s.gameId);
        if (g) { setCurrentGame(g); setScreen(s.screen); }
        else { setCurrentGame(null); setScreen('lobby'); }
      } else {
        setCurrentGame(null);
        setScreen(s.screen || 'lobby');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* PHASE 3 — document-level scroll lock while a run is live. `fitShell` only
     covers dailies that opted in and shell:'self' games bypass it entirely, so
     locking the document is what makes "nothing scrolls during play" true for
     all 33 games. Released the moment a result screen appears (that scrolls). */
  useScrollLock(screen === 'game' && !!currentGame && !winData && !loseData && !practiceResult);

  // Per-run daily move log (phase 2). Every daily game feeds move events with
  // client timestamps into this ref — the Daily Tile Match via its native
  // onMoveTile (engine-shaped { tileType } moves, replay-eligible), the other
  // dailies via their onStepChange calls (timestamp-only events for the
  // server's tier-B timing heuristics). `replayOk` goes false when the run
  // can't be fully replayed server-side: a resume (earlier moves predate this
  // mount) or a booster (not modeled by the replay engine). Submitted with
  // /finish; reset by launchGame so a retry re-sends the same log.
  const dailyRunLog = useRef({ moves: [], replayOk: true });
  const recordDailyMove = (m) => {
    const log = dailyRunLog.current;
    if (m && m.replayBreak) log.replayOk = false;
    if (log.moves.length < 800) {
      log.moves.push({ ...m, tsClient: m && m.tsClient != null ? m.tsClient : Date.now() });
    }
  };

  // Hydrate today's locked/result state from the server on mount, and
  // recompute the score from finished attempts so it survives reloads.
  // Phase 8 "make it count": on an authenticated load, retroactively commit
  // any SAME-DAY pending anonymous runs through POST /api/daily/:gameId/commit
  // (full validation parity with normal finishes), then clear the local slot.
  // Expired (410), already-played (409), or invalid (400) runs are discarded —
  // boards freeze at midnight UTC and a signed-in run always stands. Server
  // hiccups keep the run for a retry on the next load.
  const commitPendingRuns = async (daily) => {
    const runs = loadPendingRuns();
    const ids = Object.keys(runs);
    if (!ids.length) return;
    const serverDayNum = Math.floor(new Date(daily.serverNowUtc).getTime() / 86400000);
    for (const gid of ids) {
      const run = runs[gid];
      const game = GAMES.find((g) => g.id === gid);
      if (!run || !game || run.dayNum !== serverDayNum || !(run.score > 0)) {
        clearPendingRun(gid);
        continue;
      }
      if (daily.attempts && daily.attempts[gid] && daily.attempts[gid].finishedAt) {
        clearPendingRun(gid); // already played signed-in — that run stands
        continue;
      }
      try {
        const { ok, status, body } = await api(`/api/daily/${gid}/commit`, {
          method: 'POST',
          body: JSON.stringify({
            seed: run.seed, score: run.score, steps: run.steps, timeSecs: run.secs,
            moves: Array.isArray(run.moves) ? run.moves : [],
            replay: run.replay === true,
          }),
        });
        if (ok && body && body.attempt) {
          setAttempts((prev) => ({ ...prev, [gid]: body.attempt }));
          if (typeof body.streak === 'number') setStreak(body.streak);
          setTotalScore((t) => t + (body.attempt.score || 0));
          setCommitNotice(`✅ Your guest ${game.name} run now counts — you're on today's board!`);
          clearPendingRun(gid);
        } else if (Number.isFinite(status) && status !== 500 && status !== 0) {
          clearPendingRun(gid);
        }
      } catch {}
    }
  };

  const loadDaily = async () => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const path = '/api/daily' + (demo ? `?demo=${encodeURIComponent(demo)}` : '');
    const { ok, status, body } = await api(path);
    if (ok && body) {
      GUEST_MODE = false;
      setAuthOk(true);
      setUser(body.user || null);
      setAttempts(body.attempts || {});
      setNextResetUtc(body.nextResetUtc);
      setStreak(typeof body.streak === 'number' ? body.streak : 0);
      setSolveCount(Number.isFinite(body.solveCount) ? body.solveCount : 0);
      setBadges(Array.isArray(body.badges) ? body.badges : []);
      setAchievements(body.achievements && Array.isArray(body.achievements.types)
        ? { types: body.achievements.types, milestones: body.achievements.milestones || [] }
        : { types: [], milestones: [] });
      // Server-issued daily seeds — must land before any daily game mounts
      // (they do: games launch from the lobby, which renders after loading).
      SERVER_DAILY_SEEDS = body.seeds || {};
      setBests(body.bests || {});
      /* #176 — story progress is loaded alongside the daily state rather than
         folded into it: it is not day-scoped, so it does not belong on a route
         whose whole contract is "today". Failure is silent because the home
         grid degrades to showing no ladder counts rather than not rendering. */
      api('/api/story').then(r => {
        if (r.ok && r.body && r.body.progress) setStoryProgress(r.body.progress);
      }).catch(() => {});
      setFeatured(body.featured || null);
      setOffset(new Date(body.serverNowUtc).getTime() - Date.now());
      const sum = Object.values(body.attempts || {})
        .reduce((acc, a) => acc + (a.score || 0), 0);
      setTotalScore(sum);
      // Phase 8 "make it count": commit any same-day pending anonymous runs
      // now that we're authenticated. Fire-and-forget; state merges on success.
      commitPendingRuns(body);
      // ?screen=account / ?screen=profile deep link: now that we know who the
      // viewer is, open their own profile (one-shot).
      if (pendingSelfProfile.current && body.user && body.user.id) {
        pendingSelfProfile.current = false;
        setSelectedUserId(body.user.id);
        setScreen('profile');
      }
    } else {
      // 401 (no/expired token) or 5xx (DB down): can't confirm the account,
      // so persistence isn't guaranteed — reflect that in the nav.
      GUEST_MODE = true;
      setAuthOk(false);
      setUser(null);
      setStreak(0);
      setSolveCount(0);
      setBadges([]);
      setAchievements({ types: [], milestones: [] });
      // Signed-out (or backend hiccup): the public read surface still supplies
      // server time, the reset countdown, and today's board seeds, so the
      // signed-out lobby stays anchored to server time.
      try {
        const pub = await api('/api/public/daily');
        if (pub.ok && pub.body) {
          SERVER_DAILY_SEEDS = pub.body.seeds || {};
          if (pub.body.nextResetUtc) setNextResetUtc(pub.body.nextResetUtc);
          if (pub.body.serverNowUtc) setOffset(new Date(pub.body.serverNowUtc).getTime() - Date.now());
          if (pub.body.featured) setFeatured(pub.body.featured);
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, []);

  // Home in-progress row (phase 7): the viewer's active online matches.
  // Refetched on every return to the lobby so a just-made move updates the
  // your-turn flag without waiting for a reload.
  useEffect(() => {
    if (loading || !authOk || screen !== 'lobby') return;
    api('/api/rooms/mine')
      .then(({ ok, body }) => { if (ok && body) setMyRooms(body.rooms || []); })
      .catch(() => {});
  }, [loading, authOk, screen]);

  // ?demo=makeitcount: render the anonymous end screen (score + would-be rank
  // + "make it count" CTA) without an actual signed-out session, so proposal
  // checks can assert on it. The server side of this param seeds today's
  // boards (same fixture as demo=leaderboard) so the rank-preview has real
  // ranks to compute against. Available in every environment — it's an
  // explicit opt-in demo param, not an env-gated code path.
  useEffect(() => {
    if (loading) return;
    if (new URLSearchParams(window.location.search).get('demo') !== 'makeitcount') return;
    const g = GAMES.find((x) => x.id === 'sudoku');
    if (!g) return;
    setCurrentGame(g);
    setScreen('game');
    setWinData({
      score: 905, bonus: 0, finalScore: 905, steps: 21, timeSecs: 95,
      multiplier: 1, effectiveStreak: 0,
      guest: true, guestSaved: false, gameId: 'sudoku',
      share: `Game Corner Sudoku — solved today's board in 01:35!\nPlay the same board (no login): ${window.location.origin}/?game=sudoku`,
    });
    api('/api/public/daily/sudoku/rank-preview?timeSecs=95&steps=21')
      .then(({ ok, body }) => {
        if (ok && body && Number.isFinite(body.rank)) {
          setWinData((prev) => (prev && prev.guest ? { ...prev, guestRank: body.rank, guestOf: body.of } : prev));
        }
      })
      .catch(() => {});
  }, [loading]);

  // ?chat=<gameId> deep link opens that game's chat room once the daily load
  // (and any ?demo= fixture seeding inside it) has settled. Proposal tests use
  // it; it's also a handy share target.
  useEffect(() => {
    if (loading) return;
    const cid = new URLSearchParams(window.location.search).get('chat');
    if (!cid) return;
    const g = GAMES.find((x) => x.id === cid);
    if (g) setChatGame(g);
  }, [loading]);

  // Theme test hooks (also useful as share/deep links):
  //   ?theme=light|dark|system — applies + persists the preference
  //   ?settings=1              — opens the Settings sheet
  // Read once on mount; the theme applier already ran at module scope, so this
  // only overrides an explicit request.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('theme');
    if (t && THEME_PREFS.indexOf(t) >= 0) applyTheme(t, true);
    if (q.get('settings') === '1') setSettingsOpen(true);
  }, []);


  // Midnight UTC reached — reload state so everything unlocks.
  const onReset = () => {
    setScreen('lobby');
    setCurrentGame(null);
    setWinData(null);
    setLoseData(null);
    loadDaily();
  };

  // Opening a game lands on the shell-owned PRE-GAME screen (phase 3) — the
  // day's attempt is only claimed when the player hits Play (startDailyRun),
  // so browsing the pre-game screen never burns the attempt. The How-to-Play
  // cards auto-open on a player's first-ever open of each game; because timed
  // dailies only mount (and start their clock) after Play, the auto-shown
  // how-to can never eat into the timer.
  /* Story opens on the first band you have not cleared, not on band 0 — the
     ladder is a progression, so re-entering it should carry on rather than
     restart. Falls back to 0 before progress has loaded. */
  const nextUnclearedBand = (gameId) => {
    const p = storyProgress[gameId];
    if (!p || !p.total) return 0;
    return Math.min(p.cleared, p.total - 1);
  };

  const launchGame = (game, mode) => {
    allowProgressSave(game.id); // a new run lifts any prior finish guard
    /* #176 — `mode` is the play mode the card button asked for. It is
       authoritative over the registry's legacy `daily` flag: Block Fit is a
       classic entry that now has a daily, and Tile Match's free-play entry
       serves both story and arcade. Fall back to the entry's own default so
       every pre-#176 call site (deep links, resume, practice) still works. */
    const pm = isPlayMode(mode) ? mode : defaultPlayMode(game);
    setPlayMode(pm);
    if (pm === 'story') setStoryBand(nextUnclearedBand(game.id));
    if (pm !== 'daily') {
      setCurrentGame(game);
      setStepCount(0);
      setWinData(null);
      setLoseData(null);
      setScreen('game');
      // Classic games mount immediately, so the first-open how-to overlays
      // the running game (none of the in-scope classics are hard-timed).
      // Suppressed when ?sheet= asked for a specific sheet tab: the player named
      // the screen they wanted, so covering it with an unrequested modal is
      // wrong (and it hid the leaderboard in the deep link's screenshot).
      if (game.howToPlay && game.howToPlay.length && !howtoSeen(game.id) && !classicSheetDeepLink()) {
        setHowToGame(game);
      }
      return;
    }
    const existing = attempts[game.id];
    if (existing && existing.finishedAt) {
      // Finished today — straight to the locked screen.
      setCurrentGame(game);
      setScreen('locked');
      return;
    }
    setCurrentGame(game);
    setWinData(null);
    setLoseData(null);
    setScreen('pregame');
    if (game.howToPlay && game.howToPlay.length && !howtoSeen(game.id)) setHowToGame(game);
  };

  // Claim (or resume) the day's single attempt and mount the game. Extracted
  // from launchGame so the pre-game screen's Play button owns consume-on-start.
  const startDailyRun = async (game) => {
    allowProgressSave(game.id); // claiming/resuming a run lifts the finish guard
    // Guest mode (phase 8): a signed-out visitor plays today's board from the
    // public seed with NO server claim — the one-play lock is account-keyed
    // and can't apply to guests (§6.7's structural defense: the board only
    // takes accounted entries, so replaying anonymously buys nothing). The
    // finished run is held locally and committed retroactively on sign-in.
    if (!authOk) {
      dailyRunLog.current = { moves: [], replayOk: true };
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
        setCurrentGame(game);
        setScreen('locked');
      } else {
        // Claimed but unfinished — resume into the saved board state. The row
        // is already claimed, so do NOT call /start again. A resumed run's
        // earlier moves predate this page load, so its finish can't be
        // replay-validated (server falls back to tier-B heuristics).
        dailyRunLog.current = { moves: [], replayOk: false };
        setCurrentGame(game);
        setStepCount(existing.steps || 0);
        setWinData(null);
        setLoseData(null);
        setScreen('game');
      }
      return;
    }
    const { ok, status, body } = await api(`/api/daily/${game.id}/start`, { method: 'POST' });
    // Merge the seed issued with the claim — covers a client that sat on the
    // lobby across the UTC reset, whose mount-time seeds are yesterday's.
    if (body && Number.isFinite(body.seed)) SERVER_DAILY_SEEDS[game.id] = body.seed;
    if (ok) {
      if (body && body.nextResetUtc) setNextResetUtc(body.nextResetUtc);
      dailyRunLog.current = { moves: [], replayOk: true };
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
      dailyRunLog.current = { moves: [], replayOk: false };
      setCurrentGame(game);
      setScreen(body && body.attempt && !body.attempt.finishedAt ? 'game' : 'locked');
    }
  };

  // Deep-link: ?game=<id> auto-opens that game once loaded. Combined with
  // ?mmode=daily it jumps straight into Mancala's Daily Challenge — used by the
  // Daily Challenge proposal tests and shareable links. Runs once after hydrate.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (loading || deepLinkedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('game');
    if (!gid) return;
    const g = GAMES.find(x => x.id === gid);
    if (!g) return;
    deepLinkedRef.current = true;
    // ?mode= / ?mmode= both pin a classic game's mode (#144: land straight in a
    // bot or pass-and-play match without a second account, which is also how the
    // proposal tests screenshot the Gomoku ghost-confirm and Ludo token pad).
    // ?rooms=mine implies Online — it must skip the mode modal, or the deep link
    // lands on a chooser instead of the "Your rooms" list it names (#145).
    const wantsRooms = params.get('rooms') === 'mine';
    const mmode = params.get('mmode') || params.get('mode') || (wantsRooms ? 'online' : null);
    /* PHASE 1 — ?result=1 mounts the game and opens a representative results
       card over its frozen board. The end-of-run screen is otherwise reachable
       only by finishing a run, which navigation-only screenshots and proposal
       checks cannot do. Records nothing (see openResultDemo).

       Checked BEFORE the pre-launch modal on purpose: 2048 and Block Fit carry
       preLaunchModal, so anything below that branch would surface the mode
       chooser instead of the screen the link names. openResultDemo pins solo
       mode itself. */
    if (params.get('result') === '1') {
      openResultDemo(g);
      setHowToGame(null);
      return;
    }
    // Multi-mode classic games open the pre-launch modal unless a mode is
    // pinned via ?mmode= (then launch straight into it).
    if (g.preLaunchModal && !mmode) { setPreLaunchGame(g); return; }
    if (g.preLaunchModal && mmode) { setClassicGameMode(mmode); }
    // ?play=1 skips the pre-game screen (and the first-open how-to) and
    // claims/mounts immediately — used by proposal tests that assert on
    // in-game UI, and by "jump straight in" share links.
    if (params.get('play') === '1') {
      if (g.daily) { startDailyRun(g); return; }
      launchGame(g);
      setHowToGame(null); // suppress the classic first-open auto-show too
      return;
    }
    // #133 — ?practice=1 mounts today's puzzle as an unscored replay. No /start
    // claim, so it works whether or not the day has been played.
    if (params.get('practice') === '1' && g.daily) {
      startPractice(g);
      setHowToGame(null);
      return;
    }
    // #145 — ?rooms=mine lands on the online setup with the "Your rooms" list
    // showing, which is otherwise only reachable by picking Online in the modal.
    if (wantsRooms) {
      setClassicGameMode('online');
      setClassicGameModeOpts(null);
      setPreLaunchGame(null);
      launchGame(g);
      setHowToGame(null);
      return;
    }
    launchGame(g);
  }, [loading]);

  // Merge a stored attempt's persisted progress JSON with its steps/elapsed so
  // a game component can hydrate from a single savedProgress object.
  const progressFor = (attempt) => {
    if (!attempt || !attempt.progress) return null;
    return { ...attempt.progress, steps: attempt.steps, elapsedSecs: attempt.elapsedSecs };
  };

  // Autosave callback handed to every game: persists in-progress state for
  // today's claimed, unfinished attempt. Best-effort (keepalive) so it survives
  // a tab close. Never blocks gameplay.
  //
  // COALESCED (slice 1): games call this on every move, and firing a POST +
  // a full App re-render per tap was a large share of the "laggy clicking"
  // in the grid dailies. The latest payload is held in a ref and flushed on a
  // trailing timer; the local `attempts` mirror moves into that same flush so
  // a tap no longer re-renders the tree. Resume semantics are unchanged — the
  // flush always sends the newest state, and unmount/visibilitychange (via
  // useAutosave's teardown) force it out immediately.
  // `blockedGameId` is the finish guard: once a run ends, ALL further progress
  // writes for that game are dropped until a new run is claimed. A one-shot
  // queue drain isn't enough — unmounting the game body runs useAutosave's
  // teardown flush, which would re-queue a write against the row the finish
  // just closed and 409 (a console error that trips the no-console-errors
  // check). This also covers the games that don't self-suppress their winning
  // move's save.
  const saveQueueRef = useRef({ timer: null, gameId: null, payload: null, blockedGameId: null });
  const PROGRESS_FLUSH_MS = 1000;

  const flushProgressSave = () => {
    const q = saveQueueRef.current;
    if (q.timer) { clearTimeout(q.timer); q.timer = null; }
    const gameId = q.gameId, payload = q.payload;
    q.gameId = null; q.payload = null;
    if (!gameId || !payload) return;
    api(`/api/daily/${gameId}/progress`, {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        progress: payload.progress, steps: payload.steps, elapsedSecs: payload.secs,
      }),
    }).catch(() => {});
    // Keep local mirror fresh so a same-session re-entry resumes correctly.
    setAttempts(prev => {
      const a = prev[gameId];
      if (!a || a.finishedAt) return prev;
      return { ...prev, [gameId]: { ...a, progress: payload.progress, steps: payload.steps, elapsedSecs: payload.secs } };
    });
  };

  // Drop any queued write without sending it, and block further writes for
  // this game. Called the moment a run finishes so nothing can race the finish
  // and 409 against the closed row (the phase-6 "no progress save on the
  // winning move" rule, generalized to every finish path).
  const cancelProgressSave = () => {
    const q = saveQueueRef.current;
    if (q.timer) { clearTimeout(q.timer); q.timer = null; }
    if (currentGame) q.blockedGameId = currentGame.id;
    q.gameId = null; q.payload = null;
  };

  // Lift the finish guard when a fresh run is claimed/mounted for a game.
  const allowProgressSave = (gameId) => {
    const q = saveQueueRef.current;
    if (q.blockedGameId === gameId) q.blockedGameId = null;
  };

  const handleSaveProgress = (progress, steps, secs) => {
    if (!currentGame) return;
    // #122 — remember the latest snapshot even for guests / blocked queues, so
    // the finish can attach it as the reviewable final board.
    lastProgressRef.current = { gameId: currentGame.id, progress };
    // Guests have no server attempt row to save into — the POST would just
    // 401 and log console errors. A guest run lives only until its finish.
    if (!authOk) return;
    const gameId = currentGame.id;
    const q = saveQueueRef.current;
    if (q.blockedGameId === gameId) return; // run already finished

    // Switching games mid-queue: get the old game's state out first.
    if (q.gameId && q.gameId !== gameId) flushProgressSave();
    q.gameId = gameId;
    q.payload = { progress, steps, secs };
    if (!q.timer) q.timer = setTimeout(() => { saveQueueRef.current.timer = null; flushProgressSave(); }, PROGRESS_FLUSH_MS);
  };

  // Never strand a queued write on unload.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushProgressSave(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushProgressSave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushProgressSave);
      flushProgressSave();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // POST the finished daily result to the server and reconcile client state.
  // Pulled out of handleWin so the win overlay's "couldn't sync — retrying"
  // button can re-run exactly the same submission. Returns true on success.
  // Best-effort: a network throw is treated as a failed sync (syncError), never
  // an uncaught rejection that would break the overlay.
  // Three-line share card (spec-audit item 6): an edition/date line, the
  // game's own spoiler-free result line, then rank + the playable no-login
  // challenge link. `rank` is optional — the card reads fine while it's still
  // being fetched (or for guests before the rank preview lands).
  const buildShareCard = (gameId, resultLine, rank) => {
    const d = new Date(Date.now() + offset);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const lines = [`Game Corner No. ${utcDayNum(offset) - 20000} · ${dateStr}`];
    // Game result lines historically self-prefix the app name; strip it so
    // the card doesn't read "Game Corner … Game Corner …".
    if (resultLine) lines.push(resultLine.replace(/^Game Corner /, ''));
    lines.push(
      (Number.isFinite(rank) ? `#${rank} on today's board · ` : '') +
      `Play the same deal (no login): ${window.location.origin}/?game=${gameId}`
    );
    return lines.join('\n');
  };

  /* The last in-play progress payload a game handed us, kept so the finish can
     carry a final board snapshot for the locked-day review screen (#122).
     Read from the SAME coalesced autosave path the games already use — we never
     ask a game to save on its winning move (that write 409s against the row the
     finish is closing), so this is the freshest legal snapshot available. */
  const lastProgressRef = useRef({ gameId: null, progress: null });

  const submitDailyFinish = async (gameId, finalScore, steps, timeSecs) => {
    let ok = false, body = null;
    try {
      // Attach the per-run move log (phase 2): engine-shaped moves make the
      // finish replay-validatable (tier A); timestamp-only events feed the
      // server's tier-B timing heuristics. The ref survives until the next
      // launchGame, so the overlay's retry re-sends the identical log.
      const log = dailyRunLog.current;
      const moves = log.moves.slice(0, 800);
      const res = await api(`/api/daily/${gameId}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          score: finalScore, steps, timeSecs,
          moves,
          replay: log.replayOk && moves.some(m => Number.isInteger(m.tileType)),
          // #122 — final board snapshot, written in the same UPDATE server-side.
          progress: lastProgressRef.current.gameId === gameId
            ? lastProgressRef.current.progress : null,
        }),
      });
      ok = res.ok; body = res.body;
    } catch (e) {
      console.error('[daily] finish submit threw:', e && e.message);
      ok = false;
    }
    // Local mirror so the lobby card locks even if the server didn't confirm.
    const stored = ok && body && body.attempt
      ? body.attempt
      : { gameId, score: finalScore, steps, timeSecs, finishedAt: new Date().toISOString() };
    setAttempts(prev => ({ ...prev, [gameId]: stored }));
    if (ok) {
      // Reconcile against the server's authoritative streak + reward + new
      // achievement badges, and clear any prior sync-error flag.
      if (body && typeof body.streak === 'number') setStreak(body.streak);
      if (body && Number.isFinite(body.solveCount)) setSolveCount(body.solveCount);
      const newAch = (body && Array.isArray(body.newAchievements)) ? body.newAchievements : [];
      if (newAch.length) {
        setAchievements(prev => mergeAchievements(prev, newAch));
        // Reflect any server-confirmed streak milestones in the permanent
        // `badges` state too (their day thresholds), so the lobby's streak
        // chips light immediately even if the client's optimistic streak math
        // missed the exact tier.
        const streakDays = newAch
          .filter(a => a && a.type === 'streak_milestone' && a.metadata && Number.isFinite(+a.metadata.streak))
          .map(a => +a.metadata.streak);
        if (streakDays.length) {
          setBadges(prev => Array.from(new Set([...prev, ...streakDays])).sort((a, b) => a - b));
        }
      }
      setWinData(prev => {
        if (!prev) return prev;
        // De-dup the win overlay: the client-side fast-path already shows
        // `justBadge` for the streak tier this win landed on. Pick the first
        // NEW achievement that isn't that same streak badge so we never show
        // one badge twice. If the only new achievement IS the streak badge the
        // fast-path missed (stale client streak), this surfaces it as the
        // server backstop.
        const shownMin = prev.justBadge && prev.justBadge.min;
        const firstNew = newAch.find(a => {
          if (a && a.type === 'streak_milestone') return +(a.metadata && a.metadata.streak) !== shownMin;
          return true;
        });
        return {
          ...prev,
          syncError: false,
          newAchievements: newAch,
          justAchievement: firstNew ? achievementBadgeFor(firstNew) : prev.justAchievement,
        };
      });
      // DApp Mode: surface the Verified badge, then anchor on-chain (best-effort).
      if (body && body.dapp) {
        setWinData(prev => prev ? { ...prev, dapp: body.dapp } : prev);
        dappAnchor(body.dapp).then(updated => {
          setWinData(prev => prev ? { ...prev, dapp: updated } : prev);
        }).catch(() => {});
      }
    } else {
      setWinData(prev => prev ? { ...prev, syncError: true } : prev);
    }
    return ok;
  };

  /* #176 story — a rung is ticked off by the SERVER, once, on first clear.
     total_score is an incrementing column (`total_score = total_score + $n`),
     so it is not idempotent and a retry would double-credit. The award is
     therefore gated on the progression row's claim succeeding, exactly the way
     the daily's consume-on-start claim works. A replay of a cleared band is
     inert by design: story pays the first time and never again. */
  const handleBandCleared = async (bandIndex, meta) => {
    if (practiceMode || !authOk) return;
    const gameId = currentGame && currentGame.id;
    if (!gameId) return;
    const { ok, body } = await api(`/api/story/${gameId}/clear`, {
      method: 'POST',
      body: JSON.stringify({
        band: bandIndex,
        score: (meta && meta.score) || 0,
        timeSecs: (meta && meta.timeSecs) || 0,
        steps: (meta && meta.steps) || 0,
      }),
    }).catch(() => ({ ok: false, body: null }));
    if (ok && body) {
      setStoryProgress(prev => ({ ...prev, [gameId]: { cleared: body.cleared, total: body.total } }));
      if (body.awarded) setTotalScore(t => t + body.awarded);
    }
  };

  const handleWin = async (score, steps, timeSecs, meta) => {
    // The run is over: drop any queued progress write so a trailing flush
    // can't land on the row the finish is about to close (a 409 + console
    // error that would trip the no-console-errors check).
    cancelProgressSave();
    /* PHASE 4 (#133) — a practice replay is scored LOCALLY and stops here.
       No endpoint call, no streak, no badges, no bests, no leaderboard, no
       dailyRunLog submission. This early return is the single guarantee that
       "play again for fun" can never touch a real record. */
    if (practiceMode) {
      // `gameId` so the shared boardReviewable guard can confirm the result
      // belongs to the game that is actually mounted (phase 1).
      setPracticeResult({
        score, steps, timeSecs, share: meta && meta.share, won: true,
        gameId: currentGame ? currentGame.id : null,
      });
      return;
    }
    try {
      // Non-daily games skip the server, streak, and totalScore nav update.
      if (currentGame && !currentGame.daily) {
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
          gameId: currentGame.id,
        });
        // Remember the round's result for the Game Menu (kept for future
        // share affordances; the feed post button was retired).
        setClassicLastResult({ gameId: currentGame.id, score, steps, timeSecs });
        return;
      }
      // Declare gameId FIRST — referencing it before this line is a temporal
      // dead zone ReferenceError that previously killed the entire win flow
      // (no overlay, no finish call). Keep this above setWinData.
      const gameId = currentGame.id;
      // Guest run (phase 8): no server finish. Hold the run locally as a
      // same-day pending run (moves + seed, the exact payload a normal finish
      // sends, so the retroactive commit gets full validation parity), fetch
      // the would-be rank from the public read surface, and show the
      // anonymous end screen with the "make it count" CTA.
      if (!authOk) {
        const log = dailyRunLog.current;
        const seed = serverDailySeed(gameId);
        if (seed != null) {
          savePendingRun(gameId, {
            dayNum: utcDayNum(offset), gameId, seed,
            score, steps, secs: timeSecs,
            moves: log.moves.slice(0, 800),
            replay: log.replayOk && log.moves.some(m => Number.isInteger(m.tileType)),
            at: new Date().toISOString(),
          });
        }
        setWinData({
          score, bonus: 0, finalScore: score, steps, timeSecs,
          multiplier: 1, effectiveStreak: 0,
          guest: true, guestSaved: seed != null,
          share: buildShareCard(gameId, meta && meta.share),
          gameId,
        });
        try {
          const { ok, body } = await api(
            `/api/public/daily/${gameId}/rank-preview?timeSecs=${Math.round(timeSecs || 0)}&steps=${Math.round(steps || 0)}&score=${Math.round(score || 0)}`
          );
          if (ok && body && Number.isFinite(body.rank)) {
            // Would-be rank into the CTA and the share card's rank line alike.
            setWinData(prev => (prev && prev.guest
              ? { ...prev, guestRank: body.rank, guestOf: body.of, share: buildShareCard(gameId, meta && meta.share, body.rank) }
              : prev));
          }
        } catch {}
        return;
      }
      // The streak this win lands in. GotD-participation semantics: only
      // finishing TODAY'S FEATURED game extends the consecutive-day streak by
      // 1 (the server's computeStreak reconciles via the finish response);
      // every other daily reuses the current day count — the multiplier stays
      // per-day, not per-game.
      const isFeaturedWin = featured && featured.gameId === gameId;
      const featuredDoneToday = featured && attempts[featured.gameId]
        && attempts[featured.gameId].score != null;
      const effectiveStreak = (isFeaturedWin && !featuredDoneToday) ? streak + 1 : streak;
      const multiplier = streakMultiplier(effectiveStreak);
      const finalScore = Math.round(score * multiplier);
      const bonus = finalScore - score;
      setStreak(effectiveStreak);
      // Personal-best comparison for the end screen (phase 3), captured BEFORE
      // merging this win into the bests map.
      const prevBest = bests[gameId] && Number.isFinite(bests[gameId].score) ? bests[gameId].score : null;
      setBests(prev => {
        const cur = prev[gameId] || {};
        return {
          ...prev,
          [gameId]: {
            score: cur.score != null ? Math.max(cur.score, finalScore) : finalScore,
            timeSecs: cur.timeSecs != null && timeSecs != null ? Math.min(cur.timeSecs, timeSecs) : (cur.timeSecs != null ? cur.timeSecs : timeSecs),
          },
        };
      });
      // A badge unlocked the moment this win's streak lands exactly on a tier.
      const unlocked = justUnlockedBadge(effectiveStreak);
      if (unlocked) {
        setBadges(prev => (prev.includes(unlocked.min) ? prev : [...prev, unlocked.min].sort((a, b) => a - b)));
      }
      // Show the celebration overlay immediately — independent of the network
      // call below, so the player always gets a clear "Solved!" confirmation.
      setWinData({
        score, bonus, finalScore, steps, timeSecs, multiplier, effectiveStreak,
        prevBest,
        activeBadge: activeBadge(effectiveStreak),
        justBadge: unlocked,
        // Three-line share card: edition/date, the game's spoiler-free result
        // line, then rank + the playable no-login challenge link. The rank
        // line is threaded in below once the finish lands on the board.
        share: meta && meta.share ? buildShareCard(gameId, meta.share) : undefined,
        hintsUsed: meta && meta.hintsUsed,
        wordsSolved: meta && meta.wordsSolved,
        wordsTotal: meta && meta.wordsTotal,
        gameId,
        syncError: false,
        newAchievements: [],
      });
      setTotalScore(t => t + finalScore);
      // Submit to the server (records result, streak, reward, badges, receipt).
      await submitDailyFinish(gameId, finalScore, steps, timeSecs);
      // Now that the finish is on today's board, thread the earned rank into
      // the share card ("#N on today's board · …"). Best-effort — the card
      // reads fine without a rank if the fetch loses or hasn't landed.
      if (meta && meta.share) {
        try {
          const { ok, body } = await api(`/api/daily/${gameId}/leaderboard`);
          const rank = ok && body && body.me && Number.isFinite(body.me.rank) ? body.me.rank : null;
          if (rank) {
            setWinData(prev => (prev && !prev.isClassic && prev.gameId === gameId)
              ? { ...prev, myRank: rank, share: buildShareCard(gameId, meta.share, rank) }
              : prev);
          }
        } catch {}
      }
    } catch (e) {
      // Never let a handler error swallow the win silently again. Surface a
      // minimal overlay so the player sees their solve was registered.
      console.error('[daily] handleWin failed:', e && e.message);
      setWinData(prev => prev || {
        score, finalScore: score, bonus: 0, steps, timeSecs,
        multiplier: 1, effectiveStreak: 0, share: meta && meta.share, syncError: true,
      });
    }
  };

  // Retry the finish submission for the current win. PHASE 4 (#132): this is now
  // a FALLBACK — the effect below retries automatically when connectivity comes
  // back, so the reworded card is a reassurance rather than a chore.
  const retryDailyFinish = () => {
    if (!winData || winData.isClassic) return;
    const gameId = winData.gameId || (currentGame && currentGame.id);
    if (!gameId) return;
    setWinData(prev => prev ? { ...prev, syncError: false, syncing: true } : prev);
    submitDailyFinish(gameId, winData.finalScore, winData.steps, winData.timeSecs)
      .finally(() => setWinData(prev => prev ? { ...prev, syncing: false } : prev));
  };
  const retryRef = useRef(retryDailyFinish);
  retryRef.current = retryDailyFinish;

  // #132 — automatic re-send. Fires the moment the browser reports it is back
  // online while an unsynced result is on screen.
  useEffect(() => {
    if (!winData || winData.isClassic || !winData.syncError) return;
    const go = () => retryRef.current();
    window.addEventListener('online', go);
    // Also try once on a short delay: `online` doesn't fire if we were never
    // formally offline (a transient 5xx / captive portal looks the same to us).
    const t = setTimeout(go, 8000);
    return () => { window.removeEventListener('online', go); clearTimeout(t); };
  }, [winData && winData.syncError, winData && winData.gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Loss path (used by games that can be lost, e.g. Crypto Wordle). Records a
     finished row so the day stays locked, but does NOT touch the streak.
     Existing win-only games never call this.

     PHASE 3 (#161) — `meta.score` carries the score the run actually REACHED.
     It defaults to 0, so every game that doesn't pass one behaves exactly as
     before; the games where a high score IS the result (2048, Bounce, Snake,
     Diamond Rush) pass it and stop reporting "Earned +0" for a run whose score
     had already been sent to the leaderboard.

     Deliberately NOT passed by pass/fail dailies (Daily Cipher, Mine Finder,
     Mahjong, Drop Stack, Daily Snake, Daily Bounce): the daily leaderboard
     filters `score > 0`, so a non-zero loss would put a FAILED run on the
     board. Streaks are unaffected either way — computeStreak keys off
     finished_at, not score. */
  const handleLose = async (steps, timeSecs, meta) => {
    cancelProgressSave(); // same finish-race guard as handleWin
    const lostScore = meta && Number.isFinite(meta.score) ? Math.max(0, Math.round(meta.score)) : 0;
    if (practiceMode) { // #133 — practice losses are local too
      setPracticeResult({
        score: lostScore, steps, timeSecs,
        share: meta && meta.share, answer: meta && meta.answer, won: false,
        gameId: currentGame ? currentGame.id : null,
      });
      return;
    }
    try {
      // Non-daily games skip the server entirely.
      if (currentGame && !currentGame.daily) {
        setLoseData({
          steps,
          timeSecs,
          score: lostScore,
          finalScore: lostScore,
          scoreLabel: meta && meta.scoreLabel,
          scoreValue: meta && meta.scoreValue,
          share: meta && meta.share,
          answer: meta && meta.answer,
          isClassic: true,
          gameId: currentGame.id,
        });
        // A loss can still be posted ("Game Over" result) — with the score the
        // run reached, which is the same number submitClassicScore already sent.
        setClassicLastResult({ gameId: currentGame.id, score: lostScore, steps, timeSecs });
        return;
      }
      const gameId = currentGame.id;
      // Guest loss (phase 8): nothing to commit — a loss has no board entry —
      // so just show the overlay with the guest note. No server call (no
      // attempt row exists), no local pending run.
      if (!authOk) {
        setLoseData({
          steps, timeSecs,
          score: lostScore,
          finalScore: lostScore,
          scoreLabel: meta && meta.scoreLabel,
          scoreValue: meta && meta.scoreValue,
          share: meta && meta.share,
          answer: meta && meta.answer,
          guest: true,
          gameId,
        });
        return;
      }
      setLoseData({
        steps,
        timeSecs,
        score: lostScore,
        finalScore: lostScore,
        scoreLabel: meta && meta.scoreLabel,
        scoreValue: meta && meta.scoreValue,
        share: meta && meta.share,
        answer: meta && meta.answer,
        hintsUsed: meta && meta.hintsUsed,
        wordsSolved: meta && meta.wordsSolved,
        wordsTotal: meta && meta.wordsTotal,
        gameId,
      });
      // A scored loss adds to the nav total, same as a win would.
      if (lostScore > 0) setTotalScore(t => t + lostScore);

      let ok = false, body = null;
      try {
        const res = await api(`/api/daily/${gameId}/finish`, {
          method: 'POST',
          body: JSON.stringify({ score: lostScore, steps, timeSecs }),
        });
        ok = res.ok; body = res.body;
      } catch (e) {
        console.error('[daily] lose submit threw:', e && e.message);
      }
      const stored = ok && body && body.attempt
        ? body.attempt
        : { gameId, score: lostScore, steps, timeSecs, finishedAt: new Date().toISOString() };
      setAttempts(prev => ({ ...prev, [gameId]: stored }));
    } catch (e) {
      console.error('[daily] handleLose failed:', e && e.message);
    }
  };

  /* Exit any game screen back to the home lobby.
     `tab` is OPTIONAL and must be a STRING. Several call sites used to pass
     this straight to onClick/onBack, so React handed it a SyntheticEvent —
     which then landed in `lobbyTab`, and the next render's
     JSON.stringify(navState) threw "Converting circular structure to JSON",
     unmounting the whole root (#150). Two barriers now: the typeof guard
     here, and primitive coercion in navState below.
     Only 'ladder'/'home' are real lobby views — a game CATEGORY ('daily' /
     'classic') is a home-grid filter chip, so it routes to setHomeFilter.
     Writing it to lobbyTab (as before) was a no-op nothing ever read. */
  const backToLobby = (tab) => {
    setScreen('lobby');
    setCurrentGame(null);
    setReviewMode(false);
    setPracticeMode(false);
    setPracticeResult(null);
    setWinData(null);
    setLoseData(null);
    setClassicGameMode(null);
    setClassicGameModeOpts(null);
    setClassicLastResult(null);
    setPreLaunchGame(null);
    if (typeof tab !== 'string' || !tab) return;
    if (tab === 'daily' || tab === 'classic') { setLobbyTab('home'); setHomeFilter(tab); }
    else if (tab === 'ladder' || tab === 'home') setLobbyTab(tab);
  };

  /* PHASE 4 (#133) — "Play again for fun".
     Mounts the SAME component with the SAME dailyRng seed (so it is genuinely
     today's puzzle, not a random one) and a bumped resetKey, but with
     practiceMode on: handleWin/handleLose bail out before any endpoint, and no
     /start claim happens because we never call startDailyRun. */
  const startPractice = (game) => {
    if (!game) return;
    setCurrentGame(game);
    setPracticeMode(true);
    setPracticeResult(null);
    setLockedReview(false);
    setWinData(null);
    setLoseData(null);
    setReviewMode(false);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
    setScreen('game');
  };

  const playAgain = () => {
    setWinData(null);
    setLoseData(null);
    setReviewMode(false);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
    // Keep classicLastResult for the Game Menu.
  };

  /* PHASE 1 — `?result=1` screenshot-state deep link.
     The whole point of this phase is a screen that only exists AFTER a run
     ends, and neither the proposal checks nor the before/after screenshots can
     play a game to get there. This mounts a game and puts a representative
     results card over its (frozen, still-mounted) board, so the card, the
     "👁 View board" button, the collapsed minibar and the backdrop dismiss are
     all reachable by URL.

     Writes NOTHING: for a daily it uses the inert practiceMode path (#133's
     guarantee), and for a classic it only sets local `loseData` UI state — no
     endpoint is called on either path, which is why this link is deliberately
     NOT staging-gated (the "before" screenshot comes from production). */
  const RESULT_DEMO = { score: 8432, steps: 214, timeSecs: 372, tile: 512 };
  const openResultDemo = (game) => {
    if (!game) return;
    setCurrentGame(game);
    setLockedReview(false);
    // `&review=1` alongside `?result=1` lands with the card already collapsed
    // into its minibar — i.e. the "View board" state, which is the other half
    // of this phase and equally unreachable without clicking.
    setReviewMode(new URLSearchParams(window.location.search).get('review') === '1');
    setWinData(null);
    setLoseData(null);
    setPracticeResult(null);
    setPreLaunchGame(null);
    setClassicGameMode(null);
    setClassicGameModeOpts(null);
    setStepCount(0);
    setScreen('game');
    if (game.daily) {
      setPracticeMode(true);
      setPracticeResult({
        score: RESULT_DEMO.score, steps: RESULT_DEMO.steps,
        timeSecs: RESULT_DEMO.timeSecs, won: false, gameId: game.id,
      });
      return;
    }
    setPracticeMode(false);
    setLoseData({
      steps: RESULT_DEMO.steps,
      timeSecs: RESULT_DEMO.timeSecs,
      score: RESULT_DEMO.score,
      finalScore: RESULT_DEMO.score,
      scoreLabel: game.id === '2048' ? 'Highest tile' : 'Best run',
      scoreValue: game.id === '2048' ? RESULT_DEMO.tile : RESULT_DEMO.score,
      share: `Game Corner ${game.name} — ${RESULT_DEMO.score} pts`,
      isClassic: true,
      gameId: game.id,
    });
  };

  // Game Menu "New Game": optionally re-mount the current classic game in a
  // chosen mode (Versus Bot / 2 Players / Online), clearing the prior result.
  const handleNewGameMode = (mode, opts) => {
    setClassicGameMode(mode || null);
    setClassicGameModeOpts(opts || null);
    setClassicLastResult(null);
    setWinData(null);
    setLoseData(null);
    setStepCount(0);
    setPlayAgainKey(k => k + 1);
  };

  // Game Menu "Save Game": persist the active Versus-Bot game's snapshot via
  // the generic user_game_state store.
  const handleSaveGame = async () => {
    if (!currentGame) return { ok: false };
    const snap = ClassicBridge.getSnapshot ? ClassicBridge.getSnapshot() : null;
    if (!snap) return { ok: false };
    const { ok } = await api(`/api/state/${currentGame.id}`, {
      method: 'PUT',
      body: JSON.stringify({ state: { mode: 'bot', savedAt: Date.now(), ...snap } }),
    }).catch(() => ({ ok: false }));
    return { ok: !!ok };
  };

  // Build the menu config passed into ClassicShell for classic games.
  const classicMenuConfig = (currentGame && currentGame.category === 'classic') ? {
    game: currentGame,
    gameMode: classicGameMode,
    lastResult: classicLastResult,
    onNewGameMode: handleNewGameMode,
    onSaveGame: handleSaveGame,
  } : null;

  // Copy-to-clipboard Share button for the win/loss overlays. Flips its label
  // to "Copied!" briefly; degrades to a no-op where clipboard is unavailable.
  function ShareButton({ text }) {
    const [copied, setCopied] = useState(false);
    if (!text) return null;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    };
    return (
      <button
        className="primary-btn"
        style={{ background: C.violet, marginBottom: '0.6rem' }}
        onClick={copy}
      >
        {copied ? 'Copied!' : 'Share result'}
      </button>
    );
  }

  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const GameComponent = currentGame ? currentGame.component : null;

  // Render the active game's body according to its declarative `shell` flag.
  // Collapses what used to be a thicket of id/category/SELF_SHELL_GAMES checks
  // into one switch — adding a game is now purely a matter of its registry entry.
  const renderGameBody = () => {
    if (!currentGame) return null;
    /* #176 — every shell hands the game the same mode context, so a game
       component never has to know which shell it is under to know how it was
       opened. Games that predate the play-mode axis ignore all four and behave
       exactly as before, which is what keeps this backward-compatible.
         playMode  — 'daily' | 'story' | 'arcade' | null
         band      — story: the rung index; arcade: the Easy/Normal/Hard id
         gameId    — the registry id, so a component shared by two entries
                     (Sudoku and Sudoku Mini) can tell which one it is
         onBandCleared — story only: report a rung finished so it can be ticked */
    const modeProps = {
      gameId: currentGame.id,
      playMode,
      band: playMode === 'arcade' ? arcadeBandId : playMode === 'story' ? storyBand : null,
      onBandCleared: playMode === 'story' ? handleBandCleared : undefined,
    };
    switch (currentGame.shell) {
      case 'self':
        // Full-screen, gesture-first game that renders its own ClassicShell.
        return (
          <GameComponent
            {...modeProps}
            game={currentGame}
            onBack={() => backToLobby('classic')}
            onWin={handleWin}
            onLose={handleLose}
            onStepChange={setStepCount}
            offset={offset}
            /* Phase 1 (#160) — these games are now kept MOUNTED and frozen
               behind the shared results card, so any per-game end panel must
               stand down (only Hash Rush has one). */
            resultShown={!!winData || !!loseData || !!practiceResult}
            resetKey={playAgainKey}
            menuConfig={classicMenuConfig}
            gameMode={classicGameMode}
            gameModeOpts={classicGameModeOpts}
            onModeChange={setClassicGameMode}
          />
        );
      case 'classic': {
        // In-frame classic game wrapped in the shared ClassicShell.
        const classicSections = currentGame.leaderboard
          ? [cgLeaderboardSection(currentGame.id, currentGame.leaderboardOpts)]
          : [];
        return (
          <ClassicShell
            game={currentGame}
            onExit={() => backToLobby('classic')}
            onNewGame={() => setPlayAgainKey(k => k + 1)}
            menuConfig={classicMenuConfig}
            sheetSections={classicSections}
            onHowTo={currentGame.howToPlay && currentGame.howToPlay.length > 0
              ? () => setHowToGame(currentGame) : undefined}
            onChat={authOk ? () => setChatGame(currentGame) : undefined}
          >
            {/* PHASE 3 — the classic stage keeps .cg-scroll DELIBERATELY: making
                it overflow:hidden would CLIP a tall setup screen rather than fit
                it, which is the exact failure Daily Cipher had. What stops the
                scrolling is upstream — useScrollLock owns the document while a
                run is live, and the five phase-5 board games now honour the
                --cg-board viewport cap (see the .ck-board/.rv-board/... rules),
                so board + status + legend fit at 390x844 without moving. */}
            <div className="cg-stage cg-scroll">
              <GameComponent
                {...modeProps}
                onWin={handleWin}
                onLose={handleLose}
                onStepChange={setStepCount}
                offset={offset}
                resetKey={playAgainKey}
                gameMode={classicGameMode}
                gameModeOpts={classicGameModeOpts}
                onModeChange={setClassicGameMode}
                onBack={() => backToLobby('classic')}
              />
            </div>
          </ClassicShell>
        );
      }
      case 'daily':
      default: {
        // Daily puzzle (and any back-header game-wrap game): resumable, locked.
        // The Daily Tile Match reports its own engine-shaped moves through
        // onMoveTile; the other dailies get their onStepChange calls recorded
        // as timestamp-only events (recording BOTH for the tile match would
        // double every tap in the log and skew the timing heuristics).
        const logsOwnMoves = currentGame.id === 'tilematchingdaily';
        // `fitShell` (slice 1) opts a daily into the non-scrolling
        // viewport-height column; the game body then flexes to fill it and
        // sizes its own board with useFitBox. Games without the flag keep the
        // original scrolling game-wrap untouched.
        return (
          <div className={'game-wrap' + (currentGame.fitShell ? ' fit' : '')}>
            <div className="game-head">
              <button className="back-btn" onClick={() => backToLobby()}>← Back</button>
              <div className="game-title">
                <span>{currentGame.icon}</span> {currentGame.name}
              </div>
              {authOk && (
                <button
                  className="help-btn"
                  title="Game chat"
                  aria-label="Game chat"
                  onClick={() => setChatGame(currentGame)}
                >💬</button>
              )}
              {currentGame.howToPlay && currentGame.howToPlay.length > 0 && (
                <button
                  className="help-btn"
                  title="How to play"
                  aria-label="How to play"
                  onClick={() => setHowToGame(currentGame)}
                >?</button>
              )}
            </div>
            {/* PHASE 4 (#133) — an unmissable practice marker. */}
            {practiceMode && (
              <div className="practice-ribbon">🎲 Practice — not scored</div>
            )}
            <GameComponent
              {...modeProps}
              onWin={handleWin}
              onLose={handleLose}
              onStepChange={logsOwnMoves ? setStepCount : (n) => {
                // A practice run must never contribute to the verification log.
                if (!practiceMode) recordDailyMove({ k: 'step' });
                setStepCount(n);
              }}
              onMoveTile={logsOwnMoves && !practiceMode ? recordDailyMove : undefined}
              offset={offset}
              savedProgress={practiceMode ? null : progressFor(attempts[currentGame.id])}
              onSaveProgress={practiceMode ? null : handleSaveProgress}
              resetKey={playAgainKey}
            />
          </div>
        );
      }
    }
  };

  // Reward level surfaced in the nav. Suppressed when signed out so we
  // never show a multiplier the server can't back.
  const activeMult = authOk ? streakMultiplier(streak) : 1;

  // Phase 7 home derivations. featuredGame resolves the server's daily_featured
  // row against the client registry; inProgressItems merges resumable daily
  // runs with the viewer's active online matches for the in-progress row.
  const featuredGame = featured ? GAMES.find((g) => g.id === featured.gameId) : null;
  const inProgressItems = [
    ...GAMES.filter((g) => g.daily && attempts[g.id] && !attempts[g.id].finishedAt)
      .map((g) => ({ type: 'daily', game: g })),
    ...myRooms
      .map((r) => ({ type: 'room', room: r, game: GAMES.find((g) => g.id === r.gameId) }))
      .filter((x) => x.game),
  ];
  // Re-enter an active online match from the in-progress row: pre-seat the
  // player (roomId + seat number) through the classic game-mode opts so
  // BoardRoomGame / Chutes & Ladders skip the create/join setup screen.
  const resumeRoom = (room) => {
    const g = GAMES.find((x) => x.id === room.gameId);
    if (!g || loading) return;
    setClassicGameMode('online');
    setClassicGameModeOpts({ roomId: room.id, myPlayerNum: room.myPlayerNum });
    launchGame(g);
  };

  // Pin the shell to exactly one viewport while a fit-mode game is on screen
  // (slice 1), so the board's flex column measures against real space instead
  // of growing the document. Every other screen keeps normal page scrolling.
  // Server-anchored reset clock for the merged grid's daily note (slice 2) —
  // the same hook LockedScreen and the pre-game screen use, so every countdown
  // in the app ticks off one clock.
  const homeResetCountdown = useCountdown(nextResetUtc, offset, onReset);

  /* PHASE 1 (#158/#160/#162) — one `resultData` for every kind of ending, so
     the frozen board, the minibar, the backdrop dismiss and "View board" all
     key off the same value instead of three near-copies of the same condition.
     A practice result is a result: it used to leave winData/loseData null,
     which is precisely why the practice overlay had no way back to the board. */
  const practiceResultData = (practiceMode && practiceResult)
    ? { ...practiceResult, isPractice: true }
    : null;
  const resultData = winData || loseData || practiceResultData;

  const fitActive = (screen === 'game' && !!currentGame && !!currentGame.fitShell
    && (!resultData || reviewMode))
    || (screen === 'locked' && !!currentGame && !!currentGame.fitShell && lockedReview);

  /* PHASE 4 (#122) — a locked day can show the solved board only if the finished
     attempt carries a snapshot. `finish` now writes one in the SAME UPDATE as
     score/steps/finished_at (no second request, so the no-save-on-the-winning-
     move rule is untouched), and /api/daily returns it for finished rows.
     Real-time dailies with no resume (Daily Snake, Daily Bounce, Word Sprint)
     legitimately have nothing to snapshot — stated behaviour, not a bug. */
  const lockedAttempt = screen === 'locked' && currentGame ? attempts[currentGame.id] : null;
  const lockedReviewable = !!(lockedAttempt && lockedAttempt.finishedAt && lockedAttempt.progress);

  /* Whether the finished board can be shown under the results card (slice 4).
     Guarded on the result belonging to the CURRENTLY mounted game, so a stale
     board can never be presented as this run's.

     PHASE 1 (#157/#160) — the `shell !== 'self'` exclusion is GONE. Its comment
     claimed those classics draw their own game-over overlay; they do not
     (SnakeGameplay has only a `paused` overlay), so the exclusion just made the
     render below unmount the body and put the results card over a blank page.
     Snake, Block Fit, Diamond Rush and Hash Rush now keep their final board
     frozen behind the card like every other game. */
  const boardReviewable = screen === 'game' && !!currentGame && !!resultData
    && (!resultData.gameId || resultData.gameId === currentGame.id);

  /* #162 — dismissing a results card reveals the board behind it. One handler
     for all three overlays: only a press on the SCRIM itself counts (a press on
     the card bubbles to the same node, hence the target check), and it fires on
     pointerdown so it lands on finger-DOWN like the shared tap primitive. */
  const dismissResultCard = (e) => {
    if (e && e.target !== e.currentTarget) return;
    if (!boardReviewable) return;
    setReviewMode(true);
  };

  // Escape does the same thing, for keyboard/desktop players.
  useEffect(() => {
    if (!resultData || reviewMode || !boardReviewable) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setReviewMode(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resultData, reviewMode, boardReviewable]);

  // What the collapsed minibar says, per result kind.
  const resultMinibarLabel = () => {
    if (winData) {
      return `${winData.winnerLabel || 'Solved'} · +${winData.finalScore != null ? winData.finalScore : winData.score}`;
    }
    if (loseData) {
      return `Game over · +${loseData.finalScore != null ? loseData.finalScore : 0}`;
    }
    if (practiceResultData) {
      return `${practiceResultData.won ? 'Practice solve' : 'Practice run over'} · ${practiceResultData.score}`;
    }
    return 'Result';
  };

  /* NOTE: <style>{css}</style> is deliberately NOT rendered here any more — it
     is a sibling ABOVE AppErrorBoundary at the root mount (see the bottom of
     this file). When a render threw, React unmounted this whole subtree and
     took the stylesheet with it, so the failure mode was a *styled* blank page
     followed by an unstyled one (#150). Keeping the stylesheet outside the
     boundary is what lets the fallback panel render styled. */
  return (
    <div className={'app' + (fitActive ? ' app-fit' : '')}>
      <nav className="nav">
        <div className="nav-brand"><span className="logo">⬢</span> Game Corner</div>
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
          {authOk && (
            <button
              className="primary-btn nav-friends-btn"
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                color: C.text,
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
          {/* Outside the authOk guard on purpose: a signed-out visitor should
              still be able to pick a theme. */}
          <button
            className="nav-settings-btn"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
          <AccountChip
            loading={loading}
            authOk={authOk}
            user={user}
            onOpen={() => {
              if (user && user.id) { setSelectedUserId(user.id); setScreen('profile'); }
            }}
          />
        </div>
      </nav>

      {screen === 'profile' && selectedUserId && (
        <ProfileScreen
          userId={selectedUserId}
          user={user}
          onBack={() => { setScreen('lobby'); setSelectedUserId(null); }}
          onOpenFriends={() => setScreen('friends')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {screen === 'friends' && (
        <FriendsListScreen
          onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
          onBack={() => setScreen('lobby')}
        />
      )}

      {screen === 'session' && (
        <SessionReceipt
          sessionId={receiptSessionId}
          onBack={() => setScreen('lobby')}
          onOpenReceipt={openReceipt}
        />
      )}

      {screen === 'lobby' && (
        <div className="lobby">
          {lobbyTab === 'ladder' ? (
            <React.Fragment>
              <button className="home-back-btn" onClick={() => setLobbyTab('home')}>← Home</button>
              <div className="lobby-head">
                <h1>Rating Ladder</h1>
                <p>Head-to-head Elo — win online matches to climb.</p>
              </div>
              {/* Gated on !loading so a ?demo=ladder fixture (seeded inside
                  loadDaily's /api/daily call) lands before the ladder fetches. */}
              {!loading && <LadderScreen />}
            </React.Fragment>
          ) : (
            /* Phase 7 home: GotD hero → Today's Top Scores → in-progress row →
               all-games grid. The old three-tab lobby is retired; the Rating
               Ladder remains reachable via the ?tab=ladder deep link. */
            <React.Fragment>
              <div className="lobby-head masthead">
                {/* Numbered-edition dateline (Appendix A masthead). The edition
                    counts up one per UTC day from the same server-anchored day
                    number the dailies use, so every visitor sees the same issue. */}
                <div className="masthead-dateline">
                  <span>No. {utcDayNum(offset) - 20000} · {new Date(Date.now() + offset).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                </div>
                <h1>Game Corner</h1>
                <p>Classic games, free to play — no ads, no pay-to-win. Fresh puzzles every day at midnight UTC.</p>
                <div className="masthead-rule" />
              </div>
              {commitNotice && (
                <div className="commit-notice" onClick={() => setCommitNotice(null)}>{commitNotice}</div>
              )}
              {!wnDismissed && (
                <div className="whatsnew-strip">
                  <button className="wn-strip-body" onClick={() => setWhatsNewOpen(true)}>
                    🗞️ <strong>New this week:</strong> {CHANGELOG[0].items[0]} <span className="wn-more">See all ›</span>
                  </button>
                  <button className="wn-strip-dismiss" title="Dismiss" onClick={dismissWhatsNew}>✕</button>
                </div>
              )}
              {featuredGame ? (
                <GotdHero
                  game={featuredGame}
                  attempt={attempts[featuredGame.id]}
                  authOk={authOk}
                  nextResetUtc={nextResetUtc}
                  offset={offset}
                  onReset={onReset}
                  onPlay={() => { if (!loading) launchGame(featuredGame); }}
                />
              ) : nextResetUtc ? (
                <p className="reset-countdown mono">
                  Next puzzle in {fmtHoursMins(
                    new Date(nextResetUtc).getTime() - (Date.now() + offset))}
                </p>
              ) : null}
              {/* Today's Top Scores (GotD-only board) sits directly below the
                  hero so the featured game's results read as one section. */}
              {authOk && !loading && (
                <TodayChampions
                  onSelectUser={(userId) => { setSelectedUserId(userId); setScreen('profile'); }}
                />
              )}
              {authOk && (
                <InProgressRow
                  items={inProgressItems}
                  onOpenDaily={(g) => { if (!loading) launchGame(g); }}
                  onOpenRoom={resumeRoom}
                />
              )}
              {(() => {
                const gameCard = (g) => {
                  // Only daily games carry the per-day finished/in-progress lock state.
                  const a = attempts[g.id];
                  const finished = !!g.daily && !!(a && a.finishedAt);
                  const inProgress = !!g.daily && !!a && !finished;
                  return (
                    <div
                      key={g.id}
                      className={`card${finished ? ' done locked' : ''}${inProgress ? ' inprogress' : ''}`}
                      style={{ '--accent': g.tagColor }}
                      onClick={() => {
                        if (loading) return;
                        if (g.preLaunchModal) { setPreLaunchGame(g); return; }
                        launchGame(g);
                      }}
                    >
                      {g.daily && (
                        <span className={'card-daily-badge' + (finished ? ' done' : inProgress ? ' resume' : ' fresh')}>
                          {finished ? '✓ PLAYED' : inProgress ? '▶ RESUME' : 'NEW TODAY'}
                        </span>
                      )}
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
                };
                // One merged list (slice 2). Registry order is preserved
                // within each group and dailies lead, so the fresh puzzles are
                // what a player meets first; the corner badge, not a section
                // heading, is what marks a card as a daily.
                const registryOrder = [
                  ...GAMES.filter(g => g.category === 'daily'),
                  ...GAMES.filter(g => g.category !== 'daily'),
                ];
                /* #146 — walk the registry order ONCE, emitting a merged card
                   the first time either half of a pair is met and skipping the
                   other half. Because dailies lead, each merged card lands at
                   its daily half's position (Mancala, whose pair has no daily
                   registry entry, lands at its classic position).

                   Filtering happens AFTER the merge on purpose: a merged card
                   is both daily and classic, so it passes every chip. Filtering
                   GAMES first would break the walk under the 'classic' chip
                   (the daily half would be gone and the card would move). */
                /* #176 — the grid is a walk over GAME_CARDS, which is already
                   in registry order and already merges the four two-id games.
                   A card with a daily mode passes the Daily chip; one with any
                   non-daily mode passes Classic; a card with both passes both,
                   which is why filtering happens on modes rather than on the
                   registry's category field. */
                const ordered = GAME_CARDS.filter(c => {
                  if (homeFilter === 'all') return true;
                  const hasDaily = c.modes.some(m => m.mode === 'daily');
                  if (homeFilter === 'daily') return hasDaily;
                  return !hasDaily || c.modes.some(m => m.mode !== 'daily');
                });
                /* One launcher for every card button. `mode` is null for the
                   head-to-head cards, whose axis is the opponent picker inside
                   the game rather than this one. launchGame routes a finished
                   daily to the locked result screen and everything else to the
                   pre-game screen, so the day's attempt is still claimed only
                   by the pre-game Play button. */
                const playCardMode = (gameId, mode) => {
                  const g = GAMES.find(x => x.id === gameId);
                  if (!g) return;
                  if (!mode && g.preLaunchModal) { setPreLaunchGame(g); return; }
                  if (!mode) { setClassicGameMode(null); setClassicGameModeOpts(null); }
                  launchGame(g, mode);
                };
                return (
                  <React.Fragment>
                    <div className="home-section-title">All Games</div>
                    <div className="home-daily-note">
                      🕛 New daily puzzles at midnight UTC — resets in{' '}
                      <span className="mono">{homeResetCountdown}</span>
                    </div>
                    <div className="home-filter-chips" role="tablist" aria-label="Filter games">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'daily', label: 'Daily' },
                        { id: 'classic', label: 'Classic' },
                      ].map(f => (
                        <button
                          key={f.id}
                          role="tab"
                          aria-selected={homeFilter === f.id}
                          className={'home-chip' + (homeFilter === f.id ? ' on' : '')}
                          onClick={() => setHomeFilter(f.id)}
                        >{f.label}</button>
                      ))}
                    </div>
                    <div className="grid">
                      {ordered.map(c => (
                        <GameCard
                          key={c.key}
                          card={c}
                          attempts={attempts}
                          bests={bests}
                          storyProgress={storyProgress}
                          loading={loading}
                          onPlay={playCardMode}
                        />
                      ))}
                    </div>
                  </React.Fragment>
                );
              })()}
            </React.Fragment>
          )}
        </div>
      )}

      {screen === 'pregame' && currentGame && (
        <div className="game-wrap">
          <div className="game-head">
            <button className="back-btn" onClick={() => backToLobby()}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          <PreGameScreen
            game={currentGame}
            attempt={attempts[currentGame.id]}
            best={bests[currentGame.id]}
            streak={streak}
            authOk={authOk}
            nextResetUtc={nextResetUtc}
            offset={offset}
            onReset={onReset}
            onPlay={() => startDailyRun(currentGame)}
            onHowTo={() => setHowToGame(currentGame)}
            onChat={authOk ? () => setChatGame(currentGame) : undefined}
          />
        </div>
      )}

      {screen === 'locked' && currentGame && (
        <div className={'game-wrap' + (lockedReviewable ? ' fit' : '')}>
          <div className="game-head">
            <button className="back-btn" onClick={() => backToLobby()}>← Back</button>
            <div className="game-title">
              <span>{currentGame.icon}</span> {currentGame.name}
            </div>
          </div>
          {/* PHASE 4 (#122) — when the finished attempt carries a board snapshot,
              re-mount the game read-only under the result card so "View board"
              shows the puzzle you actually solved. Games that can't snapshot
              (real-time dailies with no resume) fall through to result-only. */}
          {lockedReviewable && lockedReview ? (
            <div className="game-body frozen">
              {React.createElement(currentGame.component, {
                onWin: () => {}, onLose: () => {}, onStepChange: () => {},
                offset,
                savedProgress: attempts[currentGame.id].progress,
                onSaveProgress: null,
                readOnly: true,
                resetKey: 0,
              })}
            </div>
          ) : (
            <LockedScreen
              game={currentGame}
              attempt={attempts[currentGame.id]}
              nextResetUtc={nextResetUtc}
              offset={offset}
              onReset={onReset}
              onBack={() => backToLobby()}
              best={bests[currentGame.id]}
              onReview={lockedReviewable ? () => setLockedReview(true) : null}
              onPractice={() => startPractice(currentGame)}
            />
          )}
          {lockedReviewable && lockedReview && (
            <button className="result-minibar" onClick={() => setLockedReview(false)}>
              <span className="rmb-text">
                {`Today's result · +${attempts[currentGame.id].score}`}
              </span>
              <span className="rmb-cta">↑ Results</span>
            </button>
          )}
        </div>
      )}

      {preLaunchGame && (
        <GameModeModal
          game={preLaunchGame}
          onClose={() => setPreLaunchGame(null)}
          onStart={(mode, opts) => {
            const g = preLaunchGame;
            setPreLaunchGame(null);
            setClassicGameMode(mode === 'solo' ? null : mode);
            setClassicGameModeOpts(opts || null);
            launchGame(g);
          }}
        />
      )}

      {/* The finished board stays MOUNTED under the results card (slice 4) so
          "View board" has something to reveal. Every game sets its own `done`
          flag on finish, which stops its timer and short-circuits input; the
          .frozen wrapper makes that visible and blocks stray taps.

          PHASE 1 (#157/#158/#160) — this now covers EVERY ending: wins, losses,
          practice runs, and shell:'self' classics. The old `: null` branch is
          what unmounted Snake's board the instant it crashed, leaving the
          results card floating over an empty page with nothing to go back to.

          The wrapper is rendered UNCONDITIONALLY and only its class changes.
          Swapping between `<div class="game-body frozen">{body}</div>` and a
          bare `{body}` changes the element at this position, so React unmounted
          and REMOUNTED the whole game at the exact moment the run ended: 2048
          came back as a fresh 2-tile board (its mount reads the saved-board key
          that the loss had just cleared), so "the final board" was a brand new
          one. Keeping one stable element preserves the subtree's state. */}
      {screen === 'game' && currentGame && (
        <div className={'game-body' + (boardReviewable ? ' frozen' : '')}>
          {renderGameBody()}
        </div>
      )}

      {screen === 'game' && resultData && reviewMode && (
        <button className="result-minibar" onClick={() => setReviewMode(false)}>
          <span className="rmb-text">{resultMinibarLabel()}</span>
          <span className="rmb-cta">↑ Results</span>
        </button>
      )}

      {screen === 'game' && winData && !reviewMode && (
        <div className="win-overlay" onPointerDown={dismissResultCard}>
          <div className="win-card">
            <div className="trophy">{winData.cashOut ? '💰' : '🏆'}</div>
            <h2>{winData.winnerLabel || (winData.cashOut ? 'Locked In! 🔒' : 'Solved!')}</h2>
            <div className="sub">{currentGame && currentGame.name}</div>
            <div className="score-rows">
              <div className="score-row">
                <span className="k">Base score</span>
                <span className="v mono">{winData.score}</span>
              </div>
              {winData.isClassic && winData.multiplier > 1 && (
                <div className="score-row bonus">
                  <span className="k">Lock In ×{winData.multiplier}</span>
                  <span className="v mono">×{winData.multiplier}</span>
                </div>
              )}
              {!winData.isClassic && winData.multiplier > 1 && (
                <div className="score-row bonus">
                  <span className="k">Streak ×{winData.multiplier} · {winData.effectiveStreak}-day</span>
                  <span className="v mono">+{winData.bonus}</span>
                </div>
              )}
              {Number.isFinite(winData.wordsTotal) && (
                <div className="score-row">
                  <span className="k">Words solved</span>
                  <span className="v mono">{winData.wordsSolved} / {winData.wordsTotal}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">Steps · Time</span>
                <span className="v mono">{winData.steps} · {fmtTime(winData.timeSecs)}</span>
              </div>
              {winData.hintsUsed > 0 && (
                <div className="score-row">
                  <span className="k">💡 Hints used</span>
                  <span className="v mono">{winData.hintsUsed}</span>
                </div>
              )}
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+{winData.finalScore}</span>
              </div>
              {!winData.isClassic && winData.prevBest !== undefined && (
                winData.prevBest == null || winData.finalScore > winData.prevBest ? (
                  <div className="score-row bonus">
                    <span className="k">🏅 New personal best!</span>
                    <span className="v mono">+{winData.finalScore}</span>
                  </div>
                ) : (
                  <div className="score-row">
                    <span className="k">Personal best</span>
                    <span className="v mono">+{winData.prevBest}</span>
                  </div>
                )
              )}
              {winData.isClassic && winData.bestScore !== undefined && (
                <div className="score-row">
                  <span className="k">Best score</span>
                  <span className="v mono">{winData.bestScore}</span>
                </div>
              )}
              {winData.isClassic && winData.longestSnake !== undefined && (
                <div className="score-row">
                  <span className="k">Longest</span>
                  <span className="v mono">{winData.longestSnake} cells</span>
                </div>
              )}
            </div>
            {!winData.isClassic && winData.justBadge && (
              <div className="badge-unlock">
                <div className="bu-icon">{winData.justBadge.icon}</div>
                <div className="bu-title">Milestone reached!</div>
                <div className="bu-name">{winData.justBadge.name} · {winData.justBadge.min}-day streak</div>
              </div>
            )}
            {!winData.isClassic && !winData.justBadge && winData.activeBadge && (
              <div className="win-badge-row">
                <span className="wbr-icon">{winData.activeBadge.icon}</span>
                <span>{winData.activeBadge.name} badge active</span>
              </div>
            )}
            {!winData.isClassic && winData.justAchievement && (
              <div className="badge-unlock">
                <div className="bu-icon">{winData.justAchievement.icon}</div>
                <div className="bu-title">Badge unlocked!</div>
                <div className="bu-name">{winData.justAchievement.name}</div>
              </div>
            )}
            {!winData.isClassic && !winData.guest && (() => {
              // Next-milestone progress so every solve shows forward motion even
              // when nothing unlocked this run. Streak progress is based on the
              // streak this win landed in; solve progress on the lifetime count.
              const hints = badgeProgressHints(winData.effectiveStreak || 0, solveCount);
              if (!hints.length) return null;
              return (
                <div className="win-progress">
                  {hints.map(h => (
                    <span key={h.key} className="badge-progress-pill">
                      <span>{h.icon}</span> {h.text}
                    </span>
                  ))}
                </div>
              );
            })()}
            {/* PHASE 4 (#132) — the old wording ("Couldn't sync your result —
                your puzzle is still locked for today") read like the win had
                been thrown away, and used "locked" to describe a FAILURE, which
                collides with the daily lock the same word means everywhere else.
                The run is already saved in pc_pending_runs_v1 and retries
                automatically; the button is a fallback, not the only path. */}
            {!winData.isClassic && (winData.syncError || syncFailDemo) && (
              <div className="win-sync-note">
                ✔ Saved on this device — we'll send your result automatically as
                soon as you're back online. Your score and streak are safe.
                <br />
                <button onClick={retryDailyFinish} disabled={winData.syncing}>
                  {winData.syncing ? 'Sending…' : 'Send now'}
                </button>
              </div>
            )}
            {winData.guest && (
              <div className="guest-cta">
                <div className="guest-rank">
                  {Number.isFinite(winData.guestRank)
                    ? <span>You'd be <strong>#{winData.guestRank}</strong> of {winData.guestOf} on today's board</span>
                    : <span>Great solve — today's board takes signed-in entries</span>}
                </div>
                <div className="guest-note">
                  🔑 <strong>Make it count — sign in.</strong> Open Game Corner inside
                  Usernode and this exact run joins today's leaderboard and starts
                  your streak.
                  {winData.guestSaved && ' Your run is saved on this device — it counts if you sign in before midnight UTC.'}
                </div>
              </div>
            )}
            {winData.dapp && <VerifiedBadge session={winData.dapp} onOpenReceipt={openReceipt} />}
            {/* DAILY board only. `/api/daily/:gameId/leaderboard` validates
                :gameId against GAME_IDS and 400s on a classic id, and a 400 is
                a console error the no-console-errors check fails on. Classics
                reach their all-time board through ClassicShell's ☰ sheet. */}
            {currentGame && currentGame.daily && <Leaderboard gameId={currentGame.id} solved={true} />}
            <ShareButton text={winData.share} />
            {winData.isClassic && (
              <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={playAgain}>
                Play Again
              </button>
            )}
            {boardReviewable && (
              <button className="primary-btn review-btn" onClick={() => setReviewMode(true)}>
                👁 View board
              </button>
            )}
            {/* PHASE 4 (#133) — replay today's exact puzzle, scored but not
                recorded. Daily games only: a classic already has Play Again. */}
            {!winData.isClassic && currentGame && (
              <button className="primary-btn review-btn" onClick={() => startPractice(currentGame)}>
                🎲 Play again for fun <span className="practice-note">(not scored)</span>
              </button>
            )}
            <button className="primary-btn" onClick={() => backToLobby(winData.isClassic ? 'classic' : null)}>Back to Lobby</button>
          </div>
        </div>
      )}

      {screen === 'game' && loseData && !reviewMode && (
        <div className="win-overlay" onPointerDown={dismissResultCard}>
          <div className="win-card">
            <div className="trophy">{loseData.isClassic ? '💥' : '💀'}</div>
            <h2>{loseData.isClassic ? 'Game Over' : 'Out of guesses'}</h2>
            <div className="sub">{currentGame && currentGame.name}</div>
            <div className="score-rows">
              {loseData.answer && (
                <div className="score-row">
                  <span className="k">Answer</span>
                  <span className="v mono">{loseData.answer}</span>
                </div>
              )}
              {Number.isFinite(loseData.wordsTotal) && (
                <div className="score-row">
                  <span className="k">Words solved</span>
                  <span className="v mono">{loseData.wordsSolved} / {loseData.wordsTotal}</span>
                </div>
              )}
              <div className="score-row">
                <span className="k">{loseData.isClassic ? 'Steps' : 'Guesses'} · Time</span>
                <span className="v mono">{loseData.steps} · {fmtTime(loseData.timeSecs)}</span>
              </div>
              {/* PHASE 3 (#161) — the run's own headline stat (2048's highest
                  tile, Diamond Rush's gems). Only rendered by games that pass
                  one, so pass/fail dailies are unchanged. */}
              {loseData.scoreLabel && loseData.scoreValue != null && (
                <div className="score-row">
                  <span className="k">{loseData.scoreLabel}</span>
                  <span className="v mono">{loseData.scoreValue}</span>
                </div>
              )}
              {loseData.hintsUsed > 0 && (
                <div className="score-row">
                  <span className="k">💡 Hints used</span>
                  <span className="v mono">{loseData.hintsUsed}</span>
                </div>
              )}
              {/* PHASE 3 (#161) — a lost run that still scored says so. This was
                  hard-coded "+0" even though the score had ALREADY been sent to
                  the leaderboard, which read as "that run counted for nothing". */}
              <div className="score-row total">
                <span className="k">Earned</span>
                <span className="v mono">+{loseData.finalScore != null ? loseData.finalScore : 0}</span>
              </div>
            </div>
            {loseData.guest && (
              <div className="guest-note" style={{ marginBottom: '0.8rem' }}>
                🔑 Playing as a guest — sign in inside Usernode to lock in streaks
                and appear on daily boards.
              </div>
            )}
            {/* Daily board only — see the note on the win card above. */}
            {currentGame && currentGame.daily && <Leaderboard gameId={currentGame.id} solved={false} />}
            <ShareButton text={loseData.share} />
            {loseData.isClassic && (
              <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={playAgain}>
                Play Again
              </button>
            )}
            {boardReviewable && (
              <button className="primary-btn review-btn" onClick={() => setReviewMode(true)}>
                👁 View board
              </button>
            )}
            {!loseData.isClassic && currentGame && (
              <button className="primary-btn review-btn" onClick={() => startPractice(currentGame)}>
                🎲 Play again for fun <span className="practice-note">(not scored)</span>
              </button>
            )}
            <button className="primary-btn" onClick={() => backToLobby(loseData.isClassic ? 'classic' : null)}>Back to Lobby</button>
          </div>
        </div>
      )}

      {/* PHASE 4 (#133) — practice result. Deliberately NOT the win overlay: no
          streak row, no leaderboard, no Verified badge, no share-to-board CTA —
          nothing that implies the run counted. */}
      {screen === 'game' && practiceMode && practiceResult && !reviewMode && (
        <div className="win-overlay" onPointerDown={dismissResultCard}>
          <div className="win-card">
            <div className="trophy">🎲</div>
            <h2>{practiceResult.won ? 'Solved — practice run' : 'Practice run over'}</h2>
            <div className="sub">{currentGame && currentGame.name}</div>
            <div className="practice-ribbon">Not scored — your real result for today stands</div>
            <div className="score-breakdown">
              <div className="score-row">
                <span className="k">Practice score</span>
                <span className="v mono">{practiceResult.score}</span>
              </div>
              <div className="score-row">
                <span className="k">Steps · Time</span>
                <span className="v mono">{practiceResult.steps} · {fmtTime(practiceResult.timeSecs)}</span>
              </div>
            </div>
            {practiceResult.answer && (
              <div className="sub">{practiceResult.answer}</div>
            )}
            {/* PHASE 1 (#158) — the practice card had NO way back to the board:
                no View board, no minibar, no backdrop dismiss. That was the
                whole "there is some practice run screen you can't go back to
                view board after" report. */}
            {boardReviewable && (
              <button className="primary-btn review-btn" onClick={() => setReviewMode(true)}>
                👁 View board
              </button>
            )}
            <button className="primary-btn review-btn" onClick={() => startPractice(currentGame)}>
              🎲 Another practice run
            </button>
            <button className="primary-btn" onClick={() => backToLobby()}>Back to Lobby</button>
          </div>
        </div>
      )}

      {whatsNewOpen && <WhatsNewSheet onClose={() => setWhatsNewOpen(false)} />}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      {chatGame && (
        <ChatPanel
          game={chatGame}
          user={user}
          onClose={() => setChatGame(null)}
        />
      )}

      {howToGame && (
        <HowToPlayModal
          game={howToGame}
          onClose={() => { markHowtoSeen(howToGame.id); setHowToGame(null); }}
        />
      )}
    </div>
  );
}
