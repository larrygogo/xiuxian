/**
 * 认证API
 */

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '@/config/api.config';
import type { User } from '@/types/game.types';

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}

export const authAPI = {
  /**
   * 用户注册
   */
  async register(username: string, password: string): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>(API_ENDPOINTS.AUTH_REGISTER, {
      username,
      password
    });
  },

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
      username,
      password
    });
  },

  /**
   * 获取登录表单完整HTML
   */
  async getLoginFormHTML(): Promise<string> {
    const axiosInstance = apiClient.getAxiosInstance();
    const response = await axiosInstance.get(API_ENDPOINTS.AUTH_LOGIN_PAGE, {
      responseType: 'text'
    });
    return response.data;
  },

  /**
   * 获取注册表单完整HTML
   */
  async getRegisterFormHTML(): Promise<string> {
    const axiosInstance = apiClient.getAxiosInstance();
    const response = await axiosInstance.get(API_ENDPOINTS.AUTH_REGISTER_PAGE, {
      responseType: 'text'
    });
    return response.data;
  }
};
