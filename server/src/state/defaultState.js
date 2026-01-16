"use strict";

const { TICKS_PER_DAY } = require("../config");

/**
 * 创建默认的游戏状态对象
 * @returns {Object} 包含所有默认值的游戏状态对象
 */
function defaultState() {
  return {
    name: "无名修士",

    // 大境界/层/阶段
    realmIndex: 0,
    level: 1,
    phase: 0, // 0前期 1中期 2后期

    qi: 0,
    hp: 100,
    maxHp: 100,
    luck: 10,
    herbs: 0,

    days: 0,

    daily: {
      ticksPerDay: TICKS_PER_DAY,
      tickInDay: 0,
      beastCount: 0,
      fortuneCount: 0
    },

    alive: true,
    lastTs: Date.now(),

    // 吐纳状态
    isTuna: false,

    // 离线收益记录（自然日）
    lastOfflineRewardDate: null,  // 上次获得离线收益的日期（YYYY-MM-DD格式）

    // 事件日志（最多保留最近100条）
    eventLog: []
  };
}

module.exports = { defaultState };
