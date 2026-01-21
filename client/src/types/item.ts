// 客户端物品类型定义（与服务端同步）
import type { BaseStats, CombatStats } from "./game";

// 物品类型枚举
export type ItemType = "equipment" | "consumable" | "material";

// 物品品质枚举
export type ItemQuality = "common" | "uncommon" | "rare" | "epic" | "legendary";

// 装备槽位枚举
export type EquipmentSlot = "weapon" | "helmet" | "armor" | "leggings" | "boots" | "accessory";

// 消耗品效果类型
export interface ConsumableEffect {
  type: "heal" | "mana" | "buff" | "stat";
  value?: number; // 数值（如恢复量、属性加成）
  duration?: number; // 持续时间（回合数，仅buff类型）
  statType?: keyof BaseStats | keyof CombatStats; // 属性类型（仅stat类型）
}

// 基础物品接口
export interface Item {
  id: string; // 唯一ID
  templateId: string; // 模板ID（如 "sword_001"）
  name: string; // 物品名称
  type: ItemType; // 物品类型
  quality: ItemQuality; // 品质
  level: number; // 物品等级
  description?: string; // 物品描述
}

// 装备接口
export interface Equipment extends Item {
  type: "equipment";
  slot: EquipmentSlot; // 装备槽位
  baseStats?: Partial<BaseStats>; // 基础属性加成
  combatStats?: Partial<CombatStats>; // 战斗属性加成
}

// 消耗品接口
export interface Consumable extends Item {
  type: "consumable";
  effect: ConsumableEffect; // 使用效果
  stackSize: number; // 堆叠数量
}

// 材料接口
export interface Material extends Item {
  type: "material";
  stackSize: number; // 堆叠数量
}

// 类型守卫函数
export function isEquipment(item: Item): item is Equipment {
  return item.type === "equipment";
}

export function isConsumable(item: Item): item is Consumable {
  return item.type === "consumable";
}

export function isMaterial(item: Item): item is Material {
  return item.type === "material";
}

// 装备槽位映射
export interface EquipmentSlots {
  weapon?: Equipment;
  helmet?: Equipment;
  armor?: Equipment;
  leggings?: Equipment;
  boots?: Equipment;
  accessory?: Equipment;
}

// 品质名称映射（中文）
export const QUALITY_NAMES: Record<ItemQuality, string> = {
  common: "普通",
  uncommon: "精良",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说"
};

// 槽位名称映射（中文）
export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  weapon: "武器",
  helmet: "头盔",
  armor: "护甲",
  leggings: "护腿",
  boots: "靴子",
  accessory: "饰品"
};

// 品质颜色映射
export const QUALITY_COLORS: Record<ItemQuality, string> = {
  common: "#9d9d9d", // 灰色
  uncommon: "#1eff00", // 绿色
  rare: "#0070dd", // 蓝色
  epic: "#a335ee", // 紫色
  legendary: "#ff8000" // 橙色
};
