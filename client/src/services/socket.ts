import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let isConnecting = false;
let connectionPromise: Promise<Socket> | null = null;

export function connectSocket(token: string): Socket {
  // 如果已经连接，直接返回
  if (socket?.connected) {
    return socket;
  }

  // 如果正在连接中，返回现有的 socket（等待连接完成）
  if (isConnecting && socket && connectionPromise) {
    return socket;
  }

  // 如果 socket 存在但未连接，先清理
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  isConnecting = true;

  // 创建新的连接
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    // 防止自动重连导致的重复连接
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // 创建连接 Promise
  connectionPromise = new Promise<Socket>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('连接超时'));
    }, 10000);

    socket!.on('connect', () => {
      clearTimeout(timeout);
      console.log('WebSocket 连接成功');
      isConnecting = false;
      resolve(socket!);
    });

    socket!.on('connect_error', (error: Error) => {
      clearTimeout(timeout);
      console.error('WebSocket 连接错误:', error);
      isConnecting = false;
      reject(error);
    });
  });

  socket.on('disconnect', () => {
    console.log('WebSocket 断开连接');
    isConnecting = false;
    connectionPromise = null;
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
