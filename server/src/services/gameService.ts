import { getDatabase, saveDatabase } from "../db/init";
import { defaultState } from "../state/defaultState";
import { migrateState } from "../state/migrate";
import { ensureDailyReset } from "../systems/actions";
import type { GameState, GameStateCallback } from "../types/game";

// 存储每个用户的游戏状态（内存缓存）
const userGameStates = new Map<number, GameState>();

// 存储每个用户的操作锁（防止并发操作）
const userOperationLocks = new Map<number, Promise<void>>();

/**
 * 从数据库加载游戏状态
 */
async function loadGameState(userId: number): Promise<GameState> {
  const db = await getDatabase();

  try {
    const stmt = db.prepare("SELECT state_data, last_ts FROM game_states WHERE user_id = ?");
    stmt.bind([userId]);

    if (!stmt.step()) {
      // 没有记录，创建默认状态
      stmt.free();
      return defaultState();
    }

    const result = stmt.getAsObject() as { state_data?: string; last_ts?: number };
    stmt.free();

    if (!result || !result.state_data) {
      return defaultState();
    }

    // 反序列化并补上最后时间戳
    const parsed = JSON.parse(result.state_data) as unknown;
    const candidate = migrateState(parsed);
    if (!candidate) {
      // 迁移失败，回落默认状态
      return defaultState();
    }

    candidate.lastTs = result.last_ts || Date.now();

    // 每日次数按自然日校正
    ensureDailyReset(candidate);

    // 更新最后时间戳
    candidate.lastTs = Date.now();

    return candidate;
  } catch (e) {
    console.error("加载游戏状态失败:", e);
    return defaultState();
  }
}

/**
 * 保存游戏状态到数据库
 */
async function saveGameState(userId: number, state: GameState): Promise<void> {
  const db = await getDatabase();
  const stateData = JSON.stringify(state);
  const lastTs = state.lastTs || Date.now();

  try {
    // sql.js 不支持 ON CONFLICT，先删除再插入
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
    saveDatabase(db);
  } catch (err) {
    console.error("保存游戏状态失败:", err);
    throw err;
  }
}

// 存储每个用户的状态变化回调
const userStateCallbacks = new Map<number, GameStateCallback>();

/**
 * 设置用户状态变化回调
 */
export function setUserStateCallback(userId: number, callback: GameStateCallback | null): void {
  if (callback) {
    userStateCallbacks.set(userId, callback);
  } else {
    userStateCallbacks.delete(userId);
  }
}

/**
 * 初始化用户的游戏状态（加载并设置回调）
 */
export async function initializeUserGame(
  userId: number,
  onStateChange: GameStateCallback | null
): Promise<GameState> {
  const state = await loadGameState(userId);
  userGameStates.set(userId, state);

  // 绑定实时推送回调（WebSocket）
  if (onStateChange) {
    setUserStateCallback(userId, onStateChange);
  }

  // 立即保存一次，确保数据库有最新快照
  await saveGameState(userId, state);

  return state;
}

/**
 * 获取用户的游戏状态
 */
export function getUserGameState(userId: number): GameState | null {
  return userGameStates.get(userId) || null;
}

/**
 * 更新用户的游戏状态
 */
export async function updateUserGameState(userId: number, state: GameState): Promise<void> {
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
 * 获取或创建用户操作锁（防止并发操作）
 */
export async function acquireUserLock(userId: number, operation: () => Promise<void>): Promise<void> {
  // 如果已有正在进行的操作，等待其完成
  const existingLock = userOperationLocks.get(userId);
  if (existingLock) {
    await existingLock;
  }

  // 创建新的锁
  const lockPromise = (async () => {
    try {
      await operation();
    } finally {
      // 操作完成后移除锁
      userOperationLocks.delete(userId);
    }
  })();

  userOperationLocks.set(userId, lockPromise);
  return lockPromise;
}

/**
 * 清理用户的游戏状态和回调
 */
export function cleanupUserGame(userId: number): void {
  userGameStates.delete(userId);
  userStateCallbacks.delete(userId);
}

export { saveGameState };
