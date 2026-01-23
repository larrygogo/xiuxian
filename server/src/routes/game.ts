import express, { Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  getUserGameState,
  initializeUserGame,
  updateUserGameState,
  findUserIdByCharacterId
} from "../services/gameService";
import { toClientState } from "../services/stateView";
import { heal } from "../systems/actions";
import { stepUpOnce, needQi } from "../systems/progression";
import { logLine } from "../services/logger";
import { equipItem, unequipItem, useConsumable, reorderItems, addItemToInventory, mergeStackableItems } from "../systems/items";
import { getAllEquipmentTemplates, getConsumableData, getItemTemplates, getMaterialData, itemGenerator } from "../services/itemService";
import { refreshDerivedStats } from "../systems/stats";
import { getUserById } from "../services/userService";
import { generateCharacterId } from "../state/defaultState";
import type { EquipmentSlot, ItemType } from "../types/item";

const router = express.Router();

// 所有游戏路由都需要认证
router.use(authenticateToken);

/**
 * 获取游戏状态
 * GET /api/game/state
 */
router.get("/state", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    let state = getUserGameState(userId);

    // 如果用户还没有初始化游戏，则初始化
    if (!state) {
      // 这里不需要实时推送，传入 null 即可
      state = await initializeUserGame(userId, null);
    }

    // 刷新属性，确保装备属性正确应用
    refreshDerivedStats(state);

    res.json({ state: toClientState(state) });
  } catch (error) {
    console.error("获取游戏状态错误:", error);
    res.status(500).json({ error: "获取游戏状态失败" });
  }
});

/**
 * 疗伤
 * POST /api/game/actions/heal
 */
router.post("/actions/heal", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = heal(state);
    if (!success) {
      return res.status(400).json({ error: "疗伤失败，请检查状态" });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "疗伤成功", state: toClientState(state) });
  } catch (error) {
    console.error("疗伤错误:", error);
    res.status(500).json({ error: "疗伤失败" });
  }
});

/**
 * 创建角色
 * POST /api/game/character/create
 */
router.post("/character/create", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "角色名称不能为空" });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 10) {
      return res.status(400).json({ error: "角色名称长度为2-10个字符" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "用户不存在，无法创建角色" });
    }

    let state = getUserGameState(userId);

    // 如果用户还没有初始化游戏，则初始化
    if (!state) {
      state = await initializeUserGame(userId, null);
    }

    // 检查是否已经创建过角色
    if (state.name && state.name !== "无名修士") {
      return res.status(400).json({ error: "角色已创建，无法重复创建" });
    }

    // 确保角色ID存在（兼容旧数据）
    if (typeof state.characterId !== "number") {
      state.characterId = generateCharacterId();
    }

    // 更新角色名称
    state.name = trimmedName;
    logLine(`恭喜！您已创建角色：${trimmedName}，开始您的修仙之路吧！`, state);

    await updateUserGameState(userId, state);
    res.json({ message: "角色创建成功", state: toClientState(state) });
  } catch (error) {
    console.error("创建角色错误:", error);
    res.status(500).json({ error: "创建角色失败" });
  }
});

/**
 * 修改角色名称
 * POST /api/game/character/rename
 */
router.post("/character/rename", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "角色名称不能为空" });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 10) {
      return res.status(400).json({ error: "角色名称长度为2-10个字符" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const oldName = state.name;

    // 更新角色名称并记录日志
    state.name = trimmedName;
    logLine(`角色名称已从"${oldName}"修改为"${trimmedName}"`, state);

    await updateUserGameState(userId, state);
    res.json({ message: "角色名称修改成功", state: toClientState(state) });
  } catch (error) {
    console.error("修改角色名称错误:", error);
    res.status(500).json({ error: "修改角色名称失败" });
  }
});

/**
 * 装备物品
 * POST /api/game/items/equip
 */
router.post("/items/equip", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { itemId } = req.body as { itemId?: string };
    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ error: "物品ID不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = equipItem(state, itemId);
    if (!success) {
      await updateUserGameState(userId, state);
      return res.status(400).json({ error: "装备失败，请检查物品是否存在或背包是否已满", state: toClientState(state) });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "装备成功", state: toClientState(state) });
  } catch (error) {
    console.error("装备物品错误:", error);
    res.status(500).json({ error: "装备物品失败" });
  }
});

/**
 * 卸下装备
 * POST /api/game/items/unequip
 */
router.post("/items/unequip", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { slot } = req.body as { slot?: EquipmentSlot };
    if (!slot || typeof slot !== "string") {
      return res.status(400).json({ error: "装备槽位不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = unequipItem(state, slot);
    if (!success) {
      return res.status(400).json({ error: "卸下失败，请检查装备槽位或背包是否已满" });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "卸下成功", state: toClientState(state) });
  } catch (error) {
    console.error("卸下装备错误:", error);
    res.status(500).json({ error: "卸下装备失败" });
  }
});

/**
 * 使用消耗品
 * POST /api/game/items/use
 */
router.post("/items/use", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { itemId } = req.body as { itemId?: string };
    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ error: "物品ID不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = useConsumable(state, itemId);
    if (!success) {
      return res.status(400).json({ error: "使用失败，请检查物品是否存在或是否为消耗品" });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "使用成功", state: toClientState(state) });
  } catch (error) {
    console.error("使用消耗品错误:", error);
    res.status(500).json({ error: "使用消耗品失败" });
  }
});

/**
 * 获取物品模板列表
 * GET /api/game/items/templates
 */
router.get("/items/templates", async (req: Request, res: Response) => {
  try {
    const templates = getItemTemplates();
    res.json({ templates });
  } catch (error) {
    console.error("获取物品模板错误:", error);
    res.status(500).json({ error: "获取物品模板失败" });
  }
});

/**
 * 重新排序背包物品
 * POST /api/game/items/reorder
 */
router.post("/items/reorder", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { itemIds, allowDiscard } = req.body as { itemIds?: (string | null)[]; allowDiscard?: boolean };
    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: "物品ID列表不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const actorName = state.name && state.name.trim().length > 0 ? state.name : "无名修士";
    const actorLabel = `${actorName} (${state.characterId})`;
    const success = reorderItems(state, itemIds, Boolean(allowDiscard), actorLabel);
    if (!success) {
      return res.status(400).json({ error: "重排序失败" });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "重排序成功", state: toClientState(state) });
  } catch (error) {
    console.error("重排序物品错误:", error);
    res.status(500).json({ error: "重排序物品失败" });
  }
});

/**
 * 合并同类堆叠物品
 * POST /api/game/items/merge
 */
router.post("/items/merge", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { fromItemId, toItemId } = req.body as { fromItemId?: string; toItemId?: string };
    if (!fromItemId || !toItemId) {
      return res.status(400).json({ error: "物品ID不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const result = mergeStackableItems(state, fromItemId, toItemId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (result.merged) {
      await updateUserGameState(userId, state);
    }

    res.json({ message: result.merged ? "合并成功" : "无法合并", merged: result.merged, state: toClientState(state) });
  } catch (error) {
    console.error("合并物品错误:", error);
    res.status(500).json({ error: "合并物品失败" });
  }
});

/**
 * 升级（进境一次）
 * POST /api/game/actions/levelup
 */
router.post("/actions/levelup", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    if (state.hp <= 0) {
      return res.status(400).json({ error: "你已死亡，无法升级" });
    }

    const success = stepUpOnce(state);
    if (!success) {
      const req = needQi(state);
      if (state.qi < req) {
        return res.status(400).json({ error: `灵气不足，需要 ${req} 点灵气才能升级` });
      }
      return res.status(400).json({ error: "已达到最高境界，无法继续升级" });
    }

    await updateUserGameState(userId, state);
    res.json({ message: "升级成功", state: toClientState(state) });
  } catch (error) {
    console.error("升级错误:", error);
    res.status(500).json({ error: "升级失败" });
  }
});

/**
 * 分配属性点
 * POST /api/game/actions/allocate-stats
 */
router.post("/actions/allocate-stats", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    if (state.hp <= 0) {
      return res.status(400).json({ error: "你已死亡，无法分配属性点" });
    }

    const payload = req.body as Partial<Record<"str" | "agi" | "vit" | "int" | "spi", number>>;
    const allocations = {
      str: Number(payload.str ?? 0),
      agi: Number(payload.agi ?? 0),
      vit: Number(payload.vit ?? 0),
      int: Number(payload.int ?? 0),
      spi: Number(payload.spi ?? 0)
    };

    const values = Object.values(allocations);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || !Number.isInteger(value))) {
      return res.status(400).json({ error: "分配点数必须是非负整数" });
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return res.status(400).json({ error: "分配点数不能为 0" });
    }

    if (state.statPoints < total) {
      return res.status(400).json({ error: "可用属性点不足" });
    }

    state.baseStats = state.baseStats ?? { str: 10, agi: 10, vit: 10, int: 10, spi: 10 };
    state.baseStats.str += allocations.str;
    state.baseStats.agi += allocations.agi;
    state.baseStats.vit += allocations.vit;
    state.baseStats.int += allocations.int;
    state.baseStats.spi += allocations.spi;
    state.statPoints -= total;

    refreshDerivedStats(state);
    logLine(`属性分配：力道+${allocations.str} 身法+${allocations.agi} 体魄+${allocations.vit} 灵识+${allocations.int} 根骨+${allocations.spi}。`, state);

    await updateUserGameState(userId, state);
    res.json({ message: "分配成功", state: toClientState(state) });
  } catch (error) {
    console.error("分配属性点错误:", error);
    res.status(500).json({ error: "分配属性点失败" });
  }
});

/**
 * 管理员：赠送物品给指定用户
 * POST /api/game/admin/give-item
 */
router.post("/admin/give-item", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetUserId, targetCharacterId, itemType, slot, level, templateId, crafted, consumables, materials, equipments, amount } = req.body as {
      targetUserId?: number;
      targetCharacterId?: number;
      itemType?: ItemType | "lingshi";
      slot?: EquipmentSlot;
      level?: number;
      templateId?: string;
      crafted?: boolean;
      consumables?: Array<{ templateId?: string; quantity?: number }>;
      materials?: Array<{ templateId?: string; quantity?: number }>;
      equipments?: Array<{ templateId?: string; quantity?: number }>;
      amount?: number;
    };

    // 确定目标用户ID：优先使用 targetUserId，如果没有则通过 targetCharacterId 查找
    let finalTargetUserId: number | null = null;
    
    if (targetUserId && typeof targetUserId === "number") {
      finalTargetUserId = targetUserId;
    } else if (targetCharacterId && typeof targetCharacterId === "number") {
      finalTargetUserId = await findUserIdByCharacterId(targetCharacterId);
      if (!finalTargetUserId) {
        return res.status(404).json({ error: `指定的角色ID ${targetCharacterId} 不存在` });
      }
    } else {
      return res.status(400).json({ error: "必须提供目标用户ID或角色ID" });
    }

    // 获取目标用户信息（用于日志显示）
    const targetUser = await getUserById(finalTargetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "指定的目标用户ID不存在" });
    }

    // 获取目标用户的游戏状态
    let targetState = getUserGameState(finalTargetUserId);
    if (!targetState) {
      targetState = await initializeUserGame(finalTargetUserId, null);
    }

    // 确定物品等级（使用目标用户等级或指定等级）
    const itemLevel = level || targetState.level || 1;

    if (crafted !== undefined && typeof crafted !== "boolean") {
      return res.status(400).json({ error: "打造标记必须为布尔值" });
    }

    const hasConsumableList = Array.isArray(consumables) && consumables.length > 0;
    const hasMaterialList = Array.isArray(materials) && materials.length > 0;
    const hasEquipmentList = Array.isArray(equipments) && equipments.length > 0;
    const listCount = [hasConsumableList, hasMaterialList, hasEquipmentList].filter(Boolean).length;

    if (listCount > 1) {
      return res.status(400).json({ error: "一次只能提供一种批量列表" });
    }

    if (hasConsumableList && itemType && itemType !== "consumable") {
      return res.status(400).json({ error: "赠送消耗品列表时，物品类型必须为 consumable" });
    }
    if (hasMaterialList && itemType && itemType !== "material") {
      return res.status(400).json({ error: "赠送材料列表时，物品类型必须为 material" });
    }
    if (hasEquipmentList && itemType && itemType !== "equipment") {
      return res.status(400).json({ error: "赠送装备列表时，物品类型必须为 equipment" });
    }

    const resolvedItemType: ItemType | "lingshi" | undefined = hasConsumableList
      ? "consumable"
      : hasMaterialList
        ? "material"
        : hasEquipmentList
          ? "equipment"
          : itemType;

    const adminLogPrefix = (() => {
      const ts = new Date().toLocaleString();
      return {
        event: `[${ts}] 系统赠送获得 `,
        console: (() => {
          const actorName = targetState.name && targetState.name.trim().length > 0 ? targetState.name : "无名修士";
          const actorLabel = `${actorName}(${targetState.characterId})`;
          return `[${ts}] ${actorLabel}：系统赠送获得 `;
        })()
      };
    })();

    let itemsToLog: Array<{ name: string; quantity: number }> = [];
    let responseMessage = "";
    let responseItems: Array<{ templateId: string; name: string; quantity: number }> | undefined;

    const tryAddToInventory = (
      inventory: Array<unknown>,
      entry: { templateId: string; type: string; stackSize: number },
      maxStackMap?: Map<string, number>
    ) => {
      const inventorySize = 20;
      while (inventory.length < inventorySize) {
        inventory.push(null);
      }
      inventory.splice(inventorySize);

      const existingItem = inventory.find((slot: unknown) => {
        if (!slot || typeof slot !== "object") return false;
        const typed = slot as { templateId?: string; type?: string };
        return typed.templateId === entry.templateId && typed.type === entry.type;
      }) as { stackSize?: number } | undefined;

      if (existingItem && typeof existingItem.stackSize === "number" && entry.type !== "material") {
        const maxStack = entry.type === "consumable"
          ? (maxStackMap?.get(entry.templateId) ?? 99)
          : 99;
        if (existingItem.stackSize + entry.stackSize <= maxStack) {
          existingItem.stackSize += entry.stackSize;
          return true;
        }
      }

      const emptyIndex = inventory.findIndex((slot) => slot === null);
      if (emptyIndex === -1) {
        return false;
      }
      inventory[emptyIndex] = entry;
      return true;
    };

    // 生成物品
    let item;
    if (resolvedItemType === "equipment") {
      const sourceOverride = crafted ? "crafted" : undefined;
      if (hasEquipmentList) {
        const templates = getAllEquipmentTemplates();
        const templateMap = new Map(templates.map((template) => [template.templateId, template]));
        const plannedTemplateIds: string[] = [];

        for (let i = 0; i < equipments.length; i += 1) {
          const entry = equipments[i];
          const entryTemplateId = entry?.templateId?.trim();
          const quantity = Number(entry?.quantity ?? 1);

          if (!entryTemplateId) {
            return res.status(400).json({ error: `第 ${i + 1} 个装备缺少 templateId` });
          }
          if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ error: `第 ${i + 1} 个装备数量无效` });
          }
          if (!templateMap.has(entryTemplateId)) {
            return res.status(400).json({ error: `装备模板不存在：${entryTemplateId}` });
          }

          const repeat = Math.floor(quantity);
          for (let j = 0; j < repeat; j += 1) {
            plannedTemplateIds.push(entryTemplateId);
          }
        }

        const inventorySnapshot = JSON.parse(JSON.stringify(targetState.inventory ?? [])) as Array<unknown>;
        const canAddAll = plannedTemplateIds.every(() => {
          const emptyIndex = inventorySnapshot.findIndex(slot => slot === null);
          if (emptyIndex === -1) {
            return false;
          }
          inventorySnapshot[emptyIndex] = { type: "equipment" };
          return true;
        });

        if (!canAddAll) {
          return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
        }

        const eventLogStart = targetState.eventLog?.length ?? 0;
        const summaryMap = new Map<string, { templateId: string; name: string; quantity: number }>();

        for (const entryTemplateId of plannedTemplateIds) {
          const generated = itemGenerator.generateEquipmentFromTemplate(entryTemplateId, undefined, sourceOverride);
          const success = addItemToInventory(targetState, generated);
          if (!success) {
            return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
          }

          const existing = summaryMap.get(generated.templateId);
          if (existing) {
            existing.quantity += 1;
          } else {
            summaryMap.set(generated.templateId, {
              templateId: generated.templateId,
              name: generated.name,
              quantity: 1
            });
          }

          itemsToLog.push({ name: generated.name, quantity: 1 });
        }

        if (!targetState.eventLog) {
          targetState.eventLog = [];
        }

        for (let i = 0; i < itemsToLog.length; i += 1) {
          const logIndex = eventLogStart + i;
          const entry = itemsToLog[i];
          const quantityLabel = entry.quantity > 1 ? ` x${entry.quantity}` : "";
          targetState.eventLog[logIndex] = `${adminLogPrefix.event}${entry.name}${quantityLabel}。`;
          console.log(`${adminLogPrefix.console}${entry.name}${quantityLabel}。`);
        }

        responseItems = Array.from(summaryMap.values());
        responseMessage = `成功赠送装备列表给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`;
      } else if (templateId) {
        try {
          item = itemGenerator.generateEquipmentFromTemplate(templateId, undefined, sourceOverride);
        } catch (err) {
          return res.status(400).json({ error: "装备模板不存在" });
        }
      } else {
        const equipmentTemplates = getAllEquipmentTemplates().filter((template) =>
          slot ? template.slot === slot : true
        );
        const preferredTemplates = sourceOverride
          ? equipmentTemplates.filter((template) => template.source === sourceOverride)
          : equipmentTemplates;
        if (preferredTemplates.length > 0) {
          const randomTemplate = preferredTemplates[Math.floor(Math.random() * preferredTemplates.length)];
          item = itemGenerator.generateEquipmentFromTemplate(randomTemplate.templateId, undefined, sourceOverride);
        } else {
          item = itemGenerator.generateEquipment(itemLevel, slot, sourceOverride);
        }
      }
    } else if (resolvedItemType === "consumable") {
      if (hasConsumableList) {
        const templates = getConsumableData();
        const templateMap = new Map(templates.map((template) => [template.templateId, template]));
        const maxStackMap = new Map(templates.map((template) => [template.templateId, template.maxStack || 99]));
        const plannedStacks: Array<{ templateId: string; stackSize: number }> = [];

        for (let i = 0; i < consumables.length; i += 1) {
          const entry = consumables[i];
          const entryTemplateId = entry?.templateId?.trim();
          const quantity = Number(entry?.quantity);

          if (!entryTemplateId) {
            return res.status(400).json({ error: `第 ${i + 1} 个消耗品缺少 templateId` });
          }
          if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ error: `第 ${i + 1} 个消耗品数量无效` });
          }

          const template = templateMap.get(entryTemplateId);
          if (!template) {
            return res.status(400).json({ error: `消耗品模板不存在：${entryTemplateId}` });
          }

          const maxStack = template.maxStack || 99;
          let remaining = Math.floor(quantity);
          while (remaining > 0) {
            const stackSize = Math.min(maxStack, remaining);
            plannedStacks.push({ templateId: entryTemplateId, stackSize });
            remaining -= stackSize;
          }
        }

        const plannedItems: Array<ReturnType<typeof itemGenerator.generateConsumable>> = [];
        for (const stack of plannedStacks) {
          const template = templateMap.get(stack.templateId);
          if (!template) {
            return res.status(400).json({ error: `消耗品模板不存在：${stack.templateId}` });
          }
          const preview = itemGenerator.generateConsumable(itemLevel);
          plannedItems.push({
            ...preview,
            templateId: template.templateId,
            name: template.name,
            effect: { ...template.effect },
            stackSize: stack.stackSize,
            description: template.description || preview.description
          });
        }

        const inventorySnapshot = JSON.parse(JSON.stringify(targetState.inventory ?? [])) as Array<unknown>;
        const canAddAll = plannedItems.every((plannedItem) =>
          tryAddToInventory(inventorySnapshot, {
            templateId: plannedItem.templateId,
            type: plannedItem.type,
            stackSize: plannedItem.stackSize
          }, maxStackMap)
        );
        if (!canAddAll) {
          return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
        }

        const eventLogStart = targetState.eventLog?.length ?? 0;
        const summaryMap = new Map<string, { templateId: string; name: string; quantity: number }>();

        for (const grantItem of plannedItems) {
          const success = addItemToInventory(targetState, grantItem);
          if (!success) {
            return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
          }

          const existing = summaryMap.get(grantItem.templateId);
          if (existing) {
            existing.quantity += grantItem.stackSize;
          } else {
            summaryMap.set(grantItem.templateId, {
              templateId: grantItem.templateId,
              name: grantItem.name,
              quantity: grantItem.stackSize
            });
          }

          const displayName = grantItem.level
            ? `${grantItem.name}（${grantItem.level}级）`
            : grantItem.name;
          itemsToLog.push({ name: displayName, quantity: grantItem.stackSize });
        }

        if (!targetState.eventLog) {
          targetState.eventLog = [];
        }

        for (let i = 0; i < itemsToLog.length; i += 1) {
          const logIndex = eventLogStart + i;
          const entry = itemsToLog[i];
          const quantityLabel = entry.quantity > 1 ? ` x${entry.quantity}` : "";
          targetState.eventLog[logIndex] = `${adminLogPrefix.event}${entry.name}${quantityLabel}。`;
          console.log(`${adminLogPrefix.console}${entry.name}${quantityLabel}。`);
        }

        responseItems = Array.from(summaryMap.values());
        responseMessage = `成功赠送消耗品列表给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`;
      } else {
        item = itemGenerator.generateConsumable(itemLevel);
      }
    } else if (resolvedItemType === "material") {
      if (hasMaterialList) {
        const templates = getMaterialData();
        const templateMap = new Map(templates.map((template) => [template.templateId, template]));
        const plannedStacks: Array<{ templateId: string; stackSize: number }> = [];

        for (let i = 0; i < materials.length; i += 1) {
          const entry = materials[i];
          const entryTemplateId = entry?.templateId?.trim();
          const quantity = Number(entry?.quantity);

          if (!entryTemplateId) {
            return res.status(400).json({ error: `第 ${i + 1} 个材料缺少 templateId` });
          }
          if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ error: `第 ${i + 1} 个材料数量无效` });
          }

          const template = templateMap.get(entryTemplateId);
          if (!template) {
            return res.status(400).json({ error: `材料模板不存在：${entryTemplateId}` });
          }

          const count = Math.floor(quantity);
          for (let j = 0; j < count; j += 1) {
            plannedStacks.push({ templateId: entryTemplateId, stackSize: 1 });
          }
        }

        const plannedItems: Array<ReturnType<typeof itemGenerator.generateMaterial>> = [];
        for (const stack of plannedStacks) {
          const template = templateMap.get(stack.templateId);
          if (!template) {
            return res.status(400).json({ error: `材料模板不存在：${stack.templateId}` });
          }
          const preview = itemGenerator.generateMaterial(itemLevel);
          plannedItems.push({
            ...preview,
            templateId: template.templateId,
            name: template.name,
            stackSize: stack.stackSize,
            description: template.description || preview.description,
            level: template.level ?? preview.level
          });
        }

        const inventorySnapshot = JSON.parse(JSON.stringify(targetState.inventory ?? [])) as Array<unknown>;
        const canAddAll = plannedItems.every((plannedItem) =>
          tryAddToInventory(inventorySnapshot, {
            templateId: plannedItem.templateId,
            type: plannedItem.type,
            stackSize: plannedItem.stackSize
          })
        );
        if (!canAddAll) {
          return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
        }

        const eventLogStart = targetState.eventLog?.length ?? 0;
        const summaryMap = new Map<string, { templateId: string; name: string; quantity: number }>();

        for (const grantItem of plannedItems) {
          const success = addItemToInventory(targetState, grantItem);
          if (!success) {
            return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
          }

          const existing = summaryMap.get(grantItem.templateId);
          if (existing) {
            existing.quantity += grantItem.stackSize;
          } else {
            summaryMap.set(grantItem.templateId, {
              templateId: grantItem.templateId,
              name: grantItem.name,
              quantity: grantItem.stackSize
            });
          }

          itemsToLog.push({ name: grantItem.name, quantity: grantItem.stackSize });
        }

        if (!targetState.eventLog) {
          targetState.eventLog = [];
        }

        for (let i = 0; i < itemsToLog.length; i += 1) {
          const logIndex = eventLogStart + i;
          const entry = itemsToLog[i];
          const quantityLabel = entry.quantity > 1 ? ` x${entry.quantity}` : "";
          targetState.eventLog[logIndex] = `${adminLogPrefix.event}${entry.name}${quantityLabel}。`;
          console.log(`${adminLogPrefix.console}${entry.name}${quantityLabel}。`);
        }

        responseItems = Array.from(summaryMap.values());
        responseMessage = `成功赠送材料列表给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`;
      } else {
        item = itemGenerator.generateMaterial(itemLevel);
      }
    } else if (resolvedItemType === "lingshi") {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "灵石数量必须为正整数" });
      }

      const grantAmount = Math.floor(parsedAmount);
      const oldLingshi = targetState.lingshi ?? 0;
      targetState.lingshi = oldLingshi + grantAmount;

      const actorName = targetState.name && targetState.name.trim().length > 0 ? targetState.name : "无名修士";
      const actorLabel = `${actorName}(${targetState.characterId})`;
      const eventMessage = `系统赠送获得 ${grantAmount} 灵石（${oldLingshi} → ${targetState.lingshi}）。`;
      logLine(eventMessage, targetState, `${actorLabel}：${eventMessage}`);

      responseMessage = `成功赠送 ${grantAmount} 灵石给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`;
    } else {
      item = itemGenerator.generateRandomItem(itemLevel, resolvedItemType);
    }

    if (item) {
      // 添加到目标用户背包
      const success = addItemToInventory(targetState, item);
      if (!success) {
        return res.status(400).json({ error: "目标用户背包已满，无法添加物品" });
      }

      // 替换最后一条日志（addItemToInventory 添加的"获得"消息）为更详细的日志
      if (targetState.eventLog && targetState.eventLog.length > 0) {
        const lastLog = targetState.eventLog[targetState.eventLog.length - 1];
        // 如果最后一条日志是"获得"消息，替换它
        if (lastLog && lastLog.includes(`获得 ${item.name}`)) {
          targetState.eventLog[targetState.eventLog.length - 1] = `${adminLogPrefix.event}${item.name}。`;
          console.log(`${adminLogPrefix.console}${item.name}。`);
        }
      }

      itemsToLog = [{ name: item.name, quantity: 1 }];
      responseMessage = `成功赠送 ${item.name} 给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`;
      responseItems = [{
        templateId: item.templateId,
        name: item.name,
        quantity: 1
      }];
    }

    // 刷新属性（如果装备了物品可能会影响属性）
    refreshDerivedStats(targetState);

    // 保存状态并推送更新
    await updateUserGameState(finalTargetUserId, targetState);

    const responsePayload: {
      message: string;
      items?: Array<{ templateId: string; name: string; quantity: number }>;
      item?: { id: string; name: string; type: ItemType };
    } = {
      message: responseMessage
    };

    if (responseItems) {
      responsePayload.items = responseItems;
    }

    if (item) {
      responsePayload.item = {
        id: item.id,
        name: item.name,
        type: item.type
      };
    }

    res.json(responsePayload);
  } catch (error) {
    console.error("赠送物品错误:", error);
    res.status(500).json({ error: "赠送物品失败" });
  }
});

/**
 * 管理员：赠送经验（灵气）给指定用户
 * POST /api/game/admin/give-exp
 */
router.post("/admin/give-exp", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetUserId, targetCharacterId, amount } = req.body as {
      targetUserId?: number;
      targetCharacterId?: number;
      amount?: number;
    };

    // 确定目标用户ID：优先使用 targetUserId，如果没有则通过 targetCharacterId 查找
    let finalTargetUserId: number | null = null;
    
    if (targetUserId && typeof targetUserId === "number") {
      finalTargetUserId = targetUserId;
    } else if (targetCharacterId && typeof targetCharacterId === "number") {
      finalTargetUserId = await findUserIdByCharacterId(targetCharacterId);
      if (!finalTargetUserId) {
        return res.status(404).json({ error: `指定的角色ID ${targetCharacterId} 不存在` });
      }
    } else {
      return res.status(400).json({ error: "必须提供目标用户ID或角色ID" });
    }

    // 验证经验数量
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "经验数量必须为正整数" });
    }

    // 获取目标用户信息（用于日志显示）
    const targetUser = await getUserById(finalTargetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "指定的目标用户ID不存在" });
    }

    // 获取目标用户的游戏状态
    let targetState = getUserGameState(finalTargetUserId);
    if (!targetState) {
      targetState = await initializeUserGame(finalTargetUserId, null);
    }

    // 增加经验（灵气）
    const oldQi = targetState.qi;
    targetState.qi += amount;

    // 记录日志
    const actorName = targetState.name && targetState.name.trim().length > 0 ? targetState.name : "无名修士";
    const actorLabel = `${actorName}(${targetState.characterId})`;
    const eventMessage = `系统赠送获得 ${amount} 点灵气（${oldQi} → ${targetState.qi}）。`;
    logLine(eventMessage, targetState, `${actorLabel}：${eventMessage}`);

    // 保存状态并推送更新
    await updateUserGameState(finalTargetUserId, targetState);

    res.json({
      message: `成功赠送 ${amount} 点灵气给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`,
      exp: {
        old: oldQi,
        new: targetState.qi,
        added: amount
      }
    });
  } catch (error) {
    console.error("赠送经验错误:", error);
    res.status(500).json({ error: "赠送经验失败" });
  }
});

export default router;
