import type { BattleRoom } from "../domain/BattleRoom";
import type { Command, CommandType } from "../domain/Command";
import { createCommand } from "../domain/Command";
import type { Combatant } from "../domain/Combatant";
import type { BattleRoomState } from "../domain/BattleRoomState";
import type { BattleCommandType } from "../domain/BattleCommand";
import { TurnScheduler } from "./TurnScheduler";

/**
 * 战斗结算引擎
 */
export class ResolveEngine {
  private turnScheduler: TurnScheduler;

  constructor() {
    this.turnScheduler = new TurnScheduler();
  }

  /**
   * 生成怪物 AI 指令
   */
  private generateMonsterCommand(monster: Combatant, roomState: BattleRoomState): Command | null {
    // 找出所有存活的玩家
    const alivePlayers = roomState.players.filter((p) => p.status === "alive");
    if (alivePlayers.length === 0) {
      return null;
    }

    // 随机选择一个存活玩家作为目标
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

    // 创建 ATTACK 指令
    const command = createCommand(
      `cmd_monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      monster.id,
      "attack"
    );
    command.targetId = target.id;
    return command;
  }

  /**
   * 检查战斗是否结束
   */
  private checkBattleEnd(roomState: BattleRoomState): {
    ended: boolean;
    winner?: "players" | "monsters" | "draw";
  } {
    const allPlayersDeadOrEscaped = roomState.players.every(
      (p) => p.status === "dead" || p.status === "escaped"
    );
    const allMonstersDeadOrEscaped = roomState.monsters.every(
      (m) => m.status === "dead" || m.status === "escaped"
    );

    if (allPlayersDeadOrEscaped && allMonstersDeadOrEscaped) {
      return { ended: true, winner: "draw" };
    }
    if (allPlayersDeadOrEscaped) {
      return { ended: true, winner: "monsters" };
    }
    if (allMonstersDeadOrEscaped) {
      return { ended: true, winner: "players" };
    }
    return { ended: false };
  }

  /**
   * 执行回合结算
   */
  resolveTurn(roomState: BattleRoomState): {
    newState: BattleRoomState;
    logs: string[];
    battleEnded: boolean;
    winner?: "players" | "monsters" | "draw";
  } {
    const logs: string[] = [];
    const newState: BattleRoomState = {
      ...roomState,
      players: roomState.players.map((p) => ({ ...p })),
      monsters: roomState.monsters.map((m) => ({ ...m })),
      commands: new Map(roomState.commands)
    };

    // 1. 构建行动列表
    // 获取所有存活参与者
    const allParticipants: Combatant[] = [
      ...newState.players.filter((p) => p.status === "alive"),
      ...newState.monsters.filter((m) => m.status === "alive")
    ];

    // 为怪物生成 AI 指令
    const allCommands = new Map<string, Command>();
    
    // 复制玩家指令
    newState.commands.forEach((cmd, playerId) => {
      const player = newState.players.find((p) => p.userId && `player_${p.userId}` === playerId);
      if (player) {
        // 将 BattleCommand 转换为 Command
        const command: Command = {
          commandId: cmd.commandId,
          type: this.mapBattleCommandTypeToCommandType(cmd.type),
          participantId: player.id,
          targetId: cmd.targetId,
          targetPosition: cmd.targetPosition,
          skillId: cmd.skillId,
          itemId: cmd.itemId,
          timestamp: cmd.timestamp
        };
        allCommands.set(player.id, command);
      }
    });

    // 为怪物生成指令
    for (const monster of newState.monsters) {
      if (monster.status === "alive") {
        const monsterCmd = this.generateMonsterCommand(monster, newState);
        if (monsterCmd) {
          allCommands.set(monster.id, monsterCmd);
        }
      }
    }

    // 2. 速度排序
    const orderedParticipants = this.turnScheduler.calculateTurnOrder(allParticipants);

    // 3. 执行指令（按速度顺序）
    for (const actor of orderedParticipants) {
      const command = allCommands.get(actor.id);
      if (!command || actor.status !== "alive") {
        continue;
      }

      switch (command.type) {
        case "defend":
          actor.status = "defending";
          logs.push(`${actor.name} 进入防御状态`);
          break;

        case "escape":
          const escapeSuccess = Math.random() < 0.3;
          if (escapeSuccess) {
            actor.status = "escaped";
            logs.push(`${actor.name} 成功逃脱`);
          } else {
            logs.push(`${actor.name} 逃脱失败`);
          }
          break;

        case "attack":
          if (!command.targetId) {
            logs.push(`${actor.name} 的攻击指令无效（缺少目标）`);
            break;
          }

          // 查找目标（在 players 或 monsters 中）
          let target: Combatant | undefined = newState.players.find((p) => p.id === command.targetId);
          if (!target) {
            target = newState.monsters.find((m) => m.id === command.targetId);
          }

          if (!target) {
            logs.push(`${actor.name} 的攻击目标无效`);
            break;
          }

          // 检查目标是否存活（排除 dead 和 escaped）
          if (target.status === "dead" || target.status === "escaped") {
            logs.push(`${actor.name} 的攻击目标无效（目标已死亡或逃脱）`);
            break;
          }

          // 计算伤害
          let damage = Math.max(1, actor.atk - target.def);
          const wasDefending = target.status === "defending";
          if (wasDefending) {
            damage = Math.floor(damage * 0.6);
          }

          // 应用伤害
          target.hp = Math.max(0, target.hp - damage);

          // 如果目标死亡，更新状态
          if (target.hp <= 0) {
            target.status = "dead";
            logs.push(`${actor.name} 攻击 ${target.name}，造成 ${damage} 点伤害，${target.name} 被击败`);
          } else {
            const defendText = wasDefending ? "（被防御）" : "";
            logs.push(`${actor.name} 攻击 ${target.name}，造成 ${damage} 点伤害${defendText}`);
          }
          break;

        case "wait":
          logs.push(`${actor.name} 选择等待`);
          break;

        default:
          // skill, move, item 等暂未实现
          logs.push(`${actor.name} 执行了 ${command.type} 指令（暂未实现）`);
          break;
      }
    }

    // 4. 清除 DEFEND 状态（回合结算结束后）
    for (const participant of [...newState.players, ...newState.monsters]) {
      if (participant.status === "defending") {
        participant.status = "alive";
      }
    }

    // 5. 检查战斗是否结束
    const battleResult = this.checkBattleEnd(newState);

    // 6. 回合推进（如果战斗未结束）
    if (!battleResult.ended) {
      newState.turnNumber++;
      newState.phase = "TURN_INPUT";
      newState.deadlineAt = Date.now() + 30000;
      newState.commands.clear(); // 清空指令
      newState.updatedAt = Date.now();
    } else {
      newState.phase = "ENDED";
      newState.updatedAt = Date.now();
    }

    return {
      newState,
      logs,
      battleEnded: battleResult.ended,
      winner: battleResult.winner
    };
  }

  /**
   * 执行战斗指令（保留兼容性，但建议使用 resolveTurn）
   */
  executeCommand(room: BattleRoom, command: Command): { success: boolean; damage?: number } {
    const actor = room.participants.find((p) => p.id === command.participantId);
    if (!actor) {
      return { success: false };
    }

    // Mock 伤害计算
    let damage = 0;
    if (command.type === "attack" && command.targetId) {
      const target = room.participants.find((p) => p.id === command.targetId);
      if (target) {
        damage = Math.floor(actor.atk * 0.8);
        target.hp = Math.max(0, target.hp - damage);
      }
    }

    room.updatedAt = Date.now();
    return { success: true, damage };
  }

  /**
   * 应用持续效果（Mock）
   * 注意：新的 Combatant 类型没有 effects 字段，此方法暂时保留接口但不做实现
   */
  applyOngoingEffects(participant: Combatant): void {
    // Mock 持续效果处理（暂时为空，后续可扩展）
  }

  /**
   * 将 BattleCommandType 映射为 CommandType
   */
  private mapBattleCommandTypeToCommandType(type: BattleCommandType): CommandType {
    // BattleCommandType 和 CommandType 现在完全一致
    return type;
  }

  /**
   * 检查战斗是否结束（保留兼容性，但建议使用 resolveTurn 中的方法）
   */
  checkBattleEndLegacy(room: BattleRoom): { finished: boolean; winner?: Combatant } {
    const aliveParticipants = room.participants.filter((p) => p.hp > 0);
    if (aliveParticipants.length <= 1) {
      return {
        finished: true,
        winner: aliveParticipants[0] || undefined
      };
    }
    return { finished: false };
  }
}
