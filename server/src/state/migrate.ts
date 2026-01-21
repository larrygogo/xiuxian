import { TICKS_PER_DAY } from "../config";
import type { GameState } from "../types/game";
import type { Item, Equipment, Consumable, Material } from "../types/item";
import { isEquipment, isConsumable, isMaterial } from "../types/item";
import { getItemTemplates } from "../services/itemService";

// 统一生成自然日字符串（YYYY-MM-DD）
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 生成唯一的角色数字ID
 * 使用时间戳 + 随机数确保唯一性
 */
function generateCharacterId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/**
 * 迁移和验证游戏状态
 * 确保所有必需字段存在且类型正确，修复损坏的存档
 */
export function migrateState(state: unknown): GameState | null {
  if (!state || typeof state !== "object") return null;

  const s = state as Partial<GameState>;

  // 角色ID：如果不存在则生成一个新的
  if (typeof s.characterId !== "number") {
    s.characterId = generateCharacterId();
  }

  // 基础字段兜底
  if (typeof s.name !== "string") s.name = "无名修士";
  // 等级：只在不存在或无效时才设置为默认值 1
  if (typeof s.level !== "number" || s.level < 1 || s.level > 100) {
    s.level = 1;
  }

  if (typeof s.qi !== "number") s.qi = 0;
  if (typeof s.lingshi !== "number") s.lingshi = 0;
  if (typeof s.hp !== "number") s.hp = 100;
  if (typeof s.maxHp !== "number") s.maxHp = 100;
  if (typeof s.mp !== "number") s.mp = 50;
  if (typeof s.maxMp !== "number") s.maxMp = 50;
  if (typeof s.statPoints !== "number") s.statPoints = 0;

  if (typeof s.alive !== "boolean") s.alive = true;
  if (typeof s.lastTs !== "number") s.lastTs = Date.now();

  // 修复已死亡的玩家：应用新的死亡惩罚逻辑
  if (s.alive === false) {
    // 战斗死亡惩罚：保留1HP，清空MP，扣除3%灵气和10%灵石
    const qiLoss = Math.floor((s.qi || 0) * 0.03);
    const lingshiLoss = Math.floor((s.lingshi || 0) * 0.1);
    
    s.hp = 1;
    s.mp = 0;
    s.qi = Math.max(0, (s.qi || 0) - qiLoss);
    s.lingshi = Math.max(0, (s.lingshi || 0) - lingshiLoss);
    s.alive = true;
  }

  // 事件日志兜底
  if (!Array.isArray(s.eventLog)) {
    s.eventLog = [];
  }

  // 每日计数兜底
  if (!s.daily || typeof s.daily !== "object") {
    s.daily = {
      remainingTicks: TICKS_PER_DAY,
      lastResetDate: getDateString(),
      beastCount: 0,
      fortuneCount: 0
    };
  } else {
    if (typeof s.daily.remainingTicks !== "number") s.daily.remainingTicks = TICKS_PER_DAY;
    if (typeof s.daily.lastResetDate !== "string") s.daily.lastResetDate = getDateString();
    if (typeof s.daily.beastCount !== "number") s.daily.beastCount = 0;
    if (typeof s.daily.fortuneCount !== "number") s.daily.fortuneCount = 0;
  }

  // 物品系统兜底
  if (!Array.isArray(s.inventory)) {
    s.inventory = Array(20).fill(null);
  } else {
    // 迁移旧的 Item[] 格式到新的 (Item | null)[] 格式（固定20个位置）
    const oldInventory = s.inventory as Item[];
    const newInventory: (Item | null)[] = Array(20).fill(null);
    // 将旧数组中的物品按顺序放入新数组的前20个位置
    for (let i = 0; i < Math.min(oldInventory.length, 20); i++) {
      if (oldInventory[i] !== null && oldInventory[i] !== undefined) {
        newInventory[i] = oldInventory[i];
      }
    }
    s.inventory = newInventory;
  }
  if (!s.equipment || typeof s.equipment !== "object") {
    s.equipment = {};
  }

  // 移除旧字段（若存在）
  if ("realmIndex" in s) delete (s as Record<string, unknown>).realmIndex;
  if ("phase" in s) delete (s as Record<string, unknown>).phase;

  const finalState = s as GameState;
  
  // 更新旧物品的描述（在类型转换后）
  updateItemDescriptions(finalState);

  return finalState;
}

/**
 * 更新物品描述：将旧的默认描述替换为模板中的描述
 */
function updateItemDescriptions(state: GameState): void {
  try {
    const templates = getItemTemplates();
    
    // 更新背包中的物品
    if (Array.isArray(state.inventory)) {
      for (const item of state.inventory) {
        if (item !== null) {
          updateItemDescription(item, templates);
        }
      }
    }
    
    // 更新装备中的物品
    if (state.equipment && typeof state.equipment === "object") {
      for (const slot in state.equipment) {
        const item = state.equipment[slot as keyof typeof state.equipment];
        if (item) {
          updateItemDescription(item, templates);
        }
      }
    }
  } catch (error) {
    // 如果更新失败，不影响游戏状态加载
    console.warn("更新物品描述失败:", error);
  }
}

/**
 * 更新单个物品的描述
 */
function updateItemDescription(
  item: Item,
  templates: ReturnType<typeof getItemTemplates>
): void {
  // 如果描述已经是模板中的描述，不需要更新
  // 检查描述是否是旧的默认格式
  const oldPatterns = [
    /，适合\d+级修士使用。$/,
    /，使用后可恢复或增强。$/,
    /，可用于合成或强化。$/
  ];
  
  const isOldDescription = oldPatterns.some(pattern => pattern.test(item.description || ""));
  
  if (!isOldDescription && item.description) {
    // 描述看起来已经是新的，不需要更新
    return;
  }
  
  // 根据物品类型查找模板
  let template: { description?: string } | undefined;
  
  if (isEquipment(item)) {
    const equipment = item as Equipment;
    // templates.equipment 已经是数组，包含所有装备模板
    template = templates.equipment.find(t => t.templateId === item.templateId);
  } else if (isConsumable(item)) {
    template = templates.consumables.find(t => t.templateId === item.templateId);
  } else if (isMaterial(item)) {
    template = templates.materials.find(t => t.templateId === item.templateId);
  }
  
  // 如果找到模板且有描述，更新物品描述
  if (template && template.description && template.description.trim()) {
    item.description = template.description;
  }
}
