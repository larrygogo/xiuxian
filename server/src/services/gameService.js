"use strict";

const { getDatabase } = require("../db/init");
const { defaultState } = require("../state/defaultState");
const { migrateState } = require("../state/migrate");
const { applyOfflineProgress } = require("../systems/offline");
const { tick } = require("../systems/engine");
const { cultivateTick } = require("../systems/actions");
const { exploreTick } = require("../systems/events");
const { stepUpAsMuchAsPossible } = require("../systems/progression");
const { TICK_MS, STEP_UP_LIMIT_PER_TICK } = require("../config");

// 存储每个用户的游戏状态和定时器
const userGameStates = new Map();
const userTimers = new Map();

/**
 * 从数据库加载游戏状态
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 游戏状态对象
 */
async function loadGameState(userId) {
  const db = await getDatabase();
  
  try {
    const stmt = db.prepare("SELECT state_data, last_ts FROM game_states WHERE user_id = ?");
    stmt.bind([userId]);
    
    if (!stmt.step()) {
      // 没有找到记录
      stmt.free();
      return defaultState();
    }
    
    const result = stmt.getAsObject();
    stmt.free();

    if (!result || !result.state_data) {
      // 创建新游戏状态
      return defaultState();
    }

    const state = JSON.parse(result.state_data);
    state.lastTs = result.last_ts || Date.now();

    // 应用迁移
    const migrated = migrateState(state);
    if (!migrated) {
      // 迁移失败，使用默认状态
      return defaultState();
    }

    // 计算离线收益
    const offlineMs = Date.now() - (migrated.lastTs || Date.now());
    if (offlineMs > 0) {
      applyOfflineProgress(migrated, offlineMs);
    }

    return migrated;
  } catch (e) {
    console.error("加载游戏状态失败:", e);
    return defaultState();
  }
}

/**
 * 保存游戏状态到数据库
 * @param {number} userId - 用户ID
 * @param {Object} state - 游戏状态对象
 * @returns {Promise<void>}
 */
async function saveGameState(userId, state) {
  const db = await getDatabase();
  const stateData = JSON.stringify(state);
  const lastTs = state.lastTs || Date.now();

  try {
    // sql.js 不支持 ON CONFLICT，需要先删除再插入
    const deleteStmt = db.prepare("DELETE FROM game_states WHERE user_id = ?");
    deleteStmt.bind([userId]);
    deleteStmt.step();
    deleteStmt.free();

    const insertStmt = db.prepare(
      "INSERT INTO game_states (user_id, state_data, last_ts, updated_at) VALUES (?, ?, ?, strftime('%s', 'now'))"
    );
    insertStmt.bind([userId, stateData, lastTs]);
    insertStmt.step();
    insertStmt.free();

    // 保存数据库到文件
    const { saveDatabase } = require("../db/init");
    saveDatabase(db);
  } catch (err) {
    console.error("保存游戏状态失败:", err);
    throw err;
  }
}

// 存储每个用户的状态变化回调
const userStateCallbacks = new Map();

/**
 * 设置用户状态变化回调
 * @param {number} userId - 用户ID
 * @param {Function} callback - 回调函数
 */
function setUserStateCallback(userId, callback) {
  if (callback) {
    userStateCallbacks.set(userId, callback);
  } else {
    userStateCallbacks.delete(userId);
  }
}

/**
 * 初始化用户的游戏状态（加载并启动tick）
 * @param {number} userId - 用户ID
 * @param {Function} onStateChange - 状态变化回调（可选）
 * @returns {Promise<Object>} 游戏状态对象
 */
async function initializeUserGame(userId, onStateChange) {
  const state = await loadGameState(userId);
  userGameStates.set(userId, state);

  // 设置状态变化回调
  if (onStateChange) {
    setUserStateCallback(userId, onStateChange);
  }

  // 如果定时器已存在，先清除
  if (userTimers.has(userId)) {
    clearInterval(userTimers.get(userId));
  }

  // 启动游戏tick定时器
  const timer = setInterval(async () => {
    const currentState = userGameStates.get(userId);
    if (!currentState || !currentState.alive) {
      return;
    }

    // 执行游戏tick
    tick(currentState);

    // 根据状态执行修炼或探索
    if (currentState.isTuna) {
      cultivateTick(currentState);
    } else {
      exploreTick(currentState);
    }

    // 自动进境
    stepUpAsMuchAsPossible(currentState, STEP_UP_LIMIT_PER_TICK);

    // 更新状态
    currentState.lastTs = Date.now();
    userGameStates.set(userId, currentState);

    // 保存到数据库（异步）
    try {
      await saveGameState(userId, currentState);
    } catch (err) {
      console.error(`保存用户 ${userId} 游戏状态失败:`, err);
    }

    // 通知状态变化
    const callback = userStateCallbacks.get(userId);
    if (callback) {
      callback(currentState);
    }
  }, TICK_MS);

  userTimers.set(userId, timer);

  // 立即保存一次
  await saveGameState(userId, state);

  return state;
}

/**
 * 获取用户的游戏状态
 * @param {number} userId - 用户ID
 * @returns {Object|null} 游戏状态对象
 */
function getUserGameState(userId) {
  return userGameStates.get(userId) || null;
}

/**
 * 更新用户的游戏状态
 * @param {number} userId - 用户ID
 * @param {Object} state - 新的游戏状态对象
 * @returns {Promise<void>}
 */
async function updateUserGameState(userId, state) {
  state.lastTs = Date.now();
  userGameStates.set(userId, state);
  await saveGameState(userId, state);
  
  // 触发状态变化回调，通过 WebSocket 推送
  const callback = userStateCallbacks.get(userId);
  if (callback) {
    callback(state);
  }
}

/**
 * 清理用户的游戏状态和定时器
 * @param {number} userId - 用户ID
 */
function cleanupUserGame(userId) {
  const timer = userTimers.get(userId);
  if (timer) {
    clearInterval(timer);
    userTimers.delete(userId);
  }
  userGameStates.delete(userId);
  userStateCallbacks.delete(userId);
}

module.exports = {
  initializeUserGame,
  getUserGameState,
  updateUserGameState,
  cleanupUserGame,
  saveGameState,
  setUserStateCallback
};
