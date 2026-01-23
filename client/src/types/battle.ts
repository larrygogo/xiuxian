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
  atk: number;
  def: number;
  status: CombatantStatus;
  position: { x: number; y: number };
  userId?: number;
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
}

export interface BattleEventDTO {
  type: BattleEventType;
  payload: BattleStartPayload | TurnBeginPayload | TurnAutoFillPayload | TurnResolvePayload | BattleEndPayload;
  timestamp: number;
}
