/* ============================================================
   Chutes & Ladders — 2-player local (pass-and-play) classic game
   ============================================================ */
// Standard Milton-Bradley layout. Ladders climb (bottom -> top),
// chutes slide (top -> bottom). One flat map keyed by landing square.
const CNL_LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const CNL_CHUTES  = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const CNL_JUMPS   = Object.assign({}, CNL_LADDERS, CNL_CHUTES);

/* ---- Moksha Patam — the original Indian board (slice 7) --------------------
   Ladders sit on VIRTUES, snakes on VICES, and vices outnumber virtues 11 to 5.
   That imbalance is the moral point the original was making, and it makes the
   climb genuinely slower than the Milton-Bradley board — which is why Classic
   stays the default and this is opt-in per game.

   These tables MUST stay byte-identical to CNL_MOKSHA_* in lib/board-rules.js:
   the server referees online rooms off its copy and the client renders off
   this one. Square numbers follow the commonly published Moksha Patam
   virtue/vice list; the DESTINATIONS are this app's balance choice, not
   historical record (surviving boards disagree with each other). */
const CNL_MOKSHA_LADDERS = { 12: 38, 51: 67, 57: 74, 76: 91, 78: 97 };
const CNL_MOKSHA_CHUTES  = {
  41: 20, 44: 22, 49: 9, 52: 35, 58: 40, 62: 19, 69: 33, 84: 63, 92: 73, 95: 24, 98: 78,
};
const CNL_MOKSHA_JUMPS = Object.assign({}, CNL_MOKSHA_LADDERS, CNL_MOKSHA_CHUTES);

// Square → { name, sanskrit, blurb }. Drives the on-board labels, the landing
// banner and the glossary modal.
const CNL_MOKSHA_MEANINGS = {
  12: { name: 'Faith',        sanskrit: 'Shraddha',  blurb: 'Trust in the path — the first step that makes any climb possible.' },
  51: { name: 'Reliability',  sanskrit: 'Vishwas',   blurb: 'Being someone others can depend on, steadily and without fuss.' },
  57: { name: 'Generosity',   sanskrit: 'Dāna',      blurb: 'Giving freely, without keeping score of what was given.' },
  76: { name: 'Knowledge',    sanskrit: 'Jñāna',     blurb: 'Understanding that changes how you act, not just what you know.' },
  78: { name: 'Asceticism',   sanskrit: 'Tapas',     blurb: 'Disciplined restraint — the last stretch before liberation.' },
  41: { name: 'Disobedience', sanskrit: 'Avajña',    blurb: 'Disregarding good counsel, and sliding back for it.' },
  44: { name: 'Arrogance',    sanskrit: 'Ahankara',  blurb: 'The ego that mistakes itself for the whole self.' },
  49: { name: 'Vulgarity',    sanskrit: 'Ashlilata', blurb: 'Coarseness of speech and conduct that drags others down too.' },
  52: { name: 'Theft',        sanskrit: 'Chaurya',   blurb: 'Taking what was never offered.' },
  58: { name: 'Lying',        sanskrit: 'Asatya',    blurb: 'Untruth — the vice that quietly undoes every other virtue.' },
  62: { name: 'Drunkenness',  sanskrit: 'Madya',     blurb: 'Intoxication that clouds judgement and loosens restraint.' },
  69: { name: 'Debt',         sanskrit: 'Rina',      blurb: 'Obligation left unsettled, weighing on every step after.' },
  84: { name: 'Anger',        sanskrit: 'Krodha',    blurb: 'Rage that burns away progress made patiently.' },
  92: { name: 'Greed',        sanskrit: 'Lobha',     blurb: 'Wanting more precisely when you already have enough.' },
  95: { name: 'Pride',        sanskrit: 'Mada',      blurb: 'Conceit near the summit — the longest fall on the board.' },
  98: { name: 'Lust',         sanskrit: 'Kama',      blurb: 'Craving two squares from liberation, back to where discipline begins.' },
};

const CNL_VARIANTS = {
  classic: { label: 'Classic', ladders: CNL_LADDERS, chutes: CNL_CHUTES, jumps: CNL_JUMPS },
  moksha:  { label: 'Moksha Patam', ladders: CNL_MOKSHA_LADDERS, chutes: CNL_MOKSHA_CHUTES, jumps: CNL_MOKSHA_JUMPS },
};
function cnlVariant(v) { return CNL_VARIANTS[v] ? v : 'classic'; }

// Standard 1-6 pip layouts on a 3x3 grid (row-major, 1 = pip present).
const CNL_DIE_PIPS = {
  1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
  3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
  5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
};

// Cosmetic (client-only, per-device) Classic-board skins. These substitute
// only the ladder/chute glyphs and the label shown in the picker — the
// mechanical variant (ladders/chutes tables) is untouched, so a skin never
// needs to reach the server. Disabled when the mechanical variant is
// 'moksha' (which has its own snake/virtue art baked into the board).
const CNL_SKINS = {
  plain:   { label: 'Classic', icon: '🪜', ladderMark: '🪜', chuteMark: '🛝' },
  jungle:  { label: 'Jungle Vine', icon: '🌿', ladderMark: '🌿', chuteMark: '🐊' },
  space:   { label: 'Star Voyage', icon: '🚀', ladderMark: '🚀', chuteMark: '☄️' },
  pirate:  { label: 'Treasure Trail', icon: '🏴‍☠️', ladderMark: '⚓', chuteMark: '🦑' },
};
const CNL_SKIN_KEY = 'puzzlechain_cnl_skin';
function cnlSkinId(v) { return CNL_SKINS[v] ? v : 'plain'; }
function useCnlSkin() {
  const [skin, setSkinState] = useState(() => {
    // ?cnlskin=<id> is a screenshot-state deep link — it lets proposal tests
    // and before/after captures reach a skin that's otherwise only chosen by
    // clicking a pill, and it wins over the stored device preference.
    try {
      const q = new URLSearchParams(window.location.search).get('cnlskin');
      if (q && CNL_SKINS[q]) return q;
    } catch (e) {}
    try { return cnlSkinId(localStorage.getItem(CNL_SKIN_KEY)); } catch (e) { return 'plain'; }
  });
  const setSkin = (v) => {
    const id = cnlSkinId(v);
    setSkinState(id);
    try { localStorage.setItem(CNL_SKIN_KEY, id); } catch (e) {}
  };
  return [skin, setSkin];
}

// The glossary — reachable from the mode picker and the in-game header, so a
// player can read what a square means before or during a game.
function MokshaGlossaryModal({ onClose }) {
  const row = (sq, kind) => {
    const m = CNL_MOKSHA_MEANINGS[sq];
    const dest = CNL_MOKSHA_JUMPS[sq];
    return (
      <div key={sq} className="mok-row">
        <span className={'mok-sq ' + kind}>{sq}</span>
        <span className="mok-body">
          <span className="mok-name">
            {m.name} <em>({m.sanskrit})</em>
            <span className="mok-dest">{kind === 'up' ? '↑' : '↓'} {dest}</span>
          </span>
          <span className="mok-blurb">{m.blurb}</span>
        </span>
      </div>
    );
  };
  return (
    <div className="howto-overlay" onClick={onClose}>
      <div className="howto-card" onClick={(e) => e.stopPropagation()}>
        <h3>📖 Moksha Patam — what the squares mean</h3>
        <p className="mok-intro">
          Long before it was a children's board game, this was a teaching tool from
          India. Every ladder sits on a virtue and every snake on a vice, and the
          vices deliberately outnumber the virtues — progress up the board was meant
          to feel hard-won. Square 100 is <b>Moksha</b>: liberation.
        </p>
        <div className="mok-section">Virtues — ladders up</div>
        {Object.keys(CNL_MOKSHA_LADDERS).map(Number).sort((a, b) => a - b).map((s) => row(s, 'up'))}
        <div className="mok-section">Vices — snakes down</div>
        {Object.keys(CNL_MOKSHA_CHUTES).map(Number).sort((a, b) => a - b).map((s) => row(s, 'down'))}
        <button className="primary-btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

// Map a square number (1..100) to {row, col} on the boustrophedon board.
// row 0 is the BOTTOM row (squares 1..10), row 9 is the TOP (91..100).
// Even rows (0-indexed from bottom) run left->right; odd rows right->left.
function cnlRowCol(n) {
  const idx = n - 1;            // 0-based
  const row = Math.floor(idx / 10);
  const within = idx % 10;
  const col = (row % 2 === 0) ? within : (9 - within);
  return { row, col };
}

// Center of a square as a percentage of the board box (for SVG + pawns).
// Visual row 0 sits at the BOTTOM, so flip for top-origin coordinates.
/* The Snakes & Ladders board as ONE canvas shared by local and online play
   (#170 treatment): cells, the connector lines (Moksha's snakes keep their
   slither curves), the square marks/names, and both pawns — which glide
   between squares with the same 130ms ease the DOM transition gave them.
   Display-only: the Roll buttons are the input. Chrome reads PAL; the two
   pawn colors come from the callers, as before. */
function CnlBoardCanvas({ V, isMoksha, SK, p1Pos, p2Pos, p1Color, p2Color, p2Glyph }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { boxW } = useFitBox(boxRef, { cols: 10, rows: 10 });
  const side = Math.max(0, Math.floor(boxW));

  // Pawn glide: remember each pawn's previous square and lerp for 130ms.
  const glideRef = useRef({ p1: { from: p1Pos, to: p1Pos, t0: 0 }, p2: { from: p2Pos, to: p2Pos, t0: 0 } });
  const [, setGlideFrame] = useState(0);
  useEffect(() => {
    const g = glideRef.current;
    let changed = false;
    for (const [key, pos] of [['p1', p1Pos], ['p2', p2Pos]]) {
      if (g[key].to !== pos) { g[key] = { from: g[key].to, to: pos, t0: performance.now() }; changed = true; }
    }
    if (!changed) return;
    let raf = 0;
    const tick = () => {
      setGlideFrame((f) => f + 1);
      const now = performance.now();
      if (now - g.p1.t0 < 140 || now - g.p2.t0 < 140) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [p1Pos, p2Pos]);

  useCanvasBoard(canvasRef, {
    width: side,
    height: side,
    deps: [p1Pos, p2Pos, V, isMoksha, side, SK && SK.label, p2Glyph],
    draw: (ctx) => {
      if (side < 80) return;
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
          const isL = V.ladders[n] !== undefined;
          const mark = isL ? (SK ? SK.ladderMark : '🪜') : V.chutes[n] !== undefined ? (isMoksha ? '🐍' : (SK ? SK.chuteMark : '🛝')) : null;
          if (mark) {
            ctx.font = `${Math.round(cs * 0.34)}px system-ui, sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(mark, x + cs - 2, y + cs - Math.round(cs * 0.38));
          }
          const meaning = isMoksha ? CNL_MOKSHA_MEANINGS[n] : null;
          if (meaning) {
            ctx.font = `700 ${Math.max(5, Math.round(cs * 0.14))}px 'Space Grotesk', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = isL ? PAL.emerald : PAL.rose;
            let name = meaning.name.toUpperCase();
            while (name.length > 2 && ctx.measureText(name).width > cs - 3) name = name.slice(0, -1);
            ctx.fillText(name, x + cs / 2, y + cs - Math.max(6, Math.round(cs * 0.17)));
          }
        }
      }
      // Connectors over the cells.
      for (const k of Object.keys(V.jumps)) {
        const from = parseInt(k, 10), to = V.jumps[from];
        const [ax, ay] = pct(cnlCenterPct(from));
        const [bx, by] = pct(cnlCenterPct(to));
        const isLadder = V.ladders[from] !== undefined;
        ctx.strokeStyle = isLadder ? PAL.emerald : PAL.rose;
        ctx.lineCap = 'round';
        ctx.globalAlpha = isMoksha && !isLadder ? 0.65 : 0.6;
        ctx.lineWidth = Math.max(2, side * (isMoksha && !isLadder ? 0.014 : 0.011));
        ctx.beginPath();
        if (isMoksha && !isLadder) {
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          const dx = bx - ax, dy = by - ay;
          const len = Math.max(Math.hypot(dx, dy), 0.001);
          const off = Math.min(0.09 * side, len * 0.16);
          const nx = -dy / len * off, ny = dx / len * off;
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo((ax + mx) / 2 + nx, (ay + my) / 2 + ny, mx, my);
          ctx.quadraticCurveTo((mx + bx) / 2 - nx, (my + by) / 2 - ny, bx, by);
        } else {
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Pawns, gliding between squares; nudged apart when sharing one.
      const g = glideRef.current;
      const now = performance.now();
      const posOf = (gp) => {
        const p = Math.min(1, (now - gp.t0) / 130);
        const e = 1 - (1 - p) * (1 - p);
        const [fx, fy] = pct(cnlCenterPct(gp.from));
        const [tx, ty] = pct(cnlCenterPct(gp.to));
        return [fx + (tx - fx) * e, fy + (ty - fy) * e];
      };
      let [x1, y1] = posOf(g.p1);
      let [x2, y2] = posOf(g.p2);
      if (g.p1.to === g.p2.to) { x1 -= side * 0.024; x2 += side * 0.024; }
      const rp = side * 0.035;
      const glyphs = { p1: '1', p2: p2Glyph || '2' };
      for (const [key, x, y, color] of [['p1', x1, y1, p1Color], ['p2', x2, y2, p2Color]]) {
        ctx.beginPath();
        if (key === 'p2') {
          // Diamond token: same shape identity as #175's DOM pawn, so the two
          // players are tellable apart by form, not colour alone.
          const rd = rp * 1.25;
          ctx.moveTo(x, y - rd); ctx.lineTo(x + rd, y); ctx.lineTo(x, y + rd); ctx.lineTo(x - rd, y); ctx.closePath();
        } else {
          ctx.arc(x, y, rp, 0, Math.PI * 2);
        }
        ctx.fillStyle = palOf(color, PAL.accent);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.font = `800 ${Math.max(7, Math.round(rp * 1.05))}px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(glyphs[key], x, y + 0.5);
      }
      ctx.textBaseline = 'top';
      // Outer border.
      klRR(ctx, 1, 1, side - 2, side - 2, 12);
      ctx.lineWidth = 2;
      ctx.strokeStyle = PAL.border;
      ctx.stroke();
    },
  });

  return (
    <div className="cnl-board-canvas-fill" ref={boxRef}>
      <canvas
        ref={canvasRef}
        className="cnl-canvas board-canvas"
        role="img"
        data-cnl-p2="diamond"
        aria-label={`Board — player 1 (round token) on square ${p1Pos || 0}, player 2 (diamond token${p2Glyph === '🤖' ? ', bot' : ''}) on square ${p2Pos || 0}`}
      />
    </div>
  );
}

function cnlCenterPct(n) {
  if (n <= 0) return { x: 50, y: 104 }; // off-board: just below the board
  const { row, col } = cnlRowCol(n);
  const visualRow = 9 - row;
  return { x: (col + 0.5) * 10, y: (visualRow + 0.5) * 10 };
}

/* ============================================================
   Snakes & Ladders — local party overhaul
   ------------------------------------------------------------
   Everything below this banner is the LOCAL (hot-seat) game: a pure rules
   engine, seven difficulty boards, vector snake/ladder/chess-pawn art, a
   2-6 seat lobby, a play-to-last-place turn loop, an animation layer, and
   Ranked Match. The ONLINE path (ChutesLaddersOnlineGame + CnlBoardCanvas +
   lib/board-rules.js's chutesLadders module) is deliberately untouched —
   the server referees those rooms and its tables must keep matching
   lib/board-rules.js byte-for-byte.
   ============================================================ */

/* ---- Engine constants ------------------------------------------------- */
// Landing on an occupied square knocks the OCCUPANT back ten squares (never
// below 1). The bumped pawn then re-resolves where it lands — a snake or
// ladder there still applies, and it may in turn bump somebody else.
const SNL_BUMP = 10;
const SNL_COLLISION = { bump: SNL_BUMP, mode: 'occupant' };
// Rolling a six earns another roll, but three sixes in a row forfeits the
// third move entirely and passes the turn.
const SNL_MAX_SIX_STREAK = 3;
// Hard stop on bump -> jump -> bump chains. Two pawns can ping-pong through a
// ladder/snake pair forever; the engine is pure, so a cap is the only guard.
const SNL_CHAIN_CAP = 8;
// Wins on the Super Star board needed before Legend unlocks.
const SNL_LEGEND_UNLOCK_WINS = 3;
const SNL_MAX_SEATS = 6;
const SNL_MIN_SEATS = 2;
// Ranked is hot-seat too, so "4 humans" means four people around one device.
const SNL_RANKED_MIN_HUMANS = 4;

/* ---- The seven boards -------------------------------------------------
   Authoring rules (enforced by snlValidateBoard, asserted by the `snl-boards`
   self-test, so a bad table fails the build rather than shipping a soft-lock):
     - every square in 1..100; ladders go UP, snakes go DOWN, never to self
     - no square is the start of two jumps
     - no jump LANDS on the start of another jump (chained heads would make a
       single roll teleport across the board and read as a bug)
     - nothing starts on 100 (unreachable as a start), and no SNAKE starts on 1
       (a pawn sent back before it began). A LADDER on 1 is allowed and is
       what the classic table ships.
   `regular` is the historical table and MUST stay byte-identical to
   CNL_LADDERS / CNL_CHUTES above — the online rooms play it. */
const SNL_BOARDS = [
  {
    id: 'beginner', name: 'Beginner', tier: 1, desc: 'Lots of ladders, short snakes.',
    ladders: { 2: 23, 8: 34, 20: 38, 32: 51, 41: 62, 54: 66, 63: 81, 74: 92, 85: 95 },
    snakes:  { 28: 12, 46: 25, 58: 37, 77: 57, 96: 79 },
  },
  {
    id: 'easy', name: 'Easy', tier: 2, desc: 'Friendly climb with a few bites.',
    ladders: { 5: 27, 11: 29, 19: 37, 26: 48, 43: 64, 55: 73, 68: 86, 79: 97 },
    snakes:  { 24: 10, 39: 16, 52: 31, 67: 49, 84: 60, 94: 71 },
  },
  {
    id: 'regular', name: 'Regular', tier: 3, desc: 'The classic board everyone knows.',
    ladders: CNL_LADDERS, snakes: CNL_CHUTES,
  },
  {
    id: 'hard', name: 'Hard', tier: 4, desc: 'Snakes outnumber ladders.',
    ladders: { 3: 22, 15: 34, 25: 44, 42: 63, 57: 76, 71: 90 },
    snakes:  { 18: 7, 31: 12, 40: 20, 53: 33, 66: 45, 78: 58, 87: 69, 96: 75, 99: 80 },
  },
  {
    id: 'expert', name: 'Expert', tier: 5, desc: 'The nineties are a minefield.',
    ladders: { 6: 26, 21: 41, 38: 59, 61: 80, 73: 92 },
    snakes:  { 14: 2, 29: 9, 46: 24, 54: 35, 65: 44, 77: 56, 85: 63, 91: 70, 95: 74, 98: 79 },
  },
  {
    id: 'superstar', name: 'Super Star', tier: 6, desc: 'Four ladders. Twelve snakes. Good luck.',
    ladders: { 7: 28, 23: 45, 47: 68, 72: 93 },
    snakes:  { 13: 3, 27: 8, 36: 15, 44: 21, 52: 30, 60: 39, 69: 48, 78: 57, 86: 64, 90: 71, 96: 75, 99: 81 },
  },
  {
    id: 'legend', name: 'Legend', tier: 7, desc: 'Three ladders against fifteen snakes.',
    lockedBy: 'superstar',
    ladders: { 10: 31, 34: 55, 58: 79 },
    snakes:  { 17: 4, 26: 6, 33: 11, 41: 19, 49: 27, 56: 35, 63: 42, 70: 50, 76: 59,
               84: 66, 88: 72, 92: 77, 95: 80, 97: 83, 99: 86 },
  },
  {
    /* The historical Indian board, kept alongside the difficulty ladder rather
       than inside it: it is an authentic table, not one of ours to balance.
       `special` also exempts it from the chained-head rule below — 98 slides to
       78, which is itself a ladder foot, and that is how the original plays. */
    id: 'moksha', name: 'Moksha Patam', tier: 0, special: true,
    desc: 'The Indian original — ladders on virtues, snakes on vices.',
    ladders: CNL_MOKSHA_LADDERS, snakes: CNL_MOKSHA_CHUTES,
  },
];
const SNL_BOARD_MAP = {};
SNL_BOARDS.forEach((b) => {
  b.jumps = Object.assign({}, b.ladders, b.snakes);
  SNL_BOARD_MAP[b.id] = b;
});
const SNL_DEFAULT_BOARD = 'regular';

// The difficulty ladder shown in the lobby (Moksha Patam sits outside it).
function snlLadderBoards() { return SNL_BOARDS.filter((b) => !b.special); }

function snlBoardById(id) { return SNL_BOARD_MAP[id] || SNL_BOARD_MAP[SNL_DEFAULT_BOARD]; }

// Returns [] when the table is sound, else a list of human-readable problems.
function snlValidateBoard(board) {
  const errs = [];
  const starts = {};
  const add = (map, kind) => {
    Object.keys(map || {}).forEach((k) => {
      const from = parseInt(k, 10);
      const to = map[k];
      const at = board.id + ' ' + kind + ' ' + from;
      if (!(from >= 1 && from <= 100) || !(to >= 1 && to <= 100)) errs.push(at + ': out of range');
      if (from === to) errs.push(at + ': maps to itself');
      if (from === 100) errs.push(at + ': starts on 100');
      if (kind === 'snake' && from === 1) errs.push(at + ': snake starts on 1');
      if (kind === 'ladder' && to < from) errs.push(at + ': ladder goes down');
      if (kind === 'snake' && to > from) errs.push(at + ': snake goes up');
      if (starts[from]) errs.push(at + ': duplicate start');
      starts[from] = kind;
    });
  };
  add(board.ladders, 'ladder');
  add(board.snakes, 'snake');
  if (!board.special) {
    Object.keys(board.jumps || {}).forEach((k) => {
      const to = board.jumps[k];
      if (starts[to]) errs.push(board.id + ' jump ' + k + ': lands on the start of another jump (' + to + ')');
    });
  }
  return errs;
}

/* ---- Seats, pieces, colours -------------------------------------------
   Pawn colours and chess silhouettes are INTRINSIC GAME ART, so they are
   hardcoded rather than themed (same rule as the checkers browns and the
   playing-card faces) — a light/dark flip must not repaint a player's piece. */
const SNL_SEAT_COLORS = [
  { id: 'red',    name: 'Red',    hex: '#e2453f', dark: '#9e2b26' },
  { id: 'blue',   name: 'Blue',   hex: '#2f7ae5', dark: '#1a4a91' },
  { id: 'amber',  name: 'Amber',  hex: '#f0a92a', dark: '#a86f0d' },
  { id: 'green',  name: 'Green',  hex: '#37a860', dark: '#1d6b3b' },
  { id: 'violet', name: 'Violet', hex: '#a05fd6', dark: '#63348c' },
  { id: 'teal',   name: 'Teal',   hex: '#20b8bd', dark: '#0d7276' },
];
const SNL_PIECES = [
  { id: 'pawn', name: 'Pawn' }, { id: 'knight', name: 'Knight' },
  { id: 'bishop', name: 'Bishop' }, { id: 'rook', name: 'Rook' },
  { id: 'queen', name: 'Queen' }, { id: 'king', name: 'King' },
];
function snlPieceName(id) { const p = SNL_PIECES.find((x) => x.id === id); return p ? p.name : 'Pawn'; }
function snlSeatColor(i) { return SNL_SEAT_COLORS[((i % SNL_SEAT_COLORS.length) + SNL_SEAT_COLORS.length) % SNL_SEAT_COLORS.length]; }

/* ---- Pure rules engine ------------------------------------------------- */
function snlCloneMatch(m) {
  return Object.assign({}, m, { seats: m.seats.map((s) => Object.assign({}, s)) });
}

function snlInitialMatch(cfg) {
  cfg = cfg || {};
  const board = snlBoardById(cfg.boardId);
  const src = (cfg.seats && cfg.seats.length ? cfg.seats : [{ kind: 'human' }, { kind: 'bot' }])
    .slice(0, SNL_MAX_SEATS);
  const seats = src.map((s, i) => ({
    id: i + 1,
    kind: s.kind === 'bot' ? 'bot' : 'human',
    name: s.name || (s.kind === 'bot' ? 'Bot ' + (i + 1) : 'Player ' + (i + 1)),
    pieceId: (SNL_PIECES.find((p) => p.id === s.pieceId) || SNL_PIECES[i % SNL_PIECES.length]).id,
    colorIdx: s.colorIdx == null ? i % SNL_SEAT_COLORS.length : s.colorIdx,
    pos: 0, rolls: 0, place: 0, finishedAt: 0,
  }));
  return {
    boardId: board.id, mode: cfg.mode === 'ranked' ? 'ranked' : 'party',
    seats, turnSeat: seats.length ? seats[0].id : 0, die: 0, sixStreak: 0,
    phase: 'playing', finished: 0, turnNo: 0,
  };
}

function snlRoll(match, rng) {
  const r = typeof rng === 'function' ? rng() : Math.random();
  return 1 + Math.floor(Math.min(0.999999, Math.max(0, r)) * 6);
}

/* Resolve where `seatId` has just landed: apply the jump under it, then the
   collision bump, then recurse for the bumped pawn. MUTATES `seats` (the
   caller always hands it a clone) and returns the event list. */
function snlResolveLanding(seats, board, seatId, square, depth) {
  const events = [];
  depth = depth || 0;
  const seat = seats.find((s) => s.id === seatId);
  if (!seat) return events;
  let sq = Math.max(1, Math.min(100, square));
  seat.pos = sq;
  const jump = board.jumps[sq];
  if (jump != null && jump !== sq) {
    events.push({ type: jump > sq ? 'ladder' : 'snake', seat: seatId, from: sq, to: jump });
    sq = jump;
    seat.pos = sq;
  }
  if (sq > 0 && sq < 100 && depth < SNL_CHAIN_CAP) {
    const victims = seats.filter((s) => s.id !== seatId && s.pos === sq && !s.finishedAt);
    for (let i = 0; i < victims.length; i++) {
      const v = victims[i];
      const back = Math.max(1, sq - SNL_COLLISION.bump);
      events.push({ type: 'bump', seat: v.id, by: seatId, from: sq, to: back });
      const sub = snlResolveLanding(seats, board, v.id, back, depth + 1);
      for (let j = 0; j < sub.length; j++) events.push(sub[j]);
    }
  }
  return events;
}

function snlPassTurn(m, events) {
  const active = m.seats.filter((s) => !s.finishedAt);
  if (active.length <= 1) {
    // Play-to-last-place: the last pawn still walking is awarded last place
    // rather than being left mid-board, so standings are always 1..N.
    if (active.length === 1) {
      m.finished += 1;
      active[0].place = m.finished;
      active[0].finishedAt = m.finished;
      events.push({ type: 'finish', seat: active[0].id, place: active[0].place, auto: true });
    }
    m.phase = 'over';
    m.turnSeat = 0;
    return;
  }
  const idx = m.seats.findIndex((s) => s.id === m.turnSeat);
  for (let k = 1; k <= m.seats.length; k++) {
    const cand = m.seats[(idx + k + m.seats.length) % m.seats.length];
    if (!cand.finishedAt) { m.turnSeat = cand.id; break; }
  }
  m.turnNo += 1;
  events.push({ type: 'turn', seat: m.turnSeat });
}

/* One complete turn action for the seat to move. Returns a NEW match plus the
   ordered event list the animation layer replays. */
function snlTakeTurn(match, die) {
  const m = snlCloneMatch(match);
  if (m.phase === 'over') return { match: m, events: [] };
  const board = snlBoardById(m.boardId);
  const seat = m.seats.find((s) => s.id === m.turnSeat);
  if (!seat) return { match: m, events: [] };
  const events = [{ type: 'roll', seat: seat.id, die }];
  seat.rolls += 1;
  m.die = die;
  const isSix = die === 6;
  const streak = isSix ? m.sixStreak + 1 : 0;

  if (isSix && streak >= SNL_MAX_SIX_STREAK) {
    events.push({ type: 'forfeit-six', seat: seat.id, streak });
    m.sixStreak = 0;
    snlPassTurn(m, events);
    return { match: m, events };
  }
  m.sixStreak = streak;

  const target = seat.pos + die;
  if (target > 100) {
    // Exact roll to finish: overshooting leaves the pawn where it stands.
    events.push({ type: 'overshoot', seat: seat.id, need: 100 - seat.pos });
  } else {
    events.push({ type: 'move', seat: seat.id, from: seat.pos, to: target });
    seat.pos = target;
    const sub = snlResolveLanding(m.seats, board, seat.id, target, 0);
    for (let j = 0; j < sub.length; j++) events.push(sub[j]);
    if (seat.pos === 100) {
      m.finished += 1;
      seat.place = m.finished;
      seat.finishedAt = m.finished;
      events.push({ type: 'finish', seat: seat.id, place: seat.place });
    }
  }

  if (isSix && !seat.finishedAt && m.phase !== 'over') {
    events.push({ type: 'reroll', seat: seat.id, streak: m.sixStreak });
  } else {
    m.sixStreak = 0;
    snlPassTurn(m, events);
  }
  return { match: m, events };
}

// Final (or live) ranking: finished seats by place, then the rest by progress.
function snlStandings(match) {
  return match.seats.slice().sort((a, b) => {
    if (a.place && b.place) return a.place - b.place;
    if (a.place) return -1;
    if (b.place) return 1;
    if (b.pos !== a.pos) return b.pos - a.pos;
    return a.id - b.id;
  }).map((s, i) => Object.assign({}, s, { rank: s.place || i + 1 }));
}

function snlMatchOver(match) { return match.phase === 'over'; }

/* ---- Ranked Match: RP + tiers ------------------------------------------ */
const SNL_TIERS = [
  { id: 'bronze',   name: 'Bronze',   min: 0,    color: '#b1743a', icon: '🥉' },
  { id: 'silver',   name: 'Silver',   min: 200,  color: '#9aa4b2', icon: '🥈' },
  { id: 'gold',     name: 'Gold',     min: 500,  color: '#d8a32b', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', min: 900,  color: '#57c7c0', icon: '💠' },
  { id: 'diamond',  name: 'Diamond',  min: 1400, color: '#5aa9ff', icon: '💎' },
  { id: 'master',   name: 'Master',   min: 2000, color: '#a06bff', icon: '👑' },
  { id: 'legend',   name: 'Legend',   min: 2800, color: '#ff6b6b', icon: '🐉' },
];
function snlTierFor(rp) {
  let t = SNL_TIERS[0];
  for (let i = 0; i < SNL_TIERS.length; i++) if ((rp || 0) >= SNL_TIERS[i].min) t = SNL_TIERS[i];
  return t;
}
function snlNextTier(rp) {
  for (let i = 0; i < SNL_TIERS.length; i++) if ((rp || 0) < SNL_TIERS[i].min) return SNL_TIERS[i];
  return null;
}
/* Symmetric around the field: 1st gains the most, last loses the most, and
   the +3 participation floor means a full lobby that finishes is never a pure
   loss for everybody. Total RP is clamped at 0 (no negative ladder). */
function snlRankDelta(place, players) {
  if (!players || players < 2) return 0;
  return Math.round(25 * (1 - (2 * (place - 1)) / (players - 1))) + 3;
}
function snlApplyRp(rp, place, players) {
  return Math.max(0, (rp || 0) + snlRankDelta(place, players));
}
function snlRankedEligible(seats) {
  const humans = seats.filter((s) => s.kind === 'human').length;
  return seats.length >= SNL_RANKED_MIN_HUMANS && humans === seats.length;
}

/* ---- Progression (Legend unlock) --------------------------------------
   Mirrored device-locally so the lobby can render before /api/snl/profile
   answers, and so a signed-out player still keeps their unlock. */
const SNL_PROGRESS_KEY = 'puzzlechain_snl_progress';
function snlLoadLocalProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SNL_PROGRESS_KEY) || '{}');
    return {
      superstarWins: raw.superstarWins || 0,
      wins: raw.wins || 0, matches: raw.matches || 0,
      rp: raw.rp || 0, rankedMatches: raw.rankedMatches || 0,
    };
  } catch { return { superstarWins: 0, wins: 0, matches: 0, rp: 0, rankedMatches: 0 }; }
}
function snlSaveLocalProgress(p) {
  try { localStorage.setItem(SNL_PROGRESS_KEY, JSON.stringify(p)); } catch {}
}
// Fetch the server profile ONLY when a token exists. Without one, /api/snl/*
// can only ever 401 (deny-by-default covers all of /api/), and the browser
// logs that as a console error — which trips the no-console-errors baseline
// for every signed-out visitor and every standalone/local page load. The
// local mirror above is the intended answer in that case, so skipping the
// call loses nothing: inside the platform shell a token is always injected.
function snlFetchProfile() {
  if (!USERNODE_TOKEN) return Promise.resolve(null);
  return api('/api/snl/profile')
    .then(({ ok, body }) => (ok && body && body.profile) || null)
    .catch(() => null);
}
// The RULE, with no deep-link escape hatch in it. The self-test asserts this
// one — a URL override baked into the predicate would make the test report a
// failure on any page loaded with ?snlunlock=1, which is a console error and
// therefore a failed proposal check.
function snlLegendEarned(progress) {
  return (progress && progress.superstarWins || 0) >= SNL_LEGEND_UNLOCK_WINS;
}
function snlLegendUnlocked(progress) {
  // ?snlunlock=1 is a PURE UI-state deep link: it opens the Legend board for
  // this page load so the unlocked lobby is screenshot- and check-reachable.
  // It writes nothing, is deliberately NOT staging-gated (the "before" shot
  // comes from production), and grants nothing — Legend is only a harder
  // board, and the server never gated it either.
  if (snlQ('snlunlock') === '1') return true;
  return snlLegendEarned(progress);
}
function snlBoardLocked(board, progress) {
  return board.lockedBy === 'superstar' && !snlLegendUnlocked(progress);
}
// Lock state as the RULE sees it, ignoring the deep link (self-tests only).
function snlBoardEarnedLocked(board, progress) {
  return board.lockedBy === 'superstar' && !snlLegendEarned(progress);
}
// Fold one finished match into the local progression mirror. The server row
// is authoritative when signed in, but this keeps the Legend unlock and the
// tier badge correct offline and instantly, before the POST lands.
function snlApplyResult(progress, res) {
  const p = Object.assign({}, progress);
  p.matches = (p.matches || 0) + 1;
  if (res.place === 1) {
    p.wins = (p.wins || 0) + 1;
    if (res.boardId === 'superstar') p.superstarWins = (p.superstarWins || 0) + 1;
  }
  if (res.mode === 'ranked') {
    p.rankedMatches = (p.rankedMatches || 0) + 1;
    p.rp = snlApplyRp(p.rp || 0, res.place, res.players);
  }
  return p;
}

/* ---- Ranked sheet section ---------------------------------------------
   Registry-driven (`sheetExtras` on the chutes-ladders entry), so the ☰ sheet
   and `?sheet=ranked` both reach it. Shows the viewer's RP + tier progress
   from the local mirror (instant, works signed out) and the global RP board
   from the public endpoint. */
function SnlTierBar({ rp }) {
  const tier = snlTierFor(rp);
  const next = snlNextTier(rp);
  const span = next ? Math.max(1, next.min - tier.min) : 1;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((rp - tier.min) / span) * 100))) : 100;
  return (
    <div className="snl-tier-block">
      <div className="snl-tier-head">
        <span className="snl-tier-badge" style={{ borderColor: tier.color, color: tier.color }}>
          {tier.icon} {tier.name}
        </span>
        <span className="snl-tier-rp mono">{rp} RP</span>
      </div>
      <div className="snl-tier-track"><div className="snl-tier-fill" style={{ width: pct + '%' }} /></div>
      <div className="snl-tier-note">
        {next
          ? `${next.min - rp} RP to ${next.icon} ${next.name}`
          : 'Top tier reached — hold the line.'}
      </div>
    </div>
  );
}

function SnlRankedPanel() {
  const [progress, setProgress] = useState(() => snlLoadLocalProgress());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    snlFetchProfile().then((pr) => {
      if (dead || !pr) return;
      setProgress((p) => ({
        superstarWins: Math.max(p.superstarWins || 0, pr.superstarWins || 0),
        wins: Math.max(p.wins || 0, pr.wins || 0),
        matches: Math.max(p.matches || 0, pr.matches || 0),
        rp: Math.max(p.rp || 0, pr.rp || 0),
        rankedMatches: Math.max(p.rankedMatches || 0, pr.rankedMatches || 0),
      }));
    });
    api('/api/snl/ranked/leaderboard').then(({ ok, body }) => {
      if (dead) return;
      if (ok && body) setData(body);
      setLoading(false);
    }).catch(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  const entries = (data && data.entries) || [];
  const me = data && data.me;
  const meInTop = me && entries.some((e) => e.rank === me.rank);
  return (
    <div className="snl-ranked-panel">
      <h4>Ranked</h4>
      <SnlTierBar rp={progress.rp || 0} />
      <div className="snl-ranked-stats">
        <span className="pill"><span className="plabel">Ranked</span><span className="pvalue mono">{progress.rankedMatches || 0}</span></span>
        <span className="pill"><span className="plabel">Wins</span><span className="pvalue mono">{progress.wins || 0}</span></span>
        <span className="pill"><span className="plabel">Super Star</span><span className="pvalue mono">{progress.superstarWins || 0}/{SNL_LEGEND_UNLOCK_WINS}</span></span>
      </div>
      <div className="snl-ranked-note">
        Ranked Match is hot-seat and needs {SNL_RANKED_MIN_HUMANS}+ humans. Finishing
        first pays the most RP; last place still pays a little for showing up.
      </div>
      <h4 style={{ marginTop: '0.9rem' }}>RP Leaderboard</h4>
      {loading
        ? <div className="cg-sheet-empty">Loading…</div>
        : entries.length === 0
          ? <div className="cg-sheet-empty">No ranked matches yet — play one!</div>
          : (
            <div className="snake-lb">
              {entries.map((r) => (
                <div key={r.rank} className={'snake-lb-row' + (r.isCurrentUser ? ' snake-lb-me' : '')}>
                  <div className="snake-lb-rank">#{r.rank}</div>
                  <div className="snake-lb-name">{r.username}{r.isCurrentUser ? ' (you)' : ''}</div>
                  <div className="snake-lb-score">{snlTierFor(r.rp).icon} {r.rp} RP</div>
                </div>
              ))}
              {me && !meInTop && (
                <div className="snake-lb-row snake-lb-me">
                  <div className="snake-lb-rank">#{me.rank}</div>
                  <div className="snake-lb-name">{me.username} (you)</div>
                  <div className="snake-lb-score">{snlTierFor(me.rp).icon} {me.rp} RP</div>
                </div>
              )}
            </div>
          )}
    </div>
  );
}

/* ---- Vector art: ladders, snakes, chess pieces -------------------------
   All three draw in CSS pixels into whatever context they're handed, so the
   static board layer and the standalone lobby previews share one renderer.
   Colours come in as literals (intrinsic art) — never `C.x`, which is a
   var() string guardCanvasCtx would reject. */
const SNL_LADDER_STYLE = { wood: '#c98a3c', dark: '#8a5a22', light: '#e8b567' };
const SNL_SNAKE_COLORS = [
  { body: '#3f9e57', belly: '#b9e2a6', dark: '#245c33' },
  { body: '#c2543f', belly: '#efc0a5', dark: '#7c2c1d' },
  { body: '#6a63c8', belly: '#c3bff0', dark: '#3b3580' },
  { body: '#c9a02b', belly: '#f2e0a0', dark: '#7d6111' },
];

function snlDrawLadder(ctx, ax, ay, bx, by, w, style) {
  const st = style || SNL_LADDER_STYLE;
  const dx = bx - ax, dy = by - ay;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;                     // unit perpendicular
  const half = w / 2;
  ctx.save();
  ctx.lineCap = 'round';
  // Rungs first so the rails paint over their ends.
  const rungs = Math.max(2, Math.round(len / (w * 0.85)));
  ctx.strokeStyle = st.dark;
  ctx.lineWidth = Math.max(1.4, w * 0.16);
  for (let i = 1; i < rungs; i++) {
    const t = i / rungs;
    const cx = ax + dx * t, cy = ay + dy * t;
    ctx.beginPath();
    ctx.moveTo(cx + px * half, cy + py * half);
    ctx.lineTo(cx - px * half, cy - py * half);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(2, w * 0.2);
  for (const sgn of [1, -1]) {
    ctx.strokeStyle = st.wood;
    ctx.beginPath();
    ctx.moveTo(ax + px * half * sgn, ay + py * half * sgn);
    ctx.lineTo(bx + px * half * sgn, by + py * half * sgn);
    ctx.stroke();
    // A thin highlight down one edge of each rail reads as rounded wood.
    ctx.strokeStyle = st.light;
    ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath();
    ctx.moveTo(ax + px * half * sgn - px * w * 0.05, ay + py * half * sgn - py * w * 0.05);
    ctx.lineTo(bx + px * half * sgn - px * w * 0.05, by + py * half * sgn - py * w * 0.05);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, w * 0.2);
  }
  ctx.restore();
}

/* The snake's spine is one cubic curve; the animation layer walks the SAME
   curve so a sliding pawn tracks the drawn body instead of cutting across it. */
function snlSnakeCurve(ax, ay, bx, by, seed) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.max(1, Math.hypot(dx, dy));
  const px = -dy / len, py = dx / len;
  const amp = Math.min(len * 0.28, 46) * (seed % 2 ? 1 : -1);
  return [
    { x: ax, y: ay },
    { x: ax + dx * 0.3 + px * amp, y: ay + dy * 0.3 + py * amp },
    { x: ax + dx * 0.7 - px * amp, y: ay + dy * 0.7 - py * amp },
    { x: bx, y: by },
  ];
}
function snlCurveAt(c, t) {
  const mt = 1 - t;
  const a = mt * mt * mt, b = 3 * mt * mt * t, d = 3 * mt * t * t, e = t * t * t;
  return { x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x,
           y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y };
}

function snlDrawSnake(ctx, ax, ay, bx, by, w, colors, seed) {
  const col = colors || SNL_SNAKE_COLORS[0];
  const curve = snlSnakeCurve(ax, ay, bx, by, seed || 0);
  const steps = 44;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Body drawn as tapering segments: head-thick down to a fine tail.
  let prev = snlCurveAt(curve, 0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = snlCurveAt(curve, t);
    const wide = w * (1 - 0.62 * t);
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = wide;
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = col.body;
    ctx.lineWidth = Math.max(0.8, wide * 0.78);
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (i % 4 === 0) {
      ctx.strokeStyle = col.belly;
      ctx.lineWidth = Math.max(0.6, wide * 0.3);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    prev = p;
  }
  // Head at the high square (where a pawn gets swallowed).
  const nxt = snlCurveAt(curve, 0.06);
  const hAng = Math.atan2(nxt.y - ay, nxt.x - ax);
  const hr = w * 0.82;
  ctx.translate(ax, ay);
  ctx.rotate(hAng);
  ctx.fillStyle = col.body;
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(1, w * 0.12);
  ctx.beginPath();
  ctx.ellipse(-hr * 0.15, 0, hr, hr * 0.78, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Forked tongue, out the front of the head.
  ctx.strokeStyle = '#e04a5a';
  ctx.lineWidth = Math.max(1, w * 0.11);
  ctx.beginPath();
  ctx.moveTo(hr * 0.7, 0); ctx.lineTo(hr * 1.45, 0);
  ctx.moveTo(hr * 1.45, 0); ctx.lineTo(hr * 1.8, -hr * 0.3);
  ctx.moveTo(hr * 1.45, 0); ctx.lineTo(hr * 1.8, hr * 0.3);
  ctx.stroke();
  // Eyes.
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fdfdfd';
    ctx.beginPath(); ctx.arc(hr * 0.15, sgn * hr * 0.4, hr * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(hr * 0.22, sgn * hr * 0.4, hr * 0.13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* Chess-piece silhouettes. `s` is the piece height in CSS px; (cx, cy) is the
   CENTRE of its footprint, so the caller can place one per board square. */
function snlDrawPiece(ctx, cx, cy, s, pieceId, color, dark) {
  const u = s / 100;                       // the paths are authored on a 100 grid
  ctx.save();
  ctx.translate(cx, cy + s * 0.06);
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark || '#00000055';
  ctx.fillStyle = color;
  const base = () => {
    ctx.beginPath();
    ctx.ellipse(0, 44, 32, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-26, 40); ctx.lineTo(-17, 22); ctx.lineTo(17, 22); ctx.lineTo(26, 40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  const ball = (y, r) => { ctx.beginPath(); ctx.arc(0, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  base();
  if (pieceId === 'rook') {
    ctx.beginPath();
    ctx.moveTo(-16, 22); ctx.lineTo(-13, -18); ctx.lineTo(13, -18); ctx.lineTo(16, 22);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, -18); ctx.lineTo(-22, -38); ctx.lineTo(-12, -38); ctx.lineTo(-12, -29);
    ctx.lineTo(-5, -29); ctx.lineTo(-5, -38); ctx.lineTo(5, -38); ctx.lineTo(5, -29);
    ctx.lineTo(12, -29); ctx.lineTo(12, -38); ctx.lineTo(22, -38); ctx.lineTo(22, -18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (pieceId === 'bishop') {
    ctx.beginPath();
    ctx.moveTo(-14, 22); ctx.quadraticCurveTo(-20, -6, 0, -30);
    ctx.quadraticCurveTo(20, -6, 14, 22);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ball(-38, 9);
    ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(12, -12); ctx.stroke();
  } else if (pieceId === 'knight') {
    ctx.beginPath();
    ctx.moveTo(-18, 22); ctx.lineTo(-14, 0); ctx.quadraticCurveTo(-22, -14, -8, -28);
    ctx.lineTo(-14, -40); ctx.lineTo(2, -34); ctx.quadraticCurveTo(24, -30, 22, -4);
    ctx.lineTo(18, 22);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark || '#00000055';
    ctx.beginPath(); ctx.arc(2, -24, 4, 0, Math.PI * 2); ctx.fill();
  } else if (pieceId === 'queen' || pieceId === 'king') {
    ctx.beginPath();
    ctx.moveTo(-15, 22); ctx.quadraticCurveTo(-22, -4, -14, -20);
    ctx.lineTo(14, -20); ctx.quadraticCurveTo(22, -4, 15, 22);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (pieceId === 'queen') {
      ctx.beginPath();
      ctx.moveTo(-24, -20); ctx.lineTo(-28, -48); ctx.lineTo(-12, -32);
      ctx.lineTo(0, -52); ctx.lineTo(12, -32); ctx.lineTo(28, -48); ctx.lineTo(24, -20);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-22, -20); ctx.quadraticCurveTo(-24, -40, 0, -38);
      ctx.quadraticCurveTo(24, -40, 22, -20);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -60); ctx.moveTo(-9, -52); ctx.lineTo(9, -52);
      ctx.stroke();
    }
  } else {
    // pawn
    ctx.beginPath();
    ctx.moveTo(-13, 22); ctx.quadraticCurveTo(-17, 0, -7, -10);
    ctx.lineTo(7, -10); ctx.quadraticCurveTo(17, 0, 13, 22);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ball(-24, 14);
  }
  ctx.restore();
}

/* ---- Board canvas ------------------------------------------------------
   The grid + ladders + snakes never change during a match, so they are drawn
   ONCE into an offscreen layer keyed by [side, board, skin, theme]; each frame
   is that layer blitted plus N pawns. That is what makes a 60fps pawn slide
   affordable on a phone. */
const SNL_LAYER_CACHE = new Map();
function snlStaticLayer(side, board, skin, themeV) {
  const dpr = canvasDpr();
  const key = [Math.round(side), dpr, board.id, skin.id, themeV].join('|');
  const hit = SNL_LAYER_CACHE.get(key);
  if (hit) return hit;
  const cvs = document.createElement('canvas');
  cvs.width = Math.max(1, Math.floor(side * dpr));
  cvs.height = cvs.width;
  const ctx = guardCanvasCtx(cvs.getContext('2d'));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 4;
  const inner = side - pad * 2;
  const cs = inner / 10;
  const at = (n) => {
    const p = cnlCenterPct(n);
    return { x: pad + (p.x / 100) * inner, y: pad + (p.y / 100) * inner };
  };
  // Cells.
  ctx.fillStyle = palOf('card', '#fff');
  ctx.fillRect(0, 0, side, side);
  for (let n = 1; n <= 100; n++) {
    const { row, col } = cnlRowCol(n);
    const vr = 9 - row;
    const x = pad + col * cs, y = pad + vr * cs;
    const shade = (row + col) % 2 === 0;
    ctx.fillStyle = shade ? (skin.cellTint || palOf('bg', '#f4f1ea')) : palOf('card', '#fff');
    ctx.fillRect(x, y, cs, cs);
    ctx.strokeStyle = palOf('border', '#ddd');
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(cs), Math.round(cs));
    ctx.fillStyle = palOf('muted', '#999');
    ctx.font = Math.max(8, Math.round(cs * 0.26)) + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(String(n), x + cs * 0.1, y + cs * 0.08);
  }
  // Home flag on 100.
  const home = at(100);
  ctx.fillStyle = '#d8a32b';
  ctx.beginPath(); ctx.arc(home.x, home.y, cs * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3f06';
  ctx.font = Math.max(9, Math.round(cs * 0.3)) + 'px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', home.x, home.y + 1);
  // Ladders then snakes (snakes on top: they're the drama).
  const lw = Math.max(6, cs * 0.42);
  Object.keys(board.ladders).forEach((k) => {
    const a = at(parseInt(k, 10)), b = at(board.ladders[k]);
    snlDrawLadder(ctx, a.x, a.y, b.x, b.y, lw, skin.ladderWood || SNL_LADDER_STYLE);
  });
  const pal = (skin.snakeColors && skin.snakeColors.length) ? skin.snakeColors : SNL_SNAKE_COLORS;
  Object.keys(board.snakes).forEach((k, i) => {
    const from = parseInt(k, 10);
    const a = at(from), b = at(board.snakes[k]);
    snlDrawSnake(ctx, a.x, a.y, b.x, b.y, Math.max(5, cs * 0.34), pal[i % pal.length], from);
  });
  if (SNL_LAYER_CACHE.size > 6) SNL_LAYER_CACHE.delete(SNL_LAYER_CACHE.keys().next().value);
  SNL_LAYER_CACHE.set(key, cvs);
  return cvs;
}

/* frameRef.current is a plain map seatId -> { xp, yp, lift, shake } in board
   percent coords, written by the animator every rAF tick. A seat with no
   entry falls back to its logical square, which is what makes the board
   correct on first paint and after a resume. */
function SnlBoardCanvas({ board, skin, seats, frameRef, animating, redrawKey, onFrame }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { boxW } = useFitBox(boxRef, { cols: 10, rows: 10 });
  const side = Math.max(0, Math.floor(boxW));
  const themeV = useThemeVersion();
  const drawRef = useRef(null);
  // One rAF for the whole game: the animator's per-frame tick runs here,
  // immediately before the draw that consumes it, so there is never a second
  // competing loop writing frameRef between paints.
  const frameCbRef = useRef(null);
  frameCbRef.current = onFrame;

  drawRef.current = () => {
    if (frameCbRef.current) frameCbRef.current();
    const cvs = canvasRef.current;
    if (!cvs || side < 80) return;
    const dpr = canvasDpr();
    const want = Math.floor(side * dpr);
    // Both dimensions, deliberately: a fresh <canvas> is 300x150, so at a
    // 300px board on a dpr-1 phone `width !== want` is already false and a
    // width-only guard leaves the height at 150 — the board renders as its
    // top four rows and nothing below.
    if (cvs.width !== want || cvs.height !== want) {
      cvs.width = want; cvs.height = want;
      cvs.style.width = side + 'px'; cvs.style.height = side + 'px';
    }
    const ctx = guardCanvasCtx(cvs.getContext('2d'));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, side, side);
    ctx.drawImage(snlStaticLayer(side, board, skin, themeV), 0, 0, side, side);
    const pad = 4;
    const inner = side - pad * 2;
    const cs = inner / 10;
    const frame = (frameRef && frameRef.current) || {};
    seats.forEach((s, i) => {
      const f = frame[s.id];
      const p = f || cnlCenterPct(s.pos);
      const col = snlSeatColor(s.colorIdx);
      // A stable micro-offset per seat keeps six pawns on one square legible.
      const ox = ((i % 3) - 1) * cs * 0.22;
      const oy = (Math.floor(i / 3) - 0.5) * cs * 0.2;
      const shake = f && f.shake ? (Math.random() - 0.5) * f.shake : 0;
      const lift = f && f.lift ? f.lift * cs * 0.55 : 0;
      // Off-board (square 0) sits at 104% by the shared board convention —
      // outside this canvas, which is exactly `side` tall, so an unclamped
      // start pawn is half-clipped by the bottom edge. The DOM board it was
      // written for had an overflow-visible wrapper; a canvas has no such
      // thing, so clamp the pawn back inside the last row instead.
      const rawY = Math.min(p.yp != null ? p.yp : p.y, 97);
      const x = pad + ((p.xp != null ? p.xp : p.x) / 100) * inner + ox + shake;
      const y = pad + (rawY / 100) * inner + oy - lift;
      if (lift > 0.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(x, pad + (rawY / 100) * inner + oy + cs * 0.2,
                    cs * 0.18, cs * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      snlDrawPiece(ctx, x, y, cs * (s.finishedAt ? 0.62 : 0.78), s.pieceId, col.hex, col.dark);
    });
  };

  const posKey = seats.map((s) => s.pos + ':' + s.place).join(',');
  useEffect(() => { if (drawRef.current) drawRef.current(); },
    [side, themeV, redrawKey, board.id, skin.id, seats.length, posKey]);

  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const loop = () => { if (drawRef.current) drawRef.current(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const aria = 'Snakes and Ladders board (' + board.name + '): '
    + seats.map((s) => s.name + ' (' + snlPieceName(s.pieceId) + ') on square ' + (s.pos || 0)).join(', ');
  return (
    <div className="cnl-board-canvas-fill" ref={boxRef}>
      <canvas
        ref={canvasRef}
        className="cnl-canvas snl-canvas board-canvas"
        role="img"
        data-snl-pawns="chess"
        data-snl-board={board.id}
        aria-label={aria}
      />
    </div>
  );
}

/* ---- Deep-link params --------------------------------------------------
   dapp.json checks and the before/after screenshots can only NAVIGATE, so
   every state worth showing needs a URL that reaches it. */
function snlQ(k) {
  try { return new URLSearchParams(window.location.search).get(k); } catch { return null; }
}

/* ---- Lobby -------------------------------------------------------------
   2-6 seats, each Human or Bot, with a piece and a colour; a board picker
   with the Legend lock; and the Party / Ranked toggle. Plain DOM (the same
   idiom as ChutesLaddersModeSelect) — only the in-match frame is canvas. */
function SnlLobby({ progress, initialMode, onStart, onCancel }) {
  const qBoard = snlQ('snlboard');
  const qSeats = parseInt(snlQ('snlseats') || '0', 10);
  const [boardId, setBoardId] = useState(
    (qBoard && SNL_BOARD_MAP[qBoard]) ? qBoard : SNL_DEFAULT_BOARD);
  const [mode, setMode] = useState(initialMode === 'ranked' ? 'ranked' : 'party');
  const [seats, setSeats] = useState(() => {
    const n = Math.max(SNL_MIN_SEATS, Math.min(SNL_MAX_SEATS, qSeats || (initialMode === 'ranked' ? 4 : 3)));
    return Array.from({ length: n }, (_, i) => ({
      kind: initialMode === 'ranked' ? 'human' : (i === 0 ? 'human' : 'bot'),
      name: (initialMode === 'ranked' || i === 0) ? 'Player ' + (i + 1) : 'Bot ' + (i + 1),
      pieceId: SNL_PIECES[i % SNL_PIECES.length].id,
      colorIdx: i,
    }));
  });
  const [expanded, setExpanded] = useState(-1);

  const board = snlBoardById(boardId);
  const locked = snlBoardLocked(board, progress);
  const rankedOk = snlRankedEligible(seats);
  const canStart = !locked && (mode !== 'ranked' || rankedOk);

  const setSeat = (i, patch) => setSeats((prev) =>
    prev.map((s, j) => (j === i ? Object.assign({}, s, patch) : s)));

  const setCount = (n) => setSeats((prev) => {
    const next = prev.slice(0, n);
    while (next.length < n) {
      const i = next.length;
      next.push({
        kind: mode === 'ranked' ? 'human' : 'bot',
        name: (mode === 'ranked' ? 'Player ' : 'Bot ') + (i + 1),
        pieceId: SNL_PIECES[i % SNL_PIECES.length].id, colorIdx: i,
      });
    }
    return next;
  });

  const pickMode = (m) => {
    setMode(m);
    if (m === 'ranked') {
      // Ranked is hot-seat with four real people; flip the bots to humans
      // rather than silently refusing to start.
      setSeats((prev) => {
        const next = prev.map((s, i) => Object.assign({}, s, {
          kind: 'human',
          name: s.kind === 'bot' ? 'Player ' + (i + 1) : s.name,
        }));
        while (next.length < SNL_RANKED_MIN_HUMANS) {
          const i = next.length;
          next.push({ kind: 'human', name: 'Player ' + (i + 1),
            pieceId: SNL_PIECES[i % SNL_PIECES.length].id, colorIdx: i });
        }
        return next;
      });
    }
  };

  const superWins = (progress && progress.superstarWins) || 0;

  return (
    <div className="snl-lobby mnc-mode-select">
      <div className="cnl-variant-block">
        <div className="cnl-variant-label">Match type</div>
        <div className="mnc-mode-sub">
          <button className={'mnc-difficulty-pill' + (mode === 'party' ? ' active' : '')}
            onClick={() => pickMode('party')}>🎉 Party</button>
          <button className={'mnc-difficulty-pill' + (mode === 'ranked' ? ' active' : '')}
            onClick={() => pickMode('ranked')}>🏆 Ranked Match</button>
        </div>
        {mode === 'ranked' && (
          <div className="cnl-variant-note">
            Ranked is hot-seat: {SNL_RANKED_MIN_HUMANS}+ human players on this device, no bots.
            Every finishing place moves your RP.
            {!rankedOk && <strong className="snl-warn"> Add humans to start a ranked match.</strong>}
          </div>
        )}
      </div>

      <div className="cnl-variant-block">
        <div className="cnl-variant-label">Board</div>
        <div className="snl-board-grid">
          {snlLadderBoards().map((b) => {
            const lk = snlBoardLocked(b, progress);
            return (
              <button key={b.id}
                className={'snl-board-card' + (boardId === b.id ? ' active' : '') + (lk ? ' locked' : '')}
                {...tapProps(() => setBoardId(b.id))}>
                <span className="snl-board-name">{lk ? '🔒 ' : ''}{b.name}</span>
                <span className="snl-board-meta">
                  {Object.keys(b.ladders).length} ladders · {Object.keys(b.snakes).length} snakes
                </span>
              </button>
            );
          })}
          <button className={'snl-board-card' + (boardId === 'moksha' ? ' active' : '')}
            {...tapProps(() => setBoardId('moksha'))}>
            <span className="snl-board-name">Moksha Patam</span>
            <span className="snl-board-meta">The Indian original</span>
          </button>
        </div>
        <div className="cnl-variant-note">{board.desc}</div>
        {locked && (
          <div className="snl-lock-note">
            🔒 Legend unlocks after {SNL_LEGEND_UNLOCK_WINS} Super Star wins —
            you have {Math.min(superWins, SNL_LEGEND_UNLOCK_WINS)}/{SNL_LEGEND_UNLOCK_WINS}.
          </div>
        )}
      </div>

      <div className="cnl-variant-block">
        <div className="cnl-variant-label">Players ({seats.length})</div>
        <div className="mnc-mode-sub">
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} className={'mnc-difficulty-pill' + (seats.length === n ? ' active' : '')}
              onClick={() => setCount(n)}>{n}</button>
          ))}
        </div>
        <div className="snl-seat-list">
          {seats.map((s, i) => {
            const col = snlSeatColor(s.colorIdx);
            return (
              <div className="snl-seat-row" key={i}>
                <span className="snl-seat-dot" style={{ background: col.hex }} />
                <input className="snl-seat-name" value={s.name} maxLength={14}
                  aria-label={'Player ' + (i + 1) + ' name'}
                  onChange={(e) => setSeat(i, { name: e.target.value })} />
                <button className={'snl-seat-btn' + (s.kind === 'human' ? ' active' : '')}
                  disabled={mode === 'ranked'}
                  {...tapProps(() => setSeat(i, {
                    kind: s.kind === 'human' ? 'bot' : 'human',
                    name: s.kind === 'human' ? 'Bot ' + (i + 1) : 'Player ' + (i + 1),
                  }), { disabled: mode === 'ranked' })}>{s.kind === 'human' ? '🧑 Human' : '🤖 Bot'}</button>
                <button className="snl-seat-btn" {...tapProps(() => setExpanded(expanded === i ? -1 : i))}>
                  {snlPieceName(s.pieceId)} ▾
                </button>
                {expanded === i && (
                  <div className="snl-seat-picker">
                    <div className="snl-pick-row">
                      {SNL_PIECES.map((p) => (
                        <button key={p.id}
                          className={'snl-piece-pick' + (s.pieceId === p.id ? ' active' : '')}
                          {...tapProps(() => setSeat(i, { pieceId: p.id }))}>{p.name}</button>
                      ))}
                    </div>
                    <div className="snl-pick-row">
                      {SNL_SEAT_COLORS.map((c, ci) => (
                        <button key={c.id}
                          className={'snl-color-pick' + (s.colorIdx === ci ? ' active' : '')}
                          style={{ background: c.hex }} aria-label={c.name}
                          {...tapProps(() => setSeat(i, { colorIdx: ci }))} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button className="mnc-mode-start-btn" disabled={!canStart}
        onClick={() => canStart && onStart({ boardId, mode, seats })}>
        {locked ? 'Legend is locked' : (mode === 'ranked' ? 'Start Ranked Match' : 'Start Party')}
      </button>
      {onCancel && <button className="cnl-variant-link snl-lobby-back" onClick={() => onCancel()}>← Back to modes</button>}
    </div>
  );
}

/* ---- Animation timings ------------------------------------------------- */
const SNL_ANIM = { dice: 620, hop: 130, ladderRung: 90, snake: 700, bump: 300, beat: 420 };
// Reduced motion still plays the full event sequence (and its sounds) — it
// just snaps between states instead of tweening, so nothing becomes
// unreadable and no result is skipped.
function snlDur(ms) { return cgPrefs.motion ? Math.min(ms, 30) : ms; }

function snlPct(sq) { const p = cnlCenterPct(sq); return { xp: p.x, yp: p.y, lift: 0, shake: 0 }; }

/* ---- The match --------------------------------------------------------- */
function SnlMatch({ config, onWin, onStepChange, resetKey, onExit, onResult, practice }) {
  const [match, setMatch] = useState(() => snlInitialMatch(config));
  const [die, setDie] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [redrawKey, setRedrawKey] = useState(0);
  const [skin, setSkin] = useCnlSkin();
  const SK = CNL_SKINS[skin] || CNL_SKINS.plain;
  const board = snlBoardById(match.boardId);
  const over = match.phase === 'over';
  const { secs, fmt } = useTimer(!over);
  const secsRef = useRef(0); secsRef.current = secs;

  const matchRef = useRef(match); matchRef.current = match;
  const frameRef = useRef({});
  const tweenRef = useRef(null);
  const queueRef = useRef([]);
  const timersRef = useRef([]);
  const winSentRef = useRef(false);
  const stepsRef = useRef(0);

  const cycleSkin = () => {
    const ids = Object.keys(CNL_SKINS);
    setSkin(ids[(ids.indexOf(skin) + 1) % ids.length]);
  };

  const seatById = (id) => matchRef.current.seats.find((s) => s.id === id);
  const nameOf = (id) => { const s = seatById(id); return s ? s.name : 'Player'; };

  // Seed every pawn's drawn position once, so the first paint is correct and a
  // resumed match renders its saved squares rather than the start line.
  const seedFrame = (m) => {
    const f = {};
    m.seats.forEach((s) => { f[s.id] = snlPct(s.pos); });
    frameRef.current = f;
  };
  const seedRef = useRef(false);
  if (!seedRef.current) { seedFrame(match); seedRef.current = true; }

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };

  useEffect(() => () => { clearTimers(); tweenRef.current = null; snlMusicStop(); }, []);

  useEffect(() => {
    if (!over && cgPrefs.music) snlMusicStart();
    if (over) snlMusicStop();
  }, [over]);

  // Music intensity tracks the leader's progress up the board — the bed gets
  // busier as somebody closes on 100.
  useEffect(() => {
    if (over) return;
    const lead = match.seats.reduce((a, s) => Math.max(a, s.pos), 0);
    snlMusicSetIntensity(lead / 100);
  }, [match.seats.map((s) => s.pos).join(','), over]);

  useEffect(() => {
    clearTimers();
    tweenRef.current = null;
    queueRef.current = [];
    winSentRef.current = false;
    stepsRef.current = 0;
    const m = snlInitialMatch(config);
    seedFrame(m);
    setMatch(m); setDie(null); setBusy(false); setRolling(false); setBanner('');
    setRedrawKey((k) => k + 1);
  }, [resetKey]);

  /* -- the tween driver: one active tween, advanced from the canvas's rAF -- */
  const onFrame = () => {
    const tw = tweenRef.current;
    if (!tw) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t = tw.dur <= 0 ? 1 : Math.min(1, (now - tw.t0) / tw.dur);
    frameRef.current[tw.seatId] = tw.path(t);
    if (t >= 1) {
      tweenRef.current = null;
      const done = tw.onDone;
      if (done) done();
    }
  };
  const tween = (seatId, dur, path, onDone) => {
    if (dur <= 0) { frameRef.current[seatId] = path(1); onDone(); return; }
    tweenRef.current = {
      seatId, dur, path, onDone,
      t0: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    };
  };

  /* -- event playback -- */
  const playEvent = (ev, next) => {
    if (ev.type === 'roll') {
      snlCue('dice'); cgHaptic(12);
      setRolling(true); setDie(ev.die);
      setBanner(nameOf(ev.seat) + ' rolled ' + ev.die + (ev.die === 6 ? ' — roll again!' : ''));
      later(() => { setRolling(false); next(); }, snlDur(SNL_ANIM.dice));
      return;
    }
    if (ev.type === 'move') {
      const steps = ev.to - ev.from;
      let cur = ev.from;
      const hop = () => {
        if (cur >= ev.to) { next(); return; }
        const from = snlPct(cur), to = snlPct(cur + 1);
        cur += 1;
        snlCue('hop');
        tween(ev.seat, snlDur(SNL_ANIM.hop), (t) => ({
          xp: from.xp + (to.xp - from.xp) * t,
          yp: from.yp + (to.yp - from.yp) * t,
          lift: Math.sin(Math.PI * t) * 0.5, shake: 0,
        }), hop);
      };
      if (steps <= 0) { next(); return; }
      hop();
      return;
    }
    if (ev.type === 'ladder') {
      snlCue('ladder'); cgHaptic(18);
      setBanner(nameOf(ev.seat) + ' climbs a ladder to ' + ev.to + '! 🪜');
      const from = snlPct(ev.from), to = snlPct(ev.to);
      const rungs = Math.max(3, Math.round(Math.abs(ev.to - ev.from) / 8));
      tween(ev.seat, snlDur(SNL_ANIM.ladderRung * rungs), (t) => ({
        xp: from.xp + (to.xp - from.xp) * t,
        yp: from.yp + (to.yp - from.yp) * t,
        // Stepping feel: a small saw-tooth lift, one bump per rung.
        lift: 0.25 + 0.2 * Math.abs(Math.sin(Math.PI * t * rungs)), shake: 0,
      }), next);
      return;
    }
    if (ev.type === 'snake') {
      snlCue('snake'); cgHaptic(26);
      setBanner(nameOf(ev.seat) + ' is swallowed down to ' + ev.to + '! 🐍');
      // Follow the SAME bezier the art draws, so the pawn slides along the
      // body instead of cutting the corner.
      const a = cnlCenterPct(ev.from), b = cnlCenterPct(ev.to);
      const curve = snlSnakeCurve(a.x, a.y, b.x, b.y, ev.from);
      tween(ev.seat, snlDur(SNL_ANIM.snake), (t) => {
        const e = t * t * (3 - 2 * t);
        const p = snlCurveAt(curve, e);
        return { xp: p.x, yp: p.y, lift: 0, shake: 0 };
      }, next);
      return;
    }
    if (ev.type === 'bump') {
      snlCue('bump'); cgHaptic(22);
      setBanner(nameOf(ev.by) + ' knocks ' + nameOf(ev.seat) + ' back ' + SNL_BUMP + ' squares!');
      const from = snlPct(ev.from), to = snlPct(ev.to);
      tween(ev.seat, snlDur(SNL_ANIM.bump), (t) => ({
        xp: from.xp + (to.xp - from.xp) * t,
        yp: from.yp + (to.yp - from.yp) * t,
        lift: Math.sin(Math.PI * t) * 0.35,
        shake: (1 - t) * 3,
      }), next);
      return;
    }
    if (ev.type === 'overshoot') {
      setBanner('Overshoot — needs exactly ' + ev.need + ' to finish');
      later(next, snlDur(SNL_ANIM.beat));
      return;
    }
    if (ev.type === 'forfeit-six') {
      snlCue('forfeit');
      setBanner('Three sixes in a row — ' + nameOf(ev.seat) + ' forfeits the move!');
      later(next, snlDur(SNL_ANIM.beat + 260));
      return;
    }
    if (ev.type === 'finish') {
      snlCue('finish'); snlMusicSting(); cgHaptic(40);
      setBanner(nameOf(ev.seat) + ' finishes in place #' + ev.place + '! 🎉');
      later(next, snlDur(SNL_ANIM.beat + 200));
      return;
    }
    if (ev.type === 'reroll') {
      setBanner(nameOf(ev.seat) + ' rolls again (' + ev.streak + '/' + SNL_MAX_SIX_STREAK + ' sixes)');
      later(next, snlDur(220));
      return;
    }
    if (ev.type === 'turn') {
      setBanner(nameOf(ev.seat) + "'s turn");
      later(next, snlDur(180));
      return;
    }
    next();
  };

  const pump = () => {
    const q = queueRef.current;
    if (!q.length) { setBusy(false); return; }
    const ev = q.shift();
    playEvent(ev, pump);
  };

  const doRoll = () => {
    const m = matchRef.current;
    if (busy || m.phase === 'over') return;
    const value = snlRoll(m);
    const res = snlTakeTurn(m, value);
    stepsRef.current += 1;
    if (onStepChange) onStepChange(stepsRef.current);
    setMatch(res.match);
    matchRef.current = res.match;
    queueRef.current = res.events.slice();
    setBusy(true);
    pump();
  };

  /* ?snlanim=snake|ladder|bump|dice replays ONE scripted animation on the
     opening board. The animation layer is otherwise reachable only by rolling,
     which navigation-only screenshots and dapp.json checks cannot do — so
     without this the whole slice is invisible to the gate. It plays events
     against frameRef/banner only and never calls snlTakeTurn, so no match
     state moves and nothing is recorded. */
  const animDemoRef = useRef(false);
  const animDemo = snlQ('snlanim');
  useEffect(() => {
    if (animDemoRef.current || !animDemo || over) return;
    const seat = matchRef.current.seats[0];
    if (!seat) return;
    const ladderFrom = Object.keys(board.ladders)[0];
    const snakeFrom = Object.keys(board.snakes)[0];
    let evs = null;
    if (animDemo === 'dice') {
      evs = [{ type: 'roll', seat: seat.id, die: 6 }, { type: 'move', seat: seat.id, from: 1, to: 7 }];
    } else if (animDemo === 'ladder' && ladderFrom) {
      evs = [{ type: 'move', seat: seat.id, from: 1, to: Number(ladderFrom) },
             { type: 'ladder', seat: seat.id, from: Number(ladderFrom), to: board.ladders[ladderFrom] }];
    } else if (animDemo === 'snake' && snakeFrom) {
      evs = [{ type: 'move', seat: seat.id, from: 1, to: Number(snakeFrom) },
             { type: 'snake', seat: seat.id, from: Number(snakeFrom), to: board.snakes[snakeFrom] }];
    } else if (animDemo === 'bump' && matchRef.current.seats[1]) {
      const other = matchRef.current.seats[1];
      evs = [{ type: 'move', seat: other.id, from: 1, to: 24 },
             { type: 'bump', seat: other.id, by: seat.id, from: 24, to: Math.max(1, 24 - SNL_BUMP) }];
    }
    if (!evs) return;
    animDemoRef.current = true;
    queueRef.current = evs;
    setBusy(true);
    pump();
  }, [animDemo, over]);

  // Bots roll for themselves once the animation queue drains. The scripted
  // ?snlanim demo holds them still so the recorded frame stays the one asked for.
  useEffect(() => {
    if (busy || over || animDemo) return;
    const seat = match.seats.find((s) => s.id === match.turnSeat);
    if (!seat || seat.kind !== 'bot') return;
    const t = setTimeout(() => doRoll(), 620);
    return () => clearTimeout(t);
  }, [busy, over, match.turnSeat, match.turnNo]);

  // Report the result once the last event has played out.
  useEffect(() => {
    if (!over || busy || winSentRef.current) return;
    winSentRef.current = true;
    const st = snlStandings(matchRef.current);
    const you = matchRef.current.seats[0];
    const place = you.place || st.length;
    const won = place === 1;
    const base = won
      ? Math.max(60, 320 - you.rolls * 5)
      : Math.max(15, 150 - (place - 1) * 30 - you.rolls * 2);
    const label = won ? (you.name + ' wins! 🎉') : ('Finished #' + place + ' of ' + st.length);
    const share = '🐍🪜 Snakes & Ladders (' + board.name + ') — '
      + (won ? 'won' : '#' + place) + ' of ' + st.length + ' in ' + you.rolls + ' rolls!';
    /* onResult owns progression + RP; it hands back the RP delta so the one
       shell-owned win card can show it. `practice` short-circuits it entirely
       (the inert replay path must never move a record). */
    const res = (!practice && onResult)
      ? onResult({ standings: st, place, players: st.length, board, match: matchRef.current })
      : null;
    onWin(base, stepsRef.current, secsRef.current, {
      winner: won ? 1 : 0, winnerLabel: label, share,
      standings: st.map((s) => ({
        id: s.id, place: s.rank, name: s.name, bot: s.kind === 'bot',
        color: snlSeatColor(s.colorIdx).hex, rolls: s.rolls, pos: s.pos,
      })),
      rankDelta: res && Number.isFinite(res.rankDelta) ? res.rankDelta : undefined,
      rankTier: res && res.tierName ? res.tierName : undefined,
    });
  }, [over, busy]);

  const cur = match.seats.find((s) => s.id === match.turnSeat) || null;
  const curColor = cur ? snlSeatColor(cur.colorIdx).hex : PAL.muted;
  const yourTurn = !!cur && cur.kind === 'human';
  const seatRows = match.seats.length > 3 ? 2 : 1;
  const statusH = 46 + (seatRows * 42) + 46;

  return (
    <div className="snl-match" data-snl-mode={match.mode} data-snl-board={board.id}
      data-snl-seats={match.seats.length} data-snl-anim={animDemo || undefined}>
      <CuiBar height={statusH} build={(W) => {
        const top = cuiRow(0, 0, W, 42, 3);
        const out = [
          { id: 's-time', kind: 'pill', r: top[0], label: 'Time', value: fmt, gold: true },
          { id: 's-turn', kind: 'pill', r: top[1], label: over ? 'Result' : 'Turn',
            value: over ? 'Finished' : (cur ? cur.name : '—'), color: curColor },
          { id: 's-board', kind: 'pill', r: top[2],
            label: match.mode === 'ranked' ? 'Ranked' : 'Board', value: board.name },
        ];
        const perRow = Math.ceil(match.seats.length / seatRows);
        match.seats.forEach((s, i) => {
          const row = Math.floor(i / perRow);
          const cols = cuiRow(0, 46 + row * 42, W, 38, Math.min(perRow, match.seats.length - row * perRow));
          const r = cols[i - row * perRow];
          if (!r) return;
          out.push({
            id: 'seat-' + s.id, kind: 'pill', r,
            label: (s.kind === 'bot' ? '🤖 ' : '') + s.name,
            value: s.place ? '#' + s.place : String(s.pos),
            color: snlSeatColor(s.colorIdx).hex,
          });
        });
        out.push({ id: 'skin', kind: 'button',
          r: [Math.floor(W * 0.2), 46 + seatRows * 42, Math.floor(W * 0.6), 38],
          label: SK.icon + ' ' + SK.label, font: 12, action: cycleSkin });
        return out;
      }} />

      <CuiBar height={30} build={(W) => ([{
        id: 'banner', kind: 'label', r: [0, 0, W, 28], font: 13, bold: true,
        color: over ? PAL.gold : curColor,
        label: banner || (over ? 'Match complete' : (cur ? cur.name + "'s turn" : '')),
      }])} />

      <div className="cnl-board-wrap">
        <SnlBoardCanvas board={board} skin={SK} seats={match.seats} frameRef={frameRef}
          animating={busy} redrawKey={redrawKey} onFrame={onFrame} />
      </div>

      <CuiBar height={54} build={(W) => {
        const bw = Math.min(200, Math.floor(W * 0.44));
        return [
          { id: 'die', kind: 'button', r: [Math.floor(W / 2) - 24, 3, 48, 48],
            label: die == null ? '·' : String(die),
            twinLabel: die == null ? 'Die not yet rolled' : 'Die showing ' + die,
            pips: die == null ? null : CNL_DIE_PIPS[die], font: 20, mono: true, disabled: true },
          { id: 'roll', kind: 'button', r: [4, 7, bw, 40],
            label: over ? 'Match over' : (yourTurn ? 'Roll — ' + (cur ? cur.name : '') : 'Bot rolling…'),
            solid: yourTurn && !over && !busy,
            bg: yourTurn && !over ? curColor : undefined,
            ink: yourTurn && !over ? '#fff' : undefined,
            disabled: over || busy || rolling || !yourTurn, action: doRoll },
          { id: 'exit', kind: 'button', r: [W - Math.floor(W * 0.3) - 4, 7, Math.floor(W * 0.3), 40],
            label: over ? 'New match' : 'Lobby', font: 12, action: () => onExit && onExit() },
        ];
      }} />
    </div>
  );
}

// Online Chutes & Ladders over classic_rooms. Server owns the dice; the client
// just sends a "roll" and renders the polled room state.
function ChutesLaddersOnlineGame({ onWin, onStepChange, roomId, myPlayerNum, onGlossary }) {
  const { room, pollingError, opponentDisconnected, submitMove } = useClassicRoom('chutes-ladders', roomId);
  const winCalledRef = useRef(false);
  const { secs, fmt } = useTimer(!!(room && room.status === 'active'));
  const secsRef = useRef(0); secsRef.current = secs;
  const movesRef = useRef(0);
  const [skin, setSkin] = useCnlSkin();
  const cycleSkin = () => {
    const ids = Object.keys(CNL_SKINS);
    setSkin(ids[(ids.indexOf(skin) + 1) % ids.length]);
  };

  useEffect(() => {
    if (!room || room.status !== 'finished' || winCalledRef.current) return;
    winCalledRef.current = true;
    const youWin = room.winner === String(myPlayerNum);
    const rolls = (room.state && room.state.rolls) || 0;
    const score = youWin ? Math.max(50, 300 - rolls * 5) : 0;
    const share = `🪜 Snakes & Ladders Online — ${youWin ? 'I won' : 'good game'} in ${rolls} rolls!`;
    onWin(score, movesRef.current, secsRef.current, { winnerLabel: youWin ? 'You win! 🎉' : 'Opponent wins', share });
  }, [room && room.status]);

  if (!room && !pollingError) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="mnc-spinner" style={{ margin: '0 auto 0.75rem' }} /><div style={{ color: C.muted, fontSize: '0.85rem' }}>Connecting…</div></div>;
  }
  if (pollingError === 'room_not_found') {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: C.rose }}>Room not found.</div>;
  }

  const status = room ? room.status : 'waiting';
  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ color: C.muted, marginBottom: '0.6rem', fontSize: '0.85rem' }}>Waiting for opponent to join…</div>
        <div className="mnc-room-code">{roomId}</div>
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.4rem' }}>Share this room code</div>
        <div className="mnc-spinner" style={{ margin: '1rem auto 0' }} />
      </div>
    );
  }

  const st = room.state || {};
  // The board style lives on the ROOM (the creator picked it), so the joining
  // player renders whatever board they actually joined.
  const vkey = cnlVariant(st.variant);
  const V = CNL_VARIANTS[vkey];
  const isMoksha = vkey === 'moksha';
  const SK = CNL_SKINS[isMoksha ? 'plain' : skin];
  const cur = st.currentPlayer || 1;
  const isMyTurn = status === 'active' && cur === myPlayerNum;
  const p1Color = C.accent, p2Color = C.violet;
  const myColor = myPlayerNum === 1 ? p1Color : p2Color;
  const myToken = myPlayerNum === 1 ? 'accent' : 'violet';

  const doRoll = () => {
    if (!isMyTurn) return;
    movesRef.current += 1; onStepChange && onStepChange(movesRef.current);
    submitMove({ type: 'roll' });
  };

  const turnLabel = status === 'finished'
    ? (room.winner === String(myPlayerNum) ? 'You win! 🎉' : 'Opponent wins')
    : isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div>
      <CuiBar height={(opponentDisconnected ? 20 : 0) + 96} build={(W) => {
        const pr = cuiRow(0, 0, W, 46, 4);
        const out = [
          { id: 'p-time', kind: 'pill', r: pr[0], label: 'Time', value: fmt, gold: true },
          { id: 'p-turn', kind: 'pill', r: pr[1], label: 'Turn', value: turnLabel, color: isMyTurn ? palOf(myColor, undefined) : PAL.muted },
          { id: 'p-you', kind: 'pill', r: pr[2], label: 'You', value: myPlayerNum === 1 ? (st.p1Pos || 0) : (st.p2Pos || 0), color: palOf(myColor, undefined) },
          { id: 'p-conn', kind: 'pill', r: pr[3], label: 'Online', value: '●', color: opponentDisconnected ? PAL.gold : PAL.emerald },
        ];
        let y = 50;
        if (isMoksha) { out.push({ id: 'glossary', kind: 'button', r: [Math.floor(W * 0.2), y, Math.floor(W * 0.6), 40], label: '📖 What do these mean?', font: 12, action: onGlossary }); y += 46; }
        else { out.push({ id: 'skin', kind: 'button', r: [Math.floor(W * 0.2), y, Math.floor(W * 0.6), 40], label: `${SK.icon} ${SK.label}`, font: 12, action: cycleSkin }); y += 46; }
        if (opponentDisconnected) out.push({ id: 'disc', kind: 'label', r: [0, y, W, 18], label: 'Opponent connection lost — waiting for reconnect…', gold: true, font: 12 });
        return out;
      }} />
      <div className="cnl-board-wrap">
        <CnlBoardCanvas V={V} isMoksha={isMoksha} SK={SK} p1Pos={st.p1Pos || 0} p2Pos={st.p2Pos || 0} p1Color={p1Color} p2Color={p2Color} p2Glyph={'2'} />
      </div>
      <CuiBar height={54} build={(W) => ([
        { id: 'die', kind: 'button', r: [Math.floor(W / 2) - 24, 3, 48, 48], label: st.die == null ? '·' : String(st.die), twinLabel: st.die == null ? 'Die not yet rolled' : `Die showing ${st.die}`, pips: st.die == null ? null : CNL_DIE_PIPS[st.die], font: 20, mono: true, disabled: true },
        { id: 'roll', kind: 'button', r: [W - Math.floor(W * 0.34) - 4, 7, Math.floor(W * 0.34), 40],
          label: status === 'finished' ? 'Game over' : isMyTurn ? 'Roll' : 'Waiting…',
          solid: isMyTurn, bg: isMyTurn ? palOf(myColor, undefined) : undefined, ink: isMyTurn ? '#fff' : undefined,
          disabled: !isMyTurn, action: doRoll },
      ])} />
    </div>
  );
}

const CNL_STREAK_KEY = 'puzzlechain_cnl_streak';

// Chutes & Ladders wrapper — picks a mode (2P / Versus Bot / Online) and
// delegates. Honors the Game Menu's gameMode/gameModeOpts props.