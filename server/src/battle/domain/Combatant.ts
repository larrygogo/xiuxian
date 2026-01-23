/**
 * 战斗参与者阵营
 */
export type CombatantSide = "player" | "monster";

/**
 * 战斗参与者状态
 */
export type CombatantStatus = "alive" | "dead" | "escaped" | "defending";

/**
 * 战斗参与者（统一玩家/怪物抽象）
 */
export interface Combatant {
  id: string; // 唯一标识
  side: CombatantSide; // 阵营
  name: string; // 名称
  level: number; // 等级
  hp: number; // 当前生命值
  maxHp: number; // 最大生命值
  mp?: number; // 当前法力值（玩家可用）
  maxMp?: number; // 最大法力值（玩家可用）
  spd: number; // 速度
  atk: number; // 攻击力（统一，不区分物理/法术）
  def: number; // 防御力（统一）
  status: CombatantStatus; // 状态
  position: { x: number; y: number }; // 战场位置
  userId?: number; // 用户ID（仅玩家）
}

/**
 * 创建战斗参与者（Mock）
 */
export function createCombatant(
  id: string,
  side: CombatantSide,
  name: string,
  level: number = 1
): Combatant {
  // Mock 基础属性
  const baseHp = 100;
  const baseAtk = 10;
  const baseDef = 5;
  const baseSpd = 10;

  return {
    id,
    side,
    name,
    level,
    hp: baseHp,
    maxHp: baseHp,
    mp: 0,
    maxMp: 0,
    spd: baseSpd,
    atk: baseAtk,
    def: baseDef,
    status: "alive",
    position: { x: 0, y: 0 },
    userId: side === "player" ? undefined : undefined
  };
}
