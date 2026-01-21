import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getUserGameState,
  initializeUserGame,
  updateUserGameState,
  acquireUserLock
} from "../services/gameService";
import { toClientState } from "../services/stateView";
import { cultivateTick, ensureDailyReset, heal } from "../systems/actions";
import { exploreTick } from "../systems/events";
import { stepUpAsMuchAsPossible, stepUpOnce, needQi } from "../systems/progression";
import { STEP_UP_LIMIT_PER_TICK } from "../config";
import { logLine } from "../services/logger";
import { equipItem, unequipItem, useConsumable, reorderItems } from "../systems/items";
import { getItemTemplates } from "../services/itemService";
import { refreshDerivedStats } from "../systems/battle";
import type { EquipmentSlot } from "../types/item";

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
 * 切换吐纳状态
 * POST /api/game/actions/toggle-tuna
 */
router.post("/actions/toggle-tuna", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const state = getUserGameState(userId);
    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const { enabled } = req.body as { enabled?: boolean | string };
    const newTunaState = enabled === true || enabled === "true";

    // 如果状态未变化，直接返回提示
    if (state.isTuna === newTunaState) {
      const message = newTunaState ? "你已经在吐纳状态中" : "你当前不在吐纳状态";
      return res.json({ message, state: toClientState(state) });
    }

    state.isTuna = newTunaState;
    const message = newTunaState
      ? "进入吐纳状态：专注修炼，无法进行探索"
      : "退出吐纳状态：恢复自由游历";
    logLine(message, state);

    await updateUserGameState(userId, state);

    // 状态变化回调会在 gameService 中处理 WebSocket 推送
    res.json({ message, state: toClientState(state) });
  } catch (error) {
    console.error("切换吐纳状态错误:", error);
    res.status(500).json({ error: "切换吐纳状态失败" });
  }
});

/**
 * 手动行动（消耗一次每日次数）
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

      // 检查剩余次数（必须在消耗之前检查）
      if (state.daily.remainingTicks <= 0) {
        responseSent = true;
        res.status(400).json({ error: "今日行动次数已用尽" });
        return;
      }

      // 消耗一次行动次数（在检查通过后立即消耗，避免并发问题）
      state.daily.remainingTicks -= 1;

      // 根据吐纳状态选择修炼或探索
      if (state.isTuna) {
        cultivateTick(state);
        // 修炼时不自动升级，需要手动点击升级按钮
      } else {
        exploreTick(state);
        // 探索时不自动升级，需要手动点击升级按钮
      }

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

    let state = getUserGameState(userId);

    // 如果用户还没有初始化游戏，则初始化
    if (!state) {
      state = await initializeUserGame(userId, null);
    }

    // 检查是否已经创建过角色
    if (state.name && state.name !== "无名修士") {
      return res.status(400).json({ error: "角色已创建，无法重复创建" });
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

export default router;
