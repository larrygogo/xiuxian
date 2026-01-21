import type { GameState } from "../types/game";

const MAX_EVENT_LOG_SIZE = 100;

/**
 * 输出带时间戳的日志，并将事件添加到游戏状态的事件日志中
 */
export function logLine(msg: string, state?: GameState): void {
  const ts = new Date().toLocaleString();
  const logMessage = `[${ts}] ${msg}`;
  console.log(logMessage);

  // 如果提供了游戏状态，将事件添加到事件日志中
  if (state && Array.isArray(state.eventLog)) {
    state.eventLog.push(logMessage);

    // 控制日志长度，保留最近 N 条记录
    if (state.eventLog.length > MAX_EVENT_LOG_SIZE) {
      state.eventLog = state.eventLog.slice(-MAX_EVENT_LOG_SIZE);
    }
  }
}
