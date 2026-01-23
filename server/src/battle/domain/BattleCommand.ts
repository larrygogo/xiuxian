/**
 * 战斗指令类型
 */
export type BattleCommandType = "attack" | "defend" | "skill" | "move" | "item" | "wait" | "escape";

/**
 * 战斗指令
 */
export interface BattleCommand {
  commandId: string; // 指令ID
  playerId: string; // 玩家ID
  type: BattleCommandType; // 指令类型
  targetId?: string; // 目标ID
  targetPosition?: { x: number; y: number }; // 目标位置
  skillId?: string; // 技能ID（如果是技能指令）
  itemId?: string; // 物品ID（如果是物品指令）
  timestamp: number; // 时间戳
}

/**
 * 创建战斗指令（Mock）
 */
export function createBattleCommand(
  commandId: string,
  playerId: string,
  type: BattleCommandType
): BattleCommand {
  return {
    commandId,
    playerId,
    type,
    timestamp: Date.now()
  };
}
