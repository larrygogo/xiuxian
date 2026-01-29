import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3000`;
};

const API_BASE_URL = getApiBaseUrl();

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
    // 只对特定的"用户不存在"错误触发退出，排除管理员操作中的"目标用户不存在"等错误
    const isUserMissing = status === 404 && !!errorMessage && 
      (errorMessage === '用户不存在' || errorMessage === '用户不存在，无法创建角色');
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
  levelUp: () => api.post('/api/game/actions/levelup'),
  allocateStats: (payload: { str: number; agi: number; vit: number; int: number; spi: number }) =>
    api.post('/api/game/actions/allocate-stats', payload),
  createCharacter: (name: string) => api.post('/api/game/character/create', { name }),
  renameCharacter: (name: string) => api.post('/api/game/character/rename', { name }),
  equipItem: (itemId: string) => api.post('/api/game/items/equip', { itemId }),
  unequipItem: (slot: string) => api.post('/api/game/items/unequip', { slot }),
  useItem: (itemId: string) => api.post('/api/game/items/use', { itemId }),
  getItemTemplates: () => api.get('/api/game/items/templates'),
  reorderItems: (itemIds: (string | null)[], allowDiscard = false) =>
    api.post('/api/game/items/reorder', { itemIds, allowDiscard }),
  mergeItems: (payload: { fromItemId: string; toItemId: string }) =>
    api.post('/api/game/items/merge', payload),
  giveItem: (payload: {
    targetUserId?: number;
    targetCharacterId?: number;
    itemType?: string;
    slot?: string;
    level?: number;
    templateId?: string;
    crafted?: boolean;
    consumables?: Array<{ templateId: string; quantity: number }>;
    amount?: number;
    materials?: Array<{ templateId: string; quantity: number }>;
    equipments?: Array<{ templateId: string; quantity: number }>;
  }) =>
    api.post('/api/game/admin/give-item', payload),
  giveExp: (payload: { targetUserId?: number; targetCharacterId?: number; amount: number }) =>
    api.post('/api/game/admin/give-exp', payload),
  setLevel: (payload: { targetUserId?: number; targetCharacterId?: number; level?: number; statPoints?: number }) =>
    api.post('/api/game/admin/set-level', payload),
};

export const battleAPI = {
  getScenes: () => api.get('/api/battle/scenes'),
  createRoom: (payload: { mapId: string; playerIds: number[] }) =>
    api.post('/api/battle/rooms', payload),
  getActiveRoom: () => api.get('/api/battle/rooms/active'),
  getRoom: (roomId: string) => api.get(`/api/battle/rooms/${roomId}`),
  getRoomState: (roomId: string) => api.get(`/api/battle/rooms/${roomId}/state`),
  joinRoom: (roomId: string) => api.post(`/api/battle/rooms/${roomId}/join`),
  submitCommand: (roomId: string, payload: { turn: number; type: string; targetId?: string; itemId?: string }) =>
    api.post(`/api/battle/rooms/${roomId}/command`, payload),
};

export default api;
