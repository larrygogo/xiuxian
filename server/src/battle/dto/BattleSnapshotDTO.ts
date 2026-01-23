import type { Combatant } from "../domain/Combatant";
import type { BattleCommand } from "../domain/BattleCommand";
import type { BattlePhase } from "../domain/BattleRoomState";

/**
 * 战斗快照（前端渲染所需）
 */
export interface BattleSnapshotDTO {
  roomId: string; // 房间ID
  mapId: string; // 地图ID
  turnNumber: number; // 回合数
  phase: BattlePhase; // 阶段
  deadlineAt: number; // 截止时间戳
  players: Combatant[]; // 玩家列表
  monsters: Combatant[]; // 怪物列表
  commands: Array<{
    playerId: string;
    type: BattleCommand["type"];
    targetId?: string;
  }>; // 已提交的指令（简化版）
}
