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
  getAllEquipmentTemplates,
  getRequiredLevelFromTemplateId,
  getItemConfig
} from "./itemService";
import { getEquipmentDescription, getEquipmentName } from "./equipmentLore";

// 装备模板定义（从itemService.ts复制）
type CombatStatType = keyof CombatStats;

interface StatRange {
  type: CombatStatType;
  min: number;
  max: number;
}

type GearSource = "system" | "crafted";

interface EquipmentTemplate {
  templateId: string;
  name: string;
  description?: string;
  slot: EquipmentSlot;
  source: GearSource;
  combatStats: StatRange[];
  baseAffix?: {
    stats: Array<keyof BaseStats>;
    min: number;
    max: number;
    count?: number;
    chance?: number;
    negativeChance?: number;
  };
}

// 消耗品模板
interface ConsumableTemplate {
  templateId: string;
  name: string;
  description?: string;
  effect: ConsumableEffect;
  maxStack: number;
  battleTarget?: import("../types/item").BattleTargetScope;
}

// 材料模板
interface MaterialTemplate {
  templateId: string;
  name: string;
  description?: string;
  level?: number;
}

function getStatRole(slot: EquipmentSlot, type: CombatStatType): "primary" | "secondary" | "invalid" {
  switch (slot) {
    case "weapon":
      return type === "pdmg" || type === "mdmg" ? "primary" : "invalid";
    case "helmet":
      if (type === "pdef") return "primary";
      return type === "maxHp" || type === "hit" ? "secondary" : "invalid";
    case "armor":
      return type === "pdef" || type === "maxHp" ? "primary" : "invalid";
    case "leggings":
      if (type === "mdef") return "primary";
      return type === "maxHp" || type === "pdef" ? "secondary" : "invalid";
    case "boots":
      return type === "spd" ? "primary" : "invalid";
    case "accessory":
      if (type === "hit" || type === "maxMp") return "primary";
      return type === "mdef" ? "secondary" : "invalid";
    default:
      return "invalid";
  }
}

function shouldSkipSecondary(template: EquipmentTemplate, config: ReturnType<typeof getItemConfig>): boolean {
  if (template.slot !== "helmet" && template.slot !== "leggings" && template.slot !== "accessory") {
    return false;
  }
  const chance = template.source === "crafted"
    ? config.secondary.craftedChance
    : config.secondary.systemChance;
  return Math.random() > chance;
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
    const safeLevel = Math.max(1, level);
    // 1-4级 -> 1级装备；5-9级 -> 5级装备；10-14级 -> 10级装备 ...
    // 注意：装备模板ID使用 001/005/010/...（不是 001/006/011/...）
    const tier = safeLevel < 5 ? 1 : Math.floor(safeLevel / 5) * 5;
    return Math.min(Math.max(1, tier), 100);
  }

  private rollBaseAffixes(template: EquipmentTemplate, source: GearSource): Partial<BaseStats> {
    // 规则：只有打造装备才会出现绿字；具体可加属性/上下限由 equipment.json 决定
    if (source !== "crafted") return {};
    const cfg = template.baseAffix;
    if (!cfg || !Array.isArray(cfg.stats) || cfg.stats.length === 0) return {};
    const chance = typeof cfg.chance === "number" ? cfg.chance : 0.8;
    if (Math.random() >= chance) return {};

    const min = Math.floor(cfg.min);
    const max = Math.floor(cfg.max);
    const safeMin = Number.isFinite(min) ? min : 1;
    const safeMax = Number.isFinite(max) ? Math.max(safeMin, max) : safeMin;
    const count = typeof cfg.count === "number" ? Math.max(1, Math.floor(cfg.count)) : 2;
    const negativeChance = typeof cfg.negativeChance === "number" ? cfg.negativeChance : 0.18;

    const picked = new Set<keyof BaseStats>();
    while (picked.size < Math.min(count, cfg.stats.length)) {
      const k = cfg.stats[Math.floor(Math.random() * cfg.stats.length)];
      picked.add(k);
    }

    const baseStats: Partial<BaseStats> = {};
    for (const key of picked) {
      const magnitude = this.randomInRange(safeMin, safeMax);
      const sign = Math.random() < negativeChance ? -1 : 1;
      const value = magnitude * sign;
      if (value !== 0) {
        baseStats[key] = value;
      }
    }
    return baseStats;
  }

  /**
   * 生成装备物品
   * @param level 物品等级
   * @param slot 装备槽位（可选）
   */
  generateEquipment(level: number, slot?: EquipmentSlot, sourceOverride?: GearSource): Equipment {
    // 根据等级获取对应的装备等级段
    const tier = this.getEquipmentLevelTier(level);
    const tierStr = tier.toString().padStart(3, '0'); // 001, 005, 010, etc.

    // 选择模板：根据等级段和槽位筛选
    let templates: EquipmentTemplate[];
    if (slot) {
      templates = getAllEquipmentTemplates().filter(
        t => t.slot === slot && t.templateId.endsWith(`_${tierStr}`) && (!sourceOverride || t.source === sourceOverride)
      );
    } else {
      templates = getAllEquipmentTemplates().filter(
        t => t.templateId.endsWith(`_${tierStr}`) && (!sourceOverride || t.source === sourceOverride)
      );
    }

    // 如果找不到对应等级段的模板，尝试找最近的较低等级段
    if (templates.length === 0) {
      let currentTier = tier;
      while (templates.length === 0 && currentTier >= 1) {
        const currentTierStr = currentTier.toString().padStart(3, '0');
        if (slot) {
          templates = getAllEquipmentTemplates().filter(
            t => t.slot === slot && t.templateId.endsWith(`_${currentTierStr}`) && (!sourceOverride || t.source === sourceOverride)
          );
        } else {
          templates = getAllEquipmentTemplates().filter(
            t => t.templateId.endsWith(`_${currentTierStr}`) && (!sourceOverride || t.source === sourceOverride)
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

    // 需求等级以模板等级为准（001 -> 0级）
    const requiredLevel = getRequiredLevelFromTemplateId(template.templateId);

    return this.buildEquipmentFromTemplate(template, level, requiredLevel, sourceOverride);
  }

  /**
   * 通过模板生成指定装备
   */
  generateEquipmentFromTemplate(templateId: string, level?: number, sourceOverride?: GearSource): Equipment {
    const template = getAllEquipmentTemplates().find((t) => t.templateId === templateId);
    if (!template) {
      throw new Error("装备模板不存在");
    }
    const requiredLevel = getRequiredLevelFromTemplateId(templateId);
    const finalLevel = level ?? requiredLevel;
    return this.buildEquipmentFromTemplate(template, finalLevel, requiredLevel, sourceOverride);
  }

  private buildEquipmentFromTemplate(
    template: EquipmentTemplate,
    level: number,
    requiredLevel: number,
    sourceOverride?: GearSource
  ): Equipment {
    const combatStats: Partial<CombatStats> = {};
    const config = getItemConfig();
    const source: GearSource = sourceOverride ?? template.source;

    // 生成战斗属性
    for (const stat of template.combatStats) {
      const role = getStatRole(template.slot, stat.type);
      if (role === "invalid") {
        continue;
      }
      if (role === "secondary" && shouldSkipSecondary({ ...template, source }, config)) {
        continue;
      }
      const min = Math.floor(stat.min * config.crafted.minMultiplier);
      const max = source === "crafted"
        ? Math.floor(stat.max * config.crafted.maxMultiplier)
        : stat.max;
      const safeMax = Math.max(min, max);
      const value = this.randomInRange(min, safeMax);

      const currentValue = combatStats[stat.type];
      if (typeof currentValue === "number") {
        (combatStats as any)[stat.type] = currentValue + value;
      } else {
        (combatStats as any)[stat.type] = value;
      }
    }

    const combatTypes = template.combatStats.map((s) => s.type);
    const tier = (() => {
      const match = template.templateId.match(/_(\d{3})$/);
      if (!match) return 1;
      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isFinite(parsed) || parsed <= 0) return 1;
      if (parsed === 1) return 1;
      if (parsed % 5 !== 0) return 1;
      return parsed / 5 + 1;
    })();
    const name = template.name && template.name.trim()
      ? template.name
      : getEquipmentName(template.slot, tier, combatTypes);
    const description = template.description && template.description.trim()
      ? template.description
      : getEquipmentDescription(template.slot, tier, combatTypes);

    const baseStats = this.rollBaseAffixes(template, source);
    const finalDescription = source === "crafted" && !description.includes("打造")
      ? `${description}\n（打造装备）`
      : description;

    return {
      id: this.generateItemId(),
      templateId: template.templateId,
      name,
      type: "equipment",
      level,
      slot: template.slot,
      requiredLevel,
      baseStats,
      combatStats,
      description: finalDescription
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
      description,
      battleTarget: template.battleTarget
    };
  }

  /**
   * 生成材料
   * @param level 物品等级
   */
  generateMaterial(level: number): Material {
    const templates = getMaterialData();
    const leveledTemplates = templates
      .filter((template) => typeof template.level === "number")
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const pool = leveledTemplates.length > 0 ? leveledTemplates : templates;
    let template = pool[Math.floor(Math.random() * pool.length)];

    if (leveledTemplates.length > 0) {
      const candidate = leveledTemplates
        .filter((entry) => (entry.level ?? 0) <= level)
        .pop();
      template = candidate ?? leveledTemplates[0];
    }

    // 优先使用模板中的描述，如果不存在或为空则使用默认描述
    const description = (template.description && template.description.trim())
      ? template.description
      : `${template.name}，可用于合成或强化。`;

    return {
      id: this.generateItemId(),
      templateId: template.templateId,
      name: template.name,
      type: "material",
      level: template.level ?? level,
      stackSize: 1,
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
