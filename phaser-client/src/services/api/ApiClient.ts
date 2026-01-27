/**
 * HTTP API客户端
 * 使用axios封装，提供请求拦截器和响应拦截器
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/config/api.config';
import { stateManager } from '@/services/managers/StateManager';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器 - 添加token
    this.client.interceptors.request.use(
      (config) => {
        const token = stateManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 统一错误处理
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // 处理401/403 - 登出
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('Authentication error, logging out');
          stateManager.logout();
          // TODO: 跳转到登录场景
        }

        // 处理404且消息是"用户不存在" - 登出
        if (error.response?.status === 404 && error.response?.data?.message === '用户不存在') {
          console.error('User not found, logging out');
          stateManager.logout();
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * 获取原始axios实例（如需要）
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// 导出单例
export const apiClient = new ApiClient();
