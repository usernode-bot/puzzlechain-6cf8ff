#!/usr/bin/env node
/*
 * Cross-file registry check (#176).
 *
 * The client (public/src/29-cards.jsx, public/src/28-registry.jsx) and the
 * server (server.js) each hold a statement about what every game is, and the
 * two have to agree. Historically that agreement was maintained by hand and
 * documented in a comment — "keep the two in sync" — which is exactly the kind
 * of invariant this repo has repeatedly discovered was silently broken (a game
 * in GAMES but not GAME_IDS just fails to start; a mode declared on the client
 * with no server story-band count pays zero and looks like a server bug).
 *
 * So it is checked, at build time, rather than asked for politely:
 *
 *   1. The registry id sets match exactly.
 *   2. Every id declaring a 'daily' play mode is in the server's GAME_IDS
 *      (which is what the daily routes validate against), and vice versa.
 *   3. Every id declaring 'story' has a STORY_BANDS rung count, and vice versa
 *      — a ladder with no rungs is unfinishable, and rungs on a game with no
 *      ladder are unreachable points.
 *   4. Nothing declares a mode that does not exist.
 *
 * The tables are extracted by slicing the object literals out of the sources
 * and evaluating them. That is deliberate: parsing them means this check sees
 * what the code actually says, not a third copy of the same claim.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Slice `const NAME = { ... };` out of a source and evaluate the literal. The
// object literals here are data (no calls, no references), so a bare eval of
// the slice is enough and avoids depending on a parser.
function literal(src, name, file) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) fail(`${file}: could not find \`const ${name} = {\``);
  const open = src.indexOf('{', start);
  let depth = 0, end = -1;
  let inStr = null, inLine = false, inBlock = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) fail(`${file}: unbalanced braces in ${name}`);
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(open, end + 1) + ')');
}

const problems = [];
function fail(msg) { problems.push(msg); }

const cards = fs.readFileSync(path.join(ROOT, 'public/src/29-cards.jsx'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'public/src/28-registry.jsx'), 'utf8');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

const PLAY_MODES = literal(cards, 'PLAY_MODES', '29-cards.jsx');
const PLAY_MODES_BY_ID = literal(cards, 'PLAY_MODES_BY_ID', '29-cards.jsx');
const GAME_REGISTRY = literal(server, 'GAME_REGISTRY', 'server.js');
const STORY_BANDS = literal(server, 'STORY_BANDS', 'server.js');

// Client registry ids: `id: '...'` entries in the GAMES array.
const clientIds = new Set();
for (const m of registry.matchAll(/^\s{4}id:\s*'([^']+)'/gm)) clientIds.add(m[1]);
if (!clientIds.size) fail('28-registry.jsx: found no `id:` entries — has GAMES moved?');

const serverIds = new Set(Object.keys(GAME_REGISTRY));
const dailyIds = new Set(Object.keys(GAME_REGISTRY).filter(
  id => GAME_REGISTRY[id].category === 'daily' || GAME_REGISTRY[id].dailyMode));

const diff = (a, b) => [...a].filter(x => !b.has(x)).sort();

// 1. id sets
for (const id of diff(clientIds, serverIds)) fail(`${id}: in the client GAMES array but not in server GAME_REGISTRY`);
for (const id of diff(serverIds, clientIds)) fail(`${id}: in server GAME_REGISTRY but not in the client GAMES array`);

// 4. every declared mode exists, and every registry entry has an opinion
const modeNames = new Set(Object.keys(PLAY_MODES));
for (const [id, modes] of Object.entries(PLAY_MODES_BY_ID)) {
  if (!clientIds.has(id)) fail(`${id}: PLAY_MODES_BY_ID names a game that is not in GAMES`);
  for (const m of modes) if (!modeNames.has(m)) fail(`${id}: declares unknown play mode '${m}'`);
}
for (const id of clientIds) {
  if (!Object.prototype.hasOwnProperty.call(PLAY_MODES_BY_ID, id)) {
    fail(`${id}: missing from PLAY_MODES_BY_ID — every game must say what it offers, even if that is nothing`);
  }
}

const declares = (mode) => new Set(
  Object.keys(PLAY_MODES_BY_ID).filter(id => PLAY_MODES_BY_ID[id].indexOf(mode) !== -1));

// 2. daily modes <-> the set the daily routes validate against
const clientDaily = declares('daily');
for (const id of diff(clientDaily, dailyIds)) {
  fail(`${id}: declares a 'daily' play mode, but server GAME_IDS excludes it — ` +
       `/api/daily/${id}/start would 400. Add \`dailyMode: true\` to its GAME_REGISTRY row.`);
}
for (const id of diff(dailyIds, clientDaily)) {
  fail(`${id}: server treats it as a daily (category 'daily' or dailyMode), but the client declares no 'daily' mode`);
}

// 3. story ladders <-> rung counts
const clientStory = declares('story');
const bandIds = new Set(Object.keys(STORY_BANDS));
for (const id of diff(clientStory, bandIds)) fail(`${id}: declares a 'story' mode with no STORY_BANDS rung count — the ladder has no rungs`);
for (const id of diff(bandIds, clientStory)) fail(`${id}: has STORY_BANDS rungs but declares no 'story' mode — the points are unreachable`);
for (const [id, n] of Object.entries(STORY_BANDS)) {
  if (!Number.isInteger(n) || n < 1) fail(`${id}: STORY_BANDS must be a positive integer, got ${n}`);
}

if (problems.length) {
  console.error('[check-registry] client and server registries disagree:\n  ' + problems.join('\n  '));
  process.exit(1);
}
const modeCount = Object.values(PLAY_MODES_BY_ID).reduce((a, m) => a + m.length, 0);
console.log(`[check-registry] ${clientIds.size} games, ${modeCount} play modes, ` +
  `${dailyIds.size} dailies, ${bandIds.size} story ladders — client and server agree ✓`);
