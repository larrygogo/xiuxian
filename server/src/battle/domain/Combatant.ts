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
  // 战斗属性（和玩家一样的系统）
  pdmg: number; // 物理伤害
  mdmg: number; // 法术伤害
  pdef: number; // 物理防御
  mdef: number; // 法术防御
  // 兼容字段（保留用于向后兼容，实际使用 pdmg/mdmg 和 pdef/mdef）
  atk?: number; // 攻击力（兼容字段，取 pdmg 和 mdmg 的较大值）
  def?: number; // 防御力（兼容字段，取 pdef 和 mdef 的较大值）
  status: CombatantStatus; // 状态
  position: { x: number; y: number }; // 战场位置
  userId?: number; // 用户ID（仅玩家）
  monsterId?: string; // 怪物模板ID（仅怪物）
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
  // Mock 基础属性（使用新的战斗属性系统）
  const baseHp = 100;
  const basePdmg = 10;
  const baseMdmg = 8;
  const basePdef = 5;
  const baseMdef = 5;
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
    pdmg: basePdmg,
    mdmg: baseMdmg,
    pdef: basePdef,
    mdef: baseMdef,
    atk: Math.max(basePdmg, baseMdmg), // 兼容字段
    def: Math.max(basePdef, baseMdef), // 兼容字段
    status: "alive",
    position: { x: 0, y: 0 },
    userId: side === "player" ? undefined : undefined
  };
}
