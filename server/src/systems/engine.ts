import { ensureDailyReset } from "./actions";
import type { GameState } from "../types/game";

/**
 * 游戏主循环（保留接口以兼容）
 * 目前仅执行自然日重置
 */
export function tick(state: GameState): void {
  // 死亡状态不再推进
  if (!state.alive) return;

  ensureDailyReset(state);
}
