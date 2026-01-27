/**
 * 升级进度计算工具
 * 与服务端 server/src/systems/progression.ts 保持一致
 */

import type { GameState } from '@/types/game.types';

const LEVEL_MAX = 100; // 与服务端配置保持一致

/**
 * 原公式（保持不变）
 * 计算原始经验值
 */
function expRaw(level: number): number {
  const base = 100;
  const p = 1.6;
  const growth = 1.08;
  const k = 10;

  return base * Math.pow(level, p) * Math.pow(growth, level / k);
}

/**
 * 结果整形：让经验值变成 step 的倍数
 */
function roundToStep(x: number, step: number): number {
  return Math.round(x / step) * step;
}

/**
 * 最终使用：统一让结尾是 0（10 的倍数）
 * 计算进境所需的灵气数量
 *
 * @param level 当前等级
 * @returns 升级到下一级所需的灵气数量
 */
export function qiNeedForStep(level: number): number {
  const lvl = Math.max(1, Math.min(level, LEVEL_MAX));
  const raw = expRaw(lvl);
  return roundToStep(raw, 10);
}

/**
 * 获取当前状态进境所需的灵气数量
 */
export function needQi(state: GameState): number {
  return qiNeedForStep(state.level);
}

/**
 * 检查是否已达到最高境界
 */
export function isMaxed(state: GameState): boolean {
  return state.level >= LEVEL_MAX;
}

/**
 * 获取当前等级的显示名称
 */
export function stageName(state: GameState): string {
  return `${state.level}级`;
}
