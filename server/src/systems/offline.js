"use strict";

const { OFFLINE_FACTOR, TICK_MS, OFFLINE_DAILY_QI_LIMIT, BASE_QI_PER_TICK } = require("../config");
const { logLine } = require("../services/logger");
const { stepUpAsMuchAsPossible } = require("./progression");

/**
 * 格式化时间（毫秒）为可读字符串
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化的时间字符串，例如："1h 30m 45s"
 */
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

/**
 * 获取当前自然日的日期字符串（YYYY-MM-DD格式）
 * @param {Date} date - 日期对象，默认为当前时间
 * @returns {string} 日期字符串
 */
function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算两个日期之间的自然日数量
 * @param {string} startDate - 开始日期（YYYY-MM-DD格式）
 * @param {string} endDate - 结束日期（YYYY-MM-DD格式）
 * @returns {number} 自然日数量
 */
function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * 计算修炼（吐纳）的期望灵气收益
 * 基于 BASE_QI_PER_TICK 和 5% 的额外收益概率
 * @param {number} realmIndex - 境界索引
 * @returns {number} 每 tick 的期望灵气收益
 */
function getCultivateQiPerTick(realmIndex) {
  const base = BASE_QI_PER_TICK[realmIndex] ?? 0;
  // 基础灵气 + 5% 概率额外 +1 的期望值
  return base + 0.05;
}

/**
 * 应用离线期间的收益
 * 离线时只按吐纳（修炼）方式增加灵气，不获得灵草
 * 遵循每日上限：每个自然日最多只能获得上限收益
 * @param {Object} state - 游戏状态对象
 * @param {number} offlineMs - 离线时长（毫秒），最大限制为1年
 */
function applyOfflineProgress(state, offlineMs) {
  if (offlineMs <= 0) return;
  
  // 防止异常时间戳：限制最大离线时长为 1 年（约 31536000000 毫秒）
  const MAX_OFFLINE_MS = 365 * 24 * 60 * 60 * 1000;
  if (offlineMs > MAX_OFFLINE_MS) {
    offlineMs = MAX_OFFLINE_MS;
  }

  const offlineTicks = Math.floor(offlineMs / TICK_MS);
  if (offlineTicks <= 0) return;

  // 计算自然日
  const lastTs = state.lastTs || Date.now();
  const lastDate = new Date(lastTs);
  const currentDate = new Date();
  const lastDateStr = getDateString(lastDate);
  const currentDateStr = getDateString(currentDate);
  const days = daysBetween(lastDateStr, currentDateStr);

  // 按吐纳方式计算灵气收益
  const qiPerTick = getCultivateQiPerTick(state.realmIndex);
  const ticksPerDay = Math.floor((24 * 60 * 60 * 1000) / TICK_MS); // 一天的tick数
  
  let totalQiGain = 0;

  if (days === 0) {
    // 同一天内，按实际tick计算，但不超过每日上限
    const qiGain = Math.floor(offlineTicks * qiPerTick * OFFLINE_FACTOR);
    totalQiGain = Math.min(qiGain, OFFLINE_DAILY_QI_LIMIT);
  } else {
    // 跨天了，按自然日计算
    // 计算每天的理论收益（按吐纳方式）
    const qiPerDay = Math.floor(ticksPerDay * qiPerTick * OFFLINE_FACTOR);
    // 每天最多只能获得上限收益
    const effectiveQiPerDay = Math.min(qiPerDay, OFFLINE_DAILY_QI_LIMIT);
    // 总收益 = 天数 × 每天上限
    totalQiGain = days * effectiveQiPerDay;
  }

  state.qi += totalQiGain;
  state.lastOfflineRewardDate = currentDateStr;

  // 离线进境无上限，根据灵气自动推进
  const stepped = stepUpAsMuchAsPossible(state, Infinity);

  logLine(`离线结算：离线 ${fmtTime(offlineMs)}，tick=${offlineTicks}，${days}个自然日；灵气 +${totalQiGain}（吐纳），进境 ${stepped} 步。`, state);
}

module.exports = { applyOfflineProgress };
