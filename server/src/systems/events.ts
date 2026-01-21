import { BEASTS } from "../config";
import { logLine } from "../services/logger";
import { autoBattle } from "./battle";
import { dropItem } from "./items";
import type { GameState } from "../types/game";
import type { BattleResult } from "../types/battle";

/**
 * 生成指定范围内的随机整数（包含边界）
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 执行一次探索
 * 根据气运值调整事件概率，随机触发好/中性/坏事件
 */
export function exploreTick(state: GameState): void {
  // luck 越高，收益略增；同时保持下限/上限
  const luckBias = state.luck * 0.002;
  let good = 0.4 + luckBias;
  let neutral = 0.3;
  let bad = 0.3 - luckBias;

  // 将概率限制在合理范围内，避免极端值
  good = Math.max(0.25, Math.min(0.65, good));
  bad = Math.max(0.1, Math.min(0.45, bad));

  // 归一化，保证三者总和为 1
  const total = good + neutral + bad;
  good /= total;
  neutral /= total;
  bad /= total;

  const r = Math.random();
  if (r < good) return goodEvent(state);
  if (r < good + neutral) return neutralEvent(state);
  return badEvent(state);
}

/**
 * 处理好事件
 * 可能触发奇遇机缘（获得大量灵气）或采集灵草
 */
function goodEvent(state: GameState): void {
  // 大机缘限流：每天最多 2 次
  if (Math.random() < 0.25 && state.daily.fortuneCount < 2) {
    state.daily.fortuneCount += 1;
    const gain = randInt(18, 36) + Math.floor(state.level * 0.4);
    state.qi += gain;
    logLine(`奇遇机缘：灵气 +${gain}。`, state);
    return;
  }

  // 普通采集灵草
  const herbs = randInt(0, 2) + (Math.random() < 0.25 ? 1 : 0);
  if (herbs > 0) {
    state.herbs += herbs;
    logLine(`采到灵草 x${herbs}（当前 ${state.herbs}）。`, state);
  }

  // 小概率掉落物品（10%）
  if (Math.random() < 0.1) {
    dropItem(state);
  }
}

/**
 * 处理中性事件
 * 可能触发清泉洗髓，恢复少量生命
 */
function neutralEvent(state: GameState): void {
  if (Math.random() < 0.35) {
    const heal = randInt(4, 10);
    state.hp = Math.min(state.maxHp, state.hp + heal);
    logLine(`清泉洗髓：生命 +${heal}（${state.hp}/${state.maxHp}）。`, state);
  }
}

/**
 * 处理坏事件（遇到妖兽）
 * 根据实力对比决定是斩杀获得奖励还是受伤
 */
function badEvent(state: GameState): void {
  // 妖兽限流：每天最多 3 次
  if (state.daily.beastCount >= 3) return;
  state.daily.beastCount += 1;

  const beast = BEASTS[randInt(0, BEASTS.length - 1)];
  const result: BattleResult = autoBattle(state, beast);

  if (result.victory) {
    const reward = randInt(8, 18) + Math.floor(state.level * 0.25);
    state.qi += reward;
    logLine(`斩杀【${beast}】：灵气 +${reward}。`, state);

    // 战斗胜利后概率掉落装备（30%）
    if (Math.random() < 0.3) {
      dropItem(state, undefined); // 随机生成物品
    }
    return;
  }

  // 战败或平局，根据当前血量决定是否死亡
  if (state.hp <= 0) {
    state.alive = false;
    logLine("你倒在荒野之中，身死道消。", state);
    return;
  }

  logLine(`战斗未分胜负，你暂时撤离【${beast}】。`, state);
}
