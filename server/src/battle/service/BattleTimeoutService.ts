import type { BattleRoomService } from "./BattleRoomService";
import type { TurnScheduler } from "./TurnScheduler";
import type { BattleGateway } from "../ws/BattleGateway";
import { BattleRoomLock } from "./BattleRoomLock";
import type { BattleRoomRepo } from "../repo/BattleRoomRepo";
import { BattleRoomStateAdapter } from "./BattleRoomStateAdapter";

/**
 * 战斗超时检查服务
 * 管理所有房间的超时定时器
 */
export class BattleTimeoutService {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private roomLock: BattleRoomLock;

  constructor() {
    this.roomLock = new BattleRoomLock();
  }

  /**
   * 安排超时检查
   */
  scheduleTimeoutCheck(
    roomId: string,
    deadlineAt: number,
    battleRoomService: BattleRoomService,
    turnScheduler: TurnScheduler,
    battleGateway: BattleGateway
  ): void {
    // 取消旧的定时器（如果存在）
    this.cancelTimeoutCheck(roomId);

    // 计算延迟时间
    const delay = Math.max(0, deadlineAt - Date.now());

    const scheduleRoom = battleRoomService.getRoom(roomId);
    const scheduleTurn = scheduleRoom?.currentTurn ?? -1;
    console.log(`scheduleDeadline ${roomId} ${scheduleTurn} ${deadlineAt} ${delay}`);
    console.log(`[BattleTimeoutService] 安排超时检查: roomId=${roomId}, deadlineAt=${new Date(deadlineAt).toISOString()}, delay=${delay}ms`);

    // 设置定时器
    const timeout = setTimeout(async () => {
      const now = Date.now();
      const firedRoom = battleRoomService.getRoom(roomId);
      const firedPhase = firedRoom ? BattleRoomStateAdapter.battleRoomToState(firedRoom).phase : "UNKNOWN";
      const firedTurn = firedRoom?.currentTurn ?? -1;
      const firedDeadlineAt = firedRoom?.deadlineAt ?? deadlineAt;
      console.log(`deadlineTimerFired ${roomId} ${now} ${firedPhase} ${firedTurn} ${firedDeadlineAt}`);

      console.log(`[BattleTimeoutService] 超时触发: roomId=${roomId}`);
      await this.handleTimeout(
        roomId,
        battleRoomService,
        turnScheduler,
        battleGateway
      );
      // 定时器执行后自动清理
      this.timeouts.delete(roomId);
    }, delay);

    this.timeouts.set(roomId, timeout);
  }

  /**
   * 处理超时
   */
  private async handleTimeout(
    roomId: string,
    battleRoomService: BattleRoomService,
    turnScheduler: TurnScheduler,
    battleGateway: BattleGateway
  ): Promise<void> {
    await this.roomLock.acquireRoomLock(roomId, async () => {
      console.log(`[BattleTimeoutService] 处理超时: roomId=${roomId}`);
      
      // 获取房间
      const room = battleRoomService.getRoom(roomId);
      const now = Date.now();
      const phase = room ? BattleRoomStateAdapter.battleRoomToState(room).phase : "UNKNOWN";
      const turn = room?.currentTurn ?? -1;
      console.log(`onDeadlineEnter ${roomId} ${now} ${phase} ${turn}`);
      if (!room) {
        console.log(`[BattleTimeoutService] 房间不存在: roomId=${roomId}`);
        return;
      }

      // 检查房间状态（是否仍在当前回合）
      if (room.status !== "in_progress") {
        console.log(`[BattleTimeoutService] 房间状态不是 in_progress: roomId=${roomId}, status=${room.status}`);
        return;
      }

      // 检查是否已经超过截止时间（允许1秒的误差）
      if (now < room.deadlineAt - 1000) {
        console.log(`[BattleTimeoutService] 尚未到达截止时间: roomId=${roomId}, deadlineAt=${new Date(room.deadlineAt).toISOString()}, now=${new Date(now).toISOString()}`);
        // 重新安排定时器
        this.scheduleTimeoutCheck(
          roomId,
          room.deadlineAt,
          battleRoomService,
          turnScheduler,
          battleGateway
        );
        return;
      }

      // 自动补齐缺失的指令
      const autoFilledPlayers = turnScheduler.autoFillMissingCommands(room);

      // 如果有自动补齐的玩家，保存房间并广播事件
      if (autoFilledPlayers.length > 0) {
        battleRoomService.saveRoom(room);

        // 广播 TURN_AUTO_FILL 事件
        const defaultTargets: Array<{ playerId: string; targetId: string }> = [];
        for (const playerId of autoFilledPlayers) {
          const command = room.pendingCommands.get(playerId);
          if (command && command.targetId) {
            defaultTargets.push({
              playerId,
              targetId: command.targetId
            });
          }
        }
        battleGateway.broadcastAutoFill(roomId, room.currentTurn, autoFilledPlayers, defaultTargets);
      }

      // 触发结算（无论是否有自动补齐，都需要结算）
      // 注意：即使所有玩家都已提交，也需要通过超时机制触发结算
      console.log(`[BattleTimeoutService] 触发结算: roomId=${roomId}, autoFilledPlayers=${autoFilledPlayers.length}`);
      const resolveResult = battleRoomService.resolveTurn(roomId);
      if (!resolveResult) {
        console.log(`[BattleTimeoutService] 结算失败: roomId=${roomId}`);
        return;
      }

      console.log(`[BattleTimeoutService] 结算成功: roomId=${roomId}, battleEnded=${resolveResult.battleEnded}`);

      // 如果战斗结束，计算奖励并广播 BATTLE_END 事件（不发送 TURN_RESOLVE）
      if (resolveResult.battleEnded && resolveResult.winner) {
        // 计算奖励
        const rewards = battleRoomService.calculateBattleRewards(roomId, resolveResult.winner);
        
        // 应用奖励
        if (rewards.length > 0) {
          await battleRoomService.applyBattleRewards(rewards);
        }
        
        // 广播事件（包含奖励信息和最终快照）
        battleGateway.broadcastBattleEnd(roomId, resolveResult.winner, resolveResult.logs, rewards, resolveResult.snapshot);
      } else if (!resolveResult.battleEnded) {
        // 如果战斗未结束，广播 TURN_RESOLVE 事件
        if (resolveResult.snapshot) {
          battleGateway.broadcastTurnResolve(roomId, resolveResult.snapshot, resolveResult.logs);
        }
        
        // 触发下一回合的 TURN_BEGIN
        const newRoom = battleRoomService.getRoom(roomId);
        if (newRoom) {
          battleGateway.broadcastTurnBegin(roomId, newRoom);
        }
      }
    });
  }

  /**
   * 取消超时检查
   */
  cancelTimeoutCheck(roomId: string): void {
    const timeout = this.timeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(roomId);
    }
  }

  /**
   * 清理所有定时器（用于服务器关闭）
   */
  clearAllTimeouts(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}
