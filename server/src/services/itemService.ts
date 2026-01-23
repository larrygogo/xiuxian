import { readFileSync } from "fs";
import { join } from "path";
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
import { ItemGenerator } from "./ItemGenerator";

// 装备模板定义
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
}

// 材料模板
interface MaterialTemplate {
  templateId: string;
  name: string;
  description?: string;
  level?: number;
}

// 物品配置
interface TierBase {
  pdmg: number;
  mdmg: number;
  pdef: number;
  mdef: number;
  spd: number;
  hit: number;
  maxHp: number;
  maxMp: number;
}

interface ItemConfig {
  secondary: {
    systemChance: number;
    craftedChance: number;
    subStatMultiplier: number;
    minMultiplier: number;
    maxMultiplier: number;
  };
  crafted: {
    maxMultiplier: number;
    minMultiplier: number;
  };
  tierBase: Record<string, TierBase>;
}

// 装备数据
interface EquipmentData {
  weapons: EquipmentTemplate[];
  armor: EquipmentTemplate[];
  baseAffixConfig?: Partial<Record<EquipmentSlot, EquipmentTemplate["baseAffix"]>>;
}

// 加载 JSON 数据
// 在开发环境（ts-node）：__dirname 是 src/services，需要回到 server/data
// 在生产环境（编译后）：__dirname 是 dist/services，需要回到 server/data
// 尝试多个可能的路径以确保兼容性
function getDataDir(): string {
  // 尝试从 process.cwd() 开始查找
  const cwd = process.cwd();
  const possiblePaths = [
    join(cwd, "server", "data"),  // 从项目根目录启动
    join(cwd, "data"),             // 从 server 目录启动
    join(__dirname, "..", "..", "data"),  // 从编译后的位置
    join(__dirname, "..", "data")  // 从 src/services 位置
  ];
  
  for (const path of possiblePaths) {
    try {
      const testFile = join(path, "itemConfig.json");
      if (require("fs").existsSync(testFile)) {
        return path;
      }
    } catch {
      // 继续尝试下一个路径
    }
  }
  
  // 如果都找不到，默认使用 server/data
  return join(cwd, "server", "data");
}

const DATA_DIR = getDataDir();

function loadEquipmentData(): EquipmentData {
  const filePath = join(DATA_DIR, "equipment.json");
  const data = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(data) as EquipmentData;
  if (parsed.baseAffixConfig) {
    for (const template of [...parsed.weapons, ...parsed.armor]) {
      const cfg = parsed.baseAffixConfig[template.slot];
      if (cfg) {
        template.baseAffix = cfg;
      }
    }
  }
  const config = getItemConfig();
  validateEquipmentData(parsed, config);
  return parsed;
}

function loadConsumableData(): ConsumableTemplate[] {
  const filePath = join(DATA_DIR, "consumables.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data) as ConsumableTemplate[];
}

function loadMaterialData(): MaterialTemplate[] {
  const filePath = join(DATA_DIR, "materials.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data) as MaterialTemplate[];
}

function loadItemConfig(): ItemConfig {
  const filePath = join(DATA_DIR, "itemConfig.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data) as ItemConfig;
}

// 缓存加载的数据
let equipmentDataCache: EquipmentData | null = null;
let consumableDataCache: ConsumableTemplate[] | null = null;
let materialDataCache: MaterialTemplate[] | null = null;
let itemConfigCache: ItemConfig | null = null;

export function getEquipmentData(): EquipmentData {
  if (!equipmentDataCache) {
    equipmentDataCache = loadEquipmentData();
  }
  return equipmentDataCache;
}

export function getConsumableData(): ConsumableTemplate[] {
  if (!consumableDataCache) {
    consumableDataCache = loadConsumableData();
  }
  return consumableDataCache;
}

export function getMaterialData(): MaterialTemplate[] {
  if (!materialDataCache) {
    materialDataCache = loadMaterialData();
  }
  return materialDataCache;
}

/**
 * 清除缓存，强制重新加载数据（用于开发时更新JSON文件）
 */
export function clearItemDataCache(): void {
  equipmentDataCache = null;
  consumableDataCache = null;
  materialDataCache = null;
  itemConfigCache = null;
}

export function getItemConfig(): ItemConfig {
  if (!itemConfigCache) {
    itemConfigCache = loadItemConfig();
  }
  return itemConfigCache;
}

const COMBAT_STAT_KEYS: CombatStatType[] = [
  "hit",
  "pdmg",
  "pdef",
  "spd",
  "mdmg",
  "mdef",
  "maxHp",
  "maxMp"
];

function getTierFromTemplateId(templateId: string): number | null {
  const match = templateId.match(/_(\d{3})$/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (parsed === 1) return 1;
  if (parsed % 10 !== 0) return null;
  return parsed;
}

function clampSecondaryRange(min: number, max: number): [number, number] {
  const safeMin = Math.max(1, min);
  const safeMax = Math.max(safeMin, max);
  return [safeMin, safeMax];
}

function getExpectedRange(
  tierBase: TierBase,
  statType: CombatStatType,
  isSecondary: boolean,
  config: ItemConfig
): [number, number] {
  const baseValue = tierBase[statType];
  const minMultiplier = config.secondary.minMultiplier;
  const maxMultiplier = config.secondary.maxMultiplier;
  const effectiveBase = isSecondary
    ? baseValue * config.secondary.subStatMultiplier
    : baseValue;
  const min = Math.floor(effectiveBase * minMultiplier);
  const max = Math.floor(effectiveBase * maxMultiplier);
  if (isSecondary) {
    return clampSecondaryRange(min, max);
  }
  return [min, max];
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

function validateEquipmentData(data: EquipmentData, config: ItemConfig): void {
  const templates = [...data.weapons, ...data.armor];
  templates.forEach((template) => {
    const { templateId, slot, source, combatStats } = template;
    if (!templateId) {
      throw new Error("装备模板缺少 templateId");
    }
    if (!slot) {
      throw new Error(`装备模板缺少 slot: ${templateId}`);
    }
    if (source !== "system" && source !== "crafted") {
      throw new Error(`装备模板 source 非法: ${templateId}`);
    }
    const expectedTier = getTierFromTemplateId(templateId);
    if (expectedTier === null) {
      throw new Error(`装备模板 templateId 不含合法等级段: ${templateId}`);
    }
    const tierBase = config.tierBase[String(expectedTier)];
    if (!tierBase) {
      throw new Error(`装备模板 tier 未配置: ${templateId}`);
    }
    if (!combatStats || combatStats.length === 0) {
      throw new Error(`装备模板 combatStats 为空: ${templateId}`);
    }
    const seenTypes = new Set<CombatStatType>();
    combatStats.forEach((stat) => {
      if (!COMBAT_STAT_KEYS.includes(stat.type)) {
        throw new Error(`装备模板 combatStats.type 非法: ${templateId}`);
      }
      if (seenTypes.has(stat.type)) {
        throw new Error(`装备模板 combatStats.type 重复: ${templateId}`);
      }
      seenTypes.add(stat.type);
      if (!Number.isFinite(stat.min) || !Number.isFinite(stat.max)) {
        throw new Error(`装备模板 combatStats 数值非法: ${templateId}`);
      }
      if (stat.min > stat.max) {
        throw new Error(`装备模板 combatStats min > max: ${templateId}`);
      }
      const role = getStatRole(slot, stat.type);
      if (role === "invalid") {
        throw new Error(`装备模板 combatStats 与槽位不匹配: ${templateId}`);
      }
      const [expectedMin, expectedMax] = getExpectedRange(tierBase, stat.type, role === "secondary", config);
      // 运行时以规则计算为准，避免手工维护 JSON 中的大量数值范围
      stat.min = expectedMin;
      stat.max = expectedMax;
    });

    switch (slot) {
      case "weapon": {
        if (combatStats.length !== 1) {
          throw new Error(`武器模板必须只有一条属性: ${templateId}`);
        }
        break;
      }
      case "boots": {
        if (combatStats.length !== 1 || combatStats[0].type !== "spd") {
          throw new Error(`靴子模板必须只有速度属性: ${templateId}`);
        }
        break;
      }
      case "armor": {
        if (combatStats.length !== 2 || !seenTypes.has("pdef") || !seenTypes.has("maxHp")) {
          throw new Error(`护甲模板必须包含 pdef 与 maxHp: ${templateId}`);
        }
        break;
      }
      case "helmet": {
        if (!seenTypes.has("pdef")) {
          throw new Error(`头盔模板必须包含 pdef: ${templateId}`);
        }
        if (combatStats.length > 2) {
          throw new Error(`头盔模板最多两条属性: ${templateId}`);
        }
        break;
      }
      case "leggings": {
        if (!seenTypes.has("mdef")) {
          throw new Error(`护腿模板必须包含 mdef: ${templateId}`);
        }
        if (combatStats.length > 2) {
          throw new Error(`护腿模板最多两条属性: ${templateId}`);
        }
        break;
      }
      case "accessory": {
        const hasPrimary = seenTypes.has("hit") || seenTypes.has("maxMp");
        if (!hasPrimary) {
          throw new Error(`饰品模板必须包含 hit 或 maxMp: ${templateId}`);
        }
        if (seenTypes.has("hit") && seenTypes.has("maxMp")) {
          throw new Error(`饰品模板只能有一个主属性: ${templateId}`);
        }
        if (combatStats.length > 2) {
          throw new Error(`饰品模板最多两条属性: ${templateId}`);
        }
        break;
      }
      default:
        break;
    }
  });
}

// 获取所有装备模板（武器+防具）
export function getAllEquipmentTemplates(): EquipmentTemplate[] {
  const data = getEquipmentData();
  return [...data.weapons, ...data.armor];
}

export function getRequiredLevelFromTemplateId(templateId: string): number {
  const match = templateId.match(/_(\d{3})$/);
  if (!match) return 1;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed === 1 ? 0 : parsed;
}

// 注意：generateItemId, generateQuality, randomInRange 等辅助函数已移至 ItemGenerator 类中

/**
 * 物品生成器单例实例
 */
export const itemGenerator = new ItemGenerator();

/**
 * 生成装备物品（向后兼容函数）
 */
export function generateEquipment(level: number, slot?: EquipmentSlot): Equipment {
  return itemGenerator.generateEquipment(level, slot);
}

/**
 * 生成消耗品（向后兼容函数）
 */
export function generateConsumable(level: number): Consumable {
  return itemGenerator.generateConsumable(level);
}

/**
 * 生成材料（向后兼容函数）
 */
export function generateMaterial(level: number): Material {
  return itemGenerator.generateMaterial(level);
}

/**
 * 随机生成物品（根据类型）（向后兼容函数）
 */
export function generateRandomItem(level: number, type?: ItemType): Item {
  return itemGenerator.generateRandomItem(level, type);
}

/**
 * 获取物品模板列表（用于客户端显示）
 */
export function getItemTemplates() {
  return {
    equipment: getAllEquipmentTemplates().map((template) => {
      return {
        templateId: template.templateId,
        slot: template.slot,
        source: template.source,
        combatStats: template.combatStats,
        name: template.name,
        description: template.description,
        requiredLevel: getRequiredLevelFromTemplateId(template.templateId)
      };
    }),
    consumables: getConsumableData(),
    materials: getMaterialData()
  };
}
