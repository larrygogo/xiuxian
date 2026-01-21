import { BATTLE_CONFIG } from "../config";
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
function ensureBaseStats(baseStats: Partial<BaseStats> | undefined): BaseStats {
  return {
    str: 10,
    agi: 10,
    vit: 10,
    int: 10,
    spi: 10,
    ...baseStats
  };
}

/**
 * 根据玩家分配的基础属性，计算战斗用的派生属性
 *
 * 设计思想：
 * 1. 不使用等级系数，成长完全来自“每级 5 点自由加点”
 * 2. 每个基础属性职责单一、收益线性、可预期
 * 3. 面板数值简单，复杂性放到战斗判定阶段
 */
function computeDerivedStats(base: BaseStats): CombatStats {
  // ---------- 0) 基础校验：避免 NaN/负数污染面板 ----------
  const str = Number.isFinite(base.str) ? Math.max(0, base.str) : 0;
  const int = Number.isFinite(base.int) ? Math.max(0, base.int) : 0;
  const vit = Number.isFinite(base.vit) ? Math.max(0, base.vit) : 0;
  const spi = Number.isFinite(base.spi) ? Math.max(0, base.spi) : 0;
  const agi = Number.isFinite(base.agi) ? Math.max(0, base.agi) : 0;

  // ---------- 1) 可调参数：集中管理，方便后续平衡 ----------
  const C = {
    // 命中：给一个基础底盘，避免低点数“打不着”
    HIT_BASE: 80,
    HIT_FROM_AGI: 0.6,
    HIT_FROM_STR: 0.4,

    // 物伤：主吃 str，少量吃 agi（不抢主权）
    PDMG_FROM_STR: 2.8,
    PDMG_FROM_AGI: 0.3,

    // 防御：主吃 spi，少量吃 vit（体魄提供“抗打底子”）
    PDEF_FROM_SPI: 2.2,
    PDEF_FROM_VIT: 0.6,
    MDEF_FROM_SPI: 2.2,
    MDEF_FROM_VIT: 0.6,

    // 速度：敏捷决定出手顺序，给固定底盘避免“0敏必慢”
    SPD_BASE: 50,
    SPD_FROM_AGI: 2.0,

    // 法伤：主吃 int，少量吃 spi（根骨稳，法门顺）
    MDMG_FROM_INT: 2.8,
    MDMG_FROM_SPI: 0.3
  } as const;

  // ---------- 2) 面板计算（线性、可读、梦幻风） ----------
  const hit = C.HIT_BASE + agi * C.HIT_FROM_AGI + str * C.HIT_FROM_STR;

  const pdmg = str * C.PDMG_FROM_STR + agi * C.PDMG_FROM_AGI;
  const pdef = spi * C.PDEF_FROM_SPI + vit * C.PDEF_FROM_VIT;

  const spd = C.SPD_BASE + agi * C.SPD_FROM_AGI;

  const mdmg = int * C.MDMG_FROM_INT + spi * C.MDMG_FROM_SPI;
  const mdef = spi * C.MDEF_FROM_SPI + vit * C.MDEF_FROM_VIT;

  // 最大生命值和最大法力值
  const maxHp = 60 + vit * 6;
  const maxMp = 40 + int * 5;

  // ---------- 3) 取整策略 ----------
  // 建议面板展示用整数，便于玩家理解与对比。
  // 若你希望保留小数做更细腻的平衡，可改为不取整或仅在 UI 层取整。
  return {
    hit: Math.floor(hit),
    pdmg: Math.floor(pdmg),
    pdef: Math.floor(pdef),
    spd: Math.floor(spd),
    mdmg: Math.floor(mdmg),
    mdef: Math.floor(mdef),
    maxHp: Math.floor(maxHp),
    maxMp: Math.floor(maxMp)
  };
}


/**
 * 刷新战斗属性，并同步生命/法力上限
 * 现在会考虑装备提供的属性加成
 */
export function refreshDerivedStats(state: GameState): CombatStats {
  const base = ensureBaseStats(state.baseStats);
  state.baseStats = base;

  // 获取装备提供的属性加成
  const equipmentStats = getEquipmentStats(state);

  // 将装备的基础属性加成加到基础属性上（用于计算衍生属性）
  const effectiveBase: BaseStats = {
    str: base.str + (equipmentStats.baseStats.str || 0),
    agi: base.agi + (equipmentStats.baseStats.agi || 0),
    vit: base.vit + (equipmentStats.baseStats.vit || 0),
    int: base.int + (equipmentStats.baseStats.int || 0),
    spi: base.spi + (equipmentStats.baseStats.spi || 0)
  };

  const derived = computeDerivedStats(effectiveBase);

  // 叠加装备提供的战斗属性加成
  const finalCombatStats: CombatStats = {
    ...derived,
    ...equipmentStats.combatStats
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
