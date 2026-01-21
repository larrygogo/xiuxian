import { logLine } from "../services/logger";
import { generateRandomItem } from "../services/itemService";
import { refreshDerivedStats } from "./battle";
import type { GameState } from "../types/game";
import type { Item, Equipment, Consumable, Material, EquipmentSlot } from "../types/item";
import { isEquipment, isConsumable, isMaterial } from "../types/item";

// 背包最大容量
const MAX_INVENTORY_SIZE = 100;

/**
 * 添加物品到背包
 * 如果背包已满，返回false
 */
export function addItemToInventory(state: GameState, item: Item): boolean {
  if (!state.inventory) {
    state.inventory = [];
  }

  if (state.inventory.length >= MAX_INVENTORY_SIZE) {
    return false;
  }

  // 如果是可堆叠物品，尝试合并到现有堆叠
  if (isConsumable(item) || isMaterial(item)) {
    const existingItem = state.inventory.find(
      invItem => invItem.templateId === item.templateId && invItem.quality === item.quality
    );

    if (existingItem) {
      if (isConsumable(existingItem) && isConsumable(item)) {
        const maxStack = 99;
        if (existingItem.stackSize + item.stackSize <= maxStack) {
          existingItem.stackSize += item.stackSize;
          logLine(`获得 ${item.name} x${item.stackSize}（堆叠至 ${existingItem.stackSize}）。`, state);
          return true;
        }
      } else if (isMaterial(existingItem) && isMaterial(item)) {
        const maxStack = 99;
        if (existingItem.stackSize + item.stackSize <= maxStack) {
          existingItem.stackSize += item.stackSize;
          logLine(`获得 ${item.name} x${item.stackSize}（堆叠至 ${existingItem.stackSize}）。`, state);
          return true;
        }
      }
    }
  }

  // 无法堆叠或新物品，直接添加
  state.inventory.push(item);
  logLine(`获得 ${item.name}。`, state);
  return true;
}

/**
 * 从背包移除物品
 */
export function removeItemFromInventory(state: GameState, itemId: string): Item | null {
  if (!state.inventory) {
    state.inventory = [];
    return null;
  }

  const index = state.inventory.findIndex(item => item.id === itemId);
  if (index === -1) {
    return null;
  }

  const item = state.inventory[index];
  state.inventory.splice(index, 1);
  return item;
}

/**
 * 装备物品
 * 如果槽位已有装备，会先卸下旧装备到背包
 */
export function equipItem(state: GameState, itemId: string): boolean {
  if (!state.inventory) {
    state.inventory = [];
  }
  if (!state.equipment) {
    state.equipment = {};
  }

  const item = state.inventory.find(i => i.id === itemId);
  if (!item || !isEquipment(item)) {
    return false;
  }

  const slot = item.slot;

  // 如果槽位已有装备，先卸下
  const oldEquipment = state.equipment[slot];
  if (oldEquipment) {
    // 尝试将旧装备放回背包
    if (state.inventory.length >= MAX_INVENTORY_SIZE) {
      // 背包已满，无法卸下旧装备
      return false;
    }
    state.inventory.push(oldEquipment);
    logLine(`卸下 ${oldEquipment.name}。`, state);
  }

  // 从背包移除并装备
  removeItemFromInventory(state, itemId);
  state.equipment[slot] = item;
  logLine(`装备 ${item.name}。`, state);

  // 刷新属性（装备会影响战斗属性）
  refreshDerivedStats(state);

  return true;
}

/**
 * 卸下装备
 */
export function unequipItem(state: GameState, slot: EquipmentSlot): boolean {
  if (!state.equipment) {
    state.equipment = {};
  }
  if (!state.inventory) {
    state.inventory = [];
  }

  const equipment = state.equipment[slot];
  if (!equipment) {
    return false;
  }

  // 检查背包是否已满
  if (state.inventory.length >= MAX_INVENTORY_SIZE) {
    return false;
  }

  // 从装备槽移除并放回背包
  delete state.equipment[slot];
  state.inventory.push(equipment);
  logLine(`卸下 ${equipment.name}。`, state);

  // 刷新属性
  refreshDerivedStats(state);

  return true;
}

/**
 * 使用消耗品
 */
export function useConsumable(state: GameState, itemId: string): boolean {
  if (!state.inventory) {
    state.inventory = [];
    return false;
  }

  const item = state.inventory.find(i => i.id === itemId);
  if (!item || !isConsumable(item)) {
    return false;
  }

  const effect = item.effect;

  // 应用效果
  switch (effect.type) {
    case "heal":
      if (effect.value) {
        const oldHp = state.hp;
        state.hp = Math.min(state.maxHp, state.hp + effect.value);
        const healed = state.hp - oldHp;
        logLine(`使用 ${item.name}，恢复生命 +${healed}（${state.hp}/${state.maxHp}）。`, state);
      }
      break;

    case "mana":
      if (effect.value) {
        const oldMp = state.mp;
        state.mp = Math.min(state.maxMp, state.mp + effect.value);
        const restored = state.mp - oldMp;
        logLine(`使用 ${item.name}，恢复法力 +${restored}（${state.mp}/${state.maxMp}）。`, state);
      }
      break;

    case "buff":
      // TODO: 实现buff系统（临时属性加成）
      logLine(`使用 ${item.name}，获得临时增益效果。`, state);
      break;

    case "stat":
      // TODO: 实现永久属性加成（如果设计中有）
      logLine(`使用 ${item.name}，属性提升。`, state);
      break;
  }

  // 减少堆叠数量或移除物品
  if (item.stackSize > 1) {
    item.stackSize -= 1;
  } else {
    removeItemFromInventory(state, itemId);
  }

  return true;
}

/**
 * 掉落物品（战斗或探索中获得）
 */
export function dropItem(state: GameState, item?: Item): boolean {
  if (!item) {
    // 随机生成物品
    item = generateRandomItem(state.level);
  }

  return addItemToInventory(state, item);
}

/**
 * 计算装备提供的属性加成
 * 返回基础属性和战斗属性的加成
 */
export function getEquipmentStats(state: GameState): {
  baseStats: Partial<import("../types/game").BaseStats>;
  combatStats: Partial<import("../types/game").CombatStats>;
} {
  if (!state.equipment) {
    return { baseStats: {}, combatStats: {} };
  }

  const baseStats: Partial<import("../types/game").BaseStats> = {};
  const combatStats: Partial<import("../types/game").CombatStats> = {};

  // 遍历所有装备槽位
  for (const slot of Object.keys(state.equipment) as EquipmentSlot[]) {
    const equipment = state.equipment[slot];
    if (!equipment) continue;

    // 累加基础属性
    if (equipment.baseStats) {
      for (const [key, value] of Object.entries(equipment.baseStats)) {
        const statKey = key as keyof typeof baseStats;
        baseStats[statKey] = (baseStats[statKey] || 0) + value;
      }
    }

    // 累加战斗属性
    if (equipment.combatStats) {
      for (const [key, value] of Object.entries(equipment.combatStats)) {
        const statKey = key as keyof typeof combatStats;
        if (statKey === "elementRes") {
          // 元素抗性需要特殊处理（对象合并）
          if (!combatStats.elementRes) {
            combatStats.elementRes = { fire: 0, water: 0, lightning: 0 };
          }
          if (equipment.combatStats.elementRes) {
            combatStats.elementRes.fire += equipment.combatStats.elementRes.fire || 0;
            combatStats.elementRes.water += equipment.combatStats.elementRes.water || 0;
            combatStats.elementRes.lightning += equipment.combatStats.elementRes.lightning || 0;
          }
        } else if (typeof value === "number") {
          // 确保 value 是数字类型（elementRes 已在上面处理，这里 statKey 不可能是 elementRes）
          const currentValue = combatStats[statKey];
          if (typeof currentValue === "number") {
            (combatStats as any)[statKey] = currentValue + value;
          } else {
            (combatStats as any)[statKey] = value;
          }
        }
      }
    }
  }

  return { baseStats, combatStats };
}
