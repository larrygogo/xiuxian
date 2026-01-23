/**
 * 战斗事件类型
 */
export type BattleEventType =
  | "state_update"
  | "command_received"
  | "turn_start"
  | "turn_end"
  | "battle_end"
  | "BATTLE_START"
  | "TURN_BEGIN"
  | "TURN_AUTO_FILL"
  | "TURN_RESOLVE"
  | "BATTLE_END";

/**
 * 战斗事件DTO（WebSocket推送）
 */
export interface BattleEventDTO {
  type: BattleEventType; // 事件类型
  payload: unknown; // 事件负载（根据type不同）
  timestamp: number; // 时间戳
}

/**
 * 状态更新事件负载
 */
export interface StateUpdatePayload {
  roomId: string;
  phase: string;
  turnNumber: number;
  deadlineAt: number;
}

/**
 * 指令接收事件负载
 */
export interface CommandReceivedPayload {
  playerId: string;
  commandId: string;
  type: string;
}

/**
 * 回合开始事件负载
 */
export interface TurnStartPayload {
  roomId: string;
  turnNumber: number;
  deadlineAt: number;
}

/**
 * 回合结束事件负载
 */
export interface TurnEndPayload {
  roomId: string;
  turnNumber: number;
  logs: string[]; // 战斗日志
}

/**
 * 战斗结束事件负载
 */
export interface BattleEndPayload {
  roomId: string;
  winner: "players" | "monsters" | "draw";
  logs: string[];
  rewards?: Array<{
    playerId: string;
    userId: number;
    experience: number;
    qi: number;
    items: Array<{
      id: string;
      templateId: string;
      name: string;
      type: string;
    }>;
    success: boolean;
  }>;
}

/**
 * 战斗开始事件负载
 */
export interface BattleStartPayload {
  snapshot: import("./BattleSnapshotDTO").BattleSnapshotDTO;
}

/**
 * 回合开始事件负载
 */
export interface TurnBeginPayload {
  roomId: string;
  turnNumber: number;
  deadlineAt: number;
  submittedCommands: string[]; // 已提交指令的玩家ID列表
}

/**
 * 回合自动补齐事件负载
 */
export interface TurnAutoFillPayload {
  roomId: string;
  turnNumber: number;
  autoFilledPlayers: string[]; // 被自动补齐的玩家ID列表（participantId）
  defaultTargets: Array<{ playerId: string; targetId: string }>; // 默认目标映射
}

/**
 * 回合结算事件负载
 */
export interface TurnResolvePayload {
  snapshot: import("./BattleSnapshotDTO").BattleSnapshotDTO;
  logs: string[];
}
