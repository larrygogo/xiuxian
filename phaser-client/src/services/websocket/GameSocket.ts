/**
 * 游戏WebSocket封装
 * 处理游戏状态实时更新
 */

import type { Socket } from 'socket.io-client';
import { socketManager } from './SocketManager';
import { stateManager } from '@/services/managers/StateManager';
import { SOCKET_EVENTS } from '@/config/api.config';
import type { GameState } from '@/types/game.types';

export class GameSocket {
  private socket: Socket | null = null;

  /**
   * 连接游戏Socket
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = socketManager.connectGame(token);
    this.setupListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // 监听游戏状态更新
    this.socket.on(SOCKET_EVENTS.GAME_STATE, (data: { state: GameState }) => {
      console.log('Received game state update:', data);
      stateManager.setGameState(data.state);
    });

    // 监听连接事件
    this.socket.on('connect', () => {
      console.log('GameSocket: Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('GameSocket: Disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('GameSocket: Connection error', error);
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      socketManager.disconnectGame();
      this.socket = null;
    }
  }

  /**
   * 获取Socket实例
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 监听事件
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  /**
   * 发送事件
   */
  emit(event: string, ...args: any[]): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }
}

// 导出单例
export const gameSocket = new GameSocket();
