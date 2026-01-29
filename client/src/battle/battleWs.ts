import { io, type Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3000`;
};

const SOCKET_URL = getSocketUrl();
const BATTLE_NAMESPACE = '/battle';

let battleSocket: Socket | null = null;

/**
 * 连接到战斗 WebSocket 服务器
 */
export function connectBattleSocket(token: string): Socket {
  if (battleSocket?.connected) {
    return battleSocket;
  }

  const url = `${SOCKET_URL}${BATTLE_NAMESPACE}`;
  battleSocket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  });

  battleSocket.on('connect', () => {
    console.log('战斗 WebSocket 连接成功');
  });

  battleSocket.on('disconnect', () => {
    console.log('战斗 WebSocket 断开连接');
  });

  battleSocket.on('connect_error', (error: Error) => {
    console.error('战斗 WebSocket 连接错误:', error);
  });

  return battleSocket;
}

/**
 * 断开战斗 WebSocket 连接
 */
export function disconnectBattleSocket(): void {
  if (battleSocket) {
    battleSocket.disconnect();
    battleSocket = null;
  }
}

/**
 * 获取当前战斗 WebSocket 连接
 */
export function getBattleSocket(): Socket | null {
  return battleSocket;
}
