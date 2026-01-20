"use strict";

const { ensureDailyReset } = require("./actions");

/**
 * 游戏主循环（保留接口以兼容）
 * 目前仅执行自然日重置
 * @param {Object} state - 游戏状态对象
 */
function tick(state) {
  if (!state.alive) return;

  ensureDailyReset(state);
}

module.exports = { tick };
