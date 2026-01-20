"use strict";

const { BASE_QI_PER_TICK, TICKS_PER_DAY } = require("../config");
const { logLine } = require("../services/logger");

/**
 * 获取当前自然日字符串（YYYY-MM-DD）
 * @param {Date} date
 * @returns {string}
 */
function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 按自然日重置每日次数与计数
 * @param {Object} s - 游戏状态对象
 */
function ensureDailyReset(s) {
  let didReset = false;
  if (!s.daily || typeof s.daily !== "object") {
    s.daily = {
      remainingTicks: TICKS_PER_DAY,
      lastResetDate: getDateString(),
      beastCount: 0,
      fortuneCount: 0
    };
    return true;
  }

  const today = getDateString();
  if (typeof s.daily.remainingTicks !== "number") {
    s.daily.remainingTicks = TICKS_PER_DAY;
    didReset = true;
  }
  if (typeof s.daily.lastResetDate !== "string") {
    s.daily.lastResetDate = today;
    didReset = true;
  }

  if (s.daily.lastResetDate !== today) {
    s.daily.remainingTicks = TICKS_PER_DAY;
    s.daily.lastResetDate = today;
    s.daily.beastCount = 0;
    s.daily.fortuneCount = 0;
    logLine("新的一天开始，今日次数已重置。", s);
    didReset = true;
  }

  return didReset;
}

/**
 * 手动疗伤
 * 消耗灵气恢复生命
 * @param {Object} s - 游戏状态对象
 * @returns {boolean} 如果成功疗伤返回 true，否则返回 false
 */
function heal(s) {
  if (s.hp <= 0) {
    logLine("你已死亡，无法疗伤。", s);
    return false;
  }

  if (s.hp >= s.maxHp) {
    logLine("你的生命值已满，无需疗伤。", s);
    return false;
  }

  if (s.qi < 15) {
    logLine("灵气不足（需要至少15点），无法疗伤。", s);
    return false;
  }

  let cost = Math.min(s.qi, Math.floor(15 + Math.random() * 11)); // 15~25
  const healAmt = Math.floor(cost * (1.2 + Math.random() * 0.6));
  const old = s.hp;

  s.qi -= cost;
  s.hp = Math.min(s.maxHp, s.hp + healAmt);

  logLine(`疗伤：消耗灵气 ${cost}，生命 +${s.hp - old}（${s.hp}/${s.maxHp}）。`, s);
  return true;
}

/**
 * 执行一次修炼
 * 获得基础灵气，有概率走火入魔造成伤害
 * @param {Object} s - 游戏状态对象
 */
function cultivateTick(s) {
  const base = BASE_QI_PER_TICK[s.realmIndex] ?? 0;
  const gain = base + (Math.random() < 0.05 ? 1 : 0); // 5% 小波动
  s.qi += gain;

  // 走火入魔（挂机版低风险）
  const mishapChance = 0.008 + s.realmIndex * 0.004;
  if (Math.random() < mishapChance) {
    const dmg = Math.floor(3 + Math.random() * 8) + s.realmIndex * 2;
    s.hp = Math.max(0, s.hp - dmg);
    logLine(`走火入魔：生命 -${dmg}（${s.hp}/${s.maxHp}）。`, s);
    if (s.hp <= 0) {
      s.alive = false;
      logLine("你身死道消，修仙路断。", s);
    }
  }
}

module.exports = {
  ensureDailyReset,
  heal,
  cultivateTick
};
