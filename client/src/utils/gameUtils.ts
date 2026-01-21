// 游戏配置常量（应该与服务端保持一致）
import type { GameState } from '../types/game';
import levelQiTable from '../data/levelQiTable.json';

const LEVEL_MAX = 100;

export function stageName(state: GameState): string {
  return `${state.level}级`;
}

export function needQi(state: GameState): number {
  // 从 levelQiTable.json 文件中读取升级所需的灵气数量（与服务端逻辑保持一致）
  const lvl = Math.max(1, Math.min(state.level, LEVEL_MAX));
  const qi = levelQiTable[lvl.toString() as keyof typeof levelQiTable];
  
  // 如果表中没有该等级的数据，使用默认值（向后兼容）
  if (qi === undefined) {
    // 降级到旧的线性公式作为后备
    return 30 + (lvl - 1) * 6;
  }
  
  return qi as number;
}
