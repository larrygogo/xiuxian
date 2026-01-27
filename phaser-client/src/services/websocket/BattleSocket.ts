/**
 * 战斗WebSocket封装
 * 处理战斗相关的实时事件
 */

import type { Socket } from 'socket.io-client';
import { socketManager } from './SocketManager';
import { SOCKET_EVENTS } from '@/config/api.config';
import type { BattleEventDTO } from '@/types/battle.types';

export type BattleEventCallback = (event: BattleEventDTO) => void;

export class BattleSocket {
  private socket: Socket | null = null;
  private eventCallbacks: BattleEventCallback[] = [];

  /**
   * 连接战斗Socket
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = socketManager.connectBattle(token);
    this.setupListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // 监听战斗连接成功
    this.socket.on(SOCKET_EVENTS.BATTLE_CONNECTED, (data: { message: string; userId: number }) => {
      console.log('Battle connected:', data);
    });

    // 监听加入房间成功
    this.socket.on(SOCKET_EVENTS.BATTLE_JOINED, (data: { roomId: string; message: string }) => {
      console.log('Joined battle room:', data);
    });

    // 监听战斗事件
    this.socket.on(SOCKET_EVENTS.BATTLE_EVENT, (event: BattleEventDTO) => {
      console.log('Battle event received:', event.type);
      this.triggerCallbacks(event);
    });

    // 连接状态
    this.socket.on('connect', () => {
      console.log('BattleSocket: Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('BattleSocket: Disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('BattleSocket: Connection error', error);
    });
  }

  /**
   * 加入战斗房间
   */
  joinRoom(roomId: string): void {
    if (!this.socket) {
      console.error('Battle socket not connected');
      return;
    }

    this.socket.emit(SOCKET_EVENTS.BATTLE_JOIN, { roomId });
  }

  /**
   * 离开战斗房间
   */
  leaveRoom(roomId: string): void {
    if (!this.socket) {
      console.error('Battle socket not connected');
      return;
    }

    this.socket.emit(SOCKET_EVENTS.BATTLE_LEAVE, { roomId });
  }

  /**
   * 提交战斗指令（通过WebSocket）
   */
  submitCommand(roomId: string, command: any): void {
    if (!this.socket) {
      console.error('Battle socket not connected');
      return;
    }

    this.socket.emit(SOCKET_EVENTS.BATTLE_COMMAND, { roomId, command });
  }

  /**
   * 注册战斗事件回调
   */
  onBattleEvent(callback: BattleEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * 移除战斗事件回调
   */
  offBattleEvent(callback: BattleEventCallback): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发所有回调
   */
  private triggerCallbacks(event: BattleEventDTO): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in battle event callback:', error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      socketManager.disconnectBattle();
      this.socket = null;
      this.eventCallbacks = [];
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
}

// 导出单例
export const battleSocket = new BattleSocket();
