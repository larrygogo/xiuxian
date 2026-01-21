import type { CombatStats } from "./game";

// 攻击类型：物理 or 法术
export type AttackType = "physical" | "magic";

// 流血效果
export interface BleedEffect {
  turns: number;
  dmg: number;
}

// 战斗中可叠加的异常状态
export interface BattleEffects {
  bleed?: BleedEffect;
  stun?: number;
}

// 战斗实体（玩家或妖兽）
export interface Combatant {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: CombatStats;
  attackType: AttackType;
  effects: BattleEffects;
}

// 战斗结算结果，用于事件逻辑
export interface BattleResult {
  victory: boolean;
  rounds: number;
  playerHp: number;
  enemyHp: number;
  enemyName: string;
}
