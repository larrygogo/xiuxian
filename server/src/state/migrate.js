"use strict";

const { TICKS_PER_DAY } = require("../config");

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  if ("days" in s) delete s.days;

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
      remainingTicks: TICKS_PER_DAY,
      lastResetDate: getDateString(),
      beastCount: 0,
      fortuneCount: 0
    };
  } else {
    if (typeof s.daily.remainingTicks !== "number") s.daily.remainingTicks = TICKS_PER_DAY;
    if (typeof s.daily.lastResetDate !== "string") s.daily.lastResetDate = getDateString();
    if (typeof s.daily.beastCount !== "number") s.daily.beastCount = 0;
    if (typeof s.daily.fortuneCount !== "number") s.daily.fortuneCount = 0;
    if ("ticksPerDay" in s.daily) delete s.daily.ticksPerDay;
    if ("tickInDay" in s.daily) delete s.daily.tickInDay;
  }

  // 约束范围（防止坏存档）
  if (s.level < 1) s.level = 1;
  if (s.phase < 0) s.phase = 0;
  if (s.phase > 2) s.phase = 2;

  return s;
}

module.exports = { migrateState };
