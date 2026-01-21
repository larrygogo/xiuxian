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

/**
 * 从JWT token中解析用户信息
 */
function parseToken(token: string): { userId: number; username: string; isAdmin: boolean } | null {
  try {
    // JWT token格式: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // 解析payload（base64解码）
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    return {
      userId: decoded.userId,
      username: decoded.username,
      isAdmin: decoded.isAdmin === true || decoded.isAdmin === 1
    };
  } catch (e) {
    console.error('解析token失败:', e);
    return null;
  }
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
        const parsedUser = JSON.parse(savedUser) as User;
        // 从token中解析isAdmin信息（确保是最新的）
        const tokenInfo = parseToken(token);
        if (tokenInfo) {
          // 使用token中的信息更新user对象，确保isAdmin是最新的
          // 同时确保id是string类型（兼容后端返回的number类型）
          setUser({
            id: String(parsedUser.id || tokenInfo.userId),
            username: parsedUser.username || tokenInfo.username,
            isAdmin: tokenInfo.isAdmin
          });
        } else {
          // 如果token解析失败，使用保存的user信息
          setUser(parsedUser);
        }
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
      // 确保id是string类型（兼容后端返回的number类型）
      const normalizedUser: User = {
        ...user,
        id: String(user.id)
      };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
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
      // 确保id是string类型（兼容后端返回的number类型）
      const normalizedUser: User = {
        ...user,
        id: String(user.id)
      };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
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
