# 问道长生 (Wen Dao Chang Sheng)

一个精美的修仙古风挂机游戏，采用客户端-服务端分离架构，支持多用户、实时状态同步。

![修仙古风](https://img.shields.io/badge/风格-修仙古风-gold)
![React](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

## 项目结构

```
game/
├── server/          # 服务端（Node.js + Express + Socket.io）
│   ├── src/
│   │   ├── db/      # 数据库初始化
│   │   ├── middleware/  # 中间件（认证等）
│   │   ├── routes/  # API 路由
│   │   ├── services/  # 业务服务
│   │   ├── state/   # 游戏状态管理
│   │   ├── systems/ # 游戏系统逻辑
│   │   ├── config.js
│   │   └── index.js
│   └── package.json
├── client/          # 客户端（React + Vite）
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── hooks/      # React Hooks
│   │   ├── services/   # API 服务
│   │   ├── utils/      # 工具函数
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 技术栈

### 服务端
- Node.js + Express
- Socket.io (WebSocket)
- SQLite (数据库)
- JWT (认证)
- bcrypt (密码加密)

### 客户端
- React 18
- Vite
- Axios (HTTP 请求)
- Socket.io-client (WebSocket)

## 安装和运行

### 前置要求
- Node.js 18+
- pnpm 10.28.0+

### 1. 安装服务端依赖

```bash
cd server
pnpm install
```

### 2. 安装客户端依赖

```bash
cd client
pnpm install
```

### 3. 启动服务端

```bash
cd server
pnpm start
```

服务端将在 `http://localhost:3000` 启动。

### 4. 启动客户端

```bash
cd client
pnpm dev
```

客户端将在 `http://localhost:5173` 启动。

## 功能特性

- ✅ 用户注册和登录（修仙古风界面）
- ✅ JWT 认证
- ✅ 游戏状态持久化（SQLite）
- ✅ 实时状态同步（WebSocket）
- ✅ 角色创建和名称修改
- ✅ 游戏操作（疗伤、切换吐纳状态）
- ✅ 离线收益计算
- ✅ 自动游戏 tick（每5秒）
- ✅ 精美的修仙古风 UI 设计
- ✅ 响应式布局，支持移动端

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 游戏
- `GET /api/game/state` - 获取游戏状态
- `POST /api/game/actions/heal` - 疗伤
- `POST /api/game/character/create` - 创建角色
- `POST /api/game/character/rename` - 修改角色名称

## WebSocket 事件

### 客户端 → 服务端
- `game:action` - 发送游戏动作

### 服务端 → 客户端
- `game:state` - 游戏状态更新

## 开发说明

### 环境变量

服务端可以通过环境变量配置：
- `PORT` - 服务端端口（默认：3000）
- `JWT_SECRET` - JWT 密钥（默认：开发密钥，生产环境请修改）
- `DB_PATH` - 数据库路径（默认：./game.db）
- `CLIENT_URL` - 客户端 URL（默认：http://localhost:5173）

客户端可以通过环境变量配置：
- `VITE_API_URL` - API 基础 URL（默认：http://localhost:3000）
- `VITE_SOCKET_URL` - WebSocket URL（默认：http://localhost:3000）

### 数据库

数据库文件默认保存在 `server/game.db`。首次运行时会自动创建表结构。

## 截图

游戏采用精美的修仙古风设计，包含：
- 深色背景配合金色主题
- 流畅的动画效果
- 古典的装饰元素
- 优雅的交互体验

## 开发计划

- [ ] 更多游戏玩法
- [ ] 排行榜系统
- [ ] 成就系统
- [ ] 社交功能

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC

## 作者

问道长生开发团队
