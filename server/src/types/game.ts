// 核心基础属性（与成长相关）
export interface BaseStats {
  str: number; // 力道：物攻/破防/负重
  agi: number; // 身法：速度/闪避/暴击率
  vit: number; // 体魄：生命上限/物防/部分异常抗性
  int: number; // 灵识：法攻/法力上限/法术命中
  spi: number; // 心境：法力回复/元素抗性/控制抗性
  luk: number; // 气运：暴击伤害/掉落与触发概率
}

export interface ElementRes {
  fire: number; // 火元素抗性
  water: number; // 水元素抗性
  lightning: number; // 雷元素抗性
}

// 战斗衍生属性（由基础属性映射）
export interface CombatStats {
  atk: number; // 物理攻击
  def: number; // 物理防御
  matk: number; // 法术攻击
  mdef: number; // 法术防御
  spd: number; // 速度（行动顺序）
  hit: number; // 命中
  eva: number; // 闪避
  crit: number; // 暴击率（这里是数值，不是百分比）
  critDmg: number; // 暴击伤害倍率
  critRes: number; // 暴击抗性
  ccHit: number; // 控制命中
  ccRes: number; // 控制抗性
  statusPower: number; // 异常触发
  statusRes: number; // 异常抗性
  maxHp: number; // 最大生命
  maxMp: number; // 最大法力
  armorPen: number; // 破防/穿甲
  dr: number; // 伤害减免比例
  hpRegen: number; // 生命回复
  mpRegen: number; // 法力回复
  elementRes: ElementRes; // 元素抗性集合
  dropRate: number; // 掉落加成
  procRate: number; // 触发类概率
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
  hp: number; // 当前生命
  maxHp: number; // 最大生命
  mp: number; // 当前法力
  maxMp: number; // 最大法力
  luck: number; // 气运值（兼容字段）
  herbs: number; // 灵草数量
  baseStats: BaseStats; // 基础属性
  combatStats: CombatStats; // 战斗属性
  daily: DailyState; // 每日计数状态
  alive: boolean; // 是否存活
  lastTs: number; // 最近一次更新时间戳
  isTuna: boolean; // 是否处于吐纳状态
  lastOfflineRewardDate: string | null; // 上次离线收益日期
  eventLog: string[]; // 事件日志
  inventory: Item[]; // 背包物品列表（最大容量100）
  equipment: EquipmentSlots; // 已装备的物品
}

// 状态变化回调，用于 WebSocket 推送
export type GameStateCallback = (state: GameState) => void;
