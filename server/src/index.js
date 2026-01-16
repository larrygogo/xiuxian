"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { PORT } = require("./config");
const { initDatabase } = require("./db/init");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const { authenticateToken } = require("./middleware/auth");
const { initializeUserGame, getUserGameState, cleanupUserGame } = require("./services/gameService");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

const app = express();
const server = http.createServer(app);

// 配置 CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中间件
// 配置 CORS - 必须在所有路由之前
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

// 应用 CORS 中间件
app.use(cors(corsOptions));

// 解析 JSON 请求体
app.use(express.json());

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// WebSocket 连接处理
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("未提供认证令牌"));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("无效或过期的令牌"));
    }
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  });
});

// 存储每个用户的 socket 连接
const userSockets = new Map();

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log(`用户 ${socket.username} (${userId}) 已连接`);

  // 存储 socket
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket);

  // 定义状态变化回调，通过 WebSocket 推送
  const onStateChange = (newState) => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.forEach(s => {
        s.emit("game:state", { state: newState });
      });
    }
  };

  // 初始化或获取游戏状态
  let state = getUserGameState(userId);
  if (!state) {
    state = await initializeUserGame(userId, onStateChange);
  } else {
    // 如果状态已存在，设置回调
    const { setUserStateCallback } = require("./services/gameService");
    setUserStateCallback(userId, onStateChange);
  }

  // 发送当前状态
  socket.emit("game:state", { state });

  // 处理客户端动作请求
  socket.on("game:action", async (data) => {
    // 这里可以处理实时动作，目前主要动作通过 REST API 处理
    socket.emit("game:action:response", { message: "动作已接收" });
  });

  // 断开连接处理
  socket.on("disconnect", () => {
    console.log(`用户 ${socket.username} (${userId}) 已断开连接`);
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        // 可选：清理游戏状态（如果希望用户离线时停止游戏）
        // cleanupUserGame(userId);
      }
    }
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动 HTTP 服务器
    server.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`WebSocket 服务器已启动`);
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
