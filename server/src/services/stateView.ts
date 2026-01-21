import type { CombatStats, GameState, BaseStats } from "../types/game";
import { getEquipmentStats } from "../systems/items";

function formatCombatStats(stats: CombatStats): CombatStats {
  // 简化后的战斗属性：直接返回，无需格式化转换
  // 所有属性都是直接数值（hit, pdmg, pdef, spd, mdmg, mdef, maxHp, maxMp）
  return { ...stats };
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
    spi: state.baseStats.spi + (equipmentStats.baseStats.spi || 0)
  };

  return {
    ...state,
    baseStats: effectiveBaseStats, // 返回包含装备加成的基础属性
    combatStats: formatCombatStats(state.combatStats)
  };
}
