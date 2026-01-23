import type { BattleRoom } from "../domain/BattleRoom";
import type { Combatant } from "../domain/Combatant";
import { createBattleRoom } from "../domain/BattleRoom";
import { BattleRoomRepo } from "../repo/BattleRoomRepo";
import { MonsterSpawnService } from "./MonsterSpawnService";
import { CombatantAdapter } from "./CombatantAdapter";
import { getUserGameState, updateUserGameState } from "../../services/gameService";
import { handleDeath } from "../../systems/actions";
import { createCommand } from "../domain/Command";
import type { BattleCommandType } from "../domain/BattleCommand";
import type { CommandType } from "../domain/Command";
import { BattleRoomStateAdapter } from "./BattleRoomStateAdapter";
import { ResolveEngine } from "./ResolveEngine";
import type { BattleSnapshotDTO } from "../dto/BattleSnapshotDTO";

/**
 * 战斗房间服务
 */
export class BattleRoomService {
  private repo: BattleRoomRepo;
  private monsterSpawnService: MonsterSpawnService;
  private resolveEngine: ResolveEngine;

  constructor(repo: BattleRoomRepo) {
    this.repo = repo;
    this.monsterSpawnService = new MonsterSpawnService();
    this.resolveEngine = new ResolveEngine();
  }

  /**
   * 创建战斗房间（新方法：支持地图和玩家列表）
   */
  createRoom(mapId: string, playerIds: number[]): BattleRoom {
    // 校验玩家数
    if (playerIds.length === 0 || playerIds.length > 10) {
      throw new Error("玩家数量必须在 1-10 之间");
    }

    // 生成房间ID
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 获取所有玩家的 GameState 并计算平均等级
    const playerStates: Array<{ userId: number; state: any }> = [];
    let totalLevel = 0;

    for (const userId of playerIds) {
      const gameState = getUserGameState(userId);
      if (!gameState) {
        throw new Error(`用户 ${userId} 的游戏状态不存在`);
      }
      playerStates.push({ userId, state: gameState });
      totalLevel += gameState.level;
    }

    const playersAvgLevel = totalLevel / playerIds.length;

    // 生成怪物
    const monsters = this.monsterSpawnService.spawnForMap(
      mapId,
      playersAvgLevel,
      playerIds.length
    );

    // 转换玩家为 Combatant
    const players: Combatant[] = [];
    const battlefieldWidth = 10;
    const battlefieldHeight = 10;

    playerStates.forEach(({ userId, state }, index) => {
      const playerId = `player_${userId}_${Date.now()}`;
      const combatant = CombatantAdapter.gameStateToCombatant(
        userId,
        state,
        playerId
      );

      // 设置玩家位置（在左侧，根据索引排列，最多3列）
      const x = Math.min(2, Math.floor(index / 3));
      const y = index % 3;
      combatant.position = { x, y };

      players.push(combatant);
    });

    // 创建战斗房间
    const room = createBattleRoom(roomId);
    room.status = "in_progress";
    room.currentTurn = 1;
    room.participants = [...players, ...monsters];
    room.mapId = mapId;
    room.deadlineAt = Date.now() + 30000; // 30秒后

    // 设置地图配置（如果需要）
    const mapConfig = {
      width: battlefieldWidth,
      height: battlefieldHeight,
      terrain: []
    };
    room.mapConfig = mapConfig;

    this.repo.save(room);
    return room;
  }

  /**
   * 创建战斗房间（兼容方法：仅生成房间ID）
   */
  createRoomWithId(roomId: string): BattleRoom {
    const room = createBattleRoom(roomId);
    this.repo.save(room);
    return room;
  }

  /**
   * 获取战斗房间（Mock）
   */
  getRoom(roomId: string): BattleRoom | null {
    return this.repo.findById(roomId);
  }

  /**
   * 加入战斗房间（Mock）
   */
  joinRoom(roomId: string, participant: Combatant): boolean {
    const room = this.repo.findById(roomId);
    if (!room) {
      return false;
    }
    room.participants.push(participant);
    room.updatedAt = Date.now();
    this.repo.save(room);
    return true;
  }

  /**
   * 离开战斗房间（Mock）
   */
  leaveRoom(roomId: string, participantId: string): boolean {
    const room = this.repo.findById(roomId);
    if (!room) {
      return false;
    }
    room.participants = room.participants.filter((p) => p.id !== participantId);
    room.updatedAt = Date.now();
    this.repo.save(room);
    return true;
  }

  /**
   * 更新房间状态（Mock）
   */
  updateRoomStatus(roomId: string, status: BattleRoom["status"]): boolean {
    const room = this.repo.findById(roomId);
    if (!room) {
      return false;
    }
    room.status = status;
    room.updatedAt = Date.now();
    this.repo.save(room);
    return true;
  }

  /**
   * 保存房间（用于外部服务直接保存）
   */
  saveRoom(room: BattleRoom): void {
    this.repo.save(room);
  }

  /**
   * 获取仓库（用于外部服务访问）
   */
  getRepo(): BattleRoomRepo {
    return this.repo;
  }

  /**
   * 查找用户未结束的战斗房间
   */
  getActiveRoomByUserId(userId: number): BattleRoom | null {
    const rooms = this.repo.findAll();
    const activeRooms = rooms.filter((room) => {
      if (room.status !== "in_progress") {
        return false;
      }
      return room.participants.some(
        (p) => p.side === "player" && p.userId === userId
      );
    });

    if (activeRooms.length === 0) {
      return null;
    }

    // 优先返回最近更新的房间
    activeRooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return activeRooms[0];
  }

  /**
   * 根据 userId 查找房间中的玩家 Combatant
   */
  getPlayerCombatant(roomId: string, userId: number): Combatant | null {
    const room = this.repo.findById(roomId);
    if (!room) {
      return null;
    }
    return room.participants.find(
      (p) => p.side === "player" && p.userId === userId
    ) || null;
  }

  /**
   * 提交战斗指令
   */
  submitCommand(
    roomId: string,
    userId: number,
    turn: number,
    type: BattleCommandType,
    targetId?: string,
    itemId?: string
  ): { success: boolean; allSubmitted?: boolean } {
    const room = this.repo.findById(roomId);
    if (!room) {
      return { success: false };
    }

    // 校验回合号
    if (turn !== room.currentTurn) {
      return { success: false };
    }

    // 查找玩家
    const player = this.getPlayerCombatant(roomId, userId);
    if (!player) {
      return { success: false };
    }

    // 校验玩家状态
    if (player.status !== "alive") {
      return { success: false };
    }

    // 检查是否已经提交过指令（不允许修改）
    if (room.pendingCommands.has(player.id)) {
      return { success: false }; // 已提交，不允许修改
    }

    // 校验 ATTACK 指令必须有 targetId
    if (type === "attack" && !targetId) {
      return { success: false };
    }
    if (type === "item" && (!targetId || !itemId)) {
      return { success: false };
    }

    // 将 BattleCommandType 转换为 CommandType（处理 "escape"）
    const commandType: CommandType = type === "escape" ? "escape" : type;

    // 创建指令
    const command = createCommand(
      `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player.id,
      commandType
    );
    command.targetId = targetId;
    if (itemId) {
      command.itemId = itemId;
    }

    // 保存指令
    room.pendingCommands.set(player.id, command);
    room.updatedAt = Date.now();
    this.repo.save(room);

    // 检查是否所有存活玩家都已提交指令
    const alivePlayers = room.participants.filter(
      (p) => p.side === "player" && p.status === "alive"
    );
    const allSubmitted = alivePlayers.every((p) => room.pendingCommands.has(p.id));

    return { success: true, allSubmitted };
  }

  /**
   * 执行回合结算
   */
  resolveTurn(roomId: string): {
    logs: string[];
    battleEnded: boolean;
    winner?: "players" | "monsters" | "draw";
    snapshot?: BattleSnapshotDTO;
  } | null {
    const room = this.repo.findById(roomId);
    if (!room) {
      return null;
    }

    // 转换为 BattleRoomState
    const roomState = BattleRoomStateAdapter.battleRoomToState(room);

    // 执行结算
    const result = this.resolveEngine.resolveTurn(roomState);

    // 转换回 BattleRoom 并保存
    const newRoom = BattleRoomStateAdapter.stateToBattleRoom(result.newState);
    
    // 更新房间状态
    if (result.battleEnded) {
      newRoom.status = "finished";
    } else {
      newRoom.status = "in_progress";
      newRoom.currentTurn = result.newState.turnNumber;
      newRoom.deadlineAt = result.newState.deadlineAt;
      newRoom.pendingCommands.clear(); // 清空指令
    }

    // 保存房间
    this.repo.save(newRoom);

    // 如果战斗结束，同步玩家生命/法力到游戏状态
    if (result.battleEnded) {
      this.syncPlayerStatesFromRoom(newRoom);
    }

    // 构建快照
    const snapshot: BattleSnapshotDTO = {
      roomId: result.newState.roomId,
      mapId: result.newState.mapId,
      turnNumber: result.newState.turnNumber,
      phase: result.newState.phase,
      deadlineAt: result.newState.deadlineAt,
      players: result.newState.players,
      monsters: result.newState.monsters,
      commands: Array.from(result.newState.commands.values()).map((cmd) => ({
        playerId: cmd.playerId,
        type: cmd.type,
        targetId: cmd.targetId
      }))
    };

    return {
      logs: result.logs,
      battleEnded: result.battleEnded,
      winner: result.winner,
      snapshot
    };
  }

  /**
   * 战斗结束时，将玩家生命/法力同步回 GameState
   */
  private syncPlayerStatesFromRoom(room: BattleRoom): void {
    const players = room.participants.filter(
      (p) => p.side === "player" && typeof p.userId === "number"
    );

    for (const player of players) {
      const userId = player.userId as number;
      const state = getUserGameState(userId);
      if (!state) {
        continue;
      }

      const clampedHp = Math.max(0, Math.min(Math.floor(player.hp), state.maxHp));
      if (clampedHp <= 0) {
        handleDeath(state, "战斗中阵亡，受到死亡惩罚。");
      } else {
        state.hp = clampedHp;
        if (typeof player.mp === "number") {
          const maxMp = state.maxMp;
          state.mp = Math.max(0, Math.min(Math.floor(player.mp), maxMp));
        }
      }

      void updateUserGameState(userId, state).catch((err) => {
        console.error("同步战斗结算玩家状态失败:", err);
      });
    }
  }
}
