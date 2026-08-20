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

// Scale-to-fit wrapper (slice 5). Measures its own available box AND its
// content's natural size, then applies a single `transform: scale(k)` so the
// content always fits without scrolling. This is the general answer for the
// dailies whose boards are absolutely positioned at fixed pixel offsets
// (Mahjong's layered tiles, the solitaire card columns) — those can't be
// re-expressed as a fluid grid, but they scale perfectly as one unit, and
// every existing click handler keeps working under a CSS transform.
// Never scales ABOVE 1: a small board on a big screen stays its natural size.
function FitScale({ children, className }) {
  const boxRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current, content = contentRef.current;
    if (!box || !content) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      // offsetWidth/Height are the UNSCALED layout size — getBoundingClientRect
      // on the content would already include our own transform and oscillate.
      const cw = content.offsetWidth, ch = content.offsetHeight;
      if (!cw || !ch || (b.width < 1 && b.height < 1)) return;
      const k = Math.min(1, b.width / cw, b.height / ch);
      setScale((prev) => (Math.abs(prev - k) < 0.005 ? prev : k));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={'fit-scale-box' + (className ? ' ' + className : '')} ref={boxRef}>
      <div className="fit-scale-content" ref={contentRef} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

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
function tapProps(onTap, { disabled = false } = {}) {
  if (disabled) return {};
  let handledPointer = false;
  return {
    onPointerDown: (e) => {
      if (e.currentTarget.setAttribute) e.currentTarget.setAttribute('data-pressed', '1');
    },
    onPointerUp: (e) => {
      if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
      // Touch/pen act on release-in-place; mouse falls through to onClick so
      // text selection and drag handlers elsewhere keep working.
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        handledPointer = true;
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
      if (handledPointer) { handledPointer = false; return; }
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
    const BOARDS = ['sudoku', 'wordsearch', 'wspr-grid', 'dsnk-board', 'numpad'];
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
