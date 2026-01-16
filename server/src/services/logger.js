"use strict";

const MAX_EVENT_LOG_SIZE = 100;

/**
 * 输出带时间戳的日志，并将事件添加到游戏状态的事件日志中
 * @param {string} msg - 要输出的消息
 * @param {Object} [state] - 游戏状态对象（可选）
 */
function logLine(msg, state) {
  const ts = new Date().toLocaleString();
  const logMessage = `[${ts}] ${msg}`;
  console.log(logMessage);

  // 如果提供了游戏状态，将事件添加到事件日志中
  if (state && Array.isArray(state.eventLog)) {
    state.eventLog.push(logMessage);
    
    // 限制事件日志长度，保留最近的事件
    if (state.eventLog.length > MAX_EVENT_LOG_SIZE) {
      state.eventLog = state.eventLog.slice(-MAX_EVENT_LOG_SIZE);
    }
  }
}

module.exports = { logLine };
