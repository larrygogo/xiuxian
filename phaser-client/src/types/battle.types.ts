/**
 * 战斗相关类型定义
 */

export type BattlePhase = "PREPARE" | "TURN_INPUT" | "TURN_RESOLVE" | "ENDED";

export type CombatantStatus = "alive" | "dead" | "escaped" | "defending";

export type BattleCommandType = "attack" | "defend" | "skill" | "move" | "item" | "wait" | "escape";

export interface Combatant {
  id: string;
  side: "player" | "monster";
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  spd: number;
  // 战斗属性（和玩家一样的系统）
  pdmg: number; // 物理伤害
  mdmg: number; // 法术伤害
  pdef: number; // 物理防御
  mdef: number; // 法术防御
  // 兼容字段（保留用于向后兼容，实际使用 pdmg/mdmg 和 pdef/mdef）
  atk?: number; // 攻击力（兼容字段，取 pdmg 和 mdmg 的较大值）
  def?: number; // 防御力（兼容字段，取 pdef 和 mdef 的较大值）
  status: CombatantStatus;
  position: { x: number; y: number };
  userId?: number;
  monsterId?: string; // 怪物模板ID（仅怪物）
}

export interface BattleSnapshotDTO {
  roomId: string;
  mapId: string;
  turnNumber: number;
  phase: BattlePhase;
  deadlineAt: number;
  players: Combatant[];
  monsters: Combatant[];
  commands: Array<{
    playerId: string;
    type: BattleCommandType;
    targetId?: string;
  }>;
}

export type BattleEventType =
  | "BATTLE_START"
  | "TURN_BEGIN"
  | "TURN_AUTO_FILL"
  | "TURN_RESOLVE"
  | "BATTLE_END";

export interface BattleStartPayload {
  snapshot: BattleSnapshotDTO;
}

export interface TurnBeginPayload {
  roomId: string;
  turnNumber: number;
  deadlineAt: number;
  submittedCommands: string[];
}

export interface TurnAutoFillPayload {
  roomId: string;
  turnNumber: number;
  autoFilledPlayers: string[];
  defaultTargets: Array<{ playerId: string; targetId: string }>;
}

export interface TurnResolvePayload {
  snapshot: BattleSnapshotDTO;
  logs: string[];
}

export interface BattleEndPayload {
  roomId: string;
  winner: "players" | "monsters" | "draw";
  logs: string[];
  snapshot?: BattleSnapshotDTO; // 最终战斗状态快照
  rewards?: Array<{
    playerId: string;
    userId: number;
    qi: number;
    lingshi: number;
    items: Array<{
      id: string;
      templateId: string;
      name: string;
      type: string;
      count?: number; // 相同物品的数量
    }>;
    success: boolean;
  }>;
}

export interface BattleEventDTO {
  type: BattleEventType;
  payload: BattleStartPayload | TurnBeginPayload | TurnAutoFillPayload | TurnResolvePayload | BattleEndPayload;
  timestamp: number;
}
