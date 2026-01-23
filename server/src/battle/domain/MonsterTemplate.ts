import type { BaseStats } from "../../types/game";

/**
 * 怪物模板
 */
export interface MonsterTemplate {
  templateId: string; // 模板ID
  name: string; // 怪物名称
  level: number; // 等级
  baseStats: BaseStats; // 基础属性
  skills: string[]; // 技能列表
  description?: string; // 描述
}

/**
 * 创建怪物模板（Mock）
 */
export function createMonsterTemplate(
  templateId: string,
  name: string,
  level: number = 1
): MonsterTemplate {
  return {
    templateId,
    name,
    level,
    baseStats: {
      str: 10 + level * 2,
      agi: 10 + level * 2,
      vit: 10 + level * 2,
      int: 10 + level * 2,
      spi: 10 + level * 2
    },
    skills: [],
    description: `${name}的怪物模板`
  };
}
