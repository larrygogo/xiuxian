/**
 * 战斗指令类型
 */
export type CommandType = "attack" | "defend" | "skill" | "move" | "item" | "wait" | "escape";

/**
 * 攻击目标类型
 */
export type TargetType = "enemy" | "self" | "ally" | "position";

/**
 * 战斗指令
 */
export interface Command {
  commandId: string; // 指令ID
  type: CommandType; // 指令类型
  participantId: string; // 发出指令的参与者ID
  targetId?: string; // 目标参与者ID
  targetPosition?: { x: number; y: number }; // 目标位置
  targetType?: TargetType; // 目标类型
  skillId?: string; // 技能ID（如果是技能指令）
  itemId?: string; // 物品ID（如果是物品指令）
  timestamp: number; // 指令时间戳
}

/**
 * 创建战斗指令（Mock）
 */
export function createCommand(
  commandId: string,
  participantId: string,
  type: CommandType
): Command {
  return {
    commandId,
    type,
    participantId,
    timestamp: Date.now()
  };
}
