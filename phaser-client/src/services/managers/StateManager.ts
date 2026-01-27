/**
 * 全局状态管理器
 * 使用单例模式管理游戏状态、用户信息和Token
 */

import Phaser from 'phaser';
import type { GameState, User } from '@/types/game.types';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/config/constants';

export class StateManager extends Phaser.Events.EventEmitter {
  private static instance: StateManager;

  private gameState: GameState | null = null;
  private user: User | null = null;
  private token: string | null = null;

  private constructor() {
    super();
    this.loadFromStorage();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // ==================== Token管理 ====================

  /**
   * 设置Token
   */
  setToken(token: string): void {
    this.token = token;
    storage.set(STORAGE_KEYS.TOKEN, token);
    this.emit('token:updated', token);
  }

  /**
   * 获取Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 清除Token
   */
  clearToken(): void {
    this.token = null;
    storage.remove(STORAGE_KEYS.TOKEN);
    this.emit('token:cleared');
  }

  /**
   * 解析Token获取用户信息
   */
  parseToken(token: string): User | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return {
        id: decoded.userId?.toString() || '',
        username: decoded.username,
        isAdmin: decoded.isAdmin || false
      };
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  // ==================== 用户信息管理 ====================

  /**
   * 设置用户信息
   */
  setUser(user: User): void {
    this.user = user;
    storage.set(STORAGE_KEYS.USER, user);
    this.emit('user:updated', user);
  }

  /**
   * 获取用户信息
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * 清除用户信息
   */
  clearUser(): void {
    this.user = null;
    storage.remove(STORAGE_KEYS.USER);
    this.emit('user:cleared');
  }

  /**
   * 检查是否是管理员
   */
  isAdmin(): boolean {
    return this.user?.isAdmin === true;
  }

  // ==================== 游戏状态管理 ====================

  /**
   * 设置游戏状态
   */
  setGameState(state: GameState): void {
    this.gameState = state;
    this.emit('gameState:updated', state);
  }

  /**
   * 获取游戏状态
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * 更新游戏状态（部分更新）
   */
  updateGameState(updates: Partial<GameState>): void {
    if (this.gameState) {
      this.gameState = { ...this.gameState, ...updates };
      this.emit('gameState:updated', this.gameState);
    }
  }

  /**
   * 清除游戏状态
   */
  clearGameState(): void {
    this.gameState = null;
    this.emit('gameState:cleared');
  }

  /**
   * 检查是否有角色
   */
  hasCharacter(): boolean {
    return this.gameState !== null && !!this.gameState.name;
  }

  // ==================== 登出 ====================

  /**
   * 登出（清除所有状态）
   */
  logout(): void {
    this.clearToken();
    this.clearUser();
    this.clearGameState();
    this.emit('logout');
  }

  // ==================== 初始化 ====================

  /**
   * 从localStorage加载数据
   */
  private loadFromStorage(): void {
    this.token = storage.get<string>(STORAGE_KEYS.TOKEN);
    this.user = storage.get<User>(STORAGE_KEYS.USER);

    // 如果有token但没有user，尝试解析token
    if (this.token && !this.user) {
      const parsedUser = this.parseToken(this.token);
      if (parsedUser) {
        this.setUser(parsedUser);
      }
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

// 导出单例实例
export const stateManager = StateManager.getInstance();
