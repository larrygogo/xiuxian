"use strict";

const { BASE_QI_PER_TICK, TICKS_PER_DAY } = require("../config");
const { logLine } = require("../services/logger");

/**
 * 推进游戏天数（如果需要）
 * 当 tickInDay 达到 TICKS_PER_DAY 时，天数+1并重置每日计数
 * @param {Object} s - 游戏状态对象
 */
function advanceDayIfNeeded(s) {
  s.daily.tickInDay += 1;
  if (s.daily.tickInDay >= (s.daily.ticksPerDay || TICKS_PER_DAY)) {
    s.daily.tickInDay = 0;
    s.days += 1;
    s.daily.beastCount = 0;
    s.daily.fortuneCount = 0;
    logLine(`新的一天开始（第 ${s.days} 天游历）。`, s);
  }
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
  advanceDayIfNeeded,
  heal,
  cultivateTick
};
