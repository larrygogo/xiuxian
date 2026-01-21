import { BATTLE_CONFIG } from "../config";
import type { CombatStats, GameState, BaseStats } from "../types/game";
import { getEquipmentStats } from "../systems/items";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * 100 * scale) / scale;
}

function rateFromValue(
  value: number,
  base: number,
  scale: number,
  min: number,
  max: number
): number {
  return clamp(base + value * scale, min, max);
}

function resistFromValue(value: number, scale: number, max: number): number {
  return clamp(value * scale, 0, max);
}

function formatCombatStats(stats: CombatStats): CombatStats {
  const critRate = rateFromValue(
    stats.crit,
    BATTLE_CONFIG.baseCrit,
    BATTLE_CONFIG.critScale,
    BATTLE_CONFIG.minCrit,
    BATTLE_CONFIG.maxCrit
  );
  const critResRate = resistFromValue(stats.critRes, BATTLE_CONFIG.critScale, BATTLE_CONFIG.maxCrit);
  const ccRate = rateFromValue(
    stats.ccHit,
    BATTLE_CONFIG.baseCc,
    BATTLE_CONFIG.ccScale,
    BATTLE_CONFIG.minCc,
    BATTLE_CONFIG.maxCc
  );
  const ccResRate = resistFromValue(stats.ccRes, BATTLE_CONFIG.ccScale, BATTLE_CONFIG.maxCc);
  const statusRate = rateFromValue(
    stats.statusPower,
    BATTLE_CONFIG.baseStatus,
    BATTLE_CONFIG.statusScale,
    BATTLE_CONFIG.minStatus,
    BATTLE_CONFIG.maxStatus
  );
  const statusResRate = resistFromValue(stats.statusRes, BATTLE_CONFIG.statusScale, BATTLE_CONFIG.maxStatus);

  return {
    ...stats,
    crit: toPercent(critRate),
    critRes: toPercent(critResRate),
    ccHit: toPercent(ccRate),
    ccRes: toPercent(ccResRate),
    statusPower: toPercent(statusRate),
    statusRes: toPercent(statusResRate),
    dr: toPercent(clamp(stats.dr, 0, BATTLE_CONFIG.maxDr)),
    dropRate: toPercent(clamp(stats.dropRate, 0, 1)),
    procRate: toPercent(clamp(stats.procRate, 0, 1))
  };
}

export function toClientState(state: GameState): GameState {
  // 获取装备提供的基础属性加成
  const equipmentStats = getEquipmentStats(state);
  
  // 计算包含装备加成的基础属性（用于显示）
  const effectiveBaseStats: BaseStats = {
    str: state.baseStats.str + (equipmentStats.baseStats.str || 0),
    agi: state.baseStats.agi + (equipmentStats.baseStats.agi || 0),
    vit: state.baseStats.vit + (equipmentStats.baseStats.vit || 0),
    int: state.baseStats.int + (equipmentStats.baseStats.int || 0),
    spi: state.baseStats.spi + (equipmentStats.baseStats.spi || 0),
    luk: state.baseStats.luk + (equipmentStats.baseStats.luk || 0)
  };

  return {
    ...state,
    baseStats: effectiveBaseStats, // 返回包含装备加成的基础属性
    combatStats: formatCombatStats(state.combatStats)
  };
}
