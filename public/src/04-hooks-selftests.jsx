/* ============================================================
   Shared timer hook
   ============================================================ */
// Counts up from `initialSecs` (default 0) while `running`. Seeding from a
// non-zero value lets a resumed daily attempt continue the timer from where it
// left off instead of restarting.
function useTimer(running, initialSecs = 0) {
  const [secs, setSecs] = useState(initialSecs);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { secs, fmt: fmt(secs) };
}

/* ============================================================
   Shared responsive-board + input foundation (slice 1)
   ============================================================
   Three primitives every board game can lean on so a puzzle fits the
   viewport and reacts on the next frame:

     useFitBox      — measures the space a board actually has and derives
                      an integer cell size from it (ResizeObserver based).
     useCanvasBoard — DPR-correct canvas sizing + redraw scheduling, the
                      HashRushGame/BounceGame idiom generalized.
     usePointerCell — tap / long-press / drag over a board element, with
                      the long-press deliberately firing the OPPOSITE
                      action in the games that use it.

   None of these own game state; they hand back geometry and events. */

// Measure the board's container and derive a square cell size that makes a
// cols×rows grid fit inside it. `gap` is the inter-cell gutter (counted
// cols-1 / rows-1 times, so the caller can lay out at cell+gap and still fit);
// `padX`/`padY` are subtracted for borders, clue gutters and breathing room.
// Returns integers so canvas strokes stay crisp.
function useFitBox(ref, { cols, rows, minCell = 16, maxCell = 64, gap = 0, padX = 0, padY = 0 } = {}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      // A collapsed parent (0-height flex child mid-layout) would pin the
      // cell to minCell forever; ignore those frames and wait for a real one.
      if (r.width < 1 && r.height < 1) return;
      setBox(prev => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
        ? prev : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      window.addEventListener('orientationchange', measure);
      return () => {
        window.removeEventListener('resize', measure);
        window.removeEventListener('orientationchange', measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, cols, rows]);

  // The gutters are fixed overhead, so take them off the box BEFORE dividing —
  // dividing first and laying out at cell+gap overflows by gap*(n-1).
  const availW = Math.max(0, box.w - padX - gap * Math.max(0, cols - 1));
  const availH = Math.max(0, box.h - padY - gap * Math.max(0, rows - 1));
  const raw = (cols > 0 && rows > 0 && availW > 0 && availH > 0)
    ? Math.floor(Math.min(availW / cols, availH / rows))
    : minCell;
  const cell = Math.max(minCell, Math.min(maxCell, raw));
  return { cell, boxW: box.w, boxH: box.h, ready: box.w > 0 && box.h > 0 };
}

/* The FitScale scale-to-fit wrapper (slice 5) is GONE: its last riders
   (Mahjong, Spider, the Tile Match pair, Crate Push) all draw canvases sized
   from the measured box now, so nothing shrinks a fixed-pixel board with a
   transform any more. The .fit-scale-box CSS class stays — Word Search uses
   it as a plain flex box, and describeAppStylesheet() keys on the
   .fit-scale-content rule to recognize the app's own stylesheet. */

// DPR-correct canvas sizing + redraw scheduling. `draw(ctx, geom)` is called
// on a rAF whenever `deps` change or the element resizes; `geom` carries the
// CSS-pixel width/height so draw code never touches devicePixelRatio itself.
function useCanvasBoard(canvasRef, { width, height, draw, deps = [] }) {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const rafRef = useRef(0);
  // A Light↔Dark flip must repaint immediately — canvas colours come from PAL,
  // which re-themes without any React state changing on its own.
  const themeV = useThemeVersion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !(width > 0) || !(height > 0)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const c = canvasRef.current;
      if (!c) return;
      const ctx = guardCanvasCtx(c.getContext('2d'));
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, { w: width, h: height, dpr });
    });
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, [canvasRef, width, height, themeV, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Shared DPR cap for the hand-rolled canvas loops (bounce, zuma, hashrush,
// bouncedaily) so they match useCanvasBoard instead of allocating a 4x backing
// store on high-density Androids.
function canvasDpr() { return Math.min(window.devicePixelRatio || 1, 3); }

/* PHASE 3 — no page scroll while a run is live.
   `fitShell` only covers dailies that opted in; shell:'self' games bypass it
   entirely, and a drag on a board could always pull the document. This locks
   the document itself, so it holds for all 33 games. Reference-counted: two
   overlapping locks (game + open sheet) must not fight over the restore. */
let _scrollLockCount = 0;
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    _scrollLockCount += 1;
    const root = document.documentElement;
    if (_scrollLockCount === 1) {
      root.classList.add('un-scroll-locked');
      document.body.classList.add('un-scroll-locked');
    }
    return () => {
      _scrollLockCount = Math.max(0, _scrollLockCount - 1);
      if (_scrollLockCount === 0) {
        root.classList.remove('un-scroll-locked');
        document.body.classList.remove('un-scroll-locked');
      }
    };
  }, [active]);
}

/* PHASE 2 — the shared tap primitive.
   Spread onto any tappable board element. Two jobs:
     1. Press feedback on finger-DOWN (`data-pressed`), not on the browser's
        delayed click — this is the "I tapped and nothing happened" fix.
     2. Fire the action from pointerdown/pointerup instead of click, so a tap
        never waits on double-tap-to-zoom detection.
   `data-pressed` is cleared on up/cancel/lostpointercapture so it can never
   stick. Mouse and keyboard paths are preserved (onClick still fires for
   non-touch, guarded against double-firing). */
/* The touch/click de-dupe guard lives at MODULE scope, not in tapProps'
   closure. That distinction is the whole bug behind "one tap types two
   letters" (Daily Cipher's LENDING -> LLEENND):

     pointerup -> onTap() -> setState -> React 18 flushes the re-render
     SYNCHRONOUSLY (pointerup is a discrete event) -> the element's props are
     replaced by a FRESH tapProps(...) object -> the browser's compatibility
     `click` then dispatches against that new object, whose per-render
     `handledPointer` is back to false -> onTap() fires a SECOND time.

   Any tappable that changes state on tap hit this on every touch device, so
   the guard has to outlive the render. We record which element consumed a
   touch and when; the compat click that follows (always within a few ms) is
   swallowed. Asserted by the `tap-dedupe-survives-rerender` self-test. */
let _tapHandledEl = null;
let _tapHandledAt = 0;
const TAP_CLICK_SUPPRESS_MS = 700;

function tapMarkHandled(el) {
  _tapHandledEl = el || null;
  _tapHandledAt = Date.now();
}
function tapWasHandled(el) {
  if (!_tapHandledEl || _tapHandledEl !== el) return false;
  if (Date.now() - _tapHandledAt > TAP_CLICK_SUPPRESS_MS) {
    _tapHandledEl = null;
    return false;
  }
  // One-shot: consume it so a later genuine click on the same element works.
  _tapHandledEl = null;
  return true;
}

function tapProps(onTap, { disabled = false } = {}) {
  if (disabled) return {};
  return {
    onPointerDown: (e) => {
      if (e.currentTarget.setAttribute) e.currentTarget.setAttribute('data-pressed', '1');
    },
    onPointerUp: (e) => {
      if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
      // Touch/pen act on release-in-place; mouse falls through to onClick so
      // text selection and drag handlers elsewhere keep working.
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        // Mark BEFORE running the action: onTap re-renders, and the compat
        // click is dispatched against whatever props exist by then.
        tapMarkHandled(e.currentTarget);
        onTap && onTap(e);
      }
    },
    onPointerCancel: (e) => {
      if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
    },
    onPointerLeave: (e) => {
      if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
    },
    onClick: (e) => {
      if (tapWasHandled(e.currentTarget)) return;
      onTap && onTap(e);
    },
  };
}

/* ============================================================
   Load-time self-tests (mirrors the server's boot self-tests).
   These run once on load and log a console error on failure, which trips the
   platform's no-console-errors proposal check — so a regression in any of these
   invariants blocks a merge instead of silently shipping.
   ============================================================ */
/* #150 — the barrier that keeps navState serializable. Every field of the
   history reducer's nav state passes through here, because ONE DOM-bearing
   value (React hands a SyntheticEvent to a bare `onClick={backToLobby}`)
   made JSON.stringify throw "Converting circular structure to JSON" — and with
   no error boundary above it, that unmounted the entire React root, stylesheet
   included. Asserted by the nav-state-primitives self-test. */
function navPrimitive(v) {
  if (v == null) return null;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return v;
  return null; // objects/functions/symbols can never reach the serializer
}

/* PHASE 2 (#163) — one reusable off-screen probe for touch-action computed
   values. Created once per sweep; `read(cls)` swaps the class and re-reads, and
   getComputedStyle flushes style recalc so the value is always current. */
function tapActionProbe() {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  document.body.appendChild(probe);
  return {
    read(cls) {
      probe.className = cls;
      return getComputedStyle(probe).touchAction;
    },
    destroy() { try { probe.remove(); } catch (_) {} },
  };
}

/* THE CANARY. `.un-selftest-canary` is emitted by the SAME generator as every
   real touch-action rule, so if it computes to `manipulation` the app
   stylesheet is genuinely APPLYING — not merely sitting in the DOM with its
   text present, which is all the old readiness check could tell. When it reads
   `auto`, every per-class probe below would report the UA default, and
   reporting 18 phantom class failures is what pointed #149 (and now #163) at
   the tap-target registry instead of at the stylesheet. */
function tapCanaryApplied() {
  try {
    const p = tapActionProbe();
    try { return p.read(TAP_CANARY_CLASS) === 'manipulation'; }
    finally { p.destroy(); }
  } catch (_) { return false; }
}

/* Diagnostics for a stylesheet that is present but not applying — enough to
   tell "no sheet at all" from "sheet blocked / cross-origin / empty". */
function describeAppStylesheet() {
  try {
    const sheets = Array.from(document.styleSheets || []);
    const mine = sheets.find((s) => {
      try {
        return s.ownerNode && s.ownerNode.textContent
          && s.ownerNode.textContent.indexOf('.fit-scale-content') >= 0;
      } catch (_) { return false; }
    });
    if (!mine) return 'sheets=' + sheets.length + ', appSheet=absent';
    let rules = 'unreadable';
    try { rules = String((mine.cssRules || []).length); } catch (e) { rules = 'blocked(' + e.name + ')'; }
    return 'sheets=' + sheets.length + ', appSheetRules=' + rules
      + ', disabled=' + !!mine.disabled;
  } catch (e) { return 'introspection-failed(' + (e && e.message) + ')'; }
}

/* `styleReady` is passed false when scheduleSelfTests() exhausted its retry
   budget without ever seeing the app's stylesheet APPLY. In that state EVERY
   computed-style probe returns the UA default, so the touch-action sweep used
   to report all 18 tappable classes as broken — which is exactly how #149 was
   filed against the tap-target registry when the real cause was a crash that
   unmounted the stylesheet (#150). One honest `stylesheet-*` failure beats 18
   phantom ones, so the computed-style checks are SKIPPED instead. */
function runClientSelfTests(styleReady) {
  const fails = [];
  const check = (name, fn) => {
    ran++;
    try { if (fn() !== true) fails.push(name); }
    catch (e) { fails.push(name + ': ' + e.message); }
  };
  let ran = 0;
  // Two independent gates. `styleReady` says the scheduler saw the sheet land;
  // the canary says it is actually painting. Either one failing means every
  // computed-style probe below is measuring the UA default, not this app.
  const canaryOk = tapCanaryApplied();
  const styleOk = styleReady !== false && canaryOk;
  // Only runs when the stylesheet is actually live; otherwise it would report
  // a layout/computed-style bug that doesn't exist.
  const checkStyled = (name, fn) => { if (styleOk) check(name, fn); };
  if (!styleOk) {
    fails.push(canaryOk
      ? 'stylesheet-missing: the app stylesheet never mounted, so ' +
        'computed-style checks were skipped (they would all report the UA default)'
      : 'stylesheet-not-applied: the generated .' + TAP_CANARY_CLASS + ' canary rule ' +
        'does not apply, so computed-style checks were skipped — this is a ' +
        'stylesheet problem, NOT a tap-target registry problem (' +
        describeAppStylesheet() + ')');
  }

  // Phase 1 — canvas colours.
  check('canvas-colors', canvasColorSelfTest);

  /* The double-input regression guard. One TOUCH tap = exactly one action,
     even though the action's setState re-renders the element and replaces its
     handler props before the compatibility `click` arrives. The old per-render
     `handledPointer` closure failed exactly here, which is why typing LENDING
     in Daily Cipher produced LLEENND. Simulated with plain objects: the second
     tapProps(...) stands in for the post-render props object. */
  check('tap-dedupe-survives-rerender', () => {
    const el = { _attrs: {}, setAttribute(k, v) { this._attrs[k] = v; }, removeAttribute(k) { delete this._attrs[k]; } };
    let fired = 0;
    const onTap = () => { fired++; };
    const first = tapProps(onTap);
    first.onPointerDown({ currentTarget: el, pointerType: 'touch' });
    first.onPointerUp({ currentTarget: el, pointerType: 'touch' });
    if (fired !== 1) throw new Error('touch pointerup fired ' + fired + ' times, expected 1');
    // The re-render the action just caused: brand-new props object, same node.
    const afterRerender = tapProps(onTap);
    afterRerender.onClick({ currentTarget: el });
    if (fired !== 1) throw new Error('compat click after re-render fired again (' + fired + ' total)');
    // A genuine MOUSE click on the same element afterwards must still work.
    tapProps(onTap).onClick({ currentTarget: el });
    if (fired !== 2) throw new Error('mouse click was swallowed (' + fired + ' total, expected 2)');
    return true;
  });

  // Phase 5 (#143) — 2048 vertical swipes were inverted. A lone tile at the
  // bottom row swiped 'up' must reach row 0, and vice versa.
  check('t2048-up', () => {
    const g = [[null, null, null, null], [null, null, null, null],
               [null, null, null, null], [t2048_newTile(2), null, null, null]];
    const r = t2048_move(g, 'up');
    return !!(r.grid[0][0] && !r.grid[3][0]);
  });
  check('t2048-down', () => {
    const g = [[t2048_newTile(2), null, null, null], [null, null, null, null],
               [null, null, null, null], [null, null, null, null]];
    const r = t2048_move(g, 'down');
    return !!(r.grid[3][0] && !r.grid[0][0]);
  });
  check('t2048-left', () => {
    const g = [[null, null, null, t2048_newTile(2)], [null, null, null, null],
               [null, null, null, null], [null, null, null, null]];
    const r = t2048_move(g, 'left');
    return !!(r.grid[0][0] && !r.grid[0][3]);
  });

  // Phase 5 (#139) — Word Search must place every word on the bigger grid.
  check('wordsearch-placement', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const rng = mulberry32(seed * 7919);
      const b = generateWordSearch(rng);
      for (const w of b.words) if (!locateWord(b.letters, w)) return false;
    }
    return true;
  });

  // Phase 5 (#138) — Daily Cipher must not repeat a word inside ANY window of
  // CW_CYCLE_LEN consecutive days (a sliding guarantee, not just an aligned
  // one), and every day must deal a full round set. Repeats inside a week are
  // what made every day feel identical.
  check('cipher-rotation', () => {
    /* Check the CAUSE before the symptom. The rotation guarantee is a partition
       over the union of every theme, so one word appearing in two themes breaks
       it — and the day-window failure below reports that as "X repeats on days
       4 and 8", which reads like a bug in the block maths. It is not: adding a
       Nature theme that shared 14 landform words with Geography produced
       exactly that message. Name the real problem. */
    const owner = new Map();
    for (const t of CW_THEMES) {
      for (const def of t.words) {
        if (owner.has(def.word) && owner.get(def.word) !== t.name) {
          throw new Error(`${def.word} is in two themes ("${owner.get(def.word)}" and ` +
            `"${t.name}") — the rotation partitions the UNION of the themes, so a ` +
            `word may only appear once across all of them`);
        }
        owner.set(def.word, t.name);
      }
    }
    for (let base = 0; base < 240; base++) {
      const seen = new Map();
      for (let d = base; d < base + CW_CYCLE_LEN; d++) {
        const rs = cwRoundsForDay(d);
        if (rs.length !== CW_ROUNDS_PER_DAY) {
          throw new Error('day ' + d + ' dealt ' + rs.length + ' words');
        }
        for (const def of rs) {
          if (seen.has(def.word)) {
            throw new Error(def.word + ' repeats on days ' + seen.get(def.word) + ' and ' + d);
          }
          seen.set(def.word, d);
        }
      }
    }
    return true;
  });

  // Phase 8 (#121) — every Mahjong layout must have the same slot count, or a
  // resumed board hydrates against the wrong shape.
  check('mahjong-layouts', () => {
    const bad = MJ_LAYOUTS.filter(l => l.pos.length !== 60).map(l => l.name + '=' + l.pos.length);
    if (bad.length) throw new Error('layouts not 60 slots: ' + bad.join(', '));
    // And every day must resolve to a real layout.
    for (let d = 0; d < 70; d++) if (!mjLayoutForDay(d)) throw new Error('no layout for day ' + d);
    return true;
  });

  /* A HELD CONTROL MUST STILL BE THERE. tapProps sets [data-pressed] on
     pointerdown and acts on pointerup, so any rule that takes a pressed
     element out of the flow breaks the press outright: it is not under the
     cursor when the finger lifts, and the click lands on whatever slid into
     its place. #173 did exactly that by ending this rule's selector list with
     a comma above .sr-only, which merged the two and clipped every tappable
     control to 1px for the duration of the press. Buttons vanished while held
     and did nothing on release.

     Probing a real pressed element is the only way to see it — the CSS parses,
     the selectors are all spelled correctly, and nothing throws. */
  checkStyled('press-feedback-visible', () => {
    const probe = document.createElement('button');
    probe.className = 'tappable';
    probe.textContent = 'probe';
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    try {
      const before = probe.getBoundingClientRect();
      probe.setAttribute('data-pressed', '1');
      const cs = getComputedStyle(probe);
      const after = probe.getBoundingClientRect();
      if (cs.clip !== 'auto' && cs.clip !== '') {
        throw new Error('a pressed .tappable is clipped (clip: ' + cs.clip + ') — it is being hidden, not highlighted');
      }
      // Allow the intended scale, but nothing that collapses the box.
      if (after.width < before.width * 0.6 || after.height < before.height * 0.6) {
        throw new Error('a pressed .tappable collapses from ' +
          Math.round(before.width) + 'x' + Math.round(before.height) + ' to ' +
          Math.round(after.width) + 'x' + Math.round(after.height) +
          ' — pointerup will miss it and the tap will not register');
      }
      return true;
    } finally {
      probe.remove();
    }
  });

  // Phase 3 — every daily must opt into the one-viewport column, or it scrolls
  // (or clips) during play. This is the standing guarantee behind the audit.
  // #149 — extended past the FLAG: fitShell without a .fit-col root CLIPS
  // instead of fitting, so when a daily is actually mounted, assert the class
  // is really on the tree. (Real-time dailies that render their own shell are
  // out of scope; every category:'daily' game here uses shell:'daily'.)
  check('registry-fitshell', () => {
    /* #176 — the gate is the SHELL, not the category and not the play mode.
       `fitShell` is read by exactly one renderer, the daily game-wrap, so it is
       every shell:'daily' entry that must set it — that is the same set as
       category:'daily' today, but says why rather than restating the coincidence.

       It is NOT "declares a daily play mode". Seven classics gained a daily in
       #176 and still render through ClassicShell, whose .cg-stage keeps
       .cg-scroll deliberately (an overflow:hidden stage clips a tall setup
       screen instead of fitting it) and whose boards honour the --cg-board
       viewport cap instead. Demanding fitShell of them would demand a flag the
       shell they use never reads. */
    const missing = GAMES.filter(g => g.shell === 'daily' && !g.fitShell).map(g => g.id);
    if (missing.length) throw new Error('dailies missing fitShell: ' + missing.join(', '));
    const wrap = document.querySelector('.game-wrap.fit');
    if (wrap && !wrap.querySelector('.fit-col')) {
      throw new Error('a fitShell daily is mounted with no .fit-col root — it will clip, not fit');
    }
    return true;
  });

  /* #149 — the collapse itself, measured. An auto cross-axis margin opts a
     flex item out of `align-items: stretch`, so a board inside .fit-col
     silently shrank to fit-content (Daily Snake rendered at 16px). Assert the
     mounted board fills its column, up to its own max-width cap. */
  checkStyled('fitcol-fill', () => {
    const col = document.querySelector('.fit-col');
    if (!col) return true; // no daily mounted right now
    const BOARDS = '.sudoku, .wordsearch, .wspr-grid, .dsnk-board';
    const board = col.querySelector(BOARDS);
    if (!board) return true;
    const colW = col.getBoundingClientRect().width;
    if (colW < 40) return true; // laid out off-screen / mid-mount
    const cs = getComputedStyle(board);
    const cap = parseFloat(cs.maxWidth);
    const want = Number.isFinite(cap) ? Math.min(colW, cap) : colW;
    const got = board.getBoundingClientRect().width;
    if (got < want - 4) {
      throw new Error(board.className + ' is ' + Math.round(got) + 'px in a '
        + Math.round(colW) + 'px column (expected ~' + Math.round(want) + 'px)');
    }
    return true;
  });

  /* #167 — the games grid must read as even tiles. Measured, because every way
     this regresses is a layout effect no static scan sees: re-adding
     `align-items: start` to .grid, dropping `grid-auto-rows: 1fr`, an unclamped
     title/blurb, or a footer that forgets `margin-top: auto`. One tolerance of
     1px covers sub-pixel row rounding. */
  checkStyled('grid-uniform-cards', () => {
    const cards = Array.from(document.querySelectorAll('.grid > .card'));
    if (cards.length < 2) return true; // grid not mounted (in a game, or filtered to one)
    const hs = cards.map((c) => c.getBoundingClientRect().height);
    if (Math.max.apply(null, hs) < 40) return true; // laid out off-screen / mid-mount
    const lo = Math.min.apply(null, hs);
    const hi = Math.max.apply(null, hs);
    if (hi - lo > 1) {
      const nameOf = (c) => {
        const n = c.querySelector('.card-name');
        return n ? n.textContent : '?';
      };
      throw new Error('game cards are ragged: ' + Math.round(lo) + 'px ('
        + nameOf(cards[hs.indexOf(lo)]) + ') vs ' + Math.round(hi) + 'px ('
        + nameOf(cards[hs.indexOf(hi)]) + ') across ' + cards.length + ' cards');
    }
    return true;
  });

  /* #149, statically — fires even for a game that isn't mounted. A board rule
     that sets an auto SIDE margin without a definite width is the bug class;
     inside .fit-col that always collapses the board. */
  check('fitcol-auto-margin', () => {
    const BOARDS = ['sudoku', 'wordsearch', 'wspr-grid', 'dsnk-board'];
    const bad = [];
    for (const cls of BOARDS) {
      // Grab the .fit-col-scoped rule bodies for this class.
      const re = new RegExp('\\.fit-col[^{}]*\\.' + cls + '\\b[^{}]*\\{([^}]*)\\}', 'g');
      let m, sawRule = false;
      while ((m = re.exec(css))) {
        sawRule = true;
        const body = m[1];
        /* A DEFINITE width is what re-enables stretch. Read the declared value
           and compare it, rather than a `(?!auto)` lookahead — `\s*` backtracks
           to zero width there, so `width: auto` would slip past and make this
           whole check vacuous. `max-width` is not matched: the char before
           `width` must be `;`/whitespace/start, never `-`. */
        let hasWidth = false, wm;
        const wre = /(^|[;\s])width\s*:([^;]+)/g;
        while ((wm = wre.exec(body))) {
          if (wm[2].trim().toLowerCase() !== 'auto') hasWidth = true;
        }
        const autoSide = /(^|[;\s])margin\s*:[^;]*\bauto\b/.test(body)
          || /margin-(left|right|inline-start|inline-end|inline)\s*:\s*auto/.test(body);
        if (autoSide && !hasWidth) bad.push('.fit-col .' + cls);
      }
      if (!sawRule) bad.push('.fit-col .' + cls + ' (no fit-col override at all)');
    }
    if (bad.length) throw new Error('auto side margin without a definite width: ' + bad.join(', '));
    return true;
  });

  /* #149 — the CSS half of the token mistake guardCanvasCtx catches on canvas.
     `C.x` is the string 'var(--c-x)', so `${C.gold}22` emits `var(--c-gold)22`,
     which is invalid and computes to transparent. Use ca('gold','22') instead.
     This caught three dead Ludo seat-3 tints. */
  check('token-alpha-concat', () => {
    const bad = [];
    const re = /var\(--c-[a-z0-9-]+\)([0-9a-fA-F]{2,8})\b/g;
    let m;
    while ((m = re.exec(css))) {
      const at = Math.max(0, m.index - 60);
      bad.push(css.slice(at, m.index + m[0].length).split('\n').pop().trim());
    }
    if (bad.length) {
      throw new Error('hex alpha concatenated onto a var() token (use ca()): ' + bad.join(' | '));
    }
    return true;
  });

  /* #150 — navState is JSON.stringify'd every render, so ONE non-primitive
     field (a SyntheticEvent handed to backToLobby as `tab`) threw
     "Converting circular structure to JSON" and unmounted the whole root.
     This is the mechanical form of that invariant: navPrimitive must reject
     everything a serializer can choke on. */
  check('nav-state-primitives', () => {
    const el = document.createElement('button');
    const circular = { self: null }; circular.self = circular;
    for (const hostile of [el, circular, { a: 1 }, [1, 2], () => {}, Symbol('x')]) {
      if (navPrimitive(hostile) !== null) {
        throw new Error('navPrimitive let through ' + typeof hostile);
      }
    }
    for (const ok of ['home', 7, true, false]) {
      if (navPrimitive(ok) !== ok) throw new Error('navPrimitive dropped a primitive: ' + String(ok));
    }
    if (navPrimitive(null) !== null || navPrimitive(undefined) !== null) {
      throw new Error('navPrimitive must map null/undefined to null');
    }
    // And the whole shape must survive a round-trip.
    JSON.stringify({ screen: navPrimitive(el), lobbyTab: navPrimitive('home') });
    return true;
  });

  /* Phase 2 (#163) — a tappable class that isn't covered pays the browser's
     double-tap delay on every tap. The probe list is TAPPABLE_CLASSES itself,
     the same array the CSS is generated from, so the test and the stylesheet
     can no longer drift (the old hand-copied list omitted 8 classes the CSS
     covered). Each failure now says WHETHER the rule exists in `css`, which is
     what separates "someone deleted a class" from "the sheet isn't applying". */
  checkStyled('registry-touch-action', () => {
    const probe = tapActionProbe();
    const bad = [];
    try {
      // Defensive re-read of the canary: styleOk gated on it a moment ago, but
      // a sheet can be swapped between checks. One honest line, not N phantoms.
      if (probe.read(TAP_CANARY_CLASS) === 'auto') {
        throw new Error('stylesheet-not-applied — the .' + TAP_CANARY_CLASS +
          ' canary reads auto, so the per-class sweep was skipped (' +
          describeAppStylesheet() + ')');
      }
      for (const cls of TAPPABLE_CLASSES) {
        if (probe.read(cls) !== 'auto') continue;
        const declared = css.indexOf('.' + cls + ' { touch-action') >= 0;
        bad.push(cls + (declared ? ' (rule emitted, not applied)' : ' (NO RULE EMITTED)'));
      }
    } finally { probe.destroy(); }
    if (bad.length) throw new Error('touch-action:auto on ' + bad.join(', '));
    return true;
  });

  /* The generator's own contract: every probed class must actually produce a
     rule in `css`. A static check, so it fails even when the sheet is dead —
     it is what proves TAPPABLE_CLASSES and the emitted CSS are the same list. */
  check('touch-action-rules-emitted', () => {
    const missing = TAPPABLE_CLASSES
      .filter((c) => css.indexOf('.' + c + ' { touch-action: manipulation; }') < 0);
    if (missing.length) {
      throw new Error('TAPPABLE_CLASSES entries with no emitted rule: ' + missing.join(', '));
    }
    if (css.indexOf('.' + TAP_CANARY_CLASS + ' { touch-action: manipulation; }') < 0) {
      throw new Error('the ' + TAP_CANARY_CLASS + ' canary rule is not emitted');
    }
    return true;
  });

  /* #176 — the home grid is a walk over GAME_CARDS, so a card that names an
     id the registry does not have would silently drop that game from the grid
     entirely (the walk emits nothing, and there is no fallback card). This
     also guards the four merged cards, whose whole point is that two registry
     ids share one card without either id moving. */
  check('registry-cards', () => {
    const ids = new Set(GAMES.map(g => g.id));
    const seen = new Set();
    for (const c of GAME_CARDS) {
      if (ids.has(c.key)) throw new Error('card key collides with a game id: ' + c.key);
      if (!c.modes.length) {
        if (!c.gameId || !ids.has(c.gameId)) throw new Error(c.key + ' has no modes and no valid gameId');
        continue;
      }
      for (const m of c.modes) {
        if (!isPlayMode(m.mode)) throw new Error(c.key + ' → unknown play mode ' + m.mode);
        if (!ids.has(m.gameId)) throw new Error(c.key + ' → unknown game ' + m.gameId);
        if (!supportsMode(m.gameId, m.mode)) {
          throw new Error(c.key + ': ' + m.gameId + ' does not declare ' + m.mode);
        }
        const key = m.gameId + ':' + m.mode;
        if (seen.has(key)) throw new Error('mode listed on two cards: ' + key);
        seen.add(key);
      }
    }
    // Every declared mode must reach the grid, or it is unplayable.
    for (const id of Object.keys(PLAY_MODES_BY_ID)) {
      if (!ids.has(id)) throw new Error('PLAY_MODES_BY_ID names unknown game ' + id);
      for (const mode of playModesFor(id)) {
        if (!seen.has(id + ':' + mode)) throw new Error('no card surfaces ' + id + ':' + mode);
      }
    }
    // And every registry entry must have an opinion, so a new game cannot be
    // added without deciding what it offers.
    const undeclared = GAMES.filter(g => !Object.prototype.hasOwnProperty.call(PLAY_MODES_BY_ID, g.id));
    if (undeclared.length) {
      throw new Error('games missing from PLAY_MODES_BY_ID: ' + undeclared.map(g => g.id).join(', '));
    }
    return true;
  });

  // Phase 7 — the rules registry must be reachable from the browser now that
  // local/bot modes share it with the server.
  check('board-rules', () => {
    if (!window.boardRules) return true; // script not loaded (standalone) — skip
    return window.boardRules.selfTest() === true;
  });

  if (fails.length) {
    console.error('[self-test] client self-tests FAILED:\n  ' + fails.join('\n  '));
    return false;
  }
  console.log('[self-test] client self-tests passed (' + ran + ' checks)');
  return true;
}

// Pointer gestures over a board element, reported in element-local CSS pixels.
// onTap fires on release; onLongPress fires while the finger is still down
// (so the release that follows is suppressed); onDrag streams while moving.
function usePointerCell(ref, handlers, { longPressMs = 450, moveTolerance = 10 } = {}) {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = null, startX = 0, startY = 0, moved = false, fired = false, active = false;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const local = (e) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e) => {
      if (e.button != null && e.button !== 0 && e.pointerType === 'mouse') return;
      active = true; moved = false; fired = false;
      startX = e.clientX; startY = e.clientY;
      const p = local(e);
      if (el.setPointerCapture && e.pointerId != null) {
        try { el.setPointerCapture(e.pointerId); } catch {}
      }
      if (h.current.onDown) h.current.onDown(p, e);
      clear();
      if (h.current.onLongPress) {
        timer = setTimeout(() => {
          timer = null;
          if (!moved && active) { fired = true; cgHaptic(12); h.current.onLongPress(p, e); }
        }, longPressMs);
      }
    };
    const onMove = (e) => {
      if (!active) return;
      if (Math.abs(e.clientX - startX) > moveTolerance || Math.abs(e.clientY - startY) > moveTolerance) {
        moved = true;
        clear();
      }
      if (h.current.onDrag) h.current.onDrag(local(e), { dx: e.clientX - startX, dy: e.clientY - startY, moved }, e);
    };
    const onUp = (e) => {
      if (!active) return;
      active = false;
      clear();
      const p = local(e);
      if (h.current.onUp) h.current.onUp(p, e);
      if (!fired && !moved && h.current.onTap) h.current.onTap(p, e);
    };
    const onCancel = () => { active = false; clear(); };
    const onCtx = (e) => {
      if (!h.current.onContext) return;
      e.preventDefault();
      clear();
      fired = true;
      h.current.onContext(local(e), e);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('contextmenu', onCtx);
    return () => {
      clear();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('contextmenu', onCtx);
    };
  }, [ref, longPressMs, moveTolerance]);
}

/* ================= cui — the canvas control kit (controls wave) =============
   Draws the in-frame chrome — status pills, buttons, key grids — INTO a
   game's canvas, so a running game is one uninterrupted surface. Every drawn
   control is backed by a REAL, visually-hidden DOM twin (<CuiTwin/>): screen
   readers, hardware focus and innerText-based checks keep working, because
   .sr-only clips the box without unrendering the text. Menus, sheets,
   overlays, hint paragraphs and scroll-away content lists stay DOM on
   purpose — they are prose or navigation, not play-surface controls.

   A game builds `controls` fresh each render (geometry from its fit box):
     { id, kind: 'pill' | 'button' | 'label',
       r: [x, y, w, h], label, value, sub, gold, mono, font,
       primary, on, solid, disabled, action }
   and threads the SAME array through three places:
     draw:    cuiDrawControls(ctx, controls, pressedId)
     pointer: usePointerCell(ref, cuiWrapHandlers(ctlRef, setPressed, boardHandlers))
     JSX:     <CuiTwin controls={controls} />                                 */
const CUI_FONT = "'Space Grotesk', system-ui, sans-serif";
const CUI_MONO = "'JetBrains Mono', monospace";

function cuiInRect(r, x, y) { return x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]; }

function cuiHitAt(controls, x, y) {
  for (let i = controls.length - 1; i >= 0; i--) {
    const c = controls[i];
    if (c.action && !c.disabled && cuiInRect(c.r, x, y)) return c;
  }
  return null;
}

// Split a horizontal band into n equal rects with a gap — the .status-bar /
// button-row layout, minus the DOM.
function cuiRow(x, y, w, h, n, gap = 8) {
  const cw = (w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => [x + i * (cw + gap), y, cw, h]);
}

// The .pill look: card capsule, uppercase muted label over a mono value.
function cuiDrawPill(ctx, c) {
  const [x, y, w, h] = c.r;
  klRR(ctx, x, y, w, h, 10);
  ctx.fillStyle = PAL.card;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = PAL.border;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 9px ' + CUI_FONT;
  ctx.fillStyle = PAL.muted;
  ctx.fillText(String(c.label || '').toUpperCase(), x + w / 2, y + h * 0.4, w - 8);
  ctx.font = '600 ' + Math.max(13, Math.round(h * 0.34)) + 'px ' + CUI_MONO;
  ctx.fillStyle = c.color || (c.gold ? PAL.gold : PAL.text);
  ctx.fillText(String(c.value != null ? c.value : ''), x + w / 2, y + h * 0.85, w - 8);
}

// The .p6-btn look (card + border, accent tint when primary/on, solid accent
// for the one big CTA), with the pressed state drawn since :active can't be.
function cuiDrawButton(ctx, c, pressed) {
  const [x, y, w, h] = c.r;
  ctx.save();
  if (c.disabled) ctx.globalAlpha = 0.4;
  klRR(ctx, x, y, w, h, c.radius != null ? c.radius : Math.min(12, h * 0.3));
  ctx.fillStyle = c.bg ? c.bg : (c.solid ? palOf(C.accent, '#3A6ECD') : PAL.card);
  ctx.fill();
  if ((c.primary || c.on) && !c.solid && !c.bg) {
    ctx.save(); ctx.globalAlpha *= 0.14; ctx.fillStyle = palOf(C.accent, '#3A6ECD'); ctx.fill(); ctx.restore();
  }
  if (pressed && !c.disabled) {
    ctx.save(); ctx.globalAlpha *= 0.18; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  }
  if (!c.noBorder) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = (c.primary || c.on || c.solid) ? palOf(C.accent, '#3A6ECD') : PAL.border;
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = c.font || Math.min(15, Math.max(12, Math.round(h * 0.3)));
  ctx.font = '600 ' + fs + 'px ' + (c.mono ? CUI_MONO : CUI_FONT);
  ctx.fillStyle = c.ink || (c.solid ? '#fff' : PAL.text);
  if (c.pips) {
    // Die face: 3x3 pip grid (row-major booleans) instead of the label text.
    const pr = Math.max(2, Math.min(w, h) * 0.075);
    for (let i = 0; i < 9; i++) {
      if (!c.pips[i]) continue;
      const px = x + w * (0.28 + 0.22 * (i % 3));
      const py = y + h * (0.28 + 0.22 * Math.floor(i / 3));
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillText(String(c.label != null ? c.label : ''), x + w / 2, c.sub ? y + h / 2 - fs * 0.42 : y + h / 2 + 0.5, w - 10);
  }
  if (c.sub) {
    ctx.font = '500 ' + Math.max(9, Math.round(fs * 0.72)) + 'px ' + CUI_FONT;
    ctx.fillStyle = c.solid ? 'rgba(255,255,255,0.85)' : PAL.muted;
    ctx.fillText(String(c.sub), x + w / 2, y + h / 2 + fs * 0.58, w - 10);
  }
  ctx.restore();
}

// Plain centred text (the brg-note / warn-line role).
function cuiDrawLabel(ctx, c) {
  const [x, y, w, h] = c.r;
  ctx.font = (c.bold ? '700 ' : '') + (c.font || 12) + 'px ' + (c.mono ? CUI_MONO : CUI_FONT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = c.color || (c.gold ? PAL.gold : PAL.muted);
  ctx.fillText(String(c.label != null ? c.label : ''), x + w / 2, y + h / 2, w - 4);
}

function cuiDrawControls(ctx, controls, pressedId) {
  for (const c of controls) {
    if (c.noDraw) continue; // twin-only entry (prose the draw pass renders itself)
    if (c.kind === 'pill') cuiDrawPill(ctx, c);
    else if (c.kind === 'label') cuiDrawLabel(ctx, c);
    else cuiDrawButton(ctx, c, pressedId === c.id);
  }
}

// Wrapped prose on canvas (clue lines): naive word wrap via measureText.
function cuiWrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = String(text).split(/\s+/);
  let line = '', lines = [];
  for (const w of words) {
    const probe = line ? line + ' ' + w : w;
    if (ctx.measureText(probe).width > maxW && line) { lines.push(line); line = w; }
    else line = probe;
  }
  if (line) lines.push(line);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] += '…';
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}

/* Route the pointer stream: controls first (press feedback on finger-DOWN,
   action on the release, exactly tapProps' contract), board handlers only
   when no control claims the point. `ctlRef.current` must always hold the
   render's live controls array. */
function cuiWrapHandlers(ctlRef, setPressed, h = {}) {
  return {
    ...h,
    onDown: (p, e) => {
      const c = cuiHitAt(ctlRef.current || [], p.x, p.y);
      if (c) {
        ctlRef.pressed = c.id;
        setPressed(c.id);
        cgHaptic(8);
        if (c.holdDown) c.holdDown(); // hold-to-act controls (D-pads) engage on DOWN
        return;
      }
      if (h.onDown) h.onDown(p, e);
    },
    onDrag: (p, d, e) => {
      if (ctlRef.pressed) {
        // A hold control releases if the finger slides off it (the DOM
        // pointerleave contract) — capture means leave never fires.
        const c = (ctlRef.current || []).find(x => x.id === ctlRef.pressed);
        if (c && c.holdDown && !cuiInRect(c.r, p.x, p.y)) {
          if (c.holdUp) c.holdUp();
          ctlRef.pressed = null;
          setPressed(null);
        }
        return;
      }
      if (h.onDrag) h.onDrag(p, d, e);
    },
    onUp: (p, e) => {
      // A control fires on press + release-in-rect (the DOM button contract),
      // NOT via onTap — a board's tight moveTolerance would otherwise eat
      // slightly-jittery finger taps on buttons.
      if (ctlRef.pressed) {
        const c = (ctlRef.current || []).find(x => x.id === ctlRef.pressed);
        ctlRef.pressed = null;
        setPressed(null);
        if (c && c.holdDown) { if (c.holdUp) c.holdUp(); return; }
        if (c && !c.disabled && c.action && cuiInRect(c.r, p.x, p.y)) c.action();
        return;
      }
      if (h.onUp) h.onUp(p, e);
    },
    onTap: (p, e) => {
      if (cuiHitAt(ctlRef.current || [], p.x, p.y)) return; // fired in onUp
      if (h.onTap) h.onTap(p, e);
    },
    onLongPress: h.onLongPress ? (p, e) => {
      if (cuiHitAt(ctlRef.current || [], p.x, p.y)) return;
      h.onLongPress(p, e);
    } : undefined,
    onContext: h.onContext ? (p, e) => {
      if (cuiHitAt(ctlRef.current || [], p.x, p.y)) return;
      h.onContext(p, e);
    } : undefined,
  };
}

/* A self-contained control STRIP on its own canvas — for games whose board
   canvas is a hand-rolled real-time loop (Daily Snake/Bounce, the classic
   arcade games) where splicing bands into the loop would be surgery. The
   strip draws pills/labels/buttons, wires presses, and carries its twin;
   stacked over the board canvas it reads as one surface. */
function CuiBar({ height, build }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { boxW } = useFitBox(boxRef, { cols: 1, rows: 1, maxCell: 100000 });
  const W = Math.floor(boxW);
  const controls = W > 40 ? build(W) : [];
  const ctlRef = useRef([]);
  ctlRef.current = controls;
  const [pressedId, setPressedId] = useState(null);
  usePointerCell(canvasRef, cuiWrapHandlers(ctlRef, setPressedId, {}));
  // Redraw key = the controls' FULL visual state (functions dropped): a change
  // to only sub/color/bg/solid or a rect must repaint even with labels constant.
  const key = JSON.stringify(controls, (k, v) => (typeof v === 'function' ? undefined : v));
  useCanvasBoard(canvasRef, {
    width: W,
    height,
    deps: [key, W, height, pressedId],
    draw: (ctx) => cuiDrawControls(ctx, ctlRef.current, pressedId),
  });
  return (
    <div className="cui-bar" ref={boxRef}>
      <canvas ref={canvasRef} className="cui-bar-canvas" aria-hidden="true" />
      <CuiTwin controls={controls} />
    </div>
  );
}

// Shift a board's pointer handlers below the frame's top bands: the handlers
// keep their own coordinate space (verbatim code), the frame subtracts its
// band height once here. topRef.current = the board region's y offset.
function cuiShiftHandlers(h, topRef) {
  const out = {};
  for (const k of Object.keys(h)) {
    const fn = h[k];
    if (typeof fn !== 'function') continue;
    out[k] = (pt, a, b) => fn({ x: pt.x, y: pt.y - (topRef.current || 0) }, a, b);
  }
  return out;
}

// The accessibility twin: real buttons and live text, visually clipped. One
// per game frame, fed the same controls array the canvas drew.
function CuiTwin({ controls, extra }) {
  return (
    <div className="cui-twin sr-only">
      {controls.map((c) => (
        // One block per control so innerText keeps line breaks between them.
        <div key={c.id}>
          {c.action ? (
            <button
              type="button"
              disabled={!!c.disabled}
              aria-pressed={c.on != null ? !!c.on : undefined}
              onClick={() => { if (!c.disabled) c.action(); }}
            >{String(c.twinLabel != null ? c.twinLabel : (c.label != null ? c.label : c.id)) + (c.sub ? ' — ' + c.sub : '') + (c.value != null ? ' ' + c.value : '')}</button>
          ) : (
            <span>{((c.twinLabel != null ? String(c.twinLabel) : (c.label != null ? String(c.label) : '')) + ' ' + (c.value != null ? c.value : '')).trim()}</span>
          )}
        </div>
      ))}
      {extra || null}
    </div>
  );
}
