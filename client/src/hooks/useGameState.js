import { useState, useEffect, useCallback } from 'react';
import { gameAPI } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export function useGameState() {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // 初始加载
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
  }, [fetchState]);

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

  return { state, loading, error, heal, toggleTuna, createCharacter, renameCharacter, refresh: fetchState };
}
