import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const payload = error.response?.data as { error?: string } | undefined;
    const errorMessage = payload?.error;
    const isUserMissing = status === 404 && !!errorMessage && errorMessage.includes('用户不存在');
    const shouldLogout = status === 401 || status === 403 || isUserMissing;

    if (shouldLogout) {
      // Token 无效或用户不存在，清除本地存储并回到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username: string, password: string) =>
    api.post('/api/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
};

export const gameAPI = {
  getState: () => api.get('/api/game/state'),
  heal: () => api.post('/api/game/actions/heal'),
  tick: () => api.post('/api/game/actions/tick'),
  toggleTuna: (enabled: boolean) => api.post('/api/game/actions/toggle-tuna', { enabled }),
  levelUp: () => api.post('/api/game/actions/levelup'),
  allocateStats: (payload: { str: number; agi: number; vit: number; int: number; spi: number }) =>
    api.post('/api/game/actions/allocate-stats', payload),
  createCharacter: (name: string) => api.post('/api/game/character/create', { name }),
  renameCharacter: (name: string) => api.post('/api/game/character/rename', { name }),
  equipItem: (itemId: string) => api.post('/api/game/items/equip', { itemId }),
  unequipItem: (slot: string) => api.post('/api/game/items/unequip', { slot }),
  useItem: (itemId: string) => api.post('/api/game/items/use', { itemId }),
  getItemTemplates: () => api.get('/api/game/items/templates'),
  reorderItems: (itemIds: (string | null)[]) => api.post('/api/game/items/reorder', { itemIds }),
};

export default api;
