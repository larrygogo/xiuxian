import { readFileSync } from "fs";
import { join } from "path";
import type { BaseStats, CombatStats } from "../types/game";
import type {
  Equipment,
  Item,
  ItemQuality,
  ItemType,
  EquipmentSlot,
  Consumable,
  Material,
  ConsumableEffect
} from "../types/item";

// 装备模板定义
interface EquipmentTemplate {
  templateId: string;
  name: string;
  description?: string;
  slot: EquipmentSlot;
  baseStatTypes: (keyof BaseStats)[];
  combatStatTypes: (keyof CombatStats)[];
  baseValueRange: [number, number];
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

// 物品配置
interface ItemConfig {
  qualityMultipliers: Record<ItemQuality, number>;
  qualityDropChances: Record<ItemQuality, number>;
  qualityPrefixes: Record<ItemQuality, string>;
}

// 装备数据
interface EquipmentData {
  weapons: EquipmentTemplate[];
  armor: EquipmentTemplate[];
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
  return JSON.parse(data) as EquipmentData;
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

function getEquipmentData(): EquipmentData {
  if (!equipmentDataCache) {
    equipmentDataCache = loadEquipmentData();
  }
  return equipmentDataCache;
}

function getConsumableData(): ConsumableTemplate[] {
  if (!consumableDataCache) {
    consumableDataCache = loadConsumableData();
  }
  return consumableDataCache;
}

function getMaterialData(): MaterialTemplate[] {
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

function getItemConfig(): ItemConfig {
  if (!itemConfigCache) {
    itemConfigCache = loadItemConfig();
  }
  return itemConfigCache;
}

// 获取所有装备模板（武器+防具）
function getAllEquipmentTemplates(): EquipmentTemplate[] {
  const data = getEquipmentData();
  return [...data.weapons, ...data.armor];
}

/**
 * 生成唯一物品ID
 */
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 根据随机数生成品质
 */
function generateQuality(): ItemQuality {
  const config = getItemConfig();
  const r = Math.random();
  if (r < config.qualityDropChances.common) return "common";
  if (r < config.qualityDropChances.uncommon) return "uncommon";
  if (r < config.qualityDropChances.rare) return "rare";
  if (r < config.qualityDropChances.epic) return "epic";
  return "legendary";
}

/**
 * 在范围内生成随机值
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成装备物品
 */
export function generateEquipment(level: number, slot?: EquipmentSlot): Equipment {
  const config = getItemConfig();
  const quality = generateQuality();
  const multiplier = config.qualityMultipliers[quality];

  // 选择模板
  let templates: EquipmentTemplate[];
  if (slot) {
    templates = getAllEquipmentTemplates().filter(t => t.slot === slot);
  } else {
    templates = getAllEquipmentTemplates();
  }

  if (templates.length === 0) {
    // 默认生成武器
    const data = getEquipmentData();
    templates = data.weapons;
  }

  const template = templates[Math.floor(Math.random() * templates.length)];

  // 根据等级和品质计算属性
  const levelScale = 1 + (level - 1) * 0.1;
  const baseStats: Partial<BaseStats> = {};
  const combatStats: Partial<CombatStats> = {};

  // 生成基础属性
  for (const statType of template.baseStatTypes) {
    const [min, max] = template.baseValueRange;
    const value = Math.floor((randomInRange(min, max) * multiplier * levelScale));
    baseStats[statType] = ((baseStats[statType] as number) || 0) + value;
  }

  // 生成战斗属性
  for (const statType of template.combatStatTypes) {
    const [min, max] = template.combatValueRange;
    const value = Math.floor((randomInRange(min, max) * multiplier * levelScale));
    const currentValue = combatStats[statType];
    if (typeof currentValue === "number") {
      (combatStats as any)[statType] = currentValue + value;
    } else {
      (combatStats as any)[statType] = value;
    }
  }

  const name = config.qualityPrefixes[quality] + template.name;
  // 优先使用模板中的描述，如果不存在或为空则使用默认描述
  const description = (template.description && template.description.trim()) 
    ? template.description 
    : `${name}，适合${level}级修士使用。`;

  return {
    id: generateItemId(),
    templateId: template.templateId,
    name,
    type: "equipment",
    quality,
    level,
    slot: template.slot,
    baseStats,
    combatStats,
    description
  };
}

/**
 * 生成消耗品
 */
export function generateConsumable(level: number): Consumable {
  const templates = getConsumableData();
  const template = templates[Math.floor(Math.random() * templates.length)];
  const config = getItemConfig();
  const quality = generateQuality();
  const multiplier = config.qualityMultipliers[quality];

  // 根据品质调整效果值
  const effect: ConsumableEffect = { ...template.effect };
  if (effect.value) {
    effect.value = Math.floor(effect.value * multiplier);
  }

  const name = config.qualityPrefixes[quality] + template.name;
  // 优先使用模板中的描述，如果不存在或为空则使用默认描述
  const description = (template.description && template.description.trim()) 
    ? template.description 
    : `${name}，使用后可恢复或增强。`;

  return {
    id: generateItemId(),
    templateId: template.templateId,
    name,
    type: "consumable",
    quality,
    level,
    effect,
    stackSize: 1,
    description
  };
}

/**
 * 生成材料
 */
export function generateMaterial(level: number): Material {
  const templates = getMaterialData();
  const template = templates[Math.floor(Math.random() * templates.length)];
  const quality = generateQuality();

  // 优先使用模板中的描述，如果不存在或为空则使用默认描述
  const description = (template.description && template.description.trim()) 
    ? template.description 
    : `${template.name}，可用于合成或强化。`;

  return {
    id: generateItemId(),
    templateId: template.templateId,
    name: template.name,
    type: "material",
    quality,
    level,
    stackSize: randomInRange(1, 5),
    description
  };
}

/**
 * 随机生成物品（根据类型）
 */
export function generateRandomItem(level: number, type?: ItemType): Item {
  if (type === "equipment") {
    return generateEquipment(level);
  }
  if (type === "consumable") {
    return generateConsumable(level);
  }
  if (type === "material") {
    return generateMaterial(level);
  }

  // 随机类型
  const r = Math.random();
  if (r < 0.5) {
    return generateEquipment(level);
  } else if (r < 0.8) {
    return generateConsumable(level);
  } else {
    return generateMaterial(level);
  }
}

/**
 * 获取物品模板列表（用于客户端显示）
 */
export function getItemTemplates() {
  const equipmentData = getEquipmentData();
  return {
    equipment: getAllEquipmentTemplates(),
    consumables: getConsumableData(),
    materials: getMaterialData()
  };
}
