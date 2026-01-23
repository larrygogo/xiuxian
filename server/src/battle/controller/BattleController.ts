import express, { Request, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import { createCombatant } from "../domain/Combatant";
import { configService } from "../service/ConfigService";
import type { BattleSnapshotDTO } from "../dto/BattleSnapshotDTO";
import type { BattleGateway } from "../ws/BattleGateway";
import { BattleRoomLock } from "../service/BattleRoomLock";
import type { BattleCommandType } from "../domain/BattleCommand";
import { battleRoomService } from "../battleSingletons";

const router = express.Router();

// 所有战斗路由都需要认证（除了 mock-state）
router.use((req, res, next) => {
  // mock-state 接口不需要认证
  if (req.path === "/mock-state") {
    return next();
  }
  return authenticateToken(req, res, next);
});

// 初始化服务（Mock）
const roomLock = new BattleRoomLock();

/**
 * 创建战斗房间
 * POST /api/battle/rooms
 */
router.post("/rooms", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const { mapId, playerIds } = req.body as { mapId?: string; playerIds?: number[] };

    if (!mapId || typeof mapId !== "string") {
      return res.status(400).json({ error: "地图ID不能为空" });
    }

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ error: "玩家ID列表不能为空" });
    }

    // 确保当前用户也在玩家列表中
    if (!playerIds.includes(userId)) {
      playerIds.push(userId);
    }

    const room = battleRoomService.createRoom(mapId, playerIds);

    // 触发 WebSocket 事件（BATTLE_START 和 TURN_BEGIN）
    const battleGateway = (req.app as any).battleGateway as BattleGateway | undefined;
    if (battleGateway) {
      battleGateway.triggerBattleStart(room.roomId, mapId);
    }

    res.json({
      message: "战斗房间创建成功",
      room: {
        roomId: room.roomId,
        status: room.status,
        participants: room.participants.length,
        currentTurn: room.currentTurn,
        mapId
      }
    });
  } catch (error) {
    console.error("创建战斗房间错误:", error);
    res.status(500).json({ error: "创建战斗房间失败" });
  }
});

/**
 * 获取战斗房间状态快照（用于前端刷新）
 * GET /api/battle/rooms/:roomId/state
 */
router.get("/rooms/:roomId/state", async (req: Request, res: Response) => {
  try {
    const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
    const room = battleRoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: "战斗房间不存在" });
    }

    // 转换为 BattleRoomState，再转换为 BattleSnapshotDTO
    const { BattleRoomStateAdapter } = await import("../service/BattleRoomStateAdapter");
    const state = BattleRoomStateAdapter.battleRoomToState(room);

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

    res.json({ snapshot });
  } catch (error) {
    console.error("获取战斗状态错误:", error);
    res.status(500).json({ error: "获取战斗状态失败" });
  }
});

/**
 * 获取用户当前未结束的战斗房间
 * GET /api/battle/rooms/active
 */
router.get("/rooms/active", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const room = battleRoomService.getActiveRoomByUserId(userId);
    if (!room) {
      return res.json({ room: null });
    }

    res.json({
      room: {
        roomId: room.roomId,
        status: room.status,
        currentTurn: room.currentTurn
      }
    });
  } catch (error) {
    console.error("获取活跃战斗房间错误:", error);
    res.status(500).json({ error: "获取活跃战斗房间失败" });
  }
});

/**
 * 获取战斗房间信息
 * GET /api/battle/rooms/:roomId
 */
router.get("/rooms/:roomId", async (req: Request, res: Response) => {
  try {
    const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
    const room = battleRoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: "战斗房间不存在" });
    }

    res.json({
      room: {
        roomId: room.roomId,
        status: room.status,
        participants: room.participants.map((p) => ({
          id: p.id,
          name: p.name,
          hp: p.hp,
          maxHp: p.maxHp,
          side: p.side
        })),
        currentTurn: room.currentTurn,
        currentActorIndex: room.currentActorIndex
      }
    });
  } catch (error) {
    console.error("获取战斗房间错误:", error);
    res.status(500).json({ error: "获取战斗房间失败" });
  }
});

/**
 * 加入战斗房间
 * POST /api/battle/rooms/:roomId/join
 */
router.post("/rooms/:roomId/join", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
    const playerId = `player_${userId}_${Date.now()}`;
    const participant = createCombatant(playerId, "player", `玩家${userId}`, 1);
    participant.userId = userId;

    const success = battleRoomService.joinRoom(roomId, participant);
    if (!success) {
      return res.status(404).json({ error: "战斗房间不存在" });
    }

    res.json({
      message: "加入战斗房间成功",
      playerId
    });
  } catch (error) {
    console.error("加入战斗房间错误:", error);
    res.status(500).json({ error: "加入战斗房间失败" });
  }
});

/**
 * 提交战斗指令
 * POST /api/battle/rooms/:roomId/command
 */
router.post("/rooms/:roomId/command", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "未提供认证令牌" });
    }

    const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
    const { turn, type, targetId } = req.body as {
      turn?: number;
      type?: BattleCommandType;
      targetId?: string;
    };

    // 校验参数
    if (!turn || typeof turn !== "number") {
      return res.status(400).json({ error: "回合号不能为空" });
    }

    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "指令类型不能为空" });
    }

    // 使用房间锁包装整个处理逻辑
    await roomLock.acquireRoomLock(roomId, async () => {
      // 提交指令
      const result = battleRoomService.submitCommand(
        roomId,
        userId,
        turn,
        type,
        targetId
      );

      if (!result.success) {
        // 检查是否因为已提交而失败
        const room = battleRoomService.getRoom(roomId);
        if (room) {
          const player = battleRoomService.getPlayerCombatant(roomId, userId);
          if (player && room.pendingCommands.has(player.id)) {
            return res.status(400).json({ error: "指令已提交，不能修改" });
          }
        }
        return res.status(400).json({ error: "指令提交失败：回合号不匹配、玩家不存在或状态无效" });
      }

      // 获取房间以返回指令信息
      const room = battleRoomService.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "战斗房间不存在" });
      }

      const player = battleRoomService.getPlayerCombatant(roomId, userId);
      if (!player) {
        return res.status(400).json({ error: "玩家不存在" });
      }

      const command = room.pendingCommands.get(player.id);
      if (!command) {
        return res.status(500).json({ error: "指令保存失败" });
      }

      // 如果所有玩家都已提交，立即触发结算
      if (result.allSubmitted) {
        const battleGateway = (req.app as any).battleGateway as BattleGateway | undefined;
        const battleTimeoutService = (req.app as any).battleTimeoutService as import("../service/BattleTimeoutService").BattleTimeoutService | undefined;
        
        if (battleGateway && battleTimeoutService) {
          // 取消当前的超时定时器
          battleTimeoutService.cancelTimeoutCheck(roomId);
          
          // 立即触发结算
          const resolveResult = battleRoomService.resolveTurn(roomId);
          if (resolveResult) {
            // 广播 TURN_RESOLVE 事件
            if (resolveResult.snapshot) {
              battleGateway.broadcastTurnResolve(roomId, resolveResult.snapshot, resolveResult.logs);
            }

            // 如果战斗结束，广播 BATTLE_END 事件
            if (resolveResult.battleEnded && resolveResult.winner) {
              battleGateway.broadcastBattleEnd(roomId, resolveResult.winner, []);
            } else if (!resolveResult.battleEnded) {
              // 如果战斗未结束，触发下一回合的 TURN_BEGIN
              const newRoom = battleRoomService.getRoom(roomId);
              if (newRoom) {
                battleGateway.broadcastTurnBegin(roomId, newRoom);
              }
            }
          }
        }
      }

      res.json({
        message: "指令提交成功",
        command: {
          commandId: command.commandId,
          type: command.type,
          targetId: command.targetId,
          timestamp: command.timestamp
        },
        allSubmitted: result.allSubmitted
      });
    });
  } catch (error) {
    console.error("提交战斗指令错误:", error);
    res.status(500).json({ error: "提交战斗指令失败" });
  }
});

/**
 * 获取 Mock 战斗状态（用于前端测试渲染）
 * GET /api/battle/mock-state
 * 注意：此接口不需要认证，用于测试
 */
router.get("/mock-state", async (_req: Request, res: Response) => {
  try {
    // 创建示例玩家
    const player1 = createCombatant("player_1", "player", "玩家1", 5);
    player1.userId = 1;
    player1.hp = 80;
    player1.maxHp = 100;
    player1.atk = 15;
    player1.def = 8;
    player1.spd = 12;
    player1.position = { x: 1, y: 1 };

    const player2 = createCombatant("player_2", "player", "玩家2", 6);
    player2.userId = 2;
    player2.hp = 90;
    player2.maxHp = 110;
    player2.atk = 18;
    player2.def = 10;
    player2.spd = 10;
    player2.position = { x: 2, y: 1 };

    // 创建示例怪物（使用配置服务计算属性）
    const monsterStats1 = configService.calculateMonsterStats("mob_wolf", 5);
    const monster1 = createCombatant("monster_1", "monster", "山林野狼", 5);
    if (monsterStats1) {
      monster1.maxHp = monsterStats1.maxHp;
      monster1.hp = monsterStats1.maxHp;
      monster1.atk = monsterStats1.atk;
      monster1.def = monsterStats1.def;
      monster1.spd = monsterStats1.spd;
    }
    monster1.position = { x: 8, y: 8 };

    const monsterStats2 = configService.calculateMonsterStats("mob_bandit", 6);
    const monster2 = createCombatant("monster_2", "monster", "山贼", 6);
    if (monsterStats2) {
      monster2.maxHp = monsterStats2.maxHp;
      monster2.hp = monsterStats2.maxHp;
      monster2.atk = monsterStats2.atk;
      monster2.def = monsterStats2.def;
      monster2.spd = monsterStats2.spd;
    }
    monster2.position = { x: 9, y: 8 };

    // 构建快照
    const snapshot: BattleSnapshotDTO = {
      roomId: "mock_room_123",
      mapId: "map_forest_1",
      turnNumber: 1,
      phase: "TURN_INPUT",
      deadlineAt: Date.now() + 30000, // 30秒后
      players: [player1, player2],
      monsters: [monster1, monster2],
      commands: [
        {
          playerId: "player_1",
          type: "attack",
          targetId: "monster_1"
        }
      ]
    };

    res.json(snapshot);
  } catch (error) {
    console.error("获取 Mock 战斗状态错误:", error);
    res.status(500).json({ error: "获取 Mock 战斗状态失败" });
  }
});

export default router;
