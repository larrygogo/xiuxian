/**
 * 游戏API
 */

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '@/config/api.config';
import type { GameState, BaseStats } from '@/types/game.types';

export interface GameStateResponse {
  state: GameState;
}

export interface GameActionResponse {
  message: string;
  state: GameState;
}

export interface CharacterCreateResponse {
  message: string;
  state: GameState;
}

export interface AllocateStatsPayload {
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  spi?: number;
}

export const gameAPI = {
  /**
   * 获取游戏状态
   */
  async getState(): Promise<GameState> {
    const response = await apiClient.get<GameStateResponse>(API_ENDPOINTS.GAME_STATE);
    return response.state;
  },

  /**
   * 疗伤
   */
  async heal(): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.GAME_ACTIONS_HEAL);
  },

  /**
   * 升级
   */
  async levelUp(): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.GAME_ACTIONS_LEVELUP);
  },

  /**
   * 分配属性点
   */
  async allocateStats(payload: AllocateStatsPayload): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.GAME_ACTIONS_ALLOCATE_STATS, payload);
  },

  /**
   * 创建角色
   */
  async createCharacter(name: string): Promise<CharacterCreateResponse> {
    return apiClient.post<CharacterCreateResponse>(API_ENDPOINTS.CHARACTER_CREATE, { name });
  },

  /**
   * 重命名角色
   */
  async renameCharacter(name: string): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.CHARACTER_RENAME, { name });
  },

  /**
   * 装备物品
   */
  async equipItem(itemId: string): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.ITEMS_EQUIP, { itemId });
  },

  /**
   * 卸下装备
   */
  async unequipItem(slot: string): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.ITEMS_UNEQUIP, { slot });
  },

  /**
   * 使用消耗品
   */
  async useItem(itemId: string): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.ITEMS_USE, { itemId });
  },

  /**
   * 重排背包
   */
  async reorderItems(itemIds: (string | null)[], allowDiscard?: boolean): Promise<GameActionResponse> {
    return apiClient.post<GameActionResponse>(API_ENDPOINTS.ITEMS_REORDER, {
      itemIds,
      allowDiscard
    });
  },

  /**
   * 合并堆叠物品
   */
  async mergeItems(fromItemId: string, toItemId: string): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ITEMS_MERGE, { fromItemId, toItemId });
  },

  /**
   * 获取物品模板
   */
  async getItemTemplates(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.ITEMS_TEMPLATES);
  },

  /**
   * 管理员 - 赠送物品
   */
  async adminGiveItem(payload: any): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ADMIN_GIVE_ITEM, payload);
  },

  /**
   * 管理员 - 赠送经验
   */
  async adminGiveExp(payload: any): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ADMIN_GIVE_EXP, payload);
  },

  /**
   * 管理员 - 设置等级
   */
  async adminSetLevel(payload: any): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ADMIN_SET_LEVEL, payload);
  }
};
