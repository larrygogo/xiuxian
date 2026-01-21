import { BATTLE_CONFIG } from "../config";
import { logLine } from "../services/logger";
import type { BaseStats, GameState } from "../types/game";
import type { BattleResult, Combatant } from "../types/battle";
import { computeDerivedStats, refreshDerivedStats } from "./stats";

// 将数值限制在 [min, max] 范围内，避免异常值
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 生成整数随机数（包含边界）
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getHitChance(attacker: Combatant, defender: Combatant): number {
  // 简化命中判定：基于攻击者的命中值
  const hitValue = attacker.stats.hit;
  const chance = BATTLE_CONFIG.baseHit + hitValue * BATTLE_CONFIG.hitScale;
  return clamp(chance, BATTLE_CONFIG.minHit, BATTLE_CONFIG.maxHit);
}

function getCritChance(attacker: Combatant, defender: Combatant): number {
  // 固定暴击率为 5%（隐藏属性）
  return 0.05;
}

function getCcChance(attacker: Combatant, defender: Combatant): number {
  // 控制判定已移除，返回 0
  return 0;
}

function getDamageReduction(defense: number): number {
  const dr = defense / (defense + BATTLE_CONFIG.defenseK);
  return clamp(dr, 0, BATTLE_CONFIG.maxDr);
}

/**
 * 应用流血等持续效果
 */
function applyOngoingEffects(target: Combatant, state: GameState): void {
  if (target.effects.bleed && target.effects.bleed.turns > 0) {
    const dmg = target.effects.bleed.dmg;
    target.hp = Math.max(0, target.hp - dmg);
    target.effects.bleed.turns -= 1;
    logLine(`${target.name}流血：生命 -${dmg}（${target.hp}/${target.maxHp}）。`, state);
  }
}

/**
 * 处理一次攻击逻辑（命中/暴击/控制/流血）
 */
function resolveAttack(attacker: Combatant, defender: Combatant, state: GameState): void {
  if (attacker.hp <= 0) return;

  const hitChance = getHitChance(attacker, defender);
  if (Math.random() > hitChance) {
    logLine(`${attacker.name}攻击落空。`, state);
    return;
  }

  const isMagic = attacker.attackType === "magic";
  const baseAtk = isMagic ? attacker.stats.mdmg : attacker.stats.pdmg;
  const baseDef = isMagic ? defender.stats.mdef : defender.stats.pdef;
  const dr = getDamageReduction(baseDef);
  let dmg = Math.max(1, Math.floor(baseAtk * (1 - dr)));

  // 暴击判定（固定 5% 概率，2 倍伤害）
  const critChance = getCritChance(attacker, defender);
  let isCrit = false;
  if (Math.random() < critChance) {
    isCrit = true;
    dmg = Math.floor(dmg * 2.0);
  }

  defender.hp = Math.max(0, defender.hp - dmg);
  const critText = isCrit ? "暴击" : "命中";
  logLine(`${attacker.name}${critText}造成伤害 -${dmg}（${defender.name} ${defender.hp}/${defender.maxHp}）。`, state);

  if (defender.hp <= 0) return;

  // 控制判定（眩晕）
  const ccChance = getCcChance(attacker, defender);
  if (Math.random() < ccChance) {
    defender.effects.stun = 1;
    logLine(`${defender.name}被控制，无法行动。`, state);
  }
}

/**
 * 单位行动回合，处理持续效果与技能攻击
 */
function takeTurn(actor: Combatant, target: Combatant, state: GameState): void {
  if (actor.hp <= 0) return;

  // 先结算持续伤害
  applyOngoingEffects(actor, state);
  if (actor.hp <= 0) return;

  // 眩晕跳过
  if (actor.effects.stun && actor.effects.stun > 0) {
    actor.effects.stun -= 1;
    logLine(`${actor.name}行动受阻，跳过回合。`, state);
    return;
  }

  resolveAttack(actor, target, state);
}

/**
 * 从玩家状态构造战斗体
 */
function makeCombatantFromState(state: GameState): Combatant {
  const derived = refreshDerivedStats(state);
  const attackType = derived.mdmg > derived.pdmg ? "magic" : "physical";
  return {
    name: "你",
    hp: state.hp,
    maxHp: state.maxHp,
    mp: state.mp,
    maxMp: state.maxMp,
    stats: derived,
    attackType,
    effects: {}
  };
}

/**
 * 根据等级生成妖兽基础属性
 */
function makeBeastBaseStats(level: number): BaseStats {
  const lvl = Math.max(1, level);
  const base = 8 + Math.floor(lvl * 0.2);
  return {
    str: base + randInt(0, 3),
    agi: base + randInt(0, 3),
    vit: base + randInt(0, 3),
    int: base + randInt(0, 3),
    spi: base + randInt(0, 3)
  };
}

/**
 * 生成妖兽战斗体（血量略低于玩家）
 */
function makeCombatantFromBeast(beastName: string, level: number): Combatant {
  const baseStats = makeBeastBaseStats(level);
  const derived = computeDerivedStats(baseStats);
  const attackType = derived.mdmg > derived.pdmg ? "magic" : "physical";
  return {
    name: beastName,
    hp: Math.floor(derived.maxHp * 0.9),
    maxHp: Math.floor(derived.maxHp * 0.9),
    mp: Math.floor(derived.maxMp * 0.6),
    maxMp: Math.floor(derived.maxMp * 0.6),
    stats: derived,
    attackType,
    effects: {}
  };
}

/**
 * 自动战斗（玩家 vs 妖兽）
 */
export function autoBattle(state: GameState, beastName: string): BattleResult {
  const player = makeCombatantFromState(state);
  const enemy = makeCombatantFromBeast(beastName, state.level);

  logLine(`遭遇【${beastName}】，战斗开始。`, state);

  let round = 1;
  while (player.hp > 0 && enemy.hp > 0 && round <= BATTLE_CONFIG.maxRounds) {
    // 速度高者先手，速度相同则随机
    const order = [player, enemy].sort((a, b) => {
      if (a.stats.spd === b.stats.spd) return Math.random() < 0.5 ? -1 : 1;
      return b.stats.spd - a.stats.spd;
    });

    logLine(`第${round}回合开始。`, state);
    takeTurn(order[0], order[1], state);
    if (order[1].hp > 0) takeTurn(order[1], order[0], state);
    round += 1;
  }

  if (round > BATTLE_CONFIG.maxRounds) {
    logLine("战斗久战不下，双方拉开距离。", state);
  }

  // 将战斗结果回写到玩家状态
  state.hp = Math.max(0, Math.floor(player.hp));
  state.mp = Math.max(0, Math.floor(player.mp));

  return {
    victory: player.hp > 0 && enemy.hp <= 0,
    rounds: round - 1,
    playerHp: state.hp,
    enemyHp: enemy.hp,
    enemyName: enemy.name
  };
}
