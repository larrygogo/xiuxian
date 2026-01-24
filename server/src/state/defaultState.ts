import type { GameState } from "../types/game";

/**
 * 生成唯一的角色数字ID
 * 设计目标：固定8位数字，便于展示/输入
 */
export function generateCharacterId(): number {
  // 8位数字：范围 10000000 到 99999999
  // 使用时间戳的后7位 + 1位随机数，确保是8位
  const timestamp = Date.now();
  const last7Digits = timestamp % 10_000_000;
  const randomDigit = Math.floor(Math.random() * 10);
  // 确保第一位不是0，所以从10000000开始
  return 10_000_000 + (last7Digits % 9_000_000) + randomDigit;
}

/**
 * 创建默认的游戏状态对象
 * @returns 包含所有默认值的游戏状态对象
 */
export function defaultState(): GameState {
  return {
    characterId: generateCharacterId(),
    name: "无名修士",

    // 等级
    level: 1,

    qi: 0,
    lingshi: 0,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    statPoints: 0,

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
    lastTs: Date.now(),

    // 事件日志（最多保留最近100条）
    eventLog: [],

    // 物品系统
    inventory: Array(20).fill(null), // 背包物品列表（固定20个位置，null表示空位置）
    equipment: {} // 已装备的物品
  };
}
