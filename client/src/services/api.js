import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password) =>
    api.post('/api/auth/register', { username, password }),
  login: (username, password) =>
    api.post('/api/auth/login', { username, password }),
};

export const gameAPI = {
  getState: () => api.get('/api/game/state'),
  heal: () => api.post('/api/game/actions/heal'),
  toggleTuna: (enabled) => api.post('/api/game/actions/toggle-tuna', { enabled }),
  createCharacter: (name) => api.post('/api/game/character/create', { name }),
  renameCharacter: (name) => api.post('/api/game/character/rename', { name }),
};

export default api;
