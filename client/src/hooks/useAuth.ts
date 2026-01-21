import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { authAPI } from '../services/api';
import type { ActionResult, User } from '../types/game';

interface AuthResponse {
  token: string;
  user: User;
}

interface ApiError {
  error?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从本地存储恢复用户信息
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser) as User);
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<ActionResult> => {
    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data as AuthResponse;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error: unknown) {
      const message = (error as AxiosError<ApiError>).response?.data?.error || '登录失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const register = async (username: string, password: string): Promise<ActionResult> => {
    try {
      const response = await authAPI.register(username, password);
      const { token, user } = response.data as AuthResponse;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error: unknown) {
      const message = (error as AxiosError<ApiError>).response?.data?.error || '注册失败';
      return {
        success: false,
        error: message,
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
