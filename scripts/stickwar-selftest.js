#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sw = require('../lib/stickwar-engine');

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`✓ ${name}\n`);
  } catch (err) {
    process.stderr.write(`✗ ${name}\n${err.stack || err}\n`);
    process.exitCode = 1;
  }
}

test('campaign saves are sanitized and cannot mint upgrade stars', () => {
  assert.deepEqual(sw.sanitizeCampaign('{bad json'), sw.defaultCampaign());
  const save = sw.sanitizeCampaign({
    highestUnlocked: 99,
    starsEarned: 2,
    starsSpent: 99,
    upgrades: { economy: 3, statue: 3, infantry: 3, ranged: 3, injected: 3 },
    bestScores: { 1: 1234.6, 2: -8, 8: 9000 },
  });
  assert.equal(save.highestUnlocked, 6);
  assert.equal(save.starsEarned, 2);
  assert.equal(save.starsSpent, 2);
  assert.equal(Object.values(save.upgrades).reduce((a, b) => a + b, 0), 2);
  assert.deepEqual(save.bestScores, { 1: 1235 });
});

test('mission clears unlock once, award one star, and retain the best score', () => {
  let campaign = sw.defaultCampaign();
  campaign = sw.completeMission(campaign, 1, 1200);
  assert.equal(campaign.highestUnlocked, 2);
  assert.equal(campaign.starsEarned, 1);
  campaign = sw.completeMission(campaign, 1, 900);
  assert.equal(campaign.starsEarned, 1);
  assert.equal(campaign.bestScores[1], 1200);
  campaign = sw.completeMission(campaign, 2, 2200);
  const purchase = sw.buyUpgrade(campaign, 'economy');
  assert.equal(purchase.ok, true);
  assert.equal(purchase.campaign.upgrades.economy, 1);
  assert.equal(purchase.campaign.starsSpent, 1);
});

test('the same seed and commands replay byte-for-byte', () => {
  const a = sw.createState({ mission: 4, seed: 424242 });
  const b = sw.createState({ mission: 4, seed: 424242 });
  for (const state of [a, b]) {
    state.gold.player = 1200;
    assert.equal(sw.queueUnit(state, 'player', 'swordsman').ok, true);
    assert.equal(sw.queueUnit(state, 'player', 'archer').ok, true);
  }
  for (let tick = 0; tick < 1400; tick++) {
    if (tick === 120) { sw.setCommand(a, 'attack'); sw.setCommand(b, 'attack'); }
    if (tick === 360) { sw.queueUnit(a, 'player', 'spear'); sw.queueUnit(b, 'player', 'spear'); }
    sw.step(a); sw.step(b);
  }
  assert.equal(sw.stableSnapshot(a), sw.stableSnapshot(b));
});

test('miners travel, work, return, and deposit gold', () => {
  const state = sw.createState({ mission: 1, seed: 10, disableAi: true });
  const initial = state.gold.player;
  sw.stepMany(state, 500);
  assert.ok(state.gold.player > initial, `${state.gold.player} should exceed ${initial}`);
  assert.ok(state.stats.playerGoldMined >= 100);
});

test('training enforces unlocks, affordability, queue size, and population', () => {
  const early = sw.createState({ mission: 1, disableAi: true });
  assert.equal(sw.queueUnit(early, 'player', 'giant').reason, 'Unit is locked');
  early.gold.player = 0;
  assert.equal(sw.queueUnit(early, 'player', 'swordsman').reason, 'Not enough gold');

  const state = sw.createState({ mission: 5, disableAi: true });
  state.gold.player = 5000;
  assert.equal(sw.queueUnit(state, 'player', 'giant').ok, true);
  sw.stepMany(state, Math.ceil(sw.UNIT_TYPES.giant.trainSecs * sw.TICKS_PER_SECOND) + 1);
  assert.ok(state.units.some((unit) => unit.team === 'player' && unit.type === 'giant'));
  state.populationCap = sw.population(state, 'player', true);
  assert.equal(sw.queueUnit(state, 'player', 'swordsman').reason, 'Population cap reached');
});

test('melee and ranged units acquire targets and apply damage', () => {
  const melee = sw.createState({ mission: 3, seed: 1, disableAi: true });
  melee.units = [];
  const sword = sw.debugSpawn(melee, 'player', 'swordsman', 760);
  const enemy = sw.debugSpawn(melee, 'enemy', 'swordsman', 805);
  melee.command = 'attack'; melee.enemyCommand = 'attack';
  const hp = enemy.hp;
  sw.stepMany(melee, 40);
  assert.ok(enemy.hp < hp || !melee.units.includes(enemy));
  assert.ok(sword.hp < sword.maxHp || !melee.units.includes(sword));

  const ranged = sw.createState({ mission: 3, seed: 2, disableAi: true });
  ranged.units = [];
  sw.debugSpawn(ranged, 'player', 'archer', 650);
  const target = sw.debugSpawn(ranged, 'enemy', 'spear', 820);
  ranged.command = 'attack'; ranged.enemyCommand = 'hold';
  const targetHp = target.hp;
  sw.stepMany(ranged, 45);
  assert.ok(target.hp < targetHp);
});

test('army commands and direct control move a selected unit', () => {
  const state = sw.createState({ mission: 3, seed: 5, disableAi: true });
  const unit = sw.debugSpawn(state, 'player', 'spear', 500);
  const actions = state.stats.actions;
  assert.equal(sw.setCommand(state, 'attack'), true);
  assert.equal(sw.selectUnit(state, unit.id), true);
  assert.equal(sw.setDirectInput(state, { right: true }), true);
  const x = unit.x;
  sw.stepMany(state, 20);
  assert.ok(unit.x > x);
  sw.setDirectInput(state, { right: false, attack: true });
  assert.ok(state.stats.actions >= actions + 3);
  assert.equal(sw.selectUnit(state, null), true);
  assert.equal(state.direct.unitId, null);
});

test('enemy AI funds a queue and eventually orders an attack', () => {
  const state = sw.createState({ mission: 3, seed: 99 });
  sw.stepMany(state, 1300);
  assert.ok(state.stats.enemyGoldMined > 0);
  assert.ok(state.units.some((unit) => unit.team === 'enemy' && unit.type !== 'miner')
    || state.queues.enemy.length > 0);
  assert.equal(state.enemyCommand, 'attack');
});

test('statue destruction produces stable win/loss phases and scores', () => {
  const win = sw.createState({ mission: 2, disableAi: true });
  sw.damageStatue(win, 'enemy', win.statues.enemy.maxHp + 1);
  assert.equal(win.phase, 'won');
  assert.ok(sw.calculateScore(win, true) > 0);
  const frozen = sw.stableSnapshot(win);
  sw.stepMany(win, 20);
  assert.equal(sw.stableSnapshot(win), frozen);

  const loss = sw.createState({ mission: 2, disableAi: true });
  sw.damageStatue(loss, 'player', loss.statues.player.maxHp + 1);
  assert.equal(loss.phase, 'lost');
  assert.ok(sw.calculateScore(loss, false) >= 0);
});

test('browser, server, scoring, loader, and staging manifests stay wired together', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'public', 'app.jsx'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dapp.json'), 'utf8'));
  const clientStart = app.indexOf("id: 'stickwar'");
  assert.ok(clientStart >= 0, 'client registry is missing stickwar');
  const clientBlock = app.slice(clientStart, clientStart + 2200);
  assert.match(clientBlock, /category: 'classic',[\s\S]{0,120}shell: 'self'/);
  assert.match(clientBlock, /sessionLength: 'long',[\s\S]{0,100}input: 'tap'/);
  assert.match(clientBlock, /component: StickWarGame/);
  assert.match(server, /stickwar:\s+\{ name: 'Stick War: Legacy', category: 'classic', tier: 'B',[\s\S]{0,250}sessionLength: 'long',[\s\S]{0,100}input: 'tap'/);
  assert.match(server, /CLASSIC_SCORE_GAME_IDS[^\n]+stickwar/);
  assert.match(server, /app\.get\('\/stickwar-engine\.js'/);
  assert.ok(html.indexOf('/stickwar-engine.js') >= 0);
  assert.ok(html.indexOf('/stickwar-engine.js') < html.indexOf('/app.js'));
  assert.ok(manifest.tests.some((row) => row.path === '/?tab=classic' && row.expectText === 'Stick War: Legacy'));
  assert.ok(manifest.tests.some((row) => row.path.includes('demo=stickwar') && row.expectText === 'Train a Miner'));
});

if (!process.exitCode) process.stdout.write('Stick War engine self-test passed.\n');
