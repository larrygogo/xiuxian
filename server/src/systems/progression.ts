import { LEVEL_MAX, QI_NEED_BASE, QI_NEED_STEP } from "../config";
import { logLine } from "../services/logger";
import { refreshDerivedStats } from "./battle";
import type { GameState } from "../types/game";

/**
 * 获取当前等级的显示名称
 * 格式："{等级}级"
 */
export function stageName(state: GameState): string {
  return `${state.level}级`;
}

/**
 * 计算进境所需的灵气数量
 */
export function qiNeedForStep(level: number): number {
  const lvl = Math.max(1, level);
  return QI_NEED_BASE + (lvl - 1) * QI_NEED_STEP;
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
function stepUpOnce(state: GameState): boolean {
  if (isMaxed(state)) return false;

  const req = needQi(state);
  if (state.qi < req) return false;

  // 消耗灵气，准备推进
  state.qi -= req;

  if (state.level < LEVEL_MAX) {
    state.level += 1;
    applyGrowth(state, "level");
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

type GrowthType = "level";

/**
 * 应用境界成长：提升基础属性并刷新战斗属性
 */
function applyGrowth(state: GameState, type: GrowthType): void {
  // 若基础属性缺失，则按默认值补齐
  const base = state.baseStats ?? {
    str: 10,
    agi: 10,
    vit: 10,
    int: 10,
    spi: 10,
    luk: state.luck ?? 10
  };

  const growth = {
    str: 1,
    agi: 1,
    vit: 1,
    int: 1,
    spi: 1,
    luk: Math.random() < 0.2 ? 1 : 0
  };

  // 破境额外奖励
  void type;

  base.str += growth.str;
  base.agi += growth.agi;
  base.vit += growth.vit;
  base.int += growth.int;
  base.spi += growth.spi;
  base.luk += growth.luk;

  state.baseStats = base;
  state.luck = base.luk;

  // 同步刷新战斗属性与上限
  refreshDerivedStats(state);
}
