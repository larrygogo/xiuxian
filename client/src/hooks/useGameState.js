import { useState, useEffect, useCallback } from 'react';
import { gameAPI } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export function useGameState(userId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gameAPI.getState();
      setState(response.data.state);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || '获取游戏状态失败');
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
      
      socket.on('game:state', (data) => {
        console.log('收到游戏状态更新:', data);
        setState(data.state);
      });

      socket.on('connect', () => {
        console.log('WebSocket 连接成功');
      });

      socket.on('connect_error', (err) => {
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

  const heal = async () => {
    try {
      const response = await gameAPI.heal();
      setState(response.data.state);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || '疗伤失败',
      };
    }
  };

  const tick = async () => {
    try {
      const response = await gameAPI.tick();
      setState(response.data.state);
      return { success: true, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || '行动失败',
      };
    }
  };

  const toggleTuna = async (enabled) => {
    try {
      const response = await gameAPI.toggleTuna(enabled);
      setState(response.data.state);
      return { success: true, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || '切换状态失败',
      };
    }
  };

  const createCharacter = async (name) => {
    try {
      const response = await gameAPI.createCharacter(name);
      setState(response.data.state);
      return { success: true, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || '创建角色失败',
      };
    }
  };

  const renameCharacter = async (name) => {
    try {
      const response = await gameAPI.renameCharacter(name);
      setState(response.data.state);
      return { success: true, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || '修改姓名失败',
      };
    }
  };

  return { state, loading, error, heal, tick, toggleTuna, createCharacter, renameCharacter, refresh: fetchState };
}
