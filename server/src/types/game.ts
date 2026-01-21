// 核心基础属性（与成长相关）
export interface BaseStats {
  str: number; // 力道：物攻/破防/负重
  agi: number; // 身法：速度/闪避/暴击率
  vit: number; // 体魄：生命上限/物防/部分异常抗性
  int: number; // 灵识：法攻/法力上限/法术命中
  spi: number; // 根骨：法力回复/元素抗性/控制抗性
}

// 战斗衍生属性（由基础属性映射）
export interface CombatStats {
  hit: number; // 命中
  pdmg: number; // 物伤（物理伤害）
  pdef: number; // 物防（物理防御）
  spd: number; // 速度（行动顺序）
  mdmg: number; // 法伤（法术伤害）
  mdef: number; // 法防（法术防御）
  maxHp: number; // 最大生命
  maxMp: number; // 最大法力
}

// 每日行动计数与限流状态
export interface DailyState {
  remainingTicks: number; // 今日剩余行动次数
  lastResetDate: string; // 上次重置日期
  beastCount: number; // 今日妖兽遭遇次数
  fortuneCount: number; // 今日奇遇次数
}

import type { EquipmentSlots, Item } from "./item";

// 游戏主状态对象（用于存档与运行）
export interface GameState {
  name: string; // 角色名称
  level: number; // 等级（1-100）
  qi: number; // 灵气
  lingshi: number; // 灵石
  hp: number; // 当前生命
  maxHp: number; // 最大生命
  mp: number; // 当前法力
  maxMp: number; // 最大法力
  statPoints: number; // 待分配属性点
  baseStats: BaseStats; // 基础属性
  combatStats: CombatStats; // 战斗属性
  daily: DailyState; // 每日计数状态
  alive: boolean; // 是否存活
  lastTs: number; // 最近一次更新时间戳
  isTuna: boolean; // 是否处于吐纳状态
  eventLog: string[]; // 事件日志
  inventory: (Item | null)[]; // 背包物品列表（固定20个位置，null表示空位置）
  equipment: EquipmentSlots; // 已装备的物品
}

// 状态变化回调，用于 WebSocket 推送
export type GameStateCallback = (state: GameState) => void;
