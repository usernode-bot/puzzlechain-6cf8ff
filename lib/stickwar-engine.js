// ============================================================
// Stick War: Legacy — deterministic Game Corner battle engine
//
// Pure, DOM-free fixed-step simulation shared by the browser and Node
// self-tests. The UI owns drawing, input event plumbing, persistence and
// Game Corner callbacks; this module owns economy, training, AI and combat.
// ============================================================

(function () {
'use strict';

const TICK_MS = 50;
const TICKS_PER_SECOND = 1000 / TICK_MS;
const WORLD_WIDTH = 1600;
const POPULATION_CAP = 40;
const CAMPAIGN_VERSION = 1;
const CAMPAIGN_KEY = 'puzzlechain_stickwar_campaign_v1';
const HISTORY_KEY = 'puzzlechain_stickwar_history';
const COMMANDS = ['attack', 'hold', 'garrison'];
const UPGRADE_KEYS = ['economy', 'statue', 'infantry', 'ranged'];

const UNIT_TYPES = Object.freeze({
  miner: Object.freeze({
    name: 'Miner', icon: '⛏', role: 'worker', cost: 150, trainSecs: 2.5,
    pop: 1, hp: 76, damage: 4, range: 25, cooldown: 20, speed: 62,
    unlockMission: 1,
  }),
  swordsman: Object.freeze({
    name: 'Swordsman', icon: '⚔', role: 'infantry', cost: 125, trainSecs: 3,
    pop: 1, hp: 128, damage: 18, range: 34, cooldown: 13, speed: 78,
    unlockMission: 1,
  }),
  archer: Object.freeze({
    name: 'Archer', icon: '➶', role: 'ranged', cost: 300, trainSecs: 5,
    pop: 2, hp: 88, damage: 17, range: 260, cooldown: 24, speed: 61,
    projectileSpeed: 300, unlockMission: 2,
  }),
  spear: Object.freeze({
    name: 'Spear Guard', icon: '♜', role: 'infantry', cost: 500, trainSecs: 6,
    pop: 2, hp: 220, damage: 27, range: 52, cooldown: 20, speed: 54,
    unlockMission: 3,
  }),
  mage: Object.freeze({
    name: 'Mage', icon: '✦', role: 'ranged', cost: 1200, trainSecs: 8,
    pop: 3, hp: 124, damage: 38, range: 235, cooldown: 34, speed: 48,
    projectileSpeed: 235, splash: 72, unlockMission: 4,
  }),
  giant: Object.freeze({
    name: 'Giant', icon: '◆', role: 'infantry', cost: 1500, trainSecs: 12,
    pop: 4, hp: 560, damage: 62, range: 70, cooldown: 31, speed: 34,
    splash: 56, unlockMission: 5,
  }),
});

const MISSIONS = Object.freeze([
  Object.freeze({
    id: 1, name: 'First Stand', subtitle: 'Raise a small force and break the frontier statue.',
    enemyRoster: ['miner', 'swordsman'], enemyStartGold: 250,
    enemyIncome: 17, enemyTrainBias: 1.25, attackAt: 3, statueHp: 1250,
  }),
  Object.freeze({
    id: 2, name: 'Arrow Ridge', subtitle: 'Archers punish an army that advances without cover.',
    enemyRoster: ['miner', 'swordsman', 'archer'], enemyStartGold: 340,
    enemyIncome: 21, enemyTrainBias: 1.15, attackAt: 4, statueHp: 1450,
  }),
  Object.freeze({
    id: 3, name: 'The Long Guard', subtitle: 'Spear Guards anchor a tougher defensive line.',
    enemyRoster: ['miner', 'swordsman', 'archer', 'spear'], enemyStartGold: 430,
    enemyIncome: 25, enemyTrainBias: 1.05, attackAt: 5, statueHp: 1700,
  }),
  Object.freeze({
    id: 4, name: 'Ember Crossing', subtitle: 'Break a formation protected by battlefield mages.',
    enemyRoster: ['miner', 'swordsman', 'archer', 'spear', 'mage'], enemyStartGold: 540,
    enemyIncome: 30, enemyTrainBias: 0.95, attackAt: 6, statueHp: 1950,
  }),
  Object.freeze({
    id: 5, name: 'Giant Country', subtitle: 'Hold the line when the ground itself starts moving.',
    enemyRoster: ['miner', 'swordsman', 'archer', 'spear', 'giant'], enemyStartGold: 690,
    enemyIncome: 35, enemyTrainBias: 0.88, attackAt: 7, statueHp: 2250,
  }),
  Object.freeze({
    id: 6, name: 'Last Horizon', subtitle: 'Use every unit and command to defeat the full army.',
    enemyRoster: ['miner', 'swordsman', 'archer', 'spear', 'mage', 'giant'], enemyStartGold: 850,
    enemyIncome: 42, enemyTrainBias: 0.78, attackAt: 8, statueHp: 2600,
  }),
]);

const UPGRADES = Object.freeze({
  economy: Object.freeze({ name: 'Economy', icon: '⛏', description: '+12% miner speed and gold per level' }),
  statue: Object.freeze({ name: 'Statue', icon: '♜', description: '+15% statue health per level' }),
  infantry: Object.freeze({ name: 'Infantry', icon: '⚔', description: '+9% health and damage per level' }),
  ranged: Object.freeze({ name: 'Range & Magic', icon: '➶', description: '+11% ranged damage per level' }),
});

function clamp(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

function int(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function copyUpgrades(raw) {
  const out = {};
  for (const key of UPGRADE_KEYS) out[key] = int(raw && raw[key], 0, 3);
  return out;
}

function defaultCampaign() {
  return {
    version: CAMPAIGN_VERSION,
    highestUnlocked: 1,
    starsEarned: 0,
    starsSpent: 0,
    upgrades: { economy: 0, statue: 0, infantry: 0, ranged: 0 },
    bestScores: {},
  };
}

function sanitizeCampaign(raw) {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_) { value = null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultCampaign();
  const upgrades = copyUpgrades(value.upgrades);
  const starsEarned = int(value.starsEarned, 0, MISSIONS.length);
  let spent = UPGRADE_KEYS.reduce((sum, key) => sum + upgrades[key], 0);
  // A malformed save cannot manufacture more upgrade levels than earned stars.
  if (spent > starsEarned) {
    for (let i = UPGRADE_KEYS.length - 1; i >= 0 && spent > starsEarned; i--) {
      const key = UPGRADE_KEYS[i];
      const take = Math.min(upgrades[key], spent - starsEarned);
      upgrades[key] -= take;
      spent -= take;
    }
  }
  const bestScores = {};
  if (value.bestScores && typeof value.bestScores === 'object' && !Array.isArray(value.bestScores)) {
    for (let mission = 1; mission <= MISSIONS.length; mission++) {
      const score = Number(value.bestScores[mission]);
      if (Number.isFinite(score) && score >= 0) bestScores[mission] = Math.round(Math.min(score, 10000000));
    }
  }
  return {
    version: CAMPAIGN_VERSION,
    highestUnlocked: int(value.highestUnlocked, 1, MISSIONS.length),
    starsEarned,
    starsSpent: spent,
    upgrades,
    bestScores,
  };
}

function completeMission(campaign, missionId, score) {
  const next = sanitizeCampaign(campaign);
  const mission = int(missionId, 1, MISSIONS.length);
  if (mission > next.highestUnlocked) return next;
  if (!Object.prototype.hasOwnProperty.call(next.bestScores, mission)) {
    next.starsEarned = Math.min(MISSIONS.length, next.starsEarned + 1);
  }
  next.bestScores[mission] = Math.max(next.bestScores[mission] || 0, Math.max(0, Math.round(score || 0)));
  next.highestUnlocked = Math.max(next.highestUnlocked, Math.min(MISSIONS.length, mission + 1));
  return next;
}

function buyUpgrade(campaign, key) {
  const next = sanitizeCampaign(campaign);
  if (!UPGRADE_KEYS.includes(key)) return { campaign: next, ok: false, reason: 'Unknown upgrade' };
  if (next.upgrades[key] >= 3) return { campaign: next, ok: false, reason: 'Max level' };
  if (next.starsEarned - next.starsSpent < 1) return { campaign: next, ok: false, reason: 'Earn a mission star first' };
  next.upgrades[key] += 1;
  next.starsSpent += 1;
  return { campaign: next, ok: true, reason: null };
}

function unlockedUnitIds(missionId) {
  const mission = int(missionId, 1, MISSIONS.length);
  return Object.keys(UNIT_TYPES).filter((id) => UNIT_TYPES[id].unlockMission <= mission);
}

function nextRandom(state) {
  let a = state.rngState >>> 0;
  a = (a + 0x6D2B79F5) >>> 0;
  state.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function upgradeMultiplier(state, typeId, stat) {
  if (!state || !state.upgrades) return 1;
  const type = UNIT_TYPES[typeId];
  if (!type) return 1;
  if (stat === 'worker') return 1 + state.upgrades.economy * 0.12;
  if (type.role === 'infantry') return 1 + state.upgrades.infantry * 0.09;
  if (type.role === 'ranged' && stat === 'damage') return 1 + state.upgrades.ranged * 0.11;
  return 1;
}

function unitStats(state, team, typeId) {
  const base = UNIT_TYPES[typeId];
  if (!base) return null;
  // Campaign upgrades belong only to the player. Mission scaling keeps later
  // enemies competitive without changing public unit definitions.
  const playerMultHp = team === 'player' ? upgradeMultiplier(state, typeId, 'hp') : 1;
  const playerMultDmg = team === 'player' ? upgradeMultiplier(state, typeId, 'damage') : 1;
  const enemyScale = team === 'enemy' ? 1 + (state.mission - 1) * 0.055 : 1;
  return {
    ...base,
    hp: Math.round(base.hp * playerMultHp * enemyScale),
    damage: Math.round(base.damage * playerMultDmg * enemyScale),
    speed: base.speed * (typeId === 'miner' && team === 'player'
      ? upgradeMultiplier(state, typeId, 'worker') : 1),
  };
}

function teamBaseX(team) { return team === 'player' ? 150 : WORLD_WIDTH - 150; }
function teamMineX(team) { return team === 'player' ? 375 : WORLD_WIDTH - 375; }
function teamDirection(team) { return team === 'player' ? 1 : -1; }
function opposingTeam(team) { return team === 'player' ? 'enemy' : 'player'; }

function rawSpawn(state, team, typeId, x) {
  const stats = unitStats(state, team, typeId);
  if (!stats) return null;
  const nudge = (state.nextId % 5) * 7 * -teamDirection(team);
  const unit = {
    id: state.nextId++, team, type: typeId,
    x: clamp(x == null ? teamBaseX(team) + teamDirection(team) * 32 + nudge : x, 45, WORLD_WIDTH - 45),
    hp: stats.hp, maxHp: stats.hp, cooldown: 0,
    workerPhase: typeId === 'miner' ? 'toMine' : null,
    workTicks: 0, carrying: 0,
  };
  state.units.push(unit);
  return unit;
}

function createState(options) {
  const opts = options || {};
  const mission = int(opts.mission, 1, MISSIONS.length);
  const campaign = sanitizeCampaign({
    ...defaultCampaign(),
    upgrades: opts.upgrades || {},
    starsEarned: 6,
  });
  const config = MISSIONS[mission - 1];
  const statueMult = 1 + campaign.upgrades.statue * 0.15;
  const state = {
    version: 1,
    mission,
    seed: (Number(opts.seed) >>> 0) || (0x51c0ffee ^ (mission * 2654435761)),
    rngState: (Number(opts.seed) >>> 0) || (0x51c0ffee ^ (mission * 2654435761)),
    tick: 0,
    elapsedTicks: 0,
    phase: 'playing',
    resultReason: null,
    command: 'hold',
    enemyCommand: 'hold',
    gold: { player: 300, enemy: config.enemyStartGold },
    statues: {
      player: { hp: Math.round(config.statueHp * statueMult), maxHp: Math.round(config.statueHp * statueMult) },
      enemy: { hp: config.statueHp, maxHp: config.statueHp },
    },
    units: [],
    projectiles: [],
    queues: { player: [], enemy: [] },
    populationCap: POPULATION_CAP,
    nextId: 1,
    upgrades: campaign.upgrades,
    unlocked: unlockedUnitIds(mission),
    direct: { unitId: null, left: false, right: false, attack: false },
    ai: { enabled: opts.disableAi !== true, nextDecision: 1 },
    stats: {
      actions: 0, playerGoldMined: 0, enemyGoldMined: 0,
      playerUnitsLost: 0, enemyUnitsDefeated: 0, damageToEnemyStatue: 0,
    },
  };
  rawSpawn(state, 'player', 'miner');
  rawSpawn(state, 'player', 'miner');
  rawSpawn(state, 'enemy', 'miner');
  rawSpawn(state, 'enemy', 'miner');
  if (opts.demo) {
    state.gold.player = 1350;
    state.gold.enemy = 900;
    rawSpawn(state, 'player', 'swordsman', 465);
    rawSpawn(state, 'player', 'archer', 405);
    rawSpawn(state, 'player', 'spear', 445);
    rawSpawn(state, 'enemy', 'swordsman', 1125);
    rawSpawn(state, 'enemy', 'archer', 1185);
    rawSpawn(state, 'enemy', 'spear', 1150);
    state.command = 'attack';
    state.enemyCommand = 'attack';
  }
  return state;
}

function population(state, team, includeQueued) {
  let total = 0;
  for (const unit of state.units) {
    if (unit.team === team && unit.hp > 0) total += UNIT_TYPES[unit.type].pop;
  }
  if (includeQueued !== false) {
    for (const item of state.queues[team]) total += UNIT_TYPES[item.type].pop;
  }
  return total;
}

function queueUnit(state, team, typeId) {
  if (!state || state.phase !== 'playing' || (team !== 'player' && team !== 'enemy')) {
    return { ok: false, reason: 'Battle is not active' };
  }
  const type = UNIT_TYPES[typeId];
  if (!type) return { ok: false, reason: 'Unknown unit' };
  if (team === 'player' && !state.unlocked.includes(typeId)) return { ok: false, reason: 'Unit is locked' };
  if (population(state, team, true) + type.pop > state.populationCap) return { ok: false, reason: 'Population cap reached' };
  if (state.gold[team] < type.cost) return { ok: false, reason: 'Not enough gold' };
  if (state.queues[team].length >= 5) return { ok: false, reason: 'Training queue is full' };
  state.gold[team] -= type.cost;
  state.queues[team].push({ type: typeId, ticks: Math.max(1, Math.round(type.trainSecs * TICKS_PER_SECOND)) });
  if (team === 'player') state.stats.actions += 1;
  return { ok: true, reason: null };
}

function setCommand(state, command) {
  if (!state || state.phase !== 'playing' || !COMMANDS.includes(command)) return false;
  if (state.command !== command) {
    state.command = command;
    state.stats.actions += 1;
  }
  return true;
}

function selectUnit(state, unitId) {
  if (!state || state.phase !== 'playing') return false;
  if (unitId == null) {
    if (state.direct.unitId != null) state.stats.actions += 1;
    state.direct = { unitId: null, left: false, right: false, attack: false };
    return true;
  }
  const unit = state.units.find((item) => item.id === Number(unitId)
    && item.team === 'player' && item.type !== 'miner' && item.hp > 0);
  if (!unit) return false;
  if (state.direct.unitId !== unit.id) state.stats.actions += 1;
  state.direct = { unitId: unit.id, left: false, right: false, attack: false };
  return true;
}

function setDirectInput(state, patch) {
  if (!state || state.direct.unitId == null || !patch || typeof patch !== 'object') return false;
  const beforeAttack = state.direct.attack;
  for (const key of ['left', 'right', 'attack']) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) state.direct[key] = !!patch[key];
  }
  if (!beforeAttack && state.direct.attack) state.stats.actions += 1;
  return true;
}

function nearestEnemy(state, unit, maxDistance) {
  const other = opposingTeam(unit.team);
  let best = null;
  let bestDistance = Number.isFinite(maxDistance) ? maxDistance : Infinity;
  for (const candidate of state.units) {
    if (candidate.team !== other || candidate.hp <= 0) continue;
    const distance = Math.abs(candidate.x - unit.x);
    if (distance < bestDistance) { best = candidate; bestDistance = distance; }
  }
  return best;
}

function targetPosition(state, unit, command) {
  const dir = teamDirection(unit.team);
  if (command === 'garrison') return teamBaseX(unit.team) + dir * 30;
  if (command === 'hold') return teamBaseX(unit.team) + dir * (unit.team === 'player' ? 280 : 260);
  return teamBaseX(opposingTeam(unit.team));
}

function dealToUnit(state, target, amount, attackerTeam, splash) {
  if (!target || target.hp <= 0) return;
  target.hp -= amount;
  if (splash > 0) {
    for (const other of state.units) {
      if (other.id === target.id || other.team === attackerTeam || other.hp <= 0) continue;
      if (Math.abs(other.x - target.x) <= splash) other.hp -= Math.round(amount * 0.42);
    }
  }
}

function dealToStatue(state, targetTeam, amount) {
  const statue = state.statues[targetTeam];
  if (!statue || statue.hp <= 0) return;
  const dealt = Math.min(statue.hp, amount);
  statue.hp -= dealt;
  if (targetTeam === 'enemy') state.stats.damageToEnemyStatue += dealt;
}

function launchAttack(state, unit, target, statueTeam) {
  const stats = unitStats(state, unit.team, unit.type);
  if (!stats || unit.cooldown > 0) return false;
  unit.cooldown = stats.cooldown;
  if (stats.projectileSpeed) {
    state.projectiles.push({
      id: state.nextId++, team: unit.team, x: unit.x,
      targetId: target ? target.id : null,
      statueTeam: target ? null : statueTeam,
      damage: stats.damage, speed: stats.projectileSpeed, splash: stats.splash || 0,
    });
  } else if (target) {
    dealToUnit(state, target, stats.damage, unit.team, stats.splash || 0);
  } else if (statueTeam) {
    dealToStatue(state, statueTeam, stats.damage);
  }
  return true;
}

function moveToward(unit, destination, speed) {
  const delta = destination - unit.x;
  const maxStep = speed / TICKS_PER_SECOND;
  if (Math.abs(delta) <= maxStep) unit.x = destination;
  else unit.x += Math.sign(delta) * maxStep;
  unit.x = clamp(unit.x, 45, WORLD_WIDTH - 45);
}

function updateMiner(state, unit) {
  const stats = unitStats(state, unit.team, unit.type);
  const mineX = teamMineX(unit.team);
  const baseX = teamBaseX(unit.team);
  if (unit.workerPhase === 'toMine') {
    moveToward(unit, mineX, stats.speed);
    if (Math.abs(unit.x - mineX) < 1) {
      unit.workerPhase = 'mining';
      unit.workTicks = Math.max(16, Math.round(42 / (unit.team === 'player'
        ? upgradeMultiplier(state, unit.type, 'worker') : 1)));
    }
  } else if (unit.workerPhase === 'mining') {
    unit.workTicks -= 1;
    if (unit.workTicks <= 0) {
      const mult = unit.team === 'player' ? upgradeMultiplier(state, unit.type, 'worker') : 1;
      unit.carrying = Math.round(50 * mult);
      unit.workerPhase = 'returning';
    }
  } else {
    moveToward(unit, baseX, stats.speed);
    if (Math.abs(unit.x - baseX) < 1) {
      state.gold[unit.team] += unit.carrying;
      if (unit.team === 'player') state.stats.playerGoldMined += unit.carrying;
      else state.stats.enemyGoldMined += unit.carrying;
      unit.carrying = 0;
      unit.workerPhase = 'toMine';
    }
  }
}

function updateCombatUnit(state, unit) {
  const stats = unitStats(state, unit.team, unit.type);
  if (unit.cooldown > 0) unit.cooldown -= 1;
  const isControlled = unit.team === 'player' && state.direct.unitId === unit.id;
  if (isControlled) {
    const axis = (state.direct.right ? 1 : 0) - (state.direct.left ? 1 : 0);
    if (axis) moveToward(unit, unit.x + axis * 100, stats.speed * 1.08);
    if (state.direct.attack) {
      const target = nearestEnemy(state, unit, stats.range + 24);
      if (target) launchAttack(state, unit, target, null);
      else {
        const statueTeam = opposingTeam(unit.team);
        const statueX = teamBaseX(statueTeam);
        if (Math.abs(unit.x - statueX) <= stats.range + 42) launchAttack(state, unit, null, statueTeam);
      }
    }
    return;
  }

  const command = unit.team === 'player' ? state.command : state.enemyCommand;
  const guard = targetPosition(state, unit, command);
  const aggro = command === 'attack' ? Infinity : (command === 'hold' ? 250 : 145);
  const target = nearestEnemy(state, unit, aggro);
  if (target) {
    const distance = Math.abs(target.x - unit.x);
    if (distance <= stats.range) launchAttack(state, unit, target, null);
    else moveToward(unit, target.x - teamDirection(unit.team) * Math.max(4, stats.range - 5), stats.speed);
    return;
  }

  if (command === 'attack') {
    const targetTeam = opposingTeam(unit.team);
    const statueX = teamBaseX(targetTeam);
    const distance = Math.abs(statueX - unit.x);
    if (distance <= stats.range + 38) launchAttack(state, unit, null, targetTeam);
    else moveToward(unit, statueX - teamDirection(unit.team) * 34, stats.speed);
  } else {
    moveToward(unit, guard, stats.speed);
    // Garrison slowly restores units once they make it home.
    if (command === 'garrison' && Math.abs(unit.x - guard) < 8) {
      unit.hp = Math.min(unit.maxHp, unit.hp + Math.max(0.12, unit.maxHp / 2200));
    }
  }
}

function updateProjectiles(state) {
  const kept = [];
  for (const projectile of state.projectiles) {
    const target = projectile.targetId == null ? null
      : state.units.find((unit) => unit.id === projectile.targetId && unit.hp > 0);
    const targetX = target ? target.x : teamBaseX(projectile.statueTeam || opposingTeam(projectile.team));
    const step = projectile.speed / TICKS_PER_SECOND;
    const delta = targetX - projectile.x;
    if (Math.abs(delta) <= step + 4) {
      if (target) dealToUnit(state, target, projectile.damage, projectile.team, projectile.splash);
      else if (projectile.statueTeam) dealToStatue(state, projectile.statueTeam, projectile.damage);
    } else {
      projectile.x += Math.sign(delta) * step;
      kept.push(projectile);
    }
  }
  state.projectiles = kept;
}

function updateQueues(state, team) {
  const queue = state.queues[team];
  if (!queue.length) return;
  queue[0].ticks -= 1;
  if (queue[0].ticks <= 0) {
    const item = queue.shift();
    rawSpawn(state, team, item.type);
  }
}

function chooseEnemyUnit(state) {
  const config = MISSIONS[state.mission - 1];
  const roster = config.enemyRoster;
  // Favor affordable combat units but keep a deterministic variety.
  const affordable = roster.filter((type) => UNIT_TYPES[type].cost <= state.gold.enemy
    && population(state, 'enemy', true) + UNIT_TYPES[type].pop <= state.populationCap);
  if (!affordable.length) return null;
  const combat = affordable.filter((type) => type !== 'miner');
  const pool = combat.length ? combat : affordable;
  const bias = Math.pow(nextRandom(state), config.enemyTrainBias);
  return pool[Math.min(pool.length - 1, Math.floor(bias * pool.length))];
}

function updateEnemyAi(state) {
  if (!state.ai.enabled || state.tick < state.ai.nextDecision) return;
  const config = MISSIONS[state.mission - 1];
  state.ai.nextDecision = state.tick + TICKS_PER_SECOND;
  state.gold.enemy += config.enemyIncome;

  const enemyMiners = state.units.filter((unit) => unit.team === 'enemy' && unit.type === 'miner' && unit.hp > 0).length
    + state.queues.enemy.filter((item) => item.type === 'miner').length;
  const wantedMiners = 2 + Math.floor(state.mission / 3);
  if (enemyMiners < wantedMiners && state.gold.enemy >= UNIT_TYPES.miner.cost) {
    queueUnit(state, 'enemy', 'miner');
  } else {
    const pick = chooseEnemyUnit(state);
    if (pick) queueUnit(state, 'enemy', pick);
  }

  const fighters = population(state, 'enemy', true) - enemyMiners;
  state.enemyCommand = fighters >= config.attackAt || state.elapsedTicks > 55 * TICKS_PER_SECOND
    ? 'attack' : 'hold';
}

function removeDead(state) {
  const alive = [];
  for (const unit of state.units) {
    if (unit.hp > 0) alive.push(unit);
    else {
      if (unit.team === 'enemy') state.stats.enemyUnitsDefeated += 1;
      else state.stats.playerUnitsLost += 1;
      if (state.direct.unitId === unit.id) state.direct = { unitId: null, left: false, right: false, attack: false };
    }
  }
  state.units = alive;
}

function calculateScore(state, won) {
  if (!state) return 0;
  const seconds = state.elapsedTicks / TICKS_PER_SECOND;
  const playerRatio = state.statues.player.maxHp
    ? Math.max(0, state.statues.player.hp) / state.statues.player.maxHp : 0;
  const enemyDamage = state.statues.enemy.maxHp - Math.max(0, state.statues.enemy.hp);
  if (!won) {
    return Math.max(0, Math.round(state.mission * 120 + enemyDamage * 0.35
      + state.stats.enemyUnitsDefeated * 35));
  }
  const survivors = state.units.filter((unit) => unit.team === 'player' && unit.type !== 'miner').length;
  const timeBonus = Math.max(0, 1500 - seconds * 8);
  return Math.max(0, Math.round(
    state.mission * 1000 + playerRatio * 750 + Math.min(900, state.gold.player)
    + survivors * 85 + timeBonus
  ));
}

function finishIfNeeded(state) {
  if (state.phase !== 'playing') return;
  if (state.statues.enemy.hp <= 0) {
    state.statues.enemy.hp = 0;
    state.phase = 'won';
    state.resultReason = 'Enemy statue destroyed';
    state.score = calculateScore(state, true);
  } else if (state.statues.player.hp <= 0) {
    state.statues.player.hp = 0;
    state.phase = 'lost';
    state.resultReason = 'Your statue fell';
    state.score = calculateScore(state, false);
  }
}

function step(state) {
  if (!state || state.phase !== 'playing') return state;
  state.tick += 1;
  state.elapsedTicks += 1;
  updateEnemyAi(state);
  updateQueues(state, 'player');
  updateQueues(state, 'enemy');
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    if (unit.type === 'miner') updateMiner(state, unit);
    else updateCombatUnit(state, unit);
  }
  updateProjectiles(state);
  removeDead(state);
  finishIfNeeded(state);
  return state;
}

function stepMany(state, ticks) {
  const count = int(ticks, 0, 1000000);
  for (let i = 0; i < count && state.phase === 'playing'; i++) step(state);
  return state;
}

function damageStatue(state, team, amount) {
  if (!state || (team !== 'player' && team !== 'enemy')) return false;
  dealToStatue(state, team, Math.max(0, Number(amount) || 0));
  finishIfNeeded(state);
  return true;
}

function debugSpawn(state, team, typeId, x) {
  return rawSpawn(state, team, typeId, x);
}

function view(state) {
  if (!state) return null;
  return {
    phase: state.phase,
    mission: state.mission,
    elapsedSecs: Math.floor(state.elapsedTicks / TICKS_PER_SECOND),
    command: state.command,
    enemyCommand: state.enemyCommand,
    gold: Math.floor(state.gold.player),
    enemyGold: Math.floor(state.gold.enemy),
    population: population(state, 'player', true),
    populationCap: state.populationCap,
    playerStatue: Math.max(0, Math.round(state.statues.player.hp)),
    playerStatueMax: state.statues.player.maxHp,
    enemyStatue: Math.max(0, Math.round(state.statues.enemy.hp)),
    enemyStatueMax: state.statues.enemy.maxHp,
    selectedUnitId: state.direct.unitId,
    actions: state.stats.actions,
    score: state.score || calculateScore(state, state.phase === 'won'),
    queues: {
      player: state.queues.player.map((item) => ({
        type: item.type,
        progress: 1 - item.ticks / Math.max(1, Math.round(UNIT_TYPES[item.type].trainSecs * TICKS_PER_SECOND)),
      })),
      enemy: state.queues.enemy.map((item) => ({ type: item.type })),
    },
  };
}

function stableSnapshot(state) {
  return JSON.stringify({
    tick: state.tick,
    phase: state.phase,
    command: state.command,
    enemyCommand: state.enemyCommand,
    rngState: state.rngState,
    gold: state.gold,
    statues: state.statues,
    queues: state.queues,
    units: state.units.map((unit) => ({
      id: unit.id, team: unit.team, type: unit.type,
      x: Math.round(unit.x * 1000) / 1000,
      hp: Math.round(unit.hp * 1000) / 1000,
      cooldown: unit.cooldown,
      workerPhase: unit.workerPhase, workTicks: unit.workTicks, carrying: unit.carrying,
    })),
    projectiles: state.projectiles.map((item) => ({
      id: item.id, team: item.team, x: Math.round(item.x * 1000) / 1000,
      targetId: item.targetId, statueTeam: item.statueTeam,
      damage: item.damage, speed: item.speed, splash: item.splash,
    })),
    stats: state.stats,
  });
}

const API = {
  TICK_MS, TICKS_PER_SECOND, WORLD_WIDTH, POPULATION_CAP,
  CAMPAIGN_VERSION, CAMPAIGN_KEY, HISTORY_KEY,
  COMMANDS, UNIT_TYPES, MISSIONS, UPGRADES,
  defaultCampaign, sanitizeCampaign, completeMission, buyUpgrade,
  unlockedUnitIds, createState, population, queueUnit, setCommand,
  selectUnit, setDirectInput, step, stepMany, calculateScore, view,
  stableSnapshot, damageStatue, debugSpawn,
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.stickWarEngine = API;

})();
