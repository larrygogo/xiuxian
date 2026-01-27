/**
 * WebSocket管理器
 * 管理游戏和战斗的Socket连接
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_NAMESPACES } from '@/config/api.config';

class SocketManager {
  private static instance: SocketManager;

  private gameSocket: Socket | null = null;
  private battleSocket: Socket | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // ==================== 游戏Socket ====================

  /**
   * 连接游戏Socket
   */
  connectGame(token: string): Socket {
    if (this.gameSocket?.connected) {
      return this.gameSocket;
    }

    console.log('Connecting to game socket...');

    this.gameSocket = io(SOCKET_URL + SOCKET_NAMESPACES.GAME, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.gameSocket.on('connect', () => {
      console.log('Game socket connected');
    });

    this.gameSocket.on('disconnect', (reason) => {
      console.log('Game socket disconnected:', reason);
    });

    this.gameSocket.on('connect_error', (error) => {
      console.error('Game socket connection error:', error);
    });

    return this.gameSocket;
  }

  /**
   * 断开游戏Socket
   */
  disconnectGame(): void {
    if (this.gameSocket) {
      this.gameSocket.disconnect();
      this.gameSocket = null;
      console.log('Game socket disconnected');
    }
  }

  /**
   * 获取游戏Socket
   */
  getGameSocket(): Socket | null {
    return this.gameSocket;
  }

  // ==================== 战斗Socket ====================

  /**
   * 连接战斗Socket
   */
  connectBattle(token: string): Socket {
    if (this.battleSocket?.connected) {
      return this.battleSocket;
    }

    console.log('Connecting to battle socket...');

    this.battleSocket = io(SOCKET_URL + SOCKET_NAMESPACES.BATTLE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false // 战斗Socket不自动重连
    });

    this.battleSocket.on('connect', () => {
      console.log('Battle socket connected');
    });

    this.battleSocket.on('disconnect', (reason) => {
      console.log('Battle socket disconnected:', reason);
    });

    this.battleSocket.on('connect_error', (error) => {
      console.error('Battle socket connection error:', error);
    });

    return this.battleSocket;
  }

  /**
   * 断开战斗Socket
   */
  disconnectBattle(): void {
    if (this.battleSocket) {
      this.battleSocket.disconnect();
      this.battleSocket = null;
      console.log('Battle socket disconnected');
    }
  }

  /**
   * 获取战斗Socket
   */
  getBattleSocket(): Socket | null {
    return this.battleSocket;
  }

  // ==================== 清理 ====================

  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    this.disconnectGame();
    this.disconnectBattle();
  }
}

// 导出单例
export const socketManager = SocketManager.getInstance();
