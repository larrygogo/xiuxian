import { LEVEL_MAX } from "../config";
import { logLine } from "../services/logger";
import type { GameState } from "../types/game";

/**
 * 获取当前等级的显示名称
 * 格式："{等级}级"
 */
export function stageName(state: GameState): string {
  return `${state.level}级`;
}

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
 * 执行一次进境（如果条件满足）
 * 按照 阶段 -> 层数 -> 大境界 的顺序推进
 */
export function stepUpOnce(state: GameState): boolean {
  if (isMaxed(state)) return false;

  const req = needQi(state);
  if (state.qi < req) return false;

  // 消耗灵气，准备推进
  state.qi -= req;

  if (state.level < LEVEL_MAX) {
    state.level += 1;
    state.statPoints += 5;
    state.hp = state.maxHp;
    state.mp = state.maxMp;
    logLine(`升级：${stageName(state)}（消耗灵气 ${req}）。`, state);
    return true;
  }

  return false;
}

/**
 * 尽可能多地推进境界，直到达到限制或灵气不足
 */
export function stepUpAsMuchAsPossible(state: GameState, limit: number): number {
  let count = 0;
  while (count < limit && stepUpOnce(state)) count += 1;
  return count;
}

