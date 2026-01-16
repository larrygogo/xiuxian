"use strict";

const { TICKS_PER_DAY } = require("../config");

/**
 * 迁移和验证游戏状态
 * 确保所有必需字段存在且类型正确，修复损坏的存档
 * @param {Object} s - 游戏状态对象（可能不完整）
 * @returns {Object|null} 迁移后的游戏状态对象，如果输入无效则返回 null
 */
function migrateState(s) {
  if (!s || typeof s !== "object") return null;

  if (typeof s.name !== "string") s.name = "无名修士";
  if (typeof s.realmIndex !== "number") s.realmIndex = 0;

  // 新增：层/阶段
  if (typeof s.level !== "number") s.level = 1;
  if (typeof s.phase !== "number") s.phase = 0;

  if (typeof s.qi !== "number") s.qi = 0;
  if (typeof s.hp !== "number") s.hp = 100;
  if (typeof s.maxHp !== "number") s.maxHp = 100;
  if (typeof s.luck !== "number") s.luck = 10;
  if (typeof s.herbs !== "number") s.herbs = 0;
  if (typeof s.days !== "number") s.days = 0;

  if (typeof s.alive !== "boolean") s.alive = true;
  if (typeof s.lastTs !== "number") s.lastTs = Date.now();

  // 新增：吐纳状态
  if (typeof s.isTuna !== "boolean") s.isTuna = false;

  // 新增：离线收益记录日期
  if (typeof s.lastOfflineRewardDate !== "string" && s.lastOfflineRewardDate !== null) {
    s.lastOfflineRewardDate = null;
  }

  // 新增：事件日志
  if (!Array.isArray(s.eventLog)) {
    s.eventLog = [];
  }

  if (!s.daily || typeof s.daily !== "object") {
    s.daily = {
      ticksPerDay: TICKS_PER_DAY,
      tickInDay: 0,
      beastCount: 0,
      fortuneCount: 0
    };
  } else {
    if (typeof s.daily.ticksPerDay !== "number") s.daily.ticksPerDay = TICKS_PER_DAY;
    if (typeof s.daily.tickInDay !== "number") s.daily.tickInDay = 0;
    if (typeof s.daily.beastCount !== "number") s.daily.beastCount = 0;
    if (typeof s.daily.fortuneCount !== "number") s.daily.fortuneCount = 0;
  }

  // 约束范围（防止坏存档）
  if (s.level < 1) s.level = 1;
  if (s.phase < 0) s.phase = 0;
  if (s.phase > 2) s.phase = 2;

  return s;
}

module.exports = { migrateState };
