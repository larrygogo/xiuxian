import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import { JWT_SECRET, PORT } from "./config";
import { initDatabase } from "./db/init";
import authRoutes from "./routes/auth";
import gameRoutes from "./routes/game";
import battleRoutes from "./battle/controller/BattleController";
import { BattleGateway } from "./battle/ws/BattleGateway";
import { BattleTimeoutService } from "./battle/service/BattleTimeoutService";
import { initializeUserGame, getUserGameState, setUserStateCallback } from "./services/gameService";
import { toClientState } from "./services/stateView";
import type { AuthTokenPayload } from "./types/auth";
import type { GameState } from "./types/game";

type AuthedSocket = Socket & {
  userId: number;
  username: string;
};

const app = express();
const server = http.createServer(app);

const allowedPorts = [5173, 5174];

// 生成允许的来源列表
const generateAllowedOrigins = (): Set<string> => {
  const origins: string[] = [];

  // 添加环境变量中的 CLIENT_URL
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }

  // 允许 localhost 和常见本地地址
  const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  for (const host of localHosts) {
    for (const port of allowedPorts) {
      origins.push(`http://${host}:${port}`);
    }
  }

  return new Set(origins);
};

const allowedOrigins = generateAllowedOrigins();

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) {
    return true;
  }
  // 允许已知来源
  if (allowedOrigins.has(origin)) {
    return true;
  }
  // 允许局域网 IP 访问（192.168.x.x, 10.x.x.x, 172.16-31.x.x）
  const localNetworkPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):(5173|5174)$/;
  return localNetworkPattern.test(origin);
};

// 配置 CORS（WebSocket）
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS origin not allowed"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 配置 CORS（HTTP）
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS origin not allowed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

// 应用 CORS 与 JSON 解析中间件
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/battle", battleRoutes);

// 健康检查
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// WebSocket 认证
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    return next(new Error("未提供认证令牌"));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("无效或过期的令牌"));
    }

    const payload = decoded as AuthTokenPayload;
    const authed = socket as AuthedSocket;
    authed.userId = payload.userId;
    authed.username = payload.username;
    next();
  });
});

// 存储每个用户的 socket 连接
const userSockets = new Map<number, Set<AuthedSocket>>();
// 存储已处理的 socket ID，防止重复处理
const processedSocketIds = new Set<string>();

io.on("connection", async (socket: Socket) => {
  const authed = socket as AuthedSocket;
  const userId = authed.userId;
  const socketId = socket.id;

  // 检查是否已经处理过这个 socket（防止重复连接事件）
  if (processedSocketIds.has(socketId)) {
    // 这个 socket 已经处理过，忽略重复的连接事件
    return;
  }

  // 标记为已处理
  processedSocketIds.add(socketId);

  // 存储 socket，便于后续广播
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  const existingSockets = userSockets.get(userId)!;
  const isFirstConnection = existingSockets.size === 0;
  existingSockets.add(authed);

  // 定义状态变化回调，通过 WebSocket 推送
  const onStateChange = (newState: GameState) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.forEach((s) => {
      s.emit("game:state", { state: toClientState(newState) });
    });
  };

  // 初始化或获取游戏状态
  let state = getUserGameState(userId);
  if (!state) {
    state = await initializeUserGame(userId, onStateChange);
  } else {
    // 如果状态已存在，补上回调以便实时推送
    setUserStateCallback(userId, onStateChange);
  }

  // 显示连接信息（包含角色名和角色ID）
  // 只在第一次连接时显示，避免重复日志
  if (isFirstConnection) {
    console.log(`用户 ${authed.username} (${userId}) 已连接 - 角色: ${state.name} (ID: ${state.characterId})`);
  }

  // 发送当前状态
  authed.emit("game:state", { state: toClientState(state) });

  // 处理客户端动作请求（目前主要动作通过 REST API 处理）
  authed.on("game:action", async () => {
    authed.emit("game:action:response", { message: "动作已接收" });
  });

  // 断开连接处理
  authed.on("disconnect", () => {
    // 从已处理列表中移除
    processedSocketIds.delete(socketId);
    
    const gameState = getUserGameState(userId);
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    
    sockets.delete(authed);
    
    // 如果该用户的所有 socket 都断开了，显示断开日志
    if (sockets.size === 0) {
      userSockets.delete(userId);
      if (gameState) {
        console.log(`用户 ${authed.username} (${userId}) 已断开连接 - 角色: ${gameState.name} (ID: ${gameState.characterId})`);
      } else {
        console.log(`用户 ${authed.username} (${userId}) 已断开连接`);
      }
      // 可选：清理游戏状态（如果希望用户离线时停止游戏）
      // cleanupUserGame(userId);
    }
  });
});

// 初始化战斗超时服务
const battleTimeoutService = new BattleTimeoutService();

// 初始化战斗 WebSocket 网关
const battleGateway = new BattleGateway(io, battleTimeoutService);

// 将 battleGateway 附加到 app，以便路由可以访问
  (app as any).battleGateway = battleGateway;
  (app as any).battleTimeoutService = battleTimeoutService;

// 优雅关闭时清理所有定时器
process.on("SIGTERM", () => {
  battleTimeoutService.clearAllTimeouts();
});

// 启动服务器
async function startServer(): Promise<void> {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动 HTTP 服务器（绑定到 0.0.0.0 允许 IP 访问）
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
      console.log("WebSocket 服务器已启动");
    });
  } catch (error) {
    console.error("启动服务器失败:", error);
    process.exit(1);
  }
}

startServer();

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("收到 SIGTERM 信号，正在关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});
