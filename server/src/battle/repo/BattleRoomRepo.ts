import type { BattleRoom } from "../domain/BattleRoom";

/**
 * 战斗房间仓库（内存版）
 */
export class BattleRoomRepo {
  private rooms: Map<string, BattleRoom> = new Map();

  /**
   * 保存战斗房间
   */
  save(room: BattleRoom): void {
    this.rooms.set(room.roomId, room);
  }

  /**
   * 根据ID查找战斗房间
   */
  findById(roomId: string): BattleRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 查找所有战斗房间（Mock）
   */
  findAll(): BattleRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 删除战斗房间
   */
  delete(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * 检查房间是否存在
   */
  exists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }
}
