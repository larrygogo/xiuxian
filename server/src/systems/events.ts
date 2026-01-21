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
 * 随机触发好/中性/坏事件
 */
export function exploreTick(state: GameState): void {
  // 固定概率：40% 好事件，30% 中性事件，30% 坏事件
  const good = 0.4;
  const neutral = 0.3;
  const bad = 0.3;

  const r = Math.random();
  if (r < good) return goodEvent(state);
  if (r < good + neutral) return neutralEvent(state);
  return badEvent(state);
}

/**
 * 处理好事件
 * 可能触发奇遇机缘（获得大量灵气）或掉落物品
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

  // 小概率掉落物品（10%）
  if (Math.random() < 0.1) {
    dropItem(state);
    return;
  }

  // 默认：普通探索，获得少量灵气
  const gain = randInt(2, 6);
  state.qi += gain;
  logLine(`游历探索：灵气 +${gain}。`, state);
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
    return;
  }

  // 默认：普通探索，获得少量灵气
  const gain = randInt(1, 4);
  state.qi += gain;
  logLine(`游历探索：灵气 +${gain}。`, state);
}

/**
 * 处理坏事件（遇到妖兽）
 * 根据实力对比决定是斩杀获得奖励还是受伤
 */
function badEvent(state: GameState): void {
  // 妖兽限流：每天最多 3 次
  if (state.daily.beastCount >= 3) {
    // 达到上限时，普通探索获得少量灵气
    const gain = randInt(1, 3);
    state.qi += gain;
    logLine(`游历探索：灵气 +${gain}。`, state);
    return;
  }
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
    // 战斗死亡惩罚：保留1HP，清空MP，扣除3%灵气和10%灵石
    const qiLoss = Math.floor(state.qi * 0.03);
    const lingshiLoss = Math.floor(state.lingshi * 0.1);
    
    state.hp = 1;
    state.mp = 0;
    state.qi = Math.max(0, state.qi - qiLoss);
    state.lingshi = Math.max(0, state.lingshi - lingshiLoss);
    
    logLine(`你倒在荒野之中，身受重伤。保留1点生命，法力耗尽，灵气 -${qiLoss}，灵石 -${lingshiLoss}。`, state);
    return;
  }

  logLine(`战斗未分胜负，你暂时撤离【${beast}】。`, state);
}
