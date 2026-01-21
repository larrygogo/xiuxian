import { MISHAP_BASE, MISHAP_STEP, QI_PER_TICK_BASE, QI_PER_TICK_STEP, TICKS_PER_DAY } from "../config";
import { logLine } from "../services/logger";
import type { GameState } from "../types/game";

// 获取当前自然日字符串（YYYY-MM-DD）
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 按自然日重置每日次数与计数
 */
export function ensureDailyReset(state: GameState): boolean {
  let didReset = false;

  // 如果 daily 结构缺失，立即补齐并视为已重置
  if (!state.daily || typeof state.daily !== "object") {
    state.daily = {
      remainingTicks: TICKS_PER_DAY,
      lastResetDate: getDateString(),
      beastCount: 0,
      fortuneCount: 0
    };
    return true;
  }

  const today = getDateString();

  // 兜底字段，防止旧存档缺失
  if (typeof state.daily.remainingTicks !== "number") {
    state.daily.remainingTicks = TICKS_PER_DAY;
    didReset = true;
  }
  if (typeof state.daily.lastResetDate !== "string") {
    state.daily.lastResetDate = today;
    didReset = true;
  }

  // 日期变化则重置每日次数与计数
  if (state.daily.lastResetDate !== today) {
    state.daily.remainingTicks = TICKS_PER_DAY;
    state.daily.lastResetDate = today;
    state.daily.beastCount = 0;
    state.daily.fortuneCount = 0;
    logLine("新的一天开始，今日次数已重置。", state);
    didReset = true;
  }

  return didReset;
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

/**
 * 执行一次修炼（吐纳）
 * 获得基础灵气，有概率走火入魔造成伤害
 */
export function cultivateTick(state: GameState): void {
  const base = QI_PER_TICK_BASE + Math.floor((state.level - 1) * QI_PER_TICK_STEP);
  const gain = base + (Math.random() < 0.05 ? 1 : 0); // 5% 小波动
  state.qi += gain;

  // 走火入魔：随着等级提升，风险略增
  const mishapChance = MISHAP_BASE + (state.level - 1) * MISHAP_STEP;
  if (Math.random() < mishapChance) {
    const dmg = Math.floor(3 + Math.random() * 8) + Math.floor(state.level * 0.2);
    state.hp = Math.max(0, state.hp - dmg);
    logLine(`走火入魔：生命 -${dmg}（${state.hp}/${state.maxHp}）。`, state);
    if (state.hp <= 0) {
      state.alive = false;
      logLine("你身死道消，修仙路断。", state);
    }
  }
}
