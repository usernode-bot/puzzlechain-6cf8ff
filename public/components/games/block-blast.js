/* ---------------- Block Blast ---------------- */
const BB_SHAPES = [
  [[0, 0]],
  [[0, 0], [0, 1]], [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
];
const BB_COLORS = [C.accent, C.emerald, C.gold, C.violet, C.rose];
function bbRandPiece() {
  const cells = BB_SHAPES[Math.floor(Math.random() * BB_SHAPES.length)];
  return { cells, color: BB_COLORS[Math.floor(Math.random() * BB_COLORS.length)] };
}
function bbCanPlace(grid, cells, or, oc) {
  return cells.every(([r, c]) => {
    const rr = or + r, cc = oc + c;
    return rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !grid[rr * 8 + cc];
  });
}
function bbCanPlaceAny(grid, tray) {
  for (const p of tray) {
    if (!p) continue;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (bbCanPlace(grid, p.cells, r, c)) return true;
  }
  return false;
}
function BlockBlastGame({ onWin, onStepChange, resetKey, game, onBack }) {
  const [grid, setGrid] = useState(() => new Array(64).fill(null));
  const [tray, setTray] = useState(() => [bbRandPiece(), bbRandPiece(), bbRandPiece()]);
  const [score, setScore] = useState(0);
  const [drag, setDrag] = useState(null); // { idx, cells, color, x, y }
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const placedRef = useRef(0);
  const linesRef = useRef(0);
  const gridRef = useRef(null);
  const secs = useElapsed(resetKey, !done);
  const secsRef = useRef(0); secsRef.current = secs;
  const scoreRef = useRef(0); scoreRef.current = score;

  const init = () => {
    setGrid(new Array(64).fill(null));
    setTray([bbRandPiece(), bbRandPiece(), bbRandPiece()]);
    setScore(0); setDone(false); setDrag(null);
    doneRef.current = false; placedRef.current = 0; linesRef.current = 0;
  };
  useEffect(() => { init(); }, [resetKey]);

  const originFromPointer = (x, y, cells) => {
    const el = gridRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = rect.width / 8;
    const maxR = Math.max(...cells.map(c => c[0]));
    const maxC = Math.max(...cells.map(c => c[1]));
    let oc = Math.round((x - rect.left) / cs - (maxC + 1) / 2);
    let or = Math.round((y - rect.top) / cs - (maxR + 1) / 2);
    oc = Math.max(0, Math.min(7 - maxC, oc));
    or = Math.max(0, Math.min(7 - maxR, or));
    return { or, oc };
  };
  const commitDrop = (endX, endY) => {
    setDrag(d => {
      if (!d) return null;
      const o = originFromPointer(endX, endY, d.cells);
      if (o && bbCanPlace(grid, d.cells, o.or, o.oc)) {
        place(d, o.or, o.oc);
      }
      return null;
    });
  };
  const place = (piece, or, oc) => {
    const g = grid.slice();
    piece.cells.forEach(([r, c]) => { g[(or + r) * 8 + (oc + c)] = piece.color; });
    // find full rows/cols
    const fullRows = [], fullCols = [];
    for (let r = 0; r < 8; r++) if ([0,1,2,3,4,5,6,7].every(c => g[r * 8 + c])) fullRows.push(r);
    for (let c = 0; c < 8; c++) if ([0,1,2,3,4,5,6,7].every(r => g[r * 8 + c])) fullCols.push(c);
    const lines = fullRows.length + fullCols.length;
    fullRows.forEach(r => { for (let c = 0; c < 8; c++) g[r * 8 + c] = null; });
    fullCols.forEach(c => { for (let r = 0; r < 8; r++) g[r * 8 + c] = null; });
    const gain = piece.cells.length + (lines > 0 ? lines * 10 + (lines - 1) * 10 : 0);
    placedRef.current++; linesRef.current += lines;
    cgSound(lines > 0 ? 'clear' : 'move'); cgHaptic(lines > 0 ? 25 : 10);
    setScore(s => s + gain);
    onStepChange && onStepChange(placedRef.current);
    // consume tray slot
    let nt = tray.slice();
    if (piece.idx != null) nt[piece.idx] = null;
    if (nt.every(p => !p)) nt = [bbRandPiece(), bbRandPiece(), bbRandPiece()];
    setGrid(g);
    setTray(nt);
    // game-over check next frame
    setTimeout(() => {
      if (doneRef.current) return;
      if (!bbCanPlaceAny(g, nt)) {
        doneRef.current = true; setDone(true);
        cgSound('lose'); cgHaptic([20, 40]);
        const sc = scoreRef.current;
        cgSaveHistory(BB_KEY, { score: sc, lines: linesRef.current, ts: Date.now() });
        onWin(sc, placedRef.current, secsRef.current, { winnerLabel: 'Game Over', share: `🧱 Block Blast — ${sc} pts` });
      }
    }, 0);
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => { if (e.cancelable) e.preventDefault(); const { x, y } = pointerXY(e); setDrag(d => d && { ...d, x, y }); };
    const up = (e) => { const { x, y } = pointerXY(e); commitDrop(x, y); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag, grid, tray]);

  const startDrag = (e, idx) => {
    if (done || !tray[idx]) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = pointerXY(e);
    cgSound('click');
    setDrag({ idx, cells: tray[idx].cells, color: tray[idx].color, x, y });
  };
  // preview cells
  let preview = null;
  if (drag) {
    const o = originFromPointer(drag.x, drag.y, drag.cells);
    if (o) {
      const ok = bbCanPlace(grid, drag.cells, o.or, o.oc);
      preview = {};
      drag.cells.forEach(([r, c]) => { preview[(o.or + r) * 8 + (o.oc + c)] = ok ? 'preview' : 'invalid'; });
    }
  }
  const hist = cgLoadHistory(BB_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">{r.lines} lines</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Games' },
      { val: linesRef.current, lbl: 'Lines (run)' }, { val: score, lbl: 'This run' },
    ]),
    cgRulesSection(['Drag a block from the tray onto the grid.', 'Fill a full row or column to clear it and score.', 'Clear several lines at once for bonus points.', 'Game ends when none of the three pieces fit.']),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: score }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="bb-grid" ref={gridRef}>
          {grid.map((cell, i) => {
            const pv = preview && preview[i];
            return <div key={i} className={'bb-cell' + (cell ? ' filled' : '') + (pv ? ' ' + pv : '')}
              style={cell ? { background: cell } : undefined} />;
          })}
        </div>
        <div className="bb-tray">
          {tray.map((p, idx) => (
            <div key={idx} className={'bb-piece' + (!p ? ' used' : '') + (drag && drag.idx === idx ? ' dragging' : '')}
              style={p ? { gridTemplateColumns: `repeat(${Math.max(...p.cells.map(c => c[1])) + 1}, auto)` } : undefined}
              onMouseDown={(e) => startDrag(e, idx)} onTouchStart={(e) => startDrag(e, idx)}>
              {p && (() => {
                const maxR = Math.max(...p.cells.map(c => c[0]));
                const maxC = Math.max(...p.cells.map(c => c[1]));
                const set = new Set(p.cells.map(([r, c]) => r * 10 + c));
                const out = [];
                for (let r = 0; r <= maxR; r++) for (let c = 0; c <= maxC; c++) {
                  const on = set.has(r * 10 + c);
                  out.push(<div key={r + '-' + c} className={'bb-pcell' + (on ? ' on' : '')} style={on ? { background: p.color } : { background: 'transparent' }} />);
                }
                return out;
              })()}
            </div>
          ))}
        </div>
      </div>
      {drag && (
        <div className="bb-drag-ghost" style={{
          left: drag.x, top: drag.y - 40,
          transform: 'translate(-50%, -50%)',
          gridTemplateColumns: `repeat(${Math.max(...drag.cells.map(c => c[1])) + 1}, 1.1rem)`,
        }}>
          {(() => {
            const maxR = Math.max(...drag.cells.map(c => c[0]));
            const maxC = Math.max(...drag.cells.map(c => c[1]));
            const set = new Set(drag.cells.map(([r, c]) => r * 10 + c));
            const out = [];
            for (let r = 0; r <= maxR; r++) for (let c = 0; c <= maxC; c++) {
              const on = set.has(r * 10 + c);
              out.push(<div key={r + '-' + c} className={'bb-pcell' + (on ? ' on' : '')} style={on ? { background: drag.color, width: '1.1rem', height: '1.1rem' } : { width: '1.1rem', height: '1.1rem', background: 'transparent' }} />);
            }
            return out;
          })()}
        </div>
      )}
    </ClassicShell>
  );
}
