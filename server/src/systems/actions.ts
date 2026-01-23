import { logLine } from "../services/logger";
import type { GameState } from "../types/game";

/**
 * 处理角色死亡
 * 应用死亡惩罚：保留1HP，清空MP，扣除3%灵气和10%灵石
 * @param state 游戏状态
 * @param deathMessage 死亡日志消息（可选，默认使用通用消息）
 */
export function handleDeath(state: GameState, deathMessage?: string): void {
  // 死亡惩罚：保留1HP，清空MP，扣除3%灵气和10%灵石
  const qiLoss = Math.floor(state.qi * 0.03);
  const lingshiLoss = Math.floor(state.lingshi * 0.1);
  
  state.hp = 1;
  state.mp = 0;
  state.qi = Math.max(0, state.qi - qiLoss);
  state.lingshi = Math.max(0, state.lingshi - lingshiLoss);
  
  const penaltyDetail = `保留1点生命，法力耗尽，灵气 -${qiLoss}，灵石 -${lingshiLoss}。`;
  const message = deathMessage
    ? `${deathMessage}${deathMessage.endsWith("。") ? "" : "。"}${penaltyDetail}`
    : `你身死道消，修仙路断。${penaltyDetail}`;
  logLine(message, state);
}

/**
 * 手动疗伤：消耗灵气恢复生命
 */
export function heal(state: GameState): boolean {
  if (state.hp <= 0) {
    logLine("你已死亡，无法疗伤。", state);
    return false;
  }

  if (state.hp >= state.maxHp) {
    logLine("你的生命值已满，无需疗伤。", state);
    return false;
  }

  if (state.qi < 15) {
    logLine("灵气不足（需要至少15点），无法疗伤。", state);
    return false;
  }

  // 消耗 15~25 的灵气，治疗量与消耗联动
  const cost = Math.min(state.qi, Math.floor(15 + Math.random() * 11));
  const healAmt = Math.floor(cost * (1.2 + Math.random() * 0.6));
  const oldHp = state.hp;

  state.qi -= cost;
  state.hp = Math.min(state.maxHp, state.hp + healAmt);

  logLine(`疗伤：消耗灵气 ${cost}，生命 +${state.hp - oldHp}（${state.hp}/${state.maxHp}）。`, state);
  return true;
}
