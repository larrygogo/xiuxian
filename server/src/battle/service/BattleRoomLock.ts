/**
 * 战斗房间并发锁
 * 用于确保同一房间的操作串行执行，防止并发导致的状态不一致
 */
export class BattleRoomLock {
  // 存储每个房间的操作锁
  private roomLocks = new Map<string, Promise<unknown>>();

  /**
   * 获取或创建房间操作锁（防止并发操作）
   */
  async acquireRoomLock<T>(
    roomId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // 如果已有正在进行的操作，等待其完成
    const existingLock = this.roomLocks.get(roomId);
    if (existingLock) {
      await existingLock;
    }

    // 创建新的锁并执行操作
    const lockPromise = operation().finally(() => {
      // 操作完成后移除锁
      this.roomLocks.delete(roomId);
    });

    this.roomLocks.set(roomId, lockPromise);
    
    // 返回操作结果
    return lockPromise;
  }

  /**
   * 检查房间是否有正在进行的操作
   */
  hasLock(roomId: string): boolean {
    return this.roomLocks.has(roomId);
  }

  /**
   * 清理所有锁（用于服务器关闭）
   */
  clearAllLocks(): void {
    this.roomLocks.clear();
  }
}
