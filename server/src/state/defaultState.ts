import { TICKS_PER_DAY } from "../config";
import type { GameState } from "../types/game";

// 统一生成自然日字符串（YYYY-MM-DD），用于每日重置
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 创建默认的游戏状态对象
 * @returns 包含所有默认值的游戏状态对象
 */
export function defaultState(): GameState {
  return {
    name: "无名修士",

    // 等级
    level: 1,

    qi: 0,
    lingshi: 0,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,

    // 基础属性（成长维度）
    baseStats: {
      str: 10,
      agi: 10,
      vit: 10,
      int: 10,
      spi: 10
    },

    // 战斗属性（由基础属性映射得出，运行中会刷新）
    combatStats: {
      hit: 0,
      pdmg: 0,
      pdef: 0,
      spd: 0,
      mdmg: 0,
      mdef: 0,
      maxHp: 0,
      maxMp: 0
    },

    // 每日可行动次数与事件限流
    daily: {
      remainingTicks: TICKS_PER_DAY,
      lastResetDate: getDateString(),
      beastCount: 0,
      fortuneCount: 0
    },

    alive: true,
    lastTs: Date.now(),

    // 吐纳状态
    isTuna: false,

    // 事件日志（最多保留最近100条）
    eventLog: [],

    // 物品系统
    inventory: Array(20).fill(null), // 背包物品列表（固定20个位置，null表示空位置）
    equipment: {} // 已装备的物品
  };
}
