import type { Combatant } from "./Combatant";
import type { BattleCommand } from "./BattleCommand";

/**
 * 战斗阶段
 */
export type BattlePhase = "PREPARE" | "TURN_INPUT" | "TURN_RESOLVE" | "ENDED";

/**
 * 战斗房间状态
 */
export interface BattleRoomState {
  roomId: string; // 房间ID
  mapId: string; // 地图ID
  turnNumber: number; // 当前回合数
  phase: BattlePhase; // 战斗阶段
  deadlineAt: number; // 截止时间戳（毫秒）
  players: Combatant[]; // 玩家列表（最多10个）
  monsters: Combatant[]; // 怪物列表（最多10个）
  commands: Map<string, BattleCommand>; // 已提交的指令（key: playerId）
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

/**
 * 创建战斗房间状态（Mock）
 */
export function createBattleRoomState(
  roomId: string,
  mapId: string
): BattleRoomState {
  const now = Date.now();
  return {
    roomId,
    mapId,
    turnNumber: 1,
    phase: "PREPARE",
    deadlineAt: now + 30000, // 30秒后
    players: [],
    monsters: [],
    commands: new Map(),
    createdAt: now,
    updatedAt: now
  };
}
