import express, { Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  getUserGameState,
  initializeUserGame,
  updateUserGameState,
  acquireUserLock,
  findUserIdByCharacterId
} from "../services/gameService";
import { toClientState } from "../services/stateView";
import { ensureDailyReset, heal } from "../systems/actions";
import { exploreTick } from "../systems/events";
import { stepUpOnce, needQi } from "../systems/progression";
import { logLine } from "../services/logger";
import { equipItem, unequipItem, useConsumable, reorderItems, addItemToInventory } from "../systems/items";
import { getItemTemplates, itemGenerator } from "../services/itemService";
import { refreshDerivedStats } from "../systems/stats";
import { getUserById } from "../services/userService";
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

    let state = getUserGameState(userId);

    // 如果用户还没有初始化游戏，则初始化
    if (!state) {
      // 这里不需要实时推送，传入 null 即可
      state = await initializeUserGame(userId, null);
    }

    const didReset = ensureDailyReset(state);
    if (didReset) {
      await updateUserGameState(userId, state);
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
 * 执行探索
 * POST /api/game/actions/tick
 */
router.post("/actions/tick", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    // 使用锁机制防止并发请求
    let responseSent = false;
    await acquireUserLock(userId, async () => {
      if (responseSent) return;

      const state = getUserGameState(userId);
      if (!state) {
        responseSent = true;
        res.status(404).json({ error: "游戏状态未找到" });
        return;
      }

      if (!state.alive) {
        responseSent = true;
        res.status(400).json({ error: "你已死亡，无法行动" });
        return;
      }

      ensureDailyReset(state);

      /** 测试时不消耗次数 */

      // 检查剩余次数（必须在消耗之前检查）
      // if (state.daily.remainingTicks <= 0) {
      //   responseSent = true;
      //   res.status(400).json({ error: "今日行动次数已用尽" });
      //   return;
      // }

      // // 消耗一次行动次数（在检查通过后立即消耗，避免并发问题）
      // state.daily.remainingTicks -= 1;

      // 执行探索
      exploreTick(state);

      await updateUserGameState(userId, state);

      responseSent = true;
      res.json({ message: "行动完成", state: toClientState(state) });
    });
  } catch (error) {
    console.error("行动错误:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "行动失败" });
    }
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
      state.characterId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
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
      return res.status(400).json({ error: "装备失败，请检查物品是否存在或背包是否已满" });
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

    const { itemIds } = req.body as { itemIds?: (string | null)[] };
    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: "物品ID列表不能为空" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = reorderItems(state, itemIds);
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

    if (!state.alive) {
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

    if (!state.alive) {
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
    const { targetUserId, targetCharacterId, itemType, slot, level } = req.body as {
      targetUserId?: number;
      targetCharacterId?: number;
      itemType?: ItemType;
      slot?: EquipmentSlot;
      level?: number;
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

    // 生成物品
    let item;
    if (itemType === "equipment") {
      item = itemGenerator.generateEquipment(itemLevel, slot);
    } else if (itemType === "consumable") {
      item = itemGenerator.generateConsumable(itemLevel);
    } else if (itemType === "material") {
      item = itemGenerator.generateMaterial(itemLevel);
    } else {
      item = itemGenerator.generateRandomItem(itemLevel, itemType);
    }

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
        const userDisplayName = targetState.name && targetState.name !== "无名修士" 
          ? `${targetState.name}(${targetUser.username})` 
          : targetUser.username;
        const ts = new Date().toLocaleString();
        targetState.eventLog[targetState.eventLog.length - 1] = `[${ts}] 管理员赠送：${userDisplayName} 获得 ${item.name}。`;
        console.log(`[${ts}] 管理员赠送：${userDisplayName} 获得 ${item.name}。`);
      }
    }

    // 刷新属性（如果装备了物品可能会影响属性）
    refreshDerivedStats(targetState);

    // 保存状态并推送更新
    await updateUserGameState(finalTargetUserId, targetState);

    res.json({
      message: `成功赠送 ${item.name} 给用户 ${targetUser.username} (用户ID: ${finalTargetUserId}, 角色ID: ${targetState.characterId})`,
      item: {
        id: item.id,
        name: item.name,
        type: item.type
      }
    });
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
    const userDisplayName = targetState.name && targetState.name !== "无名修士" 
      ? `${targetState.name}(${targetUser.username})` 
      : targetUser.username;
    logLine(`管理员赠送：${userDisplayName} 获得 ${amount} 点灵气（${oldQi} → ${targetState.qi}）。`, targetState);

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
