// 游戏配置常量（应该与服务端保持一致）
import type { GameState } from '../types/game';

const QI_NEED_BASE = 30;
const QI_NEED_STEP = 6;

export function stageName(state: GameState): string {
  return `${state.level}级`;
}

export function needQi(state: GameState): number {
  // 计算进境所需的灵气数量（与服务端逻辑保持一致）
  const lvl = Math.max(1, state.level);
  return QI_NEED_BASE + (lvl - 1) * QI_NEED_STEP;
}
