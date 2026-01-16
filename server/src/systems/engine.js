"use strict";

const { advanceDayIfNeeded } = require("./actions");

/**
 * 游戏主循环，每个 tick 执行一次
 * 目前只推进游戏时间
 * @param {Object} state - 游戏状态对象
 */
function tick(state) {
  if (!state.alive) return;

  advanceDayIfNeeded(state);
}

module.exports = { tick };
