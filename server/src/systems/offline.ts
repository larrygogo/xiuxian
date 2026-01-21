import { OFFLINE_DAILY_QI_LIMIT, OFFLINE_FACTOR, QI_PER_TICK_BASE, QI_PER_TICK_STEP, TICK_MS } from "../config";
import { logLine } from "../services/logger";
import { stepUpAsMuchAsPossible } from "./progression";
import type { GameState } from "../types/game";

/**
 * 格式化时间（毫秒）为可读字符串
 */
function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

/**
 * 获取当前自然日的日期字符串（YYYY-MM-DD格式）
 */
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 计算两个日期之间的自然日数量
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * 计算修炼（吐纳）的期望灵气收益
 */
function getCultivateQiPerTick(level: number): number {
  const base = QI_PER_TICK_BASE + Math.floor((level - 1) * QI_PER_TICK_STEP);
  // 基础灵气 + 5% 概率额外 +1 的期望值
  return base + 0.05;
}

/**
 * 应用离线期间的收益
 * 离线时只按吐纳方式增加灵气，不获得灵草
 * 遵循每日上限：每个自然日最多只能获得上限收益
 */
export function applyOfflineProgress(state: GameState, offlineMs: number): void {
  if (offlineMs <= 0) return;

  // 防止异常时间戳：限制最大离线时长为 1 年
  const MAX_OFFLINE_MS = 365 * 24 * 60 * 60 * 1000;
  const safeOfflineMs = Math.min(offlineMs, MAX_OFFLINE_MS);

  const offlineTicks = Math.floor(safeOfflineMs / TICK_MS);
  if (offlineTicks <= 0) return;

  // 计算自然日跨度
  const lastTs = state.lastTs || Date.now();
  const lastDateStr = getDateString(new Date(lastTs));
  const currentDateStr = getDateString(new Date());
  const days = daysBetween(lastDateStr, currentDateStr);

  // 按吐纳方式计算灵气收益
  const qiPerTick = getCultivateQiPerTick(state.level);
  const ticksPerDay = Math.floor((24 * 60 * 60 * 1000) / TICK_MS);

  let totalQiGain = 0;

  if (days === 0) {
    // 同一天内，按实际 tick 计算，但不超过每日上限
    const qiGain = Math.floor(offlineTicks * qiPerTick * OFFLINE_FACTOR);
    totalQiGain = Math.min(qiGain, OFFLINE_DAILY_QI_LIMIT);
  } else {
    // 跨天了，按自然日计算
    const qiPerDay = Math.floor(ticksPerDay * qiPerTick * OFFLINE_FACTOR);
    const effectiveQiPerDay = Math.min(qiPerDay, OFFLINE_DAILY_QI_LIMIT);
    totalQiGain = days * effectiveQiPerDay;
  }

  state.qi += totalQiGain;
  state.lastOfflineRewardDate = currentDateStr;

  // 离线进境无上限，根据灵气自动推进
  const stepped = stepUpAsMuchAsPossible(state, Infinity);

  logLine(
    `离线结算：离线 ${fmtTime(safeOfflineMs)}，tick=${offlineTicks}，${days}个自然日；灵气 +${totalQiGain}（吐纳），升级 ${stepped} 次。`,
    state
  );
}
