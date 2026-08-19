
/* ============================================================
   Classic Games shared subsystems — prefs, sound, haptics, gestures
   ============================================================ */
const CG_SOUND_KEY   = 'puzzlechain_cg_sound';
const CG_HAPTICS_KEY = 'puzzlechain_cg_haptics';
const CG_MOTION_KEY  = 'puzzlechain_cg_motion';
const PREF_KEYS = { sound: CG_SOUND_KEY, haptics: CG_HAPTICS_KEY, motion: CG_MOTION_KEY };

// Module-level prefs read by cgSound/cgHaptic without prop threading.
const cgPrefs = {
  sound:   (() => { try { return localStorage.getItem(CG_SOUND_KEY) !== '0'; } catch { return true; } })(),
  haptics: (() => { try { return localStorage.getItem(CG_HAPTICS_KEY) !== '0'; } catch { return true; } })(),
  motion:  (() => { try { return localStorage.getItem(CG_MOTION_KEY) === '1'; } catch { return false; } })(),
};
function cgSetPref(key, val) {
  cgPrefs[key] = val;
  try { localStorage.setItem(PREF_KEYS[key] || CG_MOTION_KEY, val ? '1' : '0'); } catch {}
}

/* ============================================================
   Theme preference — light / dark / system (default system)
   ------------------------------------------------------------
   Device-local, like every other pref in this app (there is no
   server-side prefs table). The stored value is the PREFERENCE
   ('system' | 'light' | 'dark'); the RESOLVED theme is what lands on
   <html data-theme>. The same key + resolution logic is duplicated in
   index.html's inline boot script so the first paint is already
   correct — keep the two in sync if either changes.
   ============================================================ */
const THEME_KEY = 'puzzlechain_theme';
const THEME_PREFS = ['system', 'light', 'dark'];

function readThemePref() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return THEME_PREFS.indexOf(v) >= 0 ? v : 'system';
  } catch { return 'system'; }
}

function systemPrefersDark() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  catch { return false; }
}

function resolveTheme(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemPrefersDark() ? 'dark' : 'light';
}

const themeState = { pref: readThemePref(), resolved: 'light', version: 0 };
const themeSubscribers = new Set();

/* Single source of truth for "make the DOM match this preference". */
function applyTheme(pref, persist) {
  themeState.pref = THEME_PREFS.indexOf(pref) >= 0 ? pref : 'system';
  themeState.resolved = resolveTheme(themeState.pref);
  themeState.version += 1;
  if (persist) {
    try { localStorage.setItem(THEME_KEY, themeState.pref); } catch {}
  }
  try {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeState.resolved);
    root.setAttribute('data-theme-pref', themeState.pref);
    // Canvas games need real hex, not var() references.
    Object.assign(PAL, PALETTES[themeState.resolved]);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', PALETTES[themeState.resolved].bg);
  } catch {}
  themeSubscribers.forEach(fn => { try { fn(); } catch {} });
}

applyTheme(themeState.pref, false);

/* Live OS reaction: only meaningful while the pref is 'system'. Registered
   once at module scope (not per-component) so it survives every navigation. */
(() => {
  try {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (themeState.pref === 'system') applyTheme('system', false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange); // Safari < 14
  } catch {}
})();

/* Components that display the theme (the segmented control, Minesweeper's
   board) subscribe so an OS-driven flip re-renders them too. */
function useTheme() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(n => n + 1);
    themeSubscribers.add(fn);
    return () => { themeSubscribers.delete(fn); };
  }, []);
  return {
    pref: themeState.pref,
    resolved: themeState.resolved,
    setPref: (p) => applyTheme(p, true),
  };
}

/* Phase 1 — canvas colour correctness.
   `C.x` is the string 'var(--c-x)'. Assigning that to ctx.fillStyle is
   INVALID: the 2D context silently keeps its previous value, and because the
   context object persists across frames the stale colour leaks between draws
   (black on frame 1, "last frame's piece colour" thereafter). Canvas code MUST
   read real values from PAL. These helpers make that cheap and make a
   regression loud instead of silent. */

// Subscribe a canvas game to theme flips so a Light↔Dark toggle repaints.
function useThemeVersion() {
  const [v, setV] = useState(themeState.version);
  useEffect(() => {
    const fn = () => setV(themeState.version);
    themeSubscribers.add(fn);
    fn();
    return () => { themeSubscribers.delete(fn); };
  }, []);
  return v;
}

// Resolve a palette token name (or pass a literal colour straight through).
// Storing token NAMES and resolving at draw time is what lets a theme flip
// recolour mid-game (the BOUNCE_ROW_COLORS precedent).
function palOf(nameOrLiteral, fallback) {
  if (!nameOrLiteral) return fallback || PAL.text;
  if (typeof nameOrLiteral !== 'string') return fallback || PAL.text;
  if (PAL[nameOrLiteral] != null) return PAL[nameOrLiteral];
  return nameOrLiteral;
}

const CANVAS_COLOR_PROPS = ['fillStyle', 'strokeStyle', 'shadowColor'];
let _canvasGuardWarned = 0;

/* Guard: a `var(--…)` colour reaching a canvas is the bug class this phase
   fixes, so make it loud AND harmless — the assignment is swallowed so the
   stale-colour leak can never happen again, and the first few occurrences log
   a console error (which trips the platform's no-console-errors check).
   Deliberately NOT env-gated: identical code path in staging and production. */
function guardCanvasCtx(ctx) {
  if (!ctx || typeof Proxy === 'undefined') return ctx;
  if (ctx.__unGuarded) return ctx;
  try {
    const p = new Proxy(ctx, {
      get(t, k) {
        const v = t[k];
        return typeof v === 'function' ? v.bind(t) : v;
      },
      set(t, k, v) {
        if (CANVAS_COLOR_PROPS.indexOf(k) >= 0 && typeof v === 'string' && /^var\(/.test(v)) {
          if (_canvasGuardWarned < 12) {
            _canvasGuardWarned += 1;
            console.error(
              '[canvas-color] invalid canvas colour ' + JSON.stringify(v) + ' assigned to ctx.' + k +
              ' — canvas cannot resolve CSS custom properties. Read from PAL instead of C.'
            );
          }
          return true; // swallow: never let the stale-colour leak happen
        }
        t[k] = v;
        return true;
      },
    });
    try { Object.defineProperty(ctx, '__unGuarded', { value: true, enumerable: false }); } catch {}
    return p;
  } catch { return ctx; }
}

/* Load-time self-test: every PAL key must be a colour the canvas actually
   accepts, and every C token must be a var() reference (so nobody "fixes" the
   theming by inlining hex and breaking re-theming). */
function canvasColorSelfTest() {
  const problems = [];
  try {
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return true;
    for (const k of Object.keys(PAL)) {
      const want = PAL[k];
      if (typeof want !== 'string') { problems.push(k + ': not a string'); continue; }
      probe.fillStyle = '#000000';
      probe.fillStyle = want;
      // An invalid value leaves fillStyle at the previous colour.
      if (probe.fillStyle === '#000000' && want.toLowerCase() !== '#000000' && want.toLowerCase() !== '#000') {
        problems.push('PAL.' + k + ' = ' + want + ' is not a valid canvas colour');
      }
    }
    for (const k of Object.keys(C)) {
      if (!/^var\(--c-/.test(C[k])) problems.push('C.' + k + ' is not a var() token: ' + C[k]);
    }
  } catch { return true; }
  if (problems.length) {
    console.error('[canvas-color] self-test failed:\n  ' + problems.join('\n  '));
    return false;
  }
  return true;
}

let _cgAudioCtx = null;
function cgAudio() {
  if (_cgAudioCtx) return _cgAudioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _cgAudioCtx = new AC();
  } catch {}
  return _cgAudioCtx;
}
// Short synthesized cues — no asset files needed.
const CG_TONES = {
  move:      { f: 320, d: 0.05, t: 'square',   g: 0.05 },
  click:     { f: 440, d: 0.04, t: 'triangle', g: 0.05 },
  merge:     { f: 540, d: 0.09, t: 'sine',     g: 0.07 },
  clear:     { f: 660, d: 0.10, t: 'sine',     g: 0.08 },
  capture:   { f: 740, d: 0.12, t: 'triangle', g: 0.08 },
  deal:      { f: 380, d: 0.05, t: 'square',   g: 0.05 },
  chip:      { f: 500, d: 0.06, t: 'square',   g: 0.06 },
  win:       { f: 784, d: 0.22, t: 'sine',     g: 0.09 },
  lose:      { f: 150, d: 0.30, t: 'sawtooth', g: 0.08 },
  // Bounce-specific cues
  bwall:     { f: 290, d: 0.03, t: 'square',   g: 0.06 },
  bpaddle:   { f: 360, d: 0.07, t: 'triangle', g: 0.07 },
  bbrick:    { f: 580, d: 0.11, t: 'sine',     g: 0.09 },
  blevel:    { f: 880, d: 0.28, t: 'sine',     g: 0.10 },
  bpowerup:  { f: 720, d: 0.14, t: 'triangle', g: 0.08 },
  bdie:      { f: 190, d: 0.35, t: 'sawtooth', g: 0.10 },
  bgameover: { f: 140, d: 0.55, t: 'sawtooth', g: 0.11 },
};
function cgSound(name, pitch) {
  if (!cgPrefs.sound) return;
  const ctx = cgAudio();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const spec = CG_TONES[name] || CG_TONES.click;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.t;
    osc.frequency.value = spec.f * (pitch || 1);
    gain.gain.value = spec.g;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(spec.g, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.d);
    osc.start(now);
    osc.stop(now + spec.d + 0.02);
  } catch {}
}
function cgHaptic(ms) {
  if (!cgPrefs.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch {}
}

/* ============================================================
   Background-music manager — fetch / decode / loop an audio asset
   ------------------------------------------------------------
   Unlike the short synthesized cgSound cues, looping background music needs a
   real asset. We fetch the file once, decode it into an AudioBuffer with the
   Web Audio API, and play it on a looping BufferSource routed through a shared
   gain node (BG_MUSIC_GAIN keeps it at a moderate background level so it never
   drowns out the cgSound effects). decodeAudioData decodes from the raw bytes
   regardless of file extension / Content-Type, so the asset's container is not
   constrained by its `.mp3` name. All state is module-level so a single track
   plays at a time; calling start again with the same url reuses the decoded
   buffer instead of re-fetching.
   ============================================================ */
const BG_MUSIC_GAIN = 0.4;
let _bgAudioCtx = null;
let _bgMusicGainNode = null;
let _bgMusicSource = null;
let _bgMusicBuffer = null;
let _bgMusicUrl = null;
let _bgMusicLoading = false;
// True once the caller has asked to stop/pause — guards the async decode from
// auto-starting playback after a stop that raced the fetch.
let _bgMusicStopped = true;
// Bumped on every fetch/decode kicked off — lets a superseded in-flight
// request (e.g. a second startBackgroundMusic(url) call for a different
// track before the first one finished decoding) recognize it's stale and
// skip starting a source, instead of both requests racing to call
// _bgStartSource() and briefly double-firing playback.
let _bgMusicToken = 0;

function bgAudioContext() {
  if (_bgAudioCtx) return _bgAudioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _bgAudioCtx = new AC();
  } catch {}
  return _bgAudioCtx;
}

// (Re)create and start the looping source from the already-decoded buffer.
function _bgStartSource() {
  const ctx = bgAudioContext();
  if (!ctx || !_bgMusicBuffer) return;
  // Tear down any prior source first (start() can only be called once per node).
  if (_bgMusicSource) {
    try { _bgMusicSource.onended = null; _bgMusicSource.stop(); } catch {}
    _bgMusicSource = null;
  }
  if (!_bgMusicGainNode) {
    _bgMusicGainNode = ctx.createGain();
    _bgMusicGainNode.gain.value = BG_MUSIC_GAIN;
    _bgMusicGainNode.connect(ctx.destination);
  }
  const src = ctx.createBufferSource();
  src.buffer = _bgMusicBuffer;
  src.loop = true;
  src.connect(_bgMusicGainNode);
  try { src.start(0); } catch {}
  _bgMusicSource = src;
}

// Start (or resume) looping the track at `url`. Must be called from a user
// gesture the first time so the AudioContext is allowed to produce sound.
function startBackgroundMusic(url) {
  const ctx = bgAudioContext();
  if (!ctx) return;
  _bgMusicStopped = false;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch {}
  // Already decoded this track → just (re)start playback synchronously.
  if (_bgMusicBuffer && _bgMusicUrl === url) {
    if (!_bgMusicSource) _bgStartSource();
    return;
  }
  if (_bgMusicLoading && _bgMusicUrl === url) return; // fetch already in flight
  _bgMusicLoading = true;
  _bgMusicUrl = url;
  _bgMusicBuffer = null;
  const token = ++_bgMusicToken;
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => new Promise((resolve, reject) => {
      // decodeAudioData has both promise and legacy-callback forms — support both.
      let p;
      try { p = ctx.decodeAudioData(buf, resolve, reject); } catch (e) { reject(e); return; }
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    }))
    .then(decoded => {
      // A newer startBackgroundMusic() call superseded this one while we were
      // decoding — drop the stale result instead of racing it into _bgStartSource().
      if (token !== _bgMusicToken) return;
      _bgMusicLoading = false;
      _bgMusicBuffer = decoded;
      // Only begin if no stop/pause arrived while we were decoding.
      if (!_bgMusicStopped) _bgStartSource();
    })
    .catch(() => { if (token === _bgMusicToken) _bgMusicLoading = false; });
}

// Stop playback (used as pause too — resume restarts the loop from its start).
function stopBackgroundMusic() {
  _bgMusicStopped = true;
  if (_bgMusicSource) {
    try { _bgMusicSource.onended = null; _bgMusicSource.stop(); } catch {}
    _bgMusicSource = null;
  }
}

// Resume after a stop/pause. Reuses the decoded buffer when present; otherwise
// re-fetches the last url.
function resumeBackgroundMusic() {
  const ctx = bgAudioContext();
  if (!ctx) return;
  _bgMusicStopped = false;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch {}
  if (_bgMusicBuffer) {
    if (!_bgMusicSource) _bgStartSource();
  } else if (_bgMusicUrl) {
    startBackgroundMusic(_bgMusicUrl);
  }
}

// Discrete-gesture hook: tap / swipe / long-press / double-tap on an element.
function useGestures(ref, handlers) {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0, startY = 0, startT = 0, lpTimer = null, lastTap = 0, moved = false;
    const SWIPE = 30;
    const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY; startT = Date.now(); moved = false;
      clearLp();
      if (h.current.onLongPress) {
        lpTimer = setTimeout(() => {
          if (!moved) { h.current.onLongPress({ x: startX, y: startY, target: e.target }); lpTimer = null; }
        }, 480);
      }
    };
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      if (Math.abs(p.clientX - startX) > 8 || Math.abs(p.clientY - startY) > 8) { moved = true; clearLp(); }
    };
    const onUp = (e) => {
      clearLp();
      const p = e.changedTouches ? e.changedTouches[0] : e;
      const dx = p.clientX - startX, dy = p.clientY - startY;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) >= SWIPE) {
        if (h.current.onSwipe) {
          const dir = adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          h.current.onSwipe(dir, { x: startX, y: startY, target: e.target });
        }
        return;
      }
      // Treat as tap
      const now = Date.now();
      if (now - startT > 480) return; // was a long press
      if (h.current.onDoubleTap && now - lastTap < 280) {
        h.current.onDoubleTap({ x: startX, y: startY, target: e.target });
        lastTap = 0;
        return;
      }
      lastTap = now;
      if (h.current.onTap) h.current.onTap({ x: startX, y: startY, target: e.target });
    };
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onUp);
    return () => {
      clearLp();
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onUp);
    };
  }, [ref]);
}

// Drag tracking for Block Blast pieces / Diamond Rush swaps.
function pointerXY(e) {
  const p = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return { x: p.clientX, y: p.clientY };
}
