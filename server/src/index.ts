import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import { JWT_SECRET, PORT } from "./config";
import { initDatabase } from "./db/init";
import authRoutes from "./routes/auth";
import gameRoutes from "./routes/game";
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

// 配置 CORS（WebSocket）
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 配置 CORS（HTTP）
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

// 应用 CORS 与 JSON 解析中间件
app.use(cors(corsOptions));
app.use(express.json());

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);

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

io.on("connection", async (socket: Socket) => {
  const authed = socket as AuthedSocket;
  const userId = authed.userId;
  console.log(`用户 ${authed.username} (${userId}) 已连接`);

  // 存储 socket，便于后续广播
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(authed);

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

  // 发送当前状态
  authed.emit("game:state", { state: toClientState(state) });

  // 处理客户端动作请求（目前主要动作通过 REST API 处理）
  authed.on("game:action", async () => {
    authed.emit("game:action:response", { message: "动作已接收" });
  });

  // 断开连接处理
  authed.on("disconnect", () => {
    console.log(`用户 ${authed.username} (${userId}) 已断开连接`);
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(authed);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      // 可选：清理游戏状态（如果希望用户离线时停止游戏）
      // cleanupUserGame(userId);
    }
  });
});

// 启动服务器
async function startServer(): Promise<void> {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动 HTTP 服务器
    server.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
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
