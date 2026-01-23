import type { Combatant } from "./Combatant";
import type { Command } from "./Command";
import type { MapConfig } from "./MapConfig";

/**
 * 战斗房间状态
 */
export type BattleRoomStatus = "waiting" | "in_progress" | "finished";

/**
 * 战斗房间实体
 */
export interface BattleRoom {
  roomId: string; // 房间ID
  status: BattleRoomStatus; // 房间状态
  participants: Combatant[]; // 参与者列表
  currentTurn: number; // 当前回合数
  currentActorIndex: number; // 当前行动者索引
  mapConfig: MapConfig; // 地图配置
  mapId: string; // 地图ID
  deadlineAt: number; // 当前回合截止时间戳（毫秒）
  pendingCommands: Map<string, Command>; // 待执行的指令（key: participantId）
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

/**
 * 创建战斗房间（Mock）
 */
export function createBattleRoom(roomId: string): BattleRoom {
  return {
    roomId,
    status: "waiting",
    participants: [],
    currentTurn: 0,
    currentActorIndex: 0,
    mapConfig: {
      width: 10,
      height: 10,
      terrain: []
    },
    mapId: "",
    deadlineAt: 0,
    pendingCommands: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
