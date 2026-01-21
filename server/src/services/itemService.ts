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

// 物品配置
interface ItemConfig {
  // 配置字段已移除，保留接口以便将来扩展
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

// 获取所有装备模板（武器+防具）
export function getAllEquipmentTemplates(): EquipmentTemplate[] {
  const data = getEquipmentData();
  return [...data.weapons, ...data.armor];
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
  const equipmentData = getEquipmentData();
  return {
    equipment: getAllEquipmentTemplates(),
    consumables: getConsumableData(),
    materials: getMaterialData()
  };
}
