/* ============================================================
   Home cards + the play-mode axis (#176)
   ============================================================
   Request #176 asked every game to offer, "as relevant", three ways to play:

     daily   — one seeded deal a day, ranked, everyone gets the same one
     story   — a progression that gets harder and that you can check off
     arcade  — generated live, endless, different every run

   THE MODEL. A play mode is a property of a CARD, not of a registry entry.
   That distinction is what keeps this cheap:

     - Registry ids never move. `daily_attempts`, `classic_scores`, chat,
       leaderboards, badges and every deep link key off them, so the four
       games that ship as two ids (Snake / Daily Snake, Bounce / Daily Bounce,
       Tile Match / Daily Tile Match, Mine Finder / Mine Finder Classic) keep
       BOTH ids and merge only here, on the card. Nothing migrates.
     - A card is one game as a player thinks of it. Its `modes` list says
       which buttons it shows and which registry id + play mode each launches.

   This generalises #146's dual-mode pairing, which hard-coded exactly two
   buttons (`regular` and `daily`). The shape is now an ordered list, so a card
   can carry one, two or three of them.

   STORY RUNGS ARE DIFFICULTY BANDS, NOT LEVELS. Ladder lengths differ wildly
   by game — Tile Match generates 1000 levels, Mahjong has 6 layouts, Marble
   Loop has 3 paths — so paying per level would make one game worth a hundred
   times another for the same "finished the story" achievement. Banding
   normalises every game to 4–8 rungs, and bands are what a difficulty rating
   produces anyway, so the ladder falls out of work the rating already does.

   ARCADE BANDS ARE ALWAYS THREE, ALWAYS OPEN. Easy / Normal / Hard for every
   game, available from the start — no story gate. See ARCADE_BANDS below.
   ============================================================ */

// The three play modes, in display order. `blurb` is the pre-game screen's
// one-line promise for that mode (the daily one is the only one that can
// honestly say "everyone plays this exact deal").
const PLAY_MODES = {
  daily:  { label: 'Daily',  order: 0, blurb: 'Everyone plays this exact deal today. One attempt.' },
  story:  { label: 'Story',  order: 1, blurb: 'Clear a band to tick it off. Each one is harder than the last.' },
  arcade: { label: 'Arcade', order: 2, blurb: 'A fresh board every run. Beat your best to score.' },
};
const PLAY_MODE_IDS = Object.keys(PLAY_MODES).sort((a, b) => PLAY_MODES[a].order - PLAY_MODES[b].order);
const isPlayMode = (m) => Object.prototype.hasOwnProperty.call(PLAY_MODES, m);

/* Arcade difficulty bands. THREE for every game, deliberately coarser than a
   story ladder: story's granularity is progression, arcade's is a selector and
   has to fit in a row. All three are open from the first run — a player who
   picks Hard on a game they have never played gets a hard board, which is why
   the picker marks the band matching their story progress as "recommended"
   rather than locking the others. Steering, not gating. */
const ARCADE_BANDS = [
  { id: 'easy',   label: 'Easy',   t: 0.15 },
  { id: 'normal', label: 'Normal', t: 0.50 },
  { id: 'hard',   label: 'Hard',   t: 0.85 },
];
const ARCADE_BAND_IDS = ARCADE_BANDS.map(b => b.id);
const arcadeBand = (id) => ARCADE_BANDS.find(b => b.id === id) || ARCADE_BANDS[1];

/* Which play modes each registry id offers. THE #176 DECLARATION TABLE — this
   is the single place that says what a game supports, and the home grid, the
   pre-game screen, the deep links and the self-tests all read it.

   Omissions are deliberate, not gaps:
     - Nonogram and Crate Push skip arcade: their content is authored or
       generated offline in bounded quantity, so endless play would exhaust it.
     - Drop Stack, Word Sprint, Snake, 2048 and Block Fit skip story: they are
       score-attack games and rungs fit them badly.
     - The seven head-to-head board games appear here with no modes at all.
       Their axis is opponent (bot / pass-and-play / online), not this one. */
const PLAY_MODES_BY_ID = {
  // Dailies that also gain a ladder and endless play
  sudoku:            ['daily', 'story', 'arcade'],
  sudokumini:        ['daily', 'story', 'arcade'],
  wordhunt:          ['daily', 'story', 'arcade'],
  cryptowordle:      ['daily', 'story', 'arcade'],
  klondike:          ['daily', 'story', 'arcade'],
  spider:            ['daily', 'story', 'arcade'],
  mahjongsol:        ['daily', 'story', 'arcade'],
  anagrams:          ['daily', 'story', 'arcade'],
  nonogram:          ['daily', 'story'],
  cratepush:         ['daily', 'story'],
  dropstack:         ['daily', 'arcade'],
  wordsprint:        ['daily', 'arcade'],

  // Merged pairs — the daily id carries only the daily; its free-play twin
  // carries the rest. Both keep their own registry id.
  tilematchingdaily: ['daily'],
  tilematching:      ['story', 'arcade'],
  minefinder:        ['daily', 'story'],
  minesweeper:       ['arcade'],
  snakedaily:        ['daily'],
  snake:             ['arcade'],
  bouncedaily:       ['daily'],
  bounce:            ['story', 'arcade'],

  // Classics gaining modes for the first time
  '2048':            ['daily', 'arcade'],
  blockblast:        ['daily', 'arcade'],
  diamondrush:       ['daily', 'story', 'arcade'],
  zuma:              ['daily', 'story', 'arcade'],
  hashrush:          ['daily', 'story', 'arcade'],
  match3:            ['daily', 'story', 'arcade'],
  'knights-tour':    ['daily', 'story', 'arcade'],

  // Head-to-head: opponent is the axis, so no play modes.
  mancala:           [],
  'chutes-ladders':  [],
  checkers:          [],
  reversi:           [],
  fourinarow:        [],
  gomoku:            [],
  ludo:              [],
};

const playModesFor = (gameId) => PLAY_MODES_BY_ID[gameId] || [];
const supportsMode = (gameId, mode) => playModesFor(gameId).indexOf(mode) !== -1;

/* The mode a game opens in when nobody said which — a bare `?game=` link, a
   resumed attempt, a practice replay.

   A DAILY REGISTRY ENTRY opens on its daily; EVERYTHING ELSE opens on free
   play (null), even when it declares modes. That asymmetry is the point: a
   classic's identity is its free play, and #176 hung modes off it rather than
   replacing it. Returning the first declared mode instead — which this did at
   first — quietly repointed every existing `?game=snake` / `?game=2048` /
   `?game=match3` share link at a mode-selection screen the sender never saw,
   and left ten of the app's own checks looking at a pre-game card where a
   board used to be. `?pmode=` is how you ask for a mode. */
function defaultPlayMode(game) {
  if (!game) return null;
  if (game.daily && supportsMode(game.id, 'daily')) return 'daily';
  return null;
}

/* The four cards that merge two registry ids. Everything else gets a card
   derived straight from its registry entry, so this table only carries the
   genuinely irregular cases. Captions are per-card copy, not per-mode
   boilerplate: "20 apples" says more than "one try". */
const MERGED_CARDS = [
  {
    key: 'card:tilematch',
    name: 'Tile Match Puzzle',
    icon: '🀄',
    tag: 'Puzzle',
    tagColor: GA.violet,
    // The blurb LEADS with the variant name ("Daily Tile Match Puzzle"):
    // a merged dapp.json test asserts it renders on the lobby card, and the
    // mode buttons say "Daily", not the variant's full name.
    desc: 'Daily Tile Match Puzzle or free play — clear layered boards three of a kind.',
    modes: [
      { mode: 'daily',  gameId: 'tilematchingdaily', caption: 'One try' },
      { mode: 'story',  gameId: 'tilematching',      caption: '10 bands' },
      { mode: 'arcade', gameId: 'tilematching',      caption: 'Endless chain' },
    ],
  },
  {
    key: 'card:minefinder',
    name: 'Mine Finder',
    icon: '💣',
    tag: 'Risk',
    tagColor: GA.coral,
    // Leads with "Mine Finder Classic" for the same reason — see the
    // Tile Match card above.
    desc: 'Mine Finder Classic or the daily field — sweep with the numbers.',
    modes: [
      { mode: 'daily',  gameId: 'minefinder',  caption: 'One run' },
      { mode: 'story',  gameId: 'minefinder',  caption: 'Bigger fields' },
      { mode: 'arcade', gameId: 'minesweeper', caption: 'Lock In' },
    ],
  },
  {
    key: 'card:snake',
    name: 'Snake',
    icon: '🐍',
    tag: 'Arcade',
    tagColor: GA.lime,
    desc: "Steer, eat, grow — don't hit a wall or your own tail.",
    modes: [
      { mode: 'daily',  gameId: 'snakedaily', caption: '20 apples' },
      { mode: 'arcade', gameId: 'snake',      caption: 'Any speed' },
    ],
  },
  {
    key: 'card:bounce',
    name: 'Bounce',
    icon: '🧱',
    tag: 'Arcade',
    tagColor: GA.coral,
    desc: 'Smash every brick with a bouncing ball.',
    modes: [
      { mode: 'daily',  gameId: 'bouncedaily', caption: '3 balls' },
      { mode: 'story',  gameId: 'bounce',      caption: 'Wall by wall' },
      { mode: 'arcade', gameId: 'bounce',      caption: 'High score' },
    ],
  },
];

// Every registry id that a merged card speaks for, so the auto-derive pass
// below skips it instead of emitting a second card for the same game.
const MERGED_IDS = new Set();
for (const c of MERGED_CARDS) for (const m of c.modes) MERGED_IDS.add(m.gameId);

/* Assemble the ordered card list once, at load. A merged card is emitted at
   the position of the FIRST of its ids in GAMES, so the home grid keeps the
   registry's ordering rather than floating the merged ones to the top. */
function buildGameCards(games) {
  const out = [];
  const emitted = new Set();
  for (const g of games) {
    if (MERGED_IDS.has(g.id)) {
      const card = MERGED_CARDS.find(c => c.modes.some(m => m.gameId === g.id));
      if (card && !emitted.has(card.key)) { emitted.add(card.key); out.push(card); }
      continue;
    }
    const modes = playModesFor(g.id).map(mode => ({ mode, gameId: g.id, caption: null }));
    out.push({
      key: 'card:' + g.id,
      name: g.name,
      icon: g.icon,
      tag: g.tag,
      tagColor: g.tagColor,
      desc: g.desc,
      modes,          // [] for the head-to-head games — a plain, single-action card
      gameId: g.id,   // set only for unmerged cards; the plain-card tap target
    });
  }
  return out;
}

const GAME_CARDS = buildGameCards(GAMES);
const CARD_BY_GAME_ID = {};
for (const c of GAME_CARDS) for (const m of c.modes) CARD_BY_GAME_ID[m.gameId] = c;
for (const c of GAME_CARDS) if (c.gameId && !CARD_BY_GAME_ID[c.gameId]) CARD_BY_GAME_ID[c.gameId] = c;

// The daily id a card locks against, if any — drives the NEW TODAY / RESUME /
// PLAYED badge. Cards with no daily mode never show one.
const cardDailyId = (card) => {
  const d = card.modes.find(m => m.mode === 'daily');
  return d ? d.gameId : null;
};

/* ============================================================
   The card
   ============================================================
   One button per mode, or a single tap target when a card has no play modes
   (the head-to-head games, whose axis is the opponent picker inside the game).
   ============================================================ */
function GameCard({ card, attempts, bests, storyProgress, loading, onPlay }) {
  const dailyId = cardDailyId(card);
  const attempt = dailyId ? attempts[dailyId] : null;
  const finished = !!(attempt && attempt.finishedAt);
  const inProgress = !!(attempt && !attempt.finishedAt);

  // State line, per recommendation 04: the card reports where you stand
  // instead of spending its width on buttons that repeat the mode labels.
  const bits = [];
  if (dailyId) bits.push(finished ? 'Daily ✓' : inProgress ? 'Daily ▶' : 'Daily · new');
  const storyMode = card.modes.find(m => m.mode === 'story');
  if (storyMode) {
    const p = (storyProgress && storyProgress[storyMode.gameId]) || null;
    if (p && p.total) bits.push(`Story ${p.cleared}/${p.total}`);
    else bits.push('Story');
  }

  if (!card.modes.length) {
    return (
      <div className="card" style={{ '--accent': card.tagColor }} role="group" aria-label={card.name}>
        <button
          className="card-plain-hit tappable"
          aria-label={card.name}
          {...tapProps(() => { if (!loading) onPlay(card.gameId, null); })}
        >
          <div className="card-icon">{card.icon}</div>
          <div className="card-name">{card.name}</div>
          <div className="card-desc">{card.desc}</div>
          <span className="tag mono" style={{ background: card.tagColor + '22', color: card.tagColor }}>
            {card.tag}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="card paired" style={{ '--accent': card.tagColor }} role="group" aria-label={card.name}>
      {dailyId && (
        <span className={'card-daily-badge' + (finished ? ' done' : inProgress ? ' resume' : ' fresh')}>
          {finished ? '✓ PLAYED' : inProgress ? '▶ RESUME' : 'NEW TODAY'}
        </span>
      )}
      <div className="card-icon">{card.icon}</div>
      <div className="card-name">{card.name}</div>
      <div className="card-desc">{card.desc}</div>
      <span className="tag mono" style={{ background: card.tagColor + '22', color: card.tagColor }}>
        {card.tag}
      </span>
      {bits.length > 0 && <div className="card-state mono">{bits.join(' · ')}</div>}
      <div className={'card-modes n' + card.modes.length}>
        {card.modes.map(m => {
          const isDaily = m.mode === 'daily';
          const state = isDaily ? (finished ? 'done' : inProgress ? 'resume' : 'fresh') : '';
          const label = PLAY_MODES[m.mode].label;
          const caption = m.caption
            || (isDaily ? (finished ? 'Played' : inProgress ? 'Resume' : 'One try') : null)
            || (m.mode === 'story' ? 'Ladder' : 'Endless');
          return (
            <button
              key={m.mode}
              className={`card-mode-btn tappable ${m.mode} ${state}`}
              aria-label={`${card.name} — ${label}`}
              {...tapProps(() => { if (!loading) onPlay(m.gameId, m.mode); })}
            >
              <span className="cmb-label">{label}</span>
              <span className="cmb-caption">{caption}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
