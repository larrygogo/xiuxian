import type { BaseStats, CombatStats, GameState } from "../types/game";
import { getEquipmentStats } from "./items";

/**
 * 确保基础属性存在，缺失则用默认值补齐
 */
export function ensureBaseStats(baseStats: Partial<BaseStats> | undefined): BaseStats {
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
 * 1. 不使用等级系数，成长完全来自"每级 5 点自由加点"
 * 2. 每个基础属性职责单一、收益线性、可预期
 * 3. 面板数值简单，复杂性放到战斗判定阶段
 */
export function computeDerivedStats(base: BaseStats): CombatStats {
  // ---------- 0) 基础校验：避免 NaN/负数污染面板 ----------
  const str = Number.isFinite(base.str) ? Math.max(0, base.str) : 0;
  const int = Number.isFinite(base.int) ? Math.max(0, base.int) : 0;
  const vit = Number.isFinite(base.vit) ? Math.max(0, base.vit) : 0;
  const spi = Number.isFinite(base.spi) ? Math.max(0, base.spi) : 0;
  const agi = Number.isFinite(base.agi) ? Math.max(0, base.agi) : 0;

  // ---------- 1) 可调参数：集中管理，方便后续平衡 ----------
  const C = {
    // 命中：给一个基础底盘，避免低点数"打不着"
    HIT_BASE: 80,
    HIT_FROM_AGI: 0.6,
    HIT_FROM_STR: 0.4,

    // 物伤：主吃 str，少量吃 agi（不抢主权）
    PDMG_FROM_STR: 2.8,
    PDMG_FROM_AGI: 0.3,

    // 防御：主吃 spi，少量吃 vit（体魄提供"抗打底子"）
    PDEF_FROM_SPI: 2.2,
    PDEF_FROM_VIT: 0.6,
    MDEF_FROM_SPI: 2.2,
    MDEF_FROM_VIT: 0.6,

    // 速度：敏捷决定出手顺序，给固定底盘避免"0敏必慢"
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
