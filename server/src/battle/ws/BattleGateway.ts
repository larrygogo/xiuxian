import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config";
import type { AuthTokenPayload } from "../../types/auth";
import type { BattleRoomRepo } from "../repo/BattleRoomRepo";
import type { BattleRoomService } from "../service/BattleRoomService";
import { BattleRoomStateAdapter } from "../service/BattleRoomStateAdapter";
import type { BattleSnapshotDTO } from "../dto/BattleSnapshotDTO";
import type { BattleStartPayload, TurnBeginPayload, TurnResolvePayload, BattleEndPayload } from "../dto/BattleEventDTO";
import type { BattleTimeoutService } from "../service/BattleTimeoutService";
import { TurnScheduler } from "../service/TurnScheduler";
import { battleRoomRepo, battleRoomService } from "../battleSingletons";

type AuthedSocket = Socket & {
  userId: number;
  username: string;
};

/**
 * 战斗 WebSocket 网关
 */
export class BattleGateway {
  private io: Server;
  private repo: BattleRoomRepo;
  private battleRoomService: BattleRoomService;
  private timeoutService: BattleTimeoutService;
  private turnScheduler: TurnScheduler;

  constructor(io: Server, timeoutService: BattleTimeoutService) {
    this.io = io;
    this.repo = battleRoomRepo;
    this.battleRoomService = battleRoomService;
    this.timeoutService = timeoutService;
    this.turnScheduler = new TurnScheduler();
    this.setupNamespace();
  }

  /**
   * 设置战斗命名空间
   */
  private setupNamespace(): void {
    const battleNamespace = this.io.of("/battle");

    // WebSocket 认证
    battleNamespace.use((socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) {
        return next(new Error("未提供认证令牌"));
      }

      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error("无效或过期的令牌"));
        }

        const payload = decoded as AuthTokenPayload;
        const authed = socket as AuthedSocket;
        authed.userId = payload.userId;
        authed.username = payload.username;
        next();
      });
    });

    // 连接处理
    battleNamespace.on("connection", (socket: Socket) => {
      const authed = socket as AuthedSocket;
      console.log(`战斗网关：用户 ${authed.username} (${authed.userId}) 已连接`);

      // 发送连接成功消息（Mock）
      socket.emit("battle:connected", {
        message: "已连接到战斗服务器",
        userId: authed.userId
      });

      // 加入房间
      socket.on("battle:join", (data: { roomId: string }) => {
        const { roomId } = data;
        socket.join(roomId);
        socket.emit("battle:joined", {
          roomId,
          message: `已加入战斗房间 ${roomId}`
        });

        // 检查房间是否就绪，如果就绪则发送 BATTLE_START 和 TURN_BEGIN
        const room = this.battleRoomService.getRoom(roomId);
        if (room && room.status === "in_progress") {
          this.broadcastBattleStart(roomId, room);
          this.broadcastTurnBegin(roomId, room);
        }
      });

      // 离开房间
      socket.on("battle:leave", (data: { roomId: string }) => {
        const { roomId } = data;
        socket.leave(roomId);
        socket.emit("battle:left", {
          roomId,
          message: `已离开战斗房间 ${roomId}`
        });
      });

      // 提交战斗指令
      socket.on("battle:command", (data: { roomId: string; command: any }) => {
        const { roomId, command } = data;
        // Mock 处理指令
        socket.emit("battle:command:response", {
          roomId,
          commandId: command.commandId || `cmd_${Date.now()}`,
          success: true,
          message: "指令已接收"
        });
      });

      // 获取房间状态
      socket.on("battle:state", (data: { roomId: string }) => {
        const { roomId } = data;
        const room = this.battleRoomService.getRoom(roomId);
        if (room) {
          socket.emit("battle:state:response", {
            roomId,
            room: {
              roomId: room.roomId,
              status: room.status,
              currentTurn: room.currentTurn,
              participants: room.participants.length
            }
          });
        } else {
          socket.emit("battle:state:response", {
            roomId,
            error: "房间不存在"
          });
        }
      });

      // 断开连接
      socket.on("disconnect", () => {
        console.log(`战斗网关：用户 ${authed.username} (${authed.userId}) 已断开连接`);
      });
    });
  }

  /**
   * 广播战斗开始事件
   */
  private broadcastBattleStart(roomId: string, room: any): void {
    // 转换为 BattleRoomState
    const state = BattleRoomStateAdapter.battleRoomToState(room);

    // 转换为 BattleSnapshotDTO
    const snapshot: BattleSnapshotDTO = {
      roomId: state.roomId,
      mapId: state.mapId,
      turnNumber: state.turnNumber,
      phase: state.phase,
      deadlineAt: state.deadlineAt,
      players: state.players,
      monsters: state.monsters,
      commands: Array.from(state.commands.values()).map((cmd) => ({
        playerId: cmd.playerId,
        type: cmd.type,
        targetId: cmd.targetId
      }))
    };

    const payload: BattleStartPayload = {
      snapshot
    };

    const event = {
      type: "BATTLE_START" as const,
      payload,
      timestamp: Date.now()
    };

    // 向房间内所有玩家广播
    const battleNamespace = this.io.of("/battle");
    battleNamespace.to(roomId).emit("battle:event", event);
  }

  /**
   * 广播回合开始事件
   */
  broadcastTurnBegin(roomId: string, room: any): void {
    const submittedCommands = Array.from(room.pendingCommands.keys()) as string[];

    const deadlineAt = room.deadlineAt || Date.now() + 30000;

    const payload: TurnBeginPayload = {
      roomId,
      turnNumber: room.currentTurn || 1,
      deadlineAt,
      submittedCommands
    };

    const event = {
      type: "TURN_BEGIN" as const,
      payload,
      timestamp: Date.now()
    };

    // 向房间内所有玩家广播
    const battleNamespace = this.io.of("/battle");
    battleNamespace.to(roomId).emit("battle:event", event);

    // 安排超时检查
    this.timeoutService.scheduleTimeoutCheck(
      roomId,
      deadlineAt,
      this.battleRoomService,
      this.turnScheduler,
      this
    );
  }

  /**
   * 触发战斗开始（外部调用，例如房间创建后）
   */
  triggerBattleStart(roomId: string, mapId: string): void {
    const room = this.battleRoomService.getRoom(roomId);
    if (room && room.status === "in_progress") {
      this.broadcastBattleStart(roomId, room);
      this.broadcastTurnBegin(roomId, room);
    }
  }

  /**
   * 广播自动补齐事件
   */
  broadcastAutoFill(
    roomId: string,
    turnNumber: number,
    autoFilledPlayers: string[],
    defaultTargets: Array<{ playerId: string; targetId: string }>
  ): void {
    const payload: import("../dto/BattleEventDTO").TurnAutoFillPayload = {
      roomId,
      turnNumber,
      autoFilledPlayers,
      defaultTargets
    };

    const event = {
      type: "TURN_AUTO_FILL" as const,
      payload,
      timestamp: Date.now()
    };

    // 向房间内所有玩家广播
    const battleNamespace = this.io.of("/battle");
    battleNamespace.to(roomId).emit("battle:event", event);
  }

  /**
   * 广播回合结算事件
   */
  broadcastTurnResolve(roomId: string, snapshot: BattleSnapshotDTO, logs: string[]): void {
    const payload: TurnResolvePayload = {
      snapshot,
      logs
    };

    const event = {
      type: "TURN_RESOLVE" as const,
      payload,
      timestamp: Date.now()
    };

    // 向房间内所有玩家广播
    const battleNamespace = this.io.of("/battle");
    battleNamespace.to(roomId).emit("battle:event", event);
  }

  /**
   * 广播战斗结束事件
   */
  broadcastBattleEnd(
    roomId: string,
    winner: "players" | "monsters" | "draw",
    logs: string[],
    rewards?: BattleEndPayload["rewards"]
  ): void {
    const payload: BattleEndPayload = {
      roomId,
      winner,
      logs,
      rewards
    };

    const event = {
      type: "BATTLE_END" as const,
      payload,
      timestamp: Date.now()
    };

    // 向房间内所有玩家广播
    const battleNamespace = this.io.of("/battle");
    battleNamespace.to(roomId).emit("battle:event", event);
  }
}
