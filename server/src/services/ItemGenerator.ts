import type { BaseStats, CombatStats } from "../types/game";
import type {
  Equipment,
  Item,
  ItemType,
  EquipmentSlot,
  Consumable,
  Material,
  ConsumableEffect
} from "../types/item";
import {
  getEquipmentData,
  getConsumableData,
  getMaterialData,
  getAllEquipmentTemplates
} from "./itemService";

// 装备模板定义（从itemService.ts复制）
interface EquipmentTemplate {
  templateId: string;
  name: string;
  description?: string;
  slot: EquipmentSlot;
  combatStatTypes: (keyof CombatStats)[];
  combatValueRange: [number, number];
}

// 消耗品模板
interface ConsumableTemplate {
  templateId: string;
  name: string;
  description?: string;
  effect: ConsumableEffect;
  maxStack: number;
}

// 材料模板
interface MaterialTemplate {
  templateId: string;
  name: string;
  description?: string;
}

// 批量生成选项
export interface GenerateOptions {
  type?: ItemType;
  slot?: EquipmentSlot;
}

/**
 * 物品生成类
 * 统一管理所有系统物品的生成逻辑
 */
export class ItemGenerator {
  /**
   * 生成唯一物品ID
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 在范围内生成随机值
   */
  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 根据等级获取对应的装备等级段（每5级一个段）
   * @param level 物品等级
   * @returns 装备等级段（1, 5, 10, 15, ..., 100）
   */
  private getEquipmentLevelTier(level: number): number {
    // 确保等级至少为1
    const safeLevel = Math.max(1, level);
    // 将等级映射到最近的5的倍数（向下取整）
    // 1-4级 -> 1级装备，5-9级 -> 5级装备，10-14级 -> 10级装备，以此类推
    const tier = Math.floor((safeLevel - 1) / 5) * 5 + 1;
    // 确保不超过100级
    return Math.min(tier, 100);
  }

  /**
   * 生成装备物品
   * @param level 物品等级
   * @param slot 装备槽位（可选）
   */
  generateEquipment(level: number, slot?: EquipmentSlot): Equipment {
    // 根据等级获取对应的装备等级段
    const tier = this.getEquipmentLevelTier(level);
    const tierStr = tier.toString().padStart(3, '0'); // 001, 005, 010, etc.

    // 选择模板：根据等级段和槽位筛选
    let templates: EquipmentTemplate[];
    if (slot) {
      templates = getAllEquipmentTemplates().filter(
        t => t.slot === slot && t.templateId.endsWith(`_${tierStr}`)
      );
    } else {
      templates = getAllEquipmentTemplates().filter(
        t => t.templateId.endsWith(`_${tierStr}`)
      );
    }

    // 如果找不到对应等级段的模板，尝试找最近的较低等级段
    if (templates.length === 0) {
      let currentTier = tier;
      while (templates.length === 0 && currentTier >= 1) {
        const currentTierStr = currentTier.toString().padStart(3, '0');
        if (slot) {
          templates = getAllEquipmentTemplates().filter(
            t => t.slot === slot && t.templateId.endsWith(`_${currentTierStr}`)
          );
        } else {
          templates = getAllEquipmentTemplates().filter(
            t => t.templateId.endsWith(`_${currentTierStr}`)
          );
        }
        // 如果当前tier是1，不能再减了，否则会变成负数
        if (currentTier <= 1) {
          break;
        }
        currentTier -= 5;
        // 确保不会小于1
        currentTier = Math.max(1, currentTier);
      }
    }

    // 如果还是找不到，使用所有模板作为后备
    if (templates.length === 0) {
      if (slot) {
        templates = getAllEquipmentTemplates().filter(t => t.slot === slot);
      } else {
        templates = getAllEquipmentTemplates();
      }
    }

    // 如果仍然为空，使用武器作为默认
    if (templates.length === 0) {
      const data = getEquipmentData();
      templates = data.weapons;
    }

    const template = templates[Math.floor(Math.random() * templates.length)];

    // 根据等级计算属性
    const levelScale = 1 + (level - 1) * 0.1;
    const combatStats: Partial<CombatStats> = {};

    // 生成战斗属性
    for (let i = 0; i < template.combatStatTypes.length; i++) {
      const statType = template.combatStatTypes[i];
      const [min, max] = template.combatValueRange;
      
      // 根据槽位和属性类型调整范围
      // 对于次要属性（第二个属性），使用较小的范围
      let value: number;
      if (i === 0) {
        // 第一个属性（主要属性）：使用完整范围
        value = Math.floor((this.randomInRange(min, max) * levelScale));
      } else {
        // 第二个属性（次要属性）：使用较小范围（约为主属性的40-50%）
        const smallMin = Math.max(1, Math.floor(min * 0.4));
        const smallMax = Math.floor(max * 0.5);
        value = Math.floor((this.randomInRange(smallMin, smallMax) * levelScale));
      }
      
      const currentValue = combatStats[statType];
      if (typeof currentValue === "number") {
        (combatStats as any)[statType] = currentValue + value;
      } else {
        (combatStats as any)[statType] = value;
      }
    }

    const name = template.name;
    // 优先使用模板中的描述，如果不存在或为空则使用默认描述
    const description = (template.description && template.description.trim()) 
      ? template.description 
      : `${name}，适合${level}级修士使用。`;

    // 需求等级等于装备等级段
    const requiredLevel = tier;

    return {
      id: this.generateItemId(),
      templateId: template.templateId,
      name,
      type: "equipment",
      level,
      slot: template.slot,
      requiredLevel,
      baseStats: {},
      combatStats,
      description
    };
  }

  /**
   * 生成消耗品
   * @param level 物品等级
   */
  generateConsumable(level: number): Consumable {
    const templates = getConsumableData();
    const template = templates[Math.floor(Math.random() * templates.length)];

    // 使用模板中的效果值
    const effect: ConsumableEffect = { ...template.effect };

    const name = template.name;
    // 优先使用模板中的描述，如果不存在或为空则使用默认描述
    const description = (template.description && template.description.trim()) 
      ? template.description 
      : `${name}，使用后可恢复或增强。`;

    return {
      id: this.generateItemId(),
      templateId: template.templateId,
      name,
      type: "consumable",
      level,
      effect,
      stackSize: 1,
      description
    };
  }

  /**
   * 生成材料
   * @param level 物品等级
   */
  generateMaterial(level: number): Material {
    const templates = getMaterialData();
    const template = templates[Math.floor(Math.random() * templates.length)];

    // 优先使用模板中的描述，如果不存在或为空则使用默认描述
    const description = (template.description && template.description.trim()) 
      ? template.description 
      : `${template.name}，可用于合成或强化。`;

    return {
      id: this.generateItemId(),
      templateId: template.templateId,
      name: template.name,
      type: "material",
      level,
      stackSize: this.randomInRange(1, 5),
      description
    };
  }

  /**
   * 随机生成物品（根据类型）
   * @param level 物品等级
   * @param type 物品类型（可选）
   */
  generateRandomItem(level: number, type?: ItemType): Item {
    if (type === "equipment") {
      return this.generateEquipment(level, undefined);
    }
    if (type === "consumable") {
      return this.generateConsumable(level);
    }
    if (type === "material") {
      return this.generateMaterial(level);
    }

    // 随机类型
    const r = Math.random();
    if (r < 0.5) {
      return this.generateEquipment(level, undefined);
    } else if (r < 0.8) {
      return this.generateConsumable(level);
    } else {
      return this.generateMaterial(level);
    }
  }

  /**
   * 批量生成物品
   * @param level 物品等级
   * @param count 生成数量
   * @param options 生成选项（可选）
   */
  generateBatch(level: number, count: number, options?: GenerateOptions): Item[] {
    const items: Item[] = [];
    for (let i = 0; i < count; i++) {
      if (options?.type === "equipment") {
        items.push(this.generateEquipment(level, options.slot));
      } else if (options?.type === "consumable") {
        items.push(this.generateConsumable(level));
      } else if (options?.type === "material") {
        items.push(this.generateMaterial(level));
      } else {
        items.push(this.generateRandomItem(level, options?.type));
      }
    }
    return items;
  }
}
