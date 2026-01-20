"use strict";

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  initializeUserGame,
  getUserGameState,
  updateUserGameState
} = require("../services/gameService");
const { heal, cultivateTick, ensureDailyReset } = require("../systems/actions");
const { exploreTick } = require("../systems/events");
const { stepUpAsMuchAsPossible } = require("../systems/progression");
const { STEP_UP_LIMIT_PER_TICK } = require("../config");
const { logLine } = require("../services/logger");

const router = express.Router();

// 所有游戏路由都需要认证
router.use(authenticateToken);

/**
 * 获取游戏状态
 * GET /api/game/state
 */
router.get("/state", async (req, res) => {
  try {
    const userId = req.user.userId;
    let state = getUserGameState(userId);

    // 如果用户还没有初始化游戏，则初始化
    if (!state) {
      // 这里需要传入一个回调函数，但在这个场景下我们不需要实时推送
      // 实际的状态更新会通过 WebSocket 推送
      state = await initializeUserGame(userId, null);
    }

    const didReset = ensureDailyReset(state);
    if (didReset) {
      await updateUserGameState(userId, state);
    }

    res.json({ state });
  } catch (error) {
    console.error("获取游戏状态错误:", error);
    res.status(500).json({ error: "获取游戏状态失败" });
  }
});

/**
 * 疗伤
 * POST /api/game/actions/heal
 */
router.post("/actions/heal", async (req, res) => {
  try {
    const userId = req.user.userId;
    const state = getUserGameState(userId);

    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const success = heal(state);
    if (success) {
      await updateUserGameState(userId, state);
      res.json({ message: "疗伤成功", state });
    } else {
      res.status(400).json({ error: "疗伤失败，请检查状态" });
    }
  } catch (error) {
    console.error("疗伤错误:", error);
    res.status(500).json({ error: "疗伤失败" });
  }
});

/**
 * 切换吐纳状态
 * POST /api/game/actions/toggle-tuna
 */
router.post("/actions/toggle-tuna", async (req, res) => {
  try {
    const userId = req.user.userId;
    const state = getUserGameState(userId);

    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    const { enabled } = req.body;
    const newTunaState = enabled === true || enabled === "true";

    if (state.isTuna === newTunaState) {
      const message = newTunaState ? "你已经在吐纳状态中" : "你当前不在吐纳状态";
      return res.json({ message, state });
    }

    state.isTuna = newTunaState;
    const message = newTunaState
      ? "进入吐纳状态：专注修炼，无法进行探索"
      : "退出吐纳状态：恢复自由游历";
    logLine(message, state);

    await updateUserGameState(userId, state);
    
    // 通过 WebSocket 推送状态更新
    // 获取 io 实例和 userSockets
    const http = require("http");
    const { Server } = require("socket.io");
    // 由于无法直接访问，我们通过触发状态变化回调来推送
    const { setUserStateCallback } = require("../services/gameService");
    // 状态变化回调会在 gameService 中处理 WebSocket 推送
    
    res.json({ message, state });
  } catch (error) {
    console.error("切换吐纳状态错误:", error);
    res.status(500).json({ error: "切换吐纳状态失败" });
  }
});

/**
 * 手动行动（消耗一次每日次数）
 * POST /api/game/actions/tick
 */
router.post("/actions/tick", async (req, res) => {
  try {
    const userId = req.user.userId;
    const state = getUserGameState(userId);

    if (!state) {
      return res.status(404).json({ error: "游戏状态未找到" });
    }

    if (!state.alive) {
      return res.status(400).json({ error: "你已死亡，无法行动" });
    }

    ensureDailyReset(state);

    if (state.daily.remainingTicks <= 0) {
      return res.status(400).json({ error: "今日行动次数已用尽" });
    }

    state.daily.remainingTicks -= 1;

    if (state.isTuna) {
      cultivateTick(state);
    } else {
      exploreTick(state);
    }

    stepUpAsMuchAsPossible(state, STEP_UP_LIMIT_PER_TICK);
    await updateUserGameState(userId, state);

    res.json({ message: "行动完成", state });
  } catch (error) {
    console.error("行动错误:", error);
    res.status(500).json({ error: "行动失败" });
  }
});

/**
 * 创建角色
 * POST /api/game/character/create
 */
router.post("/character/create", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
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
    
    res.json({ message: "角色创建成功", state });
  } catch (error) {
    console.error("创建角色错误:", error);
    res.status(500).json({ error: "创建角色失败" });
  }
});

/**
 * 修改角色名称
 * POST /api/game/character/rename
 */
router.post("/character/rename", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
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
    
    // 更新角色名称
    state.name = trimmedName;
    logLine(`角色名称已从"${oldName}"修改为"${trimmedName}"`, state);

    await updateUserGameState(userId, state);
    
    res.json({ message: "角色名称修改成功", state });
  } catch (error) {
    console.error("修改角色名称错误:", error);
    res.status(500).json({ error: "修改角色名称失败" });
  }
});

module.exports = router;
