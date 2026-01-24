import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { gameAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';
import type { ActionResult, GameState } from '../types/game';
import type { EquipmentSlot } from '../types/item';

interface ApiError {
  error?: string;
}

interface GameStateResponse {
  state: GameState;
  message?: string;
  error?: string;
}

interface StatAllocationPayload {
  str: number;
  agi: number;
  vit: number;
  int: number;
  spi: number;
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

    // 获取游戏状态
    fetchState();

    // 连接 WebSocket（使用 ref 防止重复设置监听器）
    let socketInstance: Socket | null = null;
    let isMounted = true;
    
    try {
      socketInstance = connectSocket(token);
      
      const handleGameState = (data: GameStateResponse) => {
        if (isMounted) {
          console.log('收到游戏状态更新:', data);
          setState(data.state);
        }
      };

      const handleConnect = () => {
        if (isMounted) {
          console.log('WebSocket 连接成功');
        }
      };

      const handleConnectError = (err: Error) => {
        if (isMounted) {
          console.error('WebSocket 连接错误:', err);
          setError('WebSocket 连接失败，但可以继续使用 REST API');
        }
      };

      // 只在 socket 未连接时添加监听器，避免重复添加
      if (!socketInstance.connected) {
        socketInstance.on('game:state', handleGameState);
        socketInstance.on('connect', handleConnect);
        socketInstance.on('connect_error', handleConnectError);
      } else {
        // 如果已经连接，直接添加监听器
        socketInstance.on('game:state', handleGameState);
        socketInstance.on('connect', handleConnect);
        socketInstance.on('connect_error', handleConnectError);
      }

      return () => {
        isMounted = false;
        // 清理事件监听器
        if (socketInstance) {
          socketInstance.off('game:state', handleGameState);
          socketInstance.off('connect', handleConnect);
          socketInstance.off('connect_error', handleConnectError);
        }
        // 注意：这里不调用 disconnectSocket()，因为 socket 是全局共享的
        // 只有在组件卸载且没有其他组件使用时才应该断开
      };
    } catch (err) {
      console.error('WebSocket 初始化失败:', err);
      // WebSocket 失败不影响 REST API 使用
    }
  }, [userId]); // 移除 fetchState 依赖，因为它不会变化

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
      const axiosError = err as AxiosError<ApiError>;
      const data = axiosError.response?.data as GameStateResponse | undefined;
      if (data?.state) {
        setState(data.state);
      }
      const message = data?.error || '装备失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const unequipItem = async (slot: EquipmentSlot): Promise<ActionResult> => {
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

  const allocateStats = async (payload: StatAllocationPayload): Promise<ActionResult> => {
    try {
      const response = await gameAPI.allocateStats(payload);
      const data = response.data as GameStateResponse;
      setState(data.state);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '分配属性点失败';
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
    createCharacter, 
    renameCharacter, 
    equipItem,
    unequipItem,
    useItem,
    levelUp,
    allocateStats,
    refresh: fetchState 
  };
}
