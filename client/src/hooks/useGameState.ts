import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { gameAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { ActionResult, GameState } from '../types/game';

interface ApiError {
  error?: string;
}

interface GameStateResponse {
  state: GameState;
  message?: string;
}

export function useGameState(userId: string | null | undefined) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gameAPI.getState();
      setState((response.data as GameStateResponse).state);
      setError(null);
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '获取游戏状态失败';
      setError(message);
      setState(null); // 获取失败时清除状态
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userId) {
      // 没有 token 或 userId，清除状态并断开连接
      setState(null);
      setLoading(false);
      setError(null);
      disconnectSocket();
      return;
    }

    // 清除旧状态，准备加载新用户的数据
    setState(null);
    setLoading(true);
    setError(null);

    // 断开旧的 WebSocket 连接
    disconnectSocket();

    // 获取游戏状态
    fetchState();

    // 连接 WebSocket
    try {
      const socket = connectSocket(token);
      
      socket.on('game:state', (data: GameStateResponse) => {
        console.log('收到游戏状态更新:', data);
        setState(data.state);
      });

      socket.on('connect', () => {
        console.log('WebSocket 连接成功');
      });

      socket.on('connect_error', (err: Error) => {
        console.error('WebSocket 连接错误:', err);
        setError('WebSocket 连接失败，但可以继续使用 REST API');
      });

      return () => {
        disconnectSocket();
      };
    } catch (err) {
      console.error('WebSocket 初始化失败:', err);
      // WebSocket 失败不影响 REST API 使用
    }
  }, [userId, fetchState]);

  const heal = async (): Promise<ActionResult> => {
    try {
      const response = await gameAPI.heal();
      setState((response.data as GameStateResponse).state);
      return { success: true };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '疗伤失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const tick = async (): Promise<ActionResult> => {
    try {
      const response = await gameAPI.tick();
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '行动失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const toggleTuna = async (enabled: boolean): Promise<ActionResult> => {
    try {
      const response = await gameAPI.toggleTuna(enabled);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '切换状态失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const createCharacter = async (name: string): Promise<ActionResult> => {
    try {
      const response = await gameAPI.createCharacter(name);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '创建角色失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const renameCharacter = async (name: string): Promise<ActionResult> => {
    try {
      const response = await gameAPI.renameCharacter(name);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '修改姓名失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const equipItem = async (itemId: string): Promise<ActionResult> => {
    try {
      const response = await gameAPI.equipItem(itemId);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '装备失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const unequipItem = async (slot: string): Promise<ActionResult> => {
    try {
      const response = await gameAPI.unequipItem(slot);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '卸下失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const useItem = async (itemId: string): Promise<ActionResult> => {
    try {
      const response = await gameAPI.useItem(itemId);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '使用失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const levelUp = async (): Promise<ActionResult> => {
    try {
      const response = await gameAPI.levelUp();
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '升级失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  return { 
    state, 
    loading, 
    error, 
    heal, 
    tick, 
    toggleTuna, 
    createCharacter, 
    renameCharacter, 
    equipItem,
    unequipItem,
    useItem,
    levelUp,
    refresh: fetchState 
  };
}
