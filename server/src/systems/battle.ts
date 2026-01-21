import { BATTLE_CONFIG, LEVEL_SCALE_STEP } from "../config";
import { logLine } from "../services/logger";
import type { BaseStats, CombatStats, GameState } from "../types/game";
import type { BattleResult, Combatant } from "../types/battle";
import { getEquipmentStats } from "./items";

// 将数值限制在 [min, max] 范围内，避免异常值
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 生成整数随机数（包含边界）
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 确保基础属性存在，缺失则用默认值补齐
function ensureBaseStats(baseStats: Partial<BaseStats> | undefined, fallbackLuck: number | undefined): BaseStats {
  return {
    str: 10,
    agi: 10,
    vit: 10,
    int: 10,
    spi: 10,
    luk: fallbackLuck ?? 10,
    ...baseStats
  };
}

/**
 * 根据基础属性与等级计算战斗衍生属性
 */
function computeDerivedStats(base: BaseStats, level: number): CombatStats {
  const lvl = Math.max(1, level);
  const levelScale = 1 + (lvl - 1) * LEVEL_SCALE_STEP;

  // 攻击与防御
  const atk = base.str * 2.5 * levelScale;
  const def = base.vit * 2.0 * levelScale;
  const matk = base.int * 2.5 * levelScale;
  const mdef = base.spi * 2.0 * levelScale;
  const spd = base.agi * 1.8 * levelScale;

  // 命中/闪避/暴击相关
  const hit = 60 + base.int * 1.2 + base.agi * 0.6;
  const eva = 40 + base.agi * 1.1 + base.spi * 0.6;
  const crit = 5 + base.agi * 0.35 + base.luk * 0.45;
  const critRes = 2 + base.spi * 0.3 + base.vit * 0.2;
  const critDmg = 1.5 + base.luk * 0.01;

  // 控制与异常状态
  const ccHit = 5 + base.int * 0.4 + base.spi * 0.4;
  const ccRes = 5 + base.vit * 0.4 + base.spi * 0.4;
  const statusPower = 5 + base.luk * 0.5 + base.str * 0.2;
  const statusRes = 5 + base.vit * 0.4 + base.spi * 0.4;

  // 生命/法力上限与回复
  const maxHp = 60 + base.vit * 4 + (lvl - 1) * 2.5;
  const maxMp = 40 + base.int * 3 + base.spi * 2 + (lvl - 1) * 1.5;
  const hpRegen = Math.max(1, Math.floor(base.vit * 0.1));
  const mpRegen = Math.max(1, Math.floor(base.spi * 0.12));

  // 其它属性
  const armorPen = base.str * 0.3;
  const dropRate = base.luk * 0.002;
  const procRate = base.luk * 0.002;

  return {
    atk,
    def,
    matk,
    mdef,
    spd,
    hit,
    eva,
    crit,
    critRes,
    critDmg,
    ccHit,
    ccRes,
    statusPower,
    statusRes,
    maxHp,
    maxMp,
    hpRegen,
    mpRegen,
    armorPen,
    dr: 0,
    elementRes: {
      fire: 0,
      water: 0,
      lightning: 0
    },
    dropRate,
    procRate
  };
}

/**
 * 刷新战斗属性，并同步生命/法力上限
 * 现在会考虑装备提供的属性加成
 */
export function refreshDerivedStats(state: GameState): CombatStats {
  const base = ensureBaseStats(state.baseStats, state.luck);
  state.baseStats = base;
  state.luck = base.luk;

  // 获取装备提供的属性加成
  const equipmentStats = getEquipmentStats(state);

  // 将装备的基础属性加成加到基础属性上（用于计算衍生属性）
  const effectiveBase: BaseStats = {
    str: base.str + (equipmentStats.baseStats.str || 0),
    agi: base.agi + (equipmentStats.baseStats.agi || 0),
    vit: base.vit + (equipmentStats.baseStats.vit || 0),
    int: base.int + (equipmentStats.baseStats.int || 0),
    spi: base.spi + (equipmentStats.baseStats.spi || 0),
    luk: base.luk + (equipmentStats.baseStats.luk || 0)
  };

  const derived = computeDerivedStats(effectiveBase, state.level);

  // 叠加装备提供的战斗属性加成
  const finalCombatStats: CombatStats = {
    ...derived,
    ...equipmentStats.combatStats,
    // 特殊处理元素抗性（需要合并对象）
    elementRes: {
      fire: (derived.elementRes?.fire || 0) + (equipmentStats.combatStats.elementRes?.fire || 0),
      water: (derived.elementRes?.water || 0) + (equipmentStats.combatStats.elementRes?.water || 0),
      lightning: (derived.elementRes?.lightning || 0) + (equipmentStats.combatStats.elementRes?.lightning || 0)
    }
  };

  // 合并已有的战斗属性，避免丢失自定义字段
  state.combatStats = {
    ...state.combatStats,
    ...finalCombatStats
  };

  // 同步上限与当前值（使用最终计算出的上限）
  state.maxHp = Math.floor(finalCombatStats.maxHp);
  state.maxMp = Math.floor(finalCombatStats.maxMp);
  if (typeof state.hp !== "number") state.hp = state.maxHp;
  state.hp = Math.min(state.maxHp, Math.max(0, state.hp));
  if (typeof state.mp !== "number") state.mp = state.maxMp;
  state.mp = Math.min(state.maxMp, Math.max(0, state.mp));

  return finalCombatStats;
}

function getHitChance(attacker: Combatant, defender: Combatant): number {
  const diff = attacker.stats.hit - defender.stats.eva;
  const chance = BATTLE_CONFIG.baseHit + diff * BATTLE_CONFIG.hitScale;
  return clamp(chance, BATTLE_CONFIG.minHit, BATTLE_CONFIG.maxHit);
}

function getCritChance(attacker: Combatant, defender: Combatant): number {
  const diff = attacker.stats.crit - defender.stats.critRes;
  const chance = BATTLE_CONFIG.baseCrit + diff * BATTLE_CONFIG.critScale;
  return clamp(chance, BATTLE_CONFIG.minCrit, BATTLE_CONFIG.maxCrit);
}

function getCcChance(attacker: Combatant, defender: Combatant): number {
  const diff = attacker.stats.ccHit - defender.stats.ccRes;
  const chance = BATTLE_CONFIG.baseCc + diff * BATTLE_CONFIG.ccScale;
  return clamp(chance, BATTLE_CONFIG.minCc, BATTLE_CONFIG.maxCc);
}

function getStatusChance(attacker: Combatant, defender: Combatant): number {
  const diff = attacker.stats.statusPower - defender.stats.statusRes;
  const chance = BATTLE_CONFIG.baseStatus + diff * BATTLE_CONFIG.statusScale;
  return clamp(chance, BATTLE_CONFIG.minStatus, BATTLE_CONFIG.maxStatus);
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
  const baseAtk = isMagic ? attacker.stats.matk : attacker.stats.atk;
  const baseDef = isMagic ? defender.stats.mdef : defender.stats.def;
  const dr = getDamageReduction(baseDef);
  let dmg = Math.max(1, Math.floor(baseAtk * (1 - dr)));

  // 暴击判定
  const critChance = getCritChance(attacker, defender);
  let isCrit = false;
  if (Math.random() < critChance) {
    isCrit = true;
    dmg = Math.floor(dmg * attacker.stats.critDmg);
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

  // 异常状态判定（流血）
  const statusChance = getStatusChance(attacker, defender);
  if (Math.random() < statusChance) {
    const dotDmg = Math.max(1, Math.floor(dmg * BATTLE_CONFIG.dotRatio));
    defender.effects.bleed = {
      turns: BATTLE_CONFIG.dotTurns,
      dmg: dotDmg
    };
    logLine(`${defender.name}流血，将持续受到伤害。`, state);
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

  // 回合内被动回蓝
  actor.mp = Math.min(actor.maxMp, actor.mp + actor.stats.mpRegen);
  resolveAttack(actor, target, state);
}

/**
 * 从玩家状态构造战斗体
 */
function makeCombatantFromState(state: GameState): Combatant {
  const derived = refreshDerivedStats(state);
  const attackType = derived.matk > derived.atk ? "magic" : "physical";
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
    spi: base + randInt(0, 3),
    luk: base + randInt(0, 2)
  };
}

/**
 * 生成妖兽战斗体（血量略低于玩家）
 */
function makeCombatantFromBeast(beastName: string, level: number): Combatant {
  const baseStats = makeBeastBaseStats(level);
  const derived = computeDerivedStats(baseStats, level);
  const attackType = derived.matk > derived.atk ? "magic" : "physical";
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
