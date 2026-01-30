/**
 * API配置
 */

// 获取环境变量，使用Vite的import.meta.env
const getApiUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 使用当前主机地址，支持 IP 访问
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3000`;
};

const getSocketUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  // 使用当前主机地址，支持 IP 访问
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3000`;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

// API端点
export const API_ENDPOINTS = {
  // 认证
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGIN_PAGE: '/api/auth/login-page',
  AUTH_REGISTER_PAGE: '/api/auth/register-page',

  // 游戏状态
  GAME_STATE: '/api/game/state',
  GAME_ACTIONS_HEAL: '/api/game/actions/heal',
  GAME_ACTIONS_LEVELUP: '/api/game/actions/levelup',
  GAME_ACTIONS_ALLOCATE_STATS: '/api/game/actions/allocate-stats',

  // 角色
  CHARACTER_CREATE: '/api/game/character/create',
  CHARACTER_RENAME: '/api/game/character/rename',

  // 物品
  ITEMS_EQUIP: '/api/game/items/equip',
  ITEMS_UNEQUIP: '/api/game/items/unequip',
  ITEMS_USE: '/api/game/items/use',
  ITEMS_REORDER: '/api/game/items/reorder',
  ITEMS_MERGE: '/api/game/items/merge',
  ITEMS_TEMPLATES: '/api/game/items/templates',

  // 战斗
  BATTLE_SCENES: '/api/battle/scenes',
  BATTLE_ROOMS: '/api/battle/rooms',
  BATTLE_ROOMS_ACTIVE: '/api/battle/rooms/active',
  BATTLE_ROOM: (roomId: string) => `/api/battle/rooms/${roomId}`,
  BATTLE_ROOM_STATE: (roomId: string) => `/api/battle/rooms/${roomId}/state`,
  BATTLE_ROOM_JOIN: (roomId: string) => `/api/battle/rooms/${roomId}/join`,
  BATTLE_ROOM_COMMAND: (roomId: string) => `/api/battle/rooms/${roomId}/command`,

  // 管理员
  ADMIN_GIVE_ITEM: '/api/game/admin/give-item',
  ADMIN_GIVE_EXP: '/api/game/admin/give-exp',
  ADMIN_SET_LEVEL: '/api/game/admin/set-level'
};

// WebSocket命名空间
export const SOCKET_NAMESPACES = {
  GAME: '/',
  BATTLE: '/battle'
};

// WebSocket事件
export const SOCKET_EVENTS = {
  // 游戏
  GAME_STATE: 'game:state',

  // 战斗
  BATTLE_CONNECTED: 'battle:connected',
  BATTLE_JOIN: 'battle:join',
  BATTLE_JOINED: 'battle:joined',
  BATTLE_LEAVE: 'battle:leave',
  BATTLE_LEFT: 'battle:left',
  BATTLE_COMMAND: 'battle:command',
  BATTLE_EVENT: 'battle:event'
};
