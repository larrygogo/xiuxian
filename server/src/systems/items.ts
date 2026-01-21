import { logLine } from "../services/logger";
import { generateRandomItem } from "../services/itemService";
import { refreshDerivedStats } from "./stats";
import type { GameState, CombatStats } from "../types/game";
import type { Item, Equipment, Consumable, Material, EquipmentSlot } from "../types/item";
import { isEquipment, isConsumable, isMaterial } from "../types/item";

// 背包固定大小（20个位置）
const INVENTORY_SIZE = 20;

/**
 * 添加物品到背包
 * 如果背包已满，返回false
 */
export function addItemToInventory(state: GameState, item: Item): boolean {
  if (!state.inventory) {
    state.inventory = Array(INVENTORY_SIZE).fill(null);
  }

  // 确保 inventory 数组长度为 INVENTORY_SIZE
  while (state.inventory.length < INVENTORY_SIZE) {
    state.inventory.push(null);
  }
  state.inventory = state.inventory.slice(0, INVENTORY_SIZE);

  // 如果是可堆叠物品，尝试合并到现有堆叠
  if (isConsumable(item) || isMaterial(item)) {
    const existingItem = state.inventory.find(
      invItem => invItem !== null && invItem.templateId === item.templateId
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

  // 无法堆叠或新物品，找到第一个空位置添加
  const emptyIndex = state.inventory.findIndex(slot => slot === null);
  if (emptyIndex === -1) {
    return false; // 背包已满
  }

  state.inventory[emptyIndex] = item;
  logLine(`获得 ${item.name}。`, state);
  return true;
}

/**
 * 从背包移除物品
 */
export function removeItemFromInventory(state: GameState, itemId: string): Item | null {
  if (!state.inventory) {
    state.inventory = Array(INVENTORY_SIZE).fill(null);
    return null;
  }

  const index = state.inventory.findIndex(item => item !== null && item.id === itemId);
  if (index === -1) {
    return null;
  }

  const item = state.inventory[index];
  state.inventory[index] = null;
  return item;
}

/**
 * 装备物品
 * 如果槽位已有装备，会先卸下旧装备到背包
 */
export function equipItem(state: GameState, itemId: string): boolean {
  if (!state.inventory) {
    state.inventory = Array(INVENTORY_SIZE).fill(null);
  }
  if (!state.equipment) {
    state.equipment = {};
  }

  const item = state.inventory.find(i => i !== null && i.id === itemId);
  if (!item || !isEquipment(item)) {
    return false;
  }

  // 检查玩家等级是否满足装备需求等级
  if (state.level < item.requiredLevel) {
    logLine(`无法装备 ${item.name}：需要等级 ${item.requiredLevel}，当前等级 ${state.level}。`, state);
    return false;
  }

  const slot = item.slot;

  // 如果槽位已有装备，先卸下
  const oldEquipment = state.equipment[slot];
  if (oldEquipment) {
    // 尝试将旧装备放回背包（找到第一个空位置）
    const emptyIndex = state.inventory.findIndex(slot => slot === null);
    if (emptyIndex === -1) {
      // 背包已满，无法卸下旧装备
      return false;
    }
    state.inventory[emptyIndex] = oldEquipment;
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
    state.inventory = Array(INVENTORY_SIZE).fill(null);
  }

  const equipment = state.equipment[slot];
  if (!equipment) {
    return false;
  }

  // 找到第一个空位置
  const emptyIndex = state.inventory.findIndex(slot => slot === null);
  if (emptyIndex === -1) {
    // 背包已满
    return false;
  }

  // 从装备槽移除并放回背包
  delete state.equipment[slot];
  state.inventory[emptyIndex] = equipment;
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
    state.inventory = Array(INVENTORY_SIZE).fill(null);
    return false;
  }

  const item = state.inventory.find(i => i !== null && i.id === itemId);
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
      // 处理元素抗性（扩展属性，不在标准 CombatStats 中）
      type ExtendedCombatStats = Partial<CombatStats> & {
        elementRes?: { fire?: number; water?: number; lightning?: number };
      };
      const equipmentCombatStats = equipment.combatStats as ExtendedCombatStats;
      
      if (equipmentCombatStats.elementRes) {
        if (!(combatStats as any).elementRes) {
          (combatStats as any).elementRes = { fire: 0, water: 0, lightning: 0 };
        }
        const elementRes = (combatStats as any).elementRes as { fire: number; water: number; lightning: number };
        elementRes.fire += equipmentCombatStats.elementRes.fire || 0;
        elementRes.water += equipmentCombatStats.elementRes.water || 0;
        elementRes.lightning += equipmentCombatStats.elementRes.lightning || 0;
      }

      // 处理其他标准战斗属性
      for (const [key, value] of Object.entries(equipment.combatStats)) {
        // 跳过 elementRes，已在上面处理
        if (key === "elementRes") continue;
        
        if (typeof value === "number") {
          const statKey = key as keyof typeof combatStats;
          const currentValue = (combatStats as any)[statKey];
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

/**
 * 重新排序背包物品
 * itemIds 数组长度为20，null表示空位置，字符串表示物品ID
 */
export function reorderItems(state: GameState, itemIds: (string | null)[]): boolean {
  if (!state.inventory) {
    state.inventory = Array(INVENTORY_SIZE).fill(null);
  }

  // 确保 itemIds 长度为 INVENTORY_SIZE
  const normalizedItemIds = [...itemIds];
  while (normalizedItemIds.length < INVENTORY_SIZE) {
    normalizedItemIds.push(null);
  }
  normalizedItemIds.splice(INVENTORY_SIZE);

  // 创建物品ID到物品的映射
  const itemsMap = new Map<string, Item>();
  state.inventory.forEach(item => {
    if (item !== null) {
      itemsMap.set(item.id, item);
    }
  });

  // 按照新的顺序重新排列物品
  const newInventory: (Item | null)[] = [];
  for (const itemId of normalizedItemIds) {
    if (itemId === null) {
      newInventory.push(null);
    } else {
      const item = itemsMap.get(itemId);
      if (item) {
        newInventory.push(item);
        itemsMap.delete(itemId);
      } else {
        newInventory.push(null);
      }
    }
  }

  // 添加任何未在itemIds中的物品到末尾的空位置（以防万一）
  itemsMap.forEach(item => {
    const emptyIndex = newInventory.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      newInventory[emptyIndex] = item;
    }
  });

  state.inventory = newInventory;
  return true;
}
