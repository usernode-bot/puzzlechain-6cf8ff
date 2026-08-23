/* ============================================================
   Snakes & Ladders V2 — the board canvas
   ============================================================
   Two-layer drawing: the static layer (cells, numbers, Moksha labels,
   every illustrated snake and ladder) renders ONCE into an offscreen
   canvas cached per (layout, variant, skin, side, theme), and each
   frame blits the cache and draws only the pawns + the 130ms glide.
   The old board redrew everything per glide frame — fine for straight
   lines, not for illustrated art.

   DOM contract (existing dapp.json checks pin these): the canvas keeps
   classes `cnl-canvas board-canvas`, sits under `.cnl-board-wrap` (the
   caller renders that wrapper), and carries data-cnl-p2="diamond"
   unconditionally — every V2 board has a Player 2. */

// Static layer: board chrome reads PAL (re-themes live); the illustrations
// are intrinsic art with hardcoded palettes from 01-art.jsx.
function cnlv2DrawBoardStatic(ctx, side, { V, isMoksha, isLegend, gildAll, skinId }) {
  const pad = 4;
  const inner = side - pad * 2;
  const cs = inner / 10;
  const pct = (p) => [pad + (p.x / 100) * inner, pad + (p.y / 100) * inner];
  ctx.textBaseline = 'top';
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    for (let col = 0; col < 10; col++) {
      const row = 9 - visualRow;
      const within = (row % 2 === 0) ? col : (9 - col);
      const n = row * 10 + within + 1;
      const x = pad + col * cs, y = pad + visualRow * cs;
      ctx.fillStyle = n === 100 ? 'rgba(201,162,39,0.13)' : ((row + col) % 2 ? PAL.surface : PAL.card);
      ctx.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      ctx.font = `600 ${Math.max(7, Math.round(cs * 0.24))}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = n === 100 ? PAL.gold : PAL.muted;
      ctx.fillText(String(n), x + 3, y + 2);
      const meaning = isMoksha ? CNL_MOKSHA_MEANINGS[n] : null;
      if (meaning) {
        const isL = V.ladders[n] !== undefined;
        ctx.font = `700 ${Math.max(5, Math.round(cs * 0.14))}px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isL ? PAL.emerald : PAL.rose;
        let name = meaning.name.toUpperCase();
        while (name.length > 2 && ctx.measureText(name).width > cs - 3) name = name.slice(0, -1);
        ctx.fillText(name, x + cs / 2, y + cs - Math.max(6, Math.round(cs * 0.17)));
      }
    }
  }
  // Illustrations over the cells: ladders first, snakes on top.
  const tint = CNLV2_ART_TINTS[isMoksha ? 'plain' : skinId] || CNLV2_ART_TINTS.plain;
  for (const k of Object.keys(V.ladders)) {
    const from = parseInt(k, 10), to = V.ladders[from];
    const [ax, ay] = pct(cnlCenterPct(from));
    const [bx, by] = pct(cnlCenterPct(to));
    const rowsSpanned = Math.floor((to - 1) / 10) - Math.floor((from - 1) / 10);
    cnlv2DrawLadder(ctx, ax, ay, bx, by, cs, tint, gildAll || rowsSpanned >= 3);
  }
  for (const k of Object.keys(V.chutes)) {
    const from = parseInt(k, 10), to = V.chutes[from];
    const [ax, ay] = pct(cnlCenterPct(from));
    const [bx, by] = pct(cnlCenterPct(to));
    cnlv2DrawSnake(ctx, ax, ay, bx, by, cs, from, { dragon: isLegend, tint });
  }
  // Outer border.
  klRR(ctx, 1, 1, side - 2, side - 2, 12);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PAL.border;
  ctx.stroke();
}

/* positions: array of squares, one per seat (0 = off-board). `layoutKey`
   names the static art (tier id / variant) for the cache.

   PERFORMANCE CONTRACT. The static layer (cells, numbers, every illustrated
   snake/dragon/ladder) is drawn ONCE per (layout, variant, skin, side, theme)
   into an offscreen canvas; every frame after that is one drawImage blit plus
   the pawns. The glide is driven by a dedicated rAF loop that paints the
   canvas DIRECTLY — no setState per frame. The first build used a per-frame
   setState to "animate", which did the worst of both worlds: React re-rendered
   every frame (the lag) while useCanvasBoard's deps never changed, so the
   interpolation frames never painted — pawns froze ~12% into each lerp and
   only snapped forward on the next state change (the ghost). */
function SnLV2Board({ V, isMoksha, isLegend, gildAll, SK, positions, vsBot }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { boxW } = useFitBox(boxRef, { cols: 10, rows: 10 });
  const side = Math.max(0, Math.floor(boxW));
  const seats = positions.length;
  const themeV = useThemeVersion();
  const skinId = SK ? (Object.keys(CNL_SKINS).find((k) => CNL_SKINS[k] === SK) || 'plain') : 'plain';
  const layoutKey = [isMoksha ? 'moksha' : 'tier', isLegend ? 1 : 0, gildAll ? 1 : 0,
    Object.keys(V.jumps).join('.')].join('|');
  const posKey = positions.join(',');

  // Static-layer cache; rebuilt only when an art input changes.
  const staticRef = useRef({ key: null, cv: null });

  // Pawn glide state: each pawn's previous square, target square, and lerp
  // start time. Lives in a ref — the glide never touches React state.
  const glideRef = useRef(positions.map((p) => ({ from: p, to: p, t0: 0 })));

  /* One painter shared by BOTH redraw paths (React-scheduled repaints on
     dep/theme/size changes, and the rAF glide loop below). Reassigned every
     render so it always closes over the current props; the ref indirection is
     what lets the rAF loop paint without any React work per frame. */
  const paintRef = useRef(null);
  paintRef.current = (ctx) => {
    if (side < 80) return;
    const pad = 4;
    const inner = side - pad * 2;
    const cs = inner / 10;
    const pct = (p) => [pad + (p.x / 100) * inner, pad + (p.y / 100) * inner];

    // Blit the cached static layer (rebuild if any art input moved).
    const key = [layoutKey, skinId, side, themeV].join('~');
    let st = staticRef.current;
    if (st.key !== key || !st.cv) {
      const dpr = canvasDpr();
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(side * dpr));
      cv.height = Math.max(1, Math.round(side * dpr));
      const c2 = guardCanvasCtx(cv.getContext('2d'));
      if (!c2) return;
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      cnlv2DrawBoardStatic(c2, side, { V, isMoksha, isLegend, gildAll, skinId });
      st = staticRef.current = { key, cv };
    }
    ctx.drawImage(st.cv, 0, 0, side, side);

    // Dynamic layer: pawns gliding between squares (t clamped to 1, so a
    // settled pawn always sits EXACTLY on its square, never mid-lerp).
    const g = glideRef.current.length === seats
      ? glideRef.current
      : positions.map((p) => ({ from: p, to: p, t0: 0 }));
    const now = performance.now();
    const pos = g.map((gp) => {
      const p = Math.min(1, (now - gp.t0) / 130);
      const e = 1 - (1 - p) * (1 - p);
      const [fx, fy] = pct(cnlCenterPct(gp.from));
      const [tx, ty] = pct(cnlCenterPct(gp.to));
      return [fx + (tx - fx) * e, fy + (ty - fy) * e];
    });
    // Co-located pawns fan out in a small ring so all six stay visible
    // even at the 320px minimum board width.
    const groups = {};
    g.forEach((gp, i) => { (groups[gp.to] = groups[gp.to] || []).push(i); });
    for (const sq of Object.keys(groups)) {
      const idxs = groups[sq];
      if (idxs.length < 2) continue;
      const rr = cs * (idxs.length === 2 ? 0.24 : 0.3);
      idxs.forEach((i, j) => {
        const ang = idxs.length === 2 ? (j === 0 ? Math.PI : 0) : (-Math.PI / 2 + (j * 2 * Math.PI) / idxs.length);
        pos[i][0] += Math.cos(ang) * rr;
        pos[i][1] += Math.sin(ang) * rr;
      });
    }
    const ph = cs * 0.85; // chess pieces ~1.6x the old token radius
    for (let i = 0; i < seats; i++) {
      cnlv2DrawPawn(ctx, pos[i][0], pos[i][1] - ph * 0.08, ph, i + 1);
    }
    ctx.textBaseline = 'top';
  };

  const sideRef = useRef(side);
  sideRef.current = side;

  /* Position changes update the glide targets, then a self-terminating rAF
     loop paints the canvas directly at display rate until every lerp lands.
     The loop's last pass paints with t = 1 (the `some` check runs AFTER the
     paint), so the animation always ends with pawns pinned to their squares. */
  useEffect(() => {
    let g = glideRef.current;
    if (g.length !== seats) {
      glideRef.current = positions.map((p) => ({ from: p, to: p, t0: 0 }));
      return;
    }
    let changed = false;
    positions.forEach((pos, i) => {
      if (g[i].to !== pos) { g[i] = { from: g[i].to, to: pos, t0: performance.now() }; changed = true; }
    });
    if (!changed) return;
    let raf = 0;
    const step = () => {
      const canvas = canvasRef.current;
      const paint = paintRef.current;
      if (!canvas || !paint) return;
      const ctx = guardCanvasCtx(canvas.getContext('2d'));
      if (!ctx) return;
      const s = sideRef.current;
      const dpr = canvasDpr();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, s, s);
      paint(ctx);
      const now = performance.now();
      if (glideRef.current.some((gp) => now - gp.t0 < 140)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [posKey, seats]);

  // React-scheduled repaints: mount, resize, theme flip, board/skin change,
  // and a safety repaint on any position change (idempotent with the loop).
  useCanvasBoard(canvasRef, {
    width: side,
    height: side,
    deps: [posKey, layoutKey, skinId, side, seats],
    draw: (ctx) => { const f = paintRef.current; if (f) f(ctx); },
  });

  const seatDesc = positions.map((p, i) => {
    const piece = (i + 1) % 2 === 1 ? 'knight' : 'rook';
    const extra = (i === 1 ? ', diamond emblem' : '') + (vsBot && i === 1 ? ', bot' : '');
    return `seat ${i + 1} (${piece}${extra}) on square ${p || 0}`;
  }).join(', ');

  return (
    <div className="cnl-board-canvas-fill" ref={boxRef}>
      <canvas
        ref={canvasRef}
        className="cnl-canvas board-canvas"
        role="img"
        data-cnl-p2="diamond"
        aria-label={`Board — ${seatDesc}`}
      />
    </div>
  );
}
