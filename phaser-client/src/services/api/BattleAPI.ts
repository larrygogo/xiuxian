/**
 * 战斗API
 */

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '@/config/api.config';
import type { BattleSnapshotDTO, BattleCommandType } from '@/types/battle.types';

export interface Scene {
  mapId: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  monsterPool: string[];
}

export interface BattleRoom {
  roomId: string;
  mapId: string;
  status: string;
  createdAt: number;
}

export interface CreateRoomResponse {
  message: string;
  room: BattleRoom;
}

export interface JoinRoomResponse {
  message: string;
  playerId: string;
}

export interface CommandResponse {
  message: string;
  command: any;
  allSubmitted: boolean;
}

export const battleAPI = {
  /**
   * 获取战斗场景列表
   */
  async getScenes(): Promise<{ scenes: Scene[] }> {
    return apiClient.get(API_ENDPOINTS.BATTLE_SCENES);
  },

  /**
   * 创建战斗房间
   */
  async createRoom(mapId: string, playerIds: number[]): Promise<CreateRoomResponse> {
    return apiClient.post(API_ENDPOINTS.BATTLE_ROOMS, { mapId, playerIds });
  },

  /**
   * 获取当前活跃房间
   */
  async getActiveRoom(): Promise<{ room: BattleRoom | null }> {
    return apiClient.get(API_ENDPOINTS.BATTLE_ROOMS_ACTIVE);
  },

  /**
   * 获取房间信息
   */
  async getRoom(roomId: string): Promise<{ room: BattleRoom }> {
    return apiClient.get(API_ENDPOINTS.BATTLE_ROOM(roomId));
  },

  /**
   * 获取房间状态
   */
  async getRoomState(roomId: string): Promise<{ snapshot: BattleSnapshotDTO }> {
    return apiClient.get(API_ENDPOINTS.BATTLE_ROOM_STATE(roomId));
  },

  /**
   * 加入房间
   */
  async joinRoom(roomId: string): Promise<JoinRoomResponse> {
    return apiClient.post(API_ENDPOINTS.BATTLE_ROOM_JOIN(roomId));
  },

  /**
   * 提交战斗指令
   */
  async submitCommand(
    roomId: string,
    turn: number,
    type: BattleCommandType,
    targetId?: string,
    itemId?: string
  ): Promise<CommandResponse> {
    return apiClient.post(API_ENDPOINTS.BATTLE_ROOM_COMMAND(roomId), {
      turn,
      type,
      targetId,
      itemId
    });
  }
};
