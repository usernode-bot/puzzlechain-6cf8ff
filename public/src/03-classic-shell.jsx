/* ============================================================
   Classic Games shared shell component
   ============================================================ */
function CgToggle({ on, onClick }) {
  return <button className={'cg-toggle' + (on ? ' on' : '')} onClick={onClick} aria-pressed={on} />;
}

/* Light / Dark / System segmented control. Shared by the global Settings
   sheet and the in-game ☰ → Settings tab, so both always agree. */
const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: '🖥' },
  { id: 'light',  label: 'Light',  icon: '☀' },
  { id: 'dark',   label: 'Dark',   icon: '🌙' },
];

function ThemeChoice() {
  const { pref, resolved, setPref } = useTheme();
  return (
    <div className="theme-choice">
      <div className="theme-seg" role="group" aria-label="Theme">
        {THEME_OPTIONS.map(o => (
          <button
            key={o.id}
            type="button"
            className={'theme-seg-btn' + (pref === o.id ? ' active' : '')}
            aria-pressed={pref === o.id}
            onClick={() => { setPref(o.id); cgSound('click'); }}
          >
            <span className="theme-seg-icon">{o.icon}</span>{o.label}
          </button>
        ))}
      </div>
      <div className="theme-caption">
        {pref === 'system'
          ? `Following your device — currently ${resolved === 'dark' ? 'Dark' : 'Light'}.`
          : `Always ${pref === 'dark' ? 'Dark' : 'Light'}, whatever your device says.`}
      </div>
    </div>
  );
}

function CgSettings({ tick }) {
  const [, force] = useState(0);
  const flip = (key) => { cgSetPref(key, !cgPrefs[key]); force(n => n + 1); };
  return (
    <div>
      <h4>Appearance</h4>
      <ThemeChoice />
      <h4 className="cg-settings-h4-spaced">Game feedback</h4>
      <div className="cg-setting-row"><span className="name">Sound</span><CgToggle on={cgPrefs.sound} onClick={() => flip('sound')} /></div>
      <div className="cg-setting-row"><span className="name">Haptics</span><CgToggle on={cgPrefs.haptics} onClick={() => flip('haptics')} /></div>
      <div className="cg-setting-row"><span className="name">Reduced motion</span><CgToggle on={cgPrefs.motion} onClick={() => flip('motion')} /></div>
    </div>
  );
}

/* ============================================================
   Classic Games — Game Menu (New Game / Save / Post to Feed)
   ============================================================ */
// Module-level bridge so the in-shell Game Menu can read the active
// Versus-Bot game's current state for "Save Game" without threading a
// callback through every mode sub-component. The active bot game sets
// `getSnapshot` on mount and clears it on unmount.
const ClassicBridge = { getSnapshot: null };

// A Versus-Bot game registers its live-state snapshot provider here so the
// Game Menu's Save button can persist it. `active` should be true only while
// the game is in a saveable bot session.
function useClassicSaveSource(active, snapshotFn) {
  const ref = useRef(snapshotFn);
  ref.current = snapshotFn;
  useEffect(() => {
    if (!active) return;
    ClassicBridge.getSnapshot = () => (ref.current ? ref.current() : null);
    return () => { ClassicBridge.getSnapshot = null; };
  }, [active]);
}

// Save / load a Versus-Bot game's in-progress state via the generic
// user_game_state store (GET/PUT /api/state/:gameId).
function useClassicSave(gameId) {
  const [saving, setSaving] = useState(false);
  const saveState = async (stateObj) => {
    setSaving(true);
    const { ok } = await api(`/api/state/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify({ state: { mode: 'bot', savedAt: Date.now(), ...stateObj } }),
    });
    setSaving(false);
    return ok;
  };
  const loadState = async () => {
    const { ok, body } = await api(`/api/state/${gameId}`);
    if (ok && body && body.state && body.state.mode === 'bot') {
      return { ...body.state };
    }
    return null;
  };
  const clearState = async () => {
    await api(`/api/state/${gameId}`, { method: 'PUT', body: JSON.stringify({ state: {} }) }).catch(() => {});
  };
  return { saveState, loadState, clearState, saving };
}

// Polling hook for the generic classic_rooms online multiplayer (mirrors
// useMancalaRoom). `applyMove` posts a server-authoritative move (e.g. a
// Chutes & Ladders roll) and reconciles against the returned room.
function useClassicRoom(gameId, roomId) {
  const [room, setRoom] = useState(null);
  const [pollingError, setPollingError] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const consecutiveErrors = useRef(0);
  const intervalRef = useRef(null);

  const fetchRoom = async () => {
    if (!roomId) return;
    try {
      const { ok, status, body } = await api(`/api/classic/${gameId}/rooms/${roomId}`);
      if (ok && body) {
        setRoom(body);
        setPollingError(null);
        consecutiveErrors.current = 0;
        setOpponentDisconnected(false);
      } else if (status === 404) {
        setPollingError('room_not_found');
        consecutiveErrors.current++;
      } else {
        consecutiveErrors.current++;
        if (consecutiveErrors.current >= 3) { setOpponentDisconnected(true); setPollingError('connection_error'); }
      }
    } catch {
      consecutiveErrors.current++;
      if (consecutiveErrors.current >= 3) { setOpponentDisconnected(true); setPollingError('connection_error'); }
    }
  };

  useEffect(() => {
    if (!roomId) { setRoom(null); setPollingError(null); return; }
    consecutiveErrors.current = 0;
    fetchRoom();
    intervalRef.current = setInterval(fetchRoom, 1500);
    return () => clearInterval(intervalRef.current);
  }, [gameId, roomId]);

  const submitMove = async (payload) => {
    if (!room || room.status !== 'active') return;
    const moveSeq = room.moveSeq + 1;
    try {
      const { ok, body } = await api(`/api/classic/${gameId}/rooms/${roomId}/move`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, moveSeq }),
      });
      if (ok && body) setRoom(body);
      else fetchRoom();
    } catch { fetchRoom(); }
  };

  return { room, pollingError, opponentDisconnected, submitMove };
}

// Per-mode display metadata for the inline mode picker.
const CLASSIC_MODE_META = {
  solo:   { icon: '🎯', name: 'Classic Solo',      desc: 'Play solo and chase your best score' },
  bot:    { icon: '🤖', name: 'Versus Bot',        desc: 'Play against the computer' },
  '2p':   { icon: '👥', name: '2 Players',         desc: 'Pass and play on this device' },
  online: { icon: '🌐', name: 'Online Race',       desc: 'Race a friend via room code — highest score wins' },
};

// Inline mode picker shown by the Game Menu's "New Game" for games that route
// their modes through the menu (e.g. Chutes & Ladders). Calls onPlay(mode, opts).
function ClassicModePicker({ game, onPlay }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handlePlay = async () => {
    if (!mode) return;
    if (mode !== 'online') { onPlay(mode, {}); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${game.id}/rooms`, { method: 'POST' });
      setBusy(false);
      if (ok && body) onPlay('online', { roomAction: 'create', roomId: body.id });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api(`/api/classic/${game.id}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) onPlay('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="mnc-mode-select" style={{ padding: 0 }}>
      {(game.modes || []).map(m => (
        <button key={m} className={'mnc-mode-btn' + (mode === m ? ' active' : '')} onClick={() => { setMode(m); setError(''); }}>
          <span className="mnc-mode-icon">{CLASSIC_MODE_META[m].icon}</span>
          <span className="mnc-mode-text">
            <span className="mnc-mode-name">{CLASSIC_MODE_META[m].name}</span>
            <span className="mnc-mode-desc">{CLASSIC_MODE_META[m].desc}</span>
          </span>
        </button>
      ))}
      {mode === 'online' && (
        <div className="mnc-online-actions">
          <div className="mnc-mode-sub">
            <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
            <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
          </div>
          {onlineAction === 'join' && (
            <div className="mnc-join-form">
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            </div>
          )}
        </div>
      )}
      {error && <div className="mnc-join-error">{error}</div>}
      {mode && <button className="mnc-mode-start-btn" onClick={handlePlay} disabled={!canStart || busy}>{busy ? 'Please wait…' : 'Play'}</button>}
    </div>
  );
}

// Unified pre-launch mode-selection modal for multi-mode classic games
// (today: 2048 + Block Blast, modes ['solo','online']). Shows the game's
// modes, an Online create/join sub-panel, and — for games with a global
// leaderboard — a "Top players" preview. Calls onStart(mode, opts) to launch.
function GameModeModal({ game, onStart, onClose }) {
  const [mode, setMode] = useState(null);
  const [onlineAction, setOnlineAction] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const modes = game.modes || [];

  const handlePlay = async () => {
    if (!mode || busy) return;
    if (mode !== 'online') { onStart(mode, {}); return; }
    if (onlineAction === 'create') {
      setBusy(true);
      const { ok, body } = await api(`/api/classic/${game.id}/rooms`, { method: 'POST' });
      setBusy(false);
      if (ok && body) onStart('online', { roomAction: 'create', roomId: body.id });
      else setError('Could not create room. Try again.');
    } else if (onlineAction === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length < 4) { setError('Enter a valid room code.'); return; }
      setBusy(true);
      const { ok, status } = await api(`/api/classic/${game.id}/rooms/${code}/join`, { method: 'POST' });
      setBusy(false);
      if (ok) onStart('online', { roomAction: 'join', roomId: code });
      else if (status === 404) setError('Room not found. Check the code.');
      else if (status === 409) setError('Room is full or you created it.');
      else setError('Could not join. Try again.');
    }
  };

  const canStart = mode && (mode !== 'online' || onlineAction === 'create' || (onlineAction === 'join' && joinCode.trim().length >= 4));

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()} style={{ '--accent': game.tagColor || C.accent }}>
        <button className="gm-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="gm-modal-head">
          <span className="gm-modal-icon">{game.icon}</span>
          <div>
            <div className="gm-modal-title">{game.name}</div>
            <div className="gm-modal-desc">{game.desc}</div>
          </div>
        </div>
        <div className="gm-modal-label">Choose a mode</div>
        <div className="gm-modes">
          {modes.map(m => {
            const meta = CLASSIC_MODE_META[m] || { icon: '🎮', name: m, desc: '' };
            return (
              <button key={m} className={'gm-mode-btn' + (mode === m ? ' active' : '')}
                onClick={() => { setMode(m); setOnlineAction(null); setError(''); }}>
                <span className="gm-mode-icon">{meta.icon}</span>
                <span className="gm-mode-text">
                  <span className="gm-mode-name">{meta.name}</span>
                  <span className="gm-mode-desc">{meta.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {mode === 'online' && (
          <div className="gm-online">
            <div className="gm-online-actions">
              <button className={'mnc-difficulty-pill' + (onlineAction === 'create' ? ' active' : '')} onClick={() => { setOnlineAction('create'); setError(''); }}>Create Room</button>
              <button className={'mnc-difficulty-pill' + (onlineAction === 'join' ? ' active' : '')} onClick={() => { setOnlineAction('join'); setError(''); }}>Join Room</button>
            </div>
            {onlineAction === 'join' && (
              <input className="mnc-join-input" placeholder="Room code (e.g. AB3K7P)" value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }} maxLength={8} />
            )}
            {onlineAction === 'create' && (
              <div className="gm-online-hint">A room code will be generated — share it with a friend, then they pick Join Room.</div>
            )}
          </div>
        )}
        {error && <div className="mnc-join-error">{error}</div>}
        <button className="gm-play-btn" onClick={handlePlay} disabled={!canStart || busy}>
          {busy ? 'Please wait…' : 'Play'}
        </button>
        {game.leaderboard && (
          <div className="gm-modal-lb"><ClassicLeaderboard gameId={game.id} /></div>
        )}
      </div>
    </div>
  );
}

// The Menu tab of the ClassicShell bottom sheet: New Game, Save Game (bot
// only), and Post to Feed (after a result).
function ClassicGameMenuSection({ game, gameMode, lastResult, onNewGameMode, onSaveGame, onClose }) {
  const [picking, setPicking] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'plain'
  const modes = game.modes || [];
  const usePicker = !!game.menuModePicker && modes.length > 0;
  // Default new-game mode for games without an inline picker.
  const defaultMode = modes.length === 1 ? modes[0] : null;

  const doSave = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    const result = await onSaveGame();
    if (result && result.ok) {
      setSaveStatus('plain');
      setTimeout(() => setSaveStatus(null), 1500);
    } else {
      setSaveStatus(null);
    }
  };

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'plain' ? 'Saved ✓'
    : '💾 Save Game';

  return (
    <div className="cg-menu-section">
      <div className="cg-menu-label">New game</div>
      {usePicker ? (
        picking
          ? <ClassicModePicker game={game} onPlay={(mode, opts) => { setPicking(false); onNewGameMode(mode, opts); onClose && onClose(); }} />
          : <button className="cg-sheet-action" onClick={() => setPicking(true)}>↺ New Game</button>
      ) : (
        <button className="cg-sheet-action" onClick={() => { onNewGameMode(defaultMode, {}); onClose && onClose(); }}>↺ New Game</button>
      )}

      {game.supportsSave && gameMode === 'bot' && (
        <>
          <div className="cg-menu-label" style={{ marginTop: '0.6rem' }}>Versus Bot</div>
          <button className="cg-sheet-action" onClick={doSave} disabled={saveStatus === 'saving'}>{saveLabel}</button>
        </>
      )}

    </div>
  );
}

// A small in-stage banner offering to resume a saved Versus-Bot game.
function ClassicResumeBanner({ onResume, onDismiss }) {
  return (
    <div className="cg-resume-banner">
      <span>
        💾 You have a saved game.
      </span>
      <div className="cg-resume-actions">
        <button onClick={onResume}>Resume</button>
        <button className="ghost" onClick={onDismiss}>New</button>
      </div>
    </div>
  );
}

// game: { icon, name }; onExit/onNewGame callbacks; sheetSections: [{ id, label, render }]
// menuConfig (optional): wires the first "Menu" tab — New Game / Save / Post to Feed.
/* `?sheet=<sectionId>` — screenshot-state deep link for the ClassicShell ☰ sheet.
   The sheet holds real screens (the classic all-time Leaderboard, History,
   Stats) that plain navigation could not reach: they only exist after a tap, so
   before/after screenshots and proposal tests both landed on the game board
   instead. Reading the param at mount makes each tab addressable. Pure UI state
   — no writes — so it works in every environment, per the conventions. */
function classicSheetDeepLink() {
  try {
    const v = new URLSearchParams(window.location.search).get('sheet');
    return v ? String(v).toLowerCase() : null;
  } catch { return null; }
}

function ClassicShell({ game, onExit, onNewGame, sheetSections, children, menuConfig, onHowTo, onChat }) {
  const sections = [
    ...(menuConfig ? [{
      id: 'menu', label: 'Menu',
      render: () => <ClassicGameMenuSection {...menuConfig} onClose={() => setSheetOpen(false)} />,
    }] : []),
    ...(sheetSections || []),
    { id: 'settings', label: 'Settings', render: () => <CgSettings /> },
  ];
  // Only honour ?sheet= when this game actually has that section, so a stray
  // param can't open an empty sheet.
  const deepSection = (() => {
    const want = classicSheetDeepLink();
    return want && sections.some(s => s.id === want) ? want : null;
  })();
  const [sheetOpen, setSheetOpen] = useState(!!deepSection);
  const [, force] = useState(0);
  const [active, setActive] = useState(deepSection || sections[0].id);
  const open = (id) => { setActive(id || sections[0].id); setSheetOpen(true); cgSound('click'); };
  const toggleSound = () => { cgSetPref('sound', !cgPrefs.sound); force(n => n + 1); if (cgPrefs.sound) cgSound('click'); };
  const cur = sections.find(s => s.id === active) || sections[0];
  // Games whose New Game lives in the menu hide the topbar quick-reset ↺.
  const hideQuickReset = menuConfig && (game.modes || []).length > 0;
  const modePill = menuConfig && menuConfig.gameMode && CLASSIC_MODE_META[menuConfig.gameMode];
  return (
    <div className="cg-shell">
      <div className="cg-topbar">
        <button className="cg-btn" onClick={onExit} title="Back to lobby" aria-label="Back">←</button>
        <div className="cg-title">
          <span>{game.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</span>
          {modePill && <span className="cg-mode-pill">{modePill.icon} {menuConfig.gameMode === '2p' ? '2P' : menuConfig.gameMode === 'online' ? 'Online' : 'Bot'}</span>}
        </div>
        {onNewGame && !hideQuickReset && <button className="cg-btn" onClick={() => { cgSound('click'); onNewGame(); }} title="New game" aria-label="New game">↺</button>}
        {onChat && <button className="cg-btn" onClick={() => { cgSound('click'); onChat(); }} title="Game chat" aria-label="Game chat">💬</button>}
        {onHowTo && <button className="cg-btn" onClick={() => { cgSound('click'); onHowTo(); }} title="How to play" aria-label="How to play">?</button>}
        <button className="cg-btn" onClick={toggleSound} title="Sound" aria-label="Sound">{cgPrefs.sound ? '🔊' : '🔇'}</button>
        <button className="cg-btn" onClick={() => open()} title="Menu" aria-label="Menu">☰</button>
      </div>
      {children}
      <div className={'cg-sheet-backdrop' + (sheetOpen ? ' open' : '')} onClick={() => setSheetOpen(false)} />
      <div className={'cg-sheet' + (sheetOpen ? ' open' : '')}>
        <div className="cg-sheet-handle" />
        {sections.length > 1 && (
          <div className="cg-sheet-tabs">
            {sections.map(s => (
              <button key={s.id} className={'cg-sheet-tab' + (active === s.id ? ' active' : '')} onClick={() => setActive(s.id)}>{s.label}</button>
            ))}
          </div>
        )}
        {sheetOpen && cur.render()}
      </div>
    </div>
  );
}

// Shared status-bar helper for new games.
function CgStatus({ items }) {
  return (
    <div className="cg-statusbar">
      {items.map((it, i) => (
        <div className="cg-stat" key={i}><div className="l">{it.l}</div><div className="v">{it.v}</div></div>
      ))}
    </div>
  );
}

// Generic history list + stats grid section builders for the sheet.
function cgHistorySection(rows, renderRow) {
  return {
    id: 'history', label: 'History',
    render: () => (
      <div>
        <h4>Recent games</h4>
        {(!rows || rows.length === 0)
          ? <div className="cg-sheet-empty">No games yet — play one!</div>
          : <div className="cg-sheet-list">{rows.map((r, i) => <div className="cg-sheet-row" key={i}>{renderRow(r)}</div>)}</div>}
      </div>
    ),
  };
}
function cgStatsSection(cards) {
  return {
    id: 'stats', label: 'Stats',
    render: () => (
      <div>
        <h4>Stats</h4>
        <div className="cg-stats-grid">
          {cards.map((c, i) => <div className="cg-stat-card" key={i}><div className="val">{c.val}</div><div className="lbl">{c.lbl}</div></div>)}
        </div>
      </div>
    ),
  };
}
function cgRulesSection(items) {
  return {
    id: 'rules', label: 'How to play',
    render: () => <div><h4>How to play</h4><ul className="cg-rules">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>,
  };
}

// Submit a finished classic-game run to the global leaderboard. Best-effort:
// a network failure never blocks gameplay. `extra` is optional game-specific
// stats (e.g. { bestTimeSecs, bestLevel }). Returns the server's
// { bestScore, rank, gamesPlayed } or null.
async function submitClassicScore(gameId, score, extra) {
  try {
    const { ok, body } = await api(`/api/classic/${gameId}/score`, {
      method: 'POST',
      body: JSON.stringify({ score: Math.max(0, Math.round(score || 0)), extra: extra || undefined }),
    });
    return ok ? body : null;
  } catch { return null; }
}

// Reusable global leaderboard for the score-based classic games. Lazily fetches
// /api/classic/:gameId/leaderboard, highlights the caller, and pins their row
// when outside the top N. `valueFmt` formats a row's headline number.
/* ---- Leaderboard scope tabs (phase 4) --------------------------------------
   Global | Friends pills shared by every board. `?lbscope=friends` in the URL
   preselects the Friends view (used by proposal tests and deep links). */
function lbInitialScope() {
  try {
    return new URLSearchParams(window.location.search).get('lbscope') === 'friends'
      ? 'friends' : 'global';
  } catch { return 'global'; }
}
function LbScopeTabs({ scope, onChange }) {
  return (
    <div className="lb-scope-tabs">
      <button
        className={'lb-scope-tab' + (scope === 'global' ? ' active' : '')}
        onClick={() => onChange('global')}
      >🌍 Global</button>
      <button
        className={'lb-scope-tab' + (scope === 'friends' ? ' active' : '')}
        onClick={() => onChange('friends')}
      >👥 Friends</button>
    </div>
  );
}
const LB_FRIENDS_EMPTY = 'No friends on this board yet — add friends from the Friends screen.';

function ClassicLeaderboard({ gameId, url, valueLabel = 'Score', valueFmt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Friends scope only exists on the generic classic endpoint — boards with a
  // custom `url` (snake, breakout, …) stay single-scope.
  const [scope, setScope] = useState(url ? 'global' : lbInitialScope());
  const fmt = valueFmt || ((r) => `${r.bestScore} pts`);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    const path = url || `/api/classic/${gameId}/leaderboard${scope === 'friends' ? '?scope=friends' : ''}`;
    api(path).then(({ ok, body }) => {
      if (cancelled) return;
      if (ok && body) setData(body); else setError(true);
      setLoading(false);
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [gameId, scope]);

  const scopeTabs = !url && <LbScopeTabs scope={scope} onChange={setScope} />;
  if (loading) return <div><h4>Leaderboard</h4>{scopeTabs}<div className="cg-sheet-empty">Loading…</div></div>;
  if (error) return <div><h4>Leaderboard</h4>{scopeTabs}<div className="cg-sheet-empty">Couldn't load leaderboard.</div></div>;
  /* The generic classic endpoint returns `{ entries }`; the per-game boards
     reached through `url` (Snake's /api/snake/leaderboard) return `{ top }`.
     This only ever read `entries`, so Snake's sheet Leaderboard rendered
     "No scores yet — play to rank!" no matter how many scores existed — the
     stale "Snake leaderboard renders seeded scores" test was asserting against a
     screen that could never show a row. Accept either key. */
  const entries = (data && (data.entries || data.top)) || [];
  const me = data && data.me;
  const meInTop = me && entries.some(e => e.rank === me.rank);
  if (entries.length === 0) {
    return (
      <div>
        <h4>Leaderboard</h4>
        {scopeTabs}
        <div className="cg-sheet-empty">
          {scope === 'friends' ? LB_FRIENDS_EMPTY : 'No scores yet — play to rank!'}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h4>Leaderboard <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.78rem' }}>· {valueLabel}</span></h4>
      {scopeTabs}
      <div className="snake-lb">
        {entries.map(r => (
          <div key={r.rank} className={'snake-lb-row' + (me && r.rank === me.rank ? ' snake-lb-me' : '')}>
            <div className="snake-lb-rank">#{r.rank}</div>
            <div className="snake-lb-name">{r.username}{me && r.rank === me.rank ? ' (you)' : ''}</div>
            <div className="snake-lb-score">{fmt(r)}</div>
          </div>
        ))}
        {me && !meInTop && (
          <div className="snake-lb-row snake-lb-me" style={{ marginTop: '0.4rem' }}>
            <div className="snake-lb-rank">#{me.rank}</div>
            <div className="snake-lb-name">{me.username || 'you'} (you)</div>
            <div className="snake-lb-score">{fmt(me)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sheet-section builder so any ClassicShell game can add a Leaderboard tab.
function cgLeaderboardSection(gameId, opts) {
  return {
    id: 'leaderboard', label: 'Leaderboard',
    render: () => <ClassicLeaderboard gameId={gameId} url={opts && opts.url} valueLabel={(opts && opts.valueLabel) || 'Score'} valueFmt={opts && opts.valueFmt} />,
  };
}

// Generic online-race host for score-based classic games (2048, Block Blast).
// Each player plays their OWN board; whoever posts the higher final score wins.
// Lifecycle: waiting → countdown → playing → submitted → result. `renderBoard`
// is a render-prop that gets { onEnd(score) } and renders the solo board,
// calling onEnd exactly once when that board's game ends.
function ClassicRaceGame({ game, roomId, myPlayerNum, renderBoard, onExitLobby }) {
  const { room, pollingError } = useClassicRoom(game.id, roomId);
  const [phase, setPhase] = useState('waiting');
  const [count, setCount] = useState(3);
  const [myScore, setMyScore] = useState(null);
  const [canClaim, setCanClaim] = useState(false);
  const submittedRef = useRef(false);

  const oppScore = room ? (myPlayerNum === 1 ? room.p2Score : room.p1Score) : null;
  const oppName = room ? (myPlayerNum === 1 ? room.player2Name : room.player1Name) : null;

  // Start the countdown once both players are present and the room is active.
  useEffect(() => {
    if (phase === 'waiting' && room && room.status === 'active' && room.player2Id) {
      setPhase('countdown');
    }
    if (room && room.status === 'finished' && submittedRef.current && phase === 'submitted') {
      setPhase('result');
    }
  }, [room && room.status, room && room.player2Id]);

  // 3-2-1-Go countdown.
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCount(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(id); setPhase('playing'); }
      else setCount(n);
    }, 900);
    return () => clearInterval(id);
  }, [phase]);

  // Allow claiming the win if the opponent stalls 60s after I've finished.
  useEffect(() => {
    if (phase !== 'submitted') return;
    const id = setTimeout(() => setCanClaim(true), 60000);
    return () => clearTimeout(id);
  }, [phase]);

  const handleEnd = async (score) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setMyScore(score);
    setPhase('submitted');
    submitClassicScore(game.id, score); // also count toward global leaderboard
    try {
      const { ok, body } = await api(`/api/classic/${game.id}/rooms/${roomId}/score`, {
        method: 'POST', body: JSON.stringify({ score }),
      });
      if (ok && body && body.status === 'finished') setPhase('result');
    } catch {}
  };

  const claimWin = async () => {
    await api(`/api/classic/${game.id}/rooms/${roomId}/finish`, {
      method: 'POST', body: JSON.stringify({ winner: String(myPlayerNum) }),
    }).catch(() => {});
    setPhase('result');
  };

  if (pollingError === 'room_not_found') {
    return <div className="cg-stage" style={{ textAlign: 'center', padding: '2rem', color: C.rose }}>Room not found.</div>;
  }

  if (phase === 'waiting') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="mnc-spinner" />
        <div className="gm-race-title">Online Race</div>
        <div className="gm-race-sub">Waiting for opponent to join…</div>
        {room && (
          <div className="gm-race-code">Room code: <b>{room.id}</b></div>
        )}
        <button className="gm-play-btn" style={{ maxWidth: 220 }} onClick={onExitLobby}>Cancel</button>
      </div>
    );
  }
  if (phase === 'countdown') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="gm-race-title">Get ready!</div>
        <div className="gm-countdown">{count}</div>
        <div className="gm-race-sub">Race to the highest score</div>
      </div>
    );
  }
  if (phase === 'playing') {
    return (
      <div className="cg-stage cg-scroll">
        <div className="gm-opp-chip">🆚 {oppName || 'Opponent'}: <b>{oppScore != null ? oppScore : '…'}</b></div>
        {renderBoard({ onEnd: handleEnd })}
      </div>
    );
  }
  if (phase === 'submitted') {
    return (
      <div className="cg-stage gm-race-center">
        <div className="mnc-spinner" />
        <div className="gm-race-title">Your score: {myScore}</div>
        <div className="gm-race-sub">Waiting for {oppName || 'opponent'} to finish…</div>
        <div className="gm-race-code">Their score so far: <b>{oppScore != null ? oppScore : '—'}</b></div>
        {canClaim && <button className="gm-play-btn" style={{ maxWidth: 260 }} onClick={claimWin}>Opponent stalled — claim win</button>}
        <button className="gm-link-btn" onClick={onExitLobby}>Leave race</button>
      </div>
    );
  }
  // result
  const youWin = room && room.winner === String(myPlayerNum);
  const mine = room ? (myPlayerNum === 1 ? room.p1Score : room.p2Score) : myScore;
  const theirs = room ? (myPlayerNum === 1 ? room.p2Score : room.p1Score) : oppScore;
  return (
    <div className="cg-stage gm-race-center">
      <div style={{ fontSize: '2.4rem' }}>{youWin ? '🏆' : '🤝'}</div>
      <div className="gm-race-title">{youWin ? 'You win!' : (mine === theirs ? 'Draw' : 'Opponent wins')}</div>
      <div className="gm-race-scores">
        <div><span>You</span><b>{mine != null ? mine : '—'}</b></div>
        <div><span>{oppName || 'Opponent'}</span><b>{theirs != null ? theirs : '—'}</b></div>
      </div>
      <button className="gm-play-btn" style={{ maxWidth: 220 }} onClick={onExitLobby}>Back to lobby</button>
    </div>
  );
}
