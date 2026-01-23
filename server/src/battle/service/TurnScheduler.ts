import type { BattleRoom } from "../domain/BattleRoom";
import type { Combatant } from "../domain/Combatant";
import { createCommand } from "../domain/Command";

/**
 * 回合调度器
 */
export class TurnScheduler {
  /**
   * 计算行动顺序（按速度排序，Mock）
   */
  calculateTurnOrder(participants: Combatant[]): Combatant[] {
    return [...participants].sort((a, b) => b.spd - a.spd);
  }

  /**
   * 获取下一个行动者（Mock）
   */
  getNextActor(room: BattleRoom): Combatant | null {
    if (room.participants.length === 0) {
      return null;
    }
    const ordered = this.calculateTurnOrder(room.participants);
    const currentIndex = room.currentActorIndex % ordered.length;
    return ordered[currentIndex] || null;
  }

  /**
   * 推进到下一回合（Mock）
   */
  advanceTurn(room: BattleRoom): void {
    room.currentActorIndex += 1;
    if (room.currentActorIndex >= room.participants.length) {
      room.currentTurn += 1;
      room.currentActorIndex = 0;
    }
    room.updatedAt = Date.now();
  }

  /**
   * 重置回合（Mock）
   */
  resetTurn(room: BattleRoom): void {
    room.currentTurn = 0;
    room.currentActorIndex = 0;
    room.updatedAt = Date.now();
  }

  /**
   * 找出敌方存活单位中 HP% 最低的
   */
  findLowestHpEnemy(room: BattleRoom, player: Combatant): Combatant | null {
    // 找出所有敌方存活单位
    const enemies = room.participants.filter(
      (p) => p.side !== player.side && p.status === "alive"
    );

    if (enemies.length === 0) {
      return null;
    }

    // 找出 HP% 最低的（hp/maxHp 最小）
    let lowestHpEnemy: Combatant | null = null;
    let lowestHpPercent = Infinity;

    for (const enemy of enemies) {
      const hpPercent = enemy.hp / enemy.maxHp;
      if (hpPercent < lowestHpPercent) {
        lowestHpPercent = hpPercent;
        lowestHpEnemy = enemy;
      }
    }

    return lowestHpEnemy;
  }

  /**
   * 自动补齐缺失的指令
   * 返回被自动补齐的玩家ID列表
   */
  autoFillMissingCommands(room: BattleRoom): string[] {
    // 找出所有未提交指令的存活玩家
    const players = room.participants.filter(
      (p) => p.side === "player" && p.status === "alive"
    );

    const autoFilledPlayers: string[] = [];

    for (const player of players) {
      // 检查是否已提交指令
      if (room.pendingCommands.has(player.id)) {
        continue;
      }

      // 找出默认目标（敌方 HP% 最低的）
      const defaultTarget = this.findLowestHpEnemy(room, player);
      if (!defaultTarget) {
        // 如果没有敌方目标，跳过（可能战斗已结束）
        continue;
      }

      // 创建默认 ATTACK 指令
      const command = createCommand(
        `cmd_auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        player.id,
        "attack"
      );
      command.targetId = defaultTarget.id;

      // 保存指令
      room.pendingCommands.set(player.id, command);
      autoFilledPlayers.push(player.id);
    }

    room.updatedAt = Date.now();
    return autoFilledPlayers;
  }
}
