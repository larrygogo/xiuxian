import type { BattleRoom } from "../domain/BattleRoom";
import { createBattleRoom } from "../domain/BattleRoom";
import type { BattleRoomState, BattlePhase } from "../domain/BattleRoomState";
import type { BattleCommand, BattleCommandType } from "../domain/BattleCommand";
import type { CommandType, Command } from "../domain/Command";
import { createCommand } from "../domain/Command";

/**
 * 战斗房间状态适配器
 * 从 BattleRoom 转换为 BattleRoomState（用于快照/传输）
 */
export class BattleRoomStateAdapter {
  /**
   * 将 BattleRoom 转换为 BattleRoomState
   */
  static battleRoomToState(room: BattleRoom): BattleRoomState {
    // 分离玩家和怪物
    const players = room.participants.filter((p) => p.side === "player");
    const monsters = room.participants.filter((p) => p.side === "monster");

    // 转换 commands（从 pendingCommands Map 转换为 BattleCommand）
    const commands = new Map<string, BattleCommand>();
    room.pendingCommands.forEach((cmd, participantId) => {
      // 找到对应的玩家
      const player = players.find((p) => p.id === participantId);
      if (player && player.userId) {
        // 将 Command 类型转换为 BattleCommand 类型
        const battleCommand: BattleCommand = {
          commandId: cmd.commandId,
          playerId: `player_${player.userId}`,
          type: this.mapCommandType(cmd.type),
          targetId: cmd.targetId,
          targetPosition: cmd.targetPosition,
          skillId: cmd.skillId,
          itemId: cmd.itemId,
          timestamp: cmd.timestamp
        };
        commands.set(`player_${player.userId}`, battleCommand);
      }
    });

    // 确定 phase（根据 status 映射）
    let phase: BattlePhase = "PREPARE";
    if (room.status === "in_progress") {
      phase = "TURN_INPUT"; // 默认在输入阶段
    } else if (room.status === "finished") {
      phase = "ENDED";
    }

    return {
      roomId: room.roomId,
      mapId: room.mapId || "",
      turnNumber: room.currentTurn || 1,
      phase,
      deadlineAt: room.deadlineAt || Date.now() + 30000,
      players,
      monsters,
      commands,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };
  }

  /**
   * 将 BattleRoomState 转换为 BattleRoom
   */
  static stateToBattleRoom(state: BattleRoomState): BattleRoom {
    const room = createBattleRoom(state.roomId);
    room.status = state.phase === "ENDED" ? "finished" : state.phase === "TURN_INPUT" ? "in_progress" : "waiting";
    room.participants = [...state.players, ...state.monsters];
    room.currentTurn = state.turnNumber;
    room.currentActorIndex = 0; // 重置行动者索引
    room.mapId = state.mapId;
    room.deadlineAt = state.deadlineAt;
    room.createdAt = state.createdAt;
    room.updatedAt = state.updatedAt;

    // 转换 commands（从 BattleCommand 转换为 Command）
    room.pendingCommands.clear();
    state.commands.forEach((battleCmd, playerId) => {
      // 从 playerId 格式 "player_${userId}" 中提取 userId，然后找到对应的玩家
      const userIdMatch = playerId.match(/^player_(\d+)$/);
      if (userIdMatch) {
        const userId = parseInt(userIdMatch[1], 10);
        const player = state.players.find((p) => p.userId === userId);
        if (player) {
          const command: Command = {
            commandId: battleCmd.commandId,
            type: this.mapBattleCommandTypeToCommandType(battleCmd.type),
            participantId: player.id,
            targetId: battleCmd.targetId,
            targetPosition: battleCmd.targetPosition,
            skillId: battleCmd.skillId,
            itemId: battleCmd.itemId,
            timestamp: battleCmd.timestamp
          };
          room.pendingCommands.set(player.id, command);
        }
      }
    });

    return room;
  }

  /**
   * 将 CommandType 映射为 BattleCommandType
   */
  private static mapCommandType(type: CommandType): BattleCommandType {
    // CommandType 和 BattleCommandType 基本一致，除了 BattleCommandType 有 "escape"
    if (type === "attack" || type === "defend" || type === "skill" || type === "move" || type === "item" || type === "wait" || type === "escape") {
      return type;
    }
    return "wait"; // 默认值
  }

  /**
   * 将 BattleCommandType 映射为 CommandType
   */
  private static mapBattleCommandTypeToCommandType(type: BattleCommandType): CommandType {
    if (type === "attack" || type === "defend" || type === "skill" || type === "move" || type === "item" || type === "wait" || type === "escape") {
      return type;
    }
    return "wait"; // 默认值
  }
}
