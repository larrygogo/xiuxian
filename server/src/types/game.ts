// 核心基础属性（与成长相关）
export interface BaseStats {
  str: number; // 力道
  agi: number; // 身法
  vit: number; // 体魄
  int: number; // 灵识
  spi: number; // 根骨
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

import type { EquipmentSlots, Item } from "./item";

// 游戏主状态对象（用于存档与运行）
export interface GameState {
  characterId: number; // 角色数字ID
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
  lastTs: number; // 最近一次更新时间戳
  eventLog: string[]; // 事件日志
  inventory: (Item | null)[]; // 背包物品列表（固定20个位置，null表示空位置）
  equipment: EquipmentSlots; // 已装备的物品
}

// 状态变化回调，用于 WebSocket 推送
export type GameStateCallback = (state: GameState) => void;
