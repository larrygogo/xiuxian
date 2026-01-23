# 问道长生（Wen Dao Chang Sheng）

一个「修仙古风」主题的多人 Web 游戏原型，采用**前后端分离**架构：客户端负责 UI/交互，服务端负责鉴权、状态存档、规则计算与实时推送。

本 README 目标：把当前仓库里**已经存在的功能 / 玩法 / 技术实现**整理成一份"可直接用于在 ChatGPT/文档工具里建立项目管理"的超详细说明书。

---

## 1. 快速总览（现状）

### 1.1 现有玩法（可用）

- 用户系统：注册 / 登录（JWT），支持管理员标记（`is_admin`）。
- 角色系统：创建角色、改名、生成可展示的数字角色 ID（`characterId`）。
- 成长系统：等级（1-100）、灵气（`qi`）、升级（消耗灵气）、每级 +5 可分配属性点（`statPoints`）。
- 属性系统：基础属性（`str/agi/vit/int/spi`）→ 派生战斗属性（`hit/pdmg/pdef/spd/mdmg/mdef/maxHp/maxMp`）。
- 恢复系统：疗伤（消耗灵气恢复生命）。
- 物品系统：背包（固定 20 格，支持拖拽换位/重排）、装备（6 槽位）、消耗品（堆叠）、材料（堆叠）。
- 装备数值：装备提供战斗属性加成；打造装备额外可能出现"绿字"（基础属性加成，可能正/负）。
- 管理员工具：按用户ID/角色ID 赠送物品、赠送灵气（经验）。
- 实时同步：服务端通过 WebSocket 推送 `game:state`，客户端实时更新状态。

### 1.2 现有玩法（代码已存在但未接入/未完成）

- "探索/行动（tick）"HTTP 接口已移除；客户端目前用"正在开发"占位展示。
- 战斗系统代码已实现（回合制自动战斗 `autoBattle`），但当前没有入口把它串到探索/事件里：`server/src/systems/battle.ts`。
- 控制/异常状态（眩晕等）在战斗中被禁用（控制判定返回 0），属于"保留扩展点"：`server/src/systems/battle.ts`。

---

## 2. 项目结构（目录职责）

```
game/
├── README.md
├── 属性影响关系.md                 # 人类可读的"属性→面板"设计说明（与代码参数未必完全一致）
├── server/                         # Node.js 服务端
│   ├── data/                        # 平衡配置与物品模板（JSON）
│   ├── game.db                      # SQLite 数据库文件（sql.js 持久化输出）
│   ├── src/
│   │   ├── config.ts                # 端口/JWT/游戏常量/战斗配置
│   │   ├── index.ts                 # 服务器入口（Express + Socket.io）
│   │   ├── db/init.ts               # sql.js 初始化与表结构
│   │   ├── middleware/auth.ts       # JWT 鉴权 + 管理员校验
│   │   ├── routes/                  # HTTP API
│   │   ├── services/                # 业务服务（状态、用户、物品生成等）
│   │   ├── state/                   # 初始状态与存档迁移
│   │   ├── systems/                 # 玩法系统（属性/进度/物品/战斗/动作）
│   │   └── types/                   # TS 类型定义（服务端）
│   └── dist/                        # tsc 编译产物（运行 `pnpm build` 后更新）
└── client/                          # React 客户端
    ├── src/
    │   ├── App.tsx                  # 页面入口（登录/创建角色/主UI与面板管理）
    │   ├── components/              # UI 组件（背包、物品卡、属性面板、管理员面板等）
    │   ├── hooks/                   # useAuth / useGameState 等状态 Hook
    │   ├── services/                # API & WebSocket 封装
    │   ├── data/                    # 客户端只读数据（例如 levelQiTable）
    │   ├── utils/                   # gameUtils、弹窗面板管理等
    │   └── types/                   # TS 类型定义（客户端）
    └── vite.config.js
```

---

## 3. 技术栈与关键实现

### 3.1 服务端

- 运行时：Node.js（TypeScript 编译到 `dist/`）
- Web 框架：Express（HTTP API）
- 实时通信：Socket.io（WebSocket + fallback）
- 鉴权：JWT（HTTP 请求头 Bearer Token + WebSocket 握手 token）
- 密码：bcryptjs（哈希存储）
- 数据库存储：sql.js（SQLite in-memory）+ 导出写入本地文件 `DB_PATH`（默认 `./game.db`）

### 3.2 客户端

- React 18 + Vite
- Axios（REST API）
- socket.io-client（实时状态推送）
- UI 特性：可拖拽面板系统（背包/人物属性/设置/管理员），背包拖拽换位与右键操作，物品悬浮 Tooltip。

---

## 4. 本地启动（开发/生产）

### 4.1 前置要求

- Node.js 18+
- pnpm（仓库使用 `pnpm@10.28.0`）

### 4.2 安装依赖

```bash
cd server
pnpm install

cd ../client
pnpm install
```

### 4.3 启动服务端

开发（推荐，自动重启）：

```bash
cd server
pnpm dev
```

运行编译产物：

```bash
cd server
pnpm build
pnpm start
```

默认监听：`http://localhost:3000`，并同时提供 Socket.io 服务。

### 4.4 启动客户端

```bash
cd client
pnpm dev
```

默认：`http://localhost:5173`

---

## 5. 环境变量与配置项（必须知道的）

### 5.1 服务端环境变量（`server/src/config.ts` + `server/src/index.ts`）

- `PORT`：HTTP/WebSocket 端口（默认 `3000`）
- `JWT_SECRET`：JWT 密钥（默认 `your-secret-key-change-in-production`，生产必须改）
- `DB_PATH`：数据库文件路径（默认 `./game.db`；相对路径基于启动目录）
- `CLIENT_URL`：允许跨域访问的客户端地址（默认 `http://localhost:5173`）

### 5.2 客户端环境变量（`client/src/services/api.ts` / `client/src/services/socket.ts`）

- `VITE_API_URL`：REST API Base URL（默认 `http://localhost:3000`）
- `VITE_SOCKET_URL`：Socket.io URL（默认 `http://localhost:3000`）

---

## 6. 数据库与持久化（非常重要）

### 6.1 选择 sql.js 的含义

服务端并不是直接用 `sqlite3` 原生驱动，而是：

- 用 sql.js 在内存里跑 SQLite；
- 每次写入后手动 `db.export()` 导出二进制并写回 `DB_PATH` 文件。

实现位置：`server/src/db/init.ts`。

### 6.2 表结构（由服务端启动时自动创建）

`users`

- `id` 自增主键
- `username` 唯一
- `password_hash`
- `is_admin`（默认 0；会在启动时自动补字段）

`game_states`

- `user_id`（与 users 外键，唯一）
- `state_data`（JSON 字符串，存 GameState）
- `last_ts`（最近一次更新时间戳）

### 6.3 状态缓存与保存策略（关键流程）

服务端内存缓存：`userGameStates: Map<userId, GameState>`（`server/src/services/gameService.ts`）。

流程：

1. HTTP/WS 触发访问时，若缓存没有 → 从 DB 读取 `state_data` → `migrateState` 修复结构 → 放入缓存。
2. 任意会改变状态的操作调用 `updateUserGameState`：
   - 更新 `lastTs`
   - 写回 DB（先删再插，规避 sql.js 不支持 `ON CONFLICT`）
   - 若该用户存在 WebSocket 回调，则推送最新状态（`game:state`）。
3. 存档迁移：每次加载都会走 `migrateState`，用于"旧字段清理/结构补齐/旧描述升级"等。

并发保护：`acquireUserLock(userId, fn)`，用于避免同一用户并行请求造成覆盖（可用于后续探索/战斗接入时）。

---

## 7. 鉴权与权限模型

### 7.1 JWT（HTTP）

- 客户端把 token 放进 `Authorization: Bearer <token>`（`client/src/services/api.ts`）。
- 服务端中间件验证并把 payload 写入 `req.user`（`server/src/middleware/auth.ts`）。

### 7.2 JWT（WebSocket）

- 客户端在 `connectSocket(token)` 时把 token 放在 `socket.handshake.auth.token`（`client/src/services/socket.ts`）。
- 服务端 `io.use(...)` 校验 token，给 socket 注入 `userId/username`（`server/src/index.ts`）。

### 7.3 管理员权限

- 任何 `/api/game/admin/*` 路由都要求 `requireAdmin`（`server/src/middleware/auth.ts`）。
- 目前仓库没有"把某个用户设为管理员"的 API，需要你手动改数据库：把 `users.is_admin` 设为 `1`。

---

## 8. 游戏核心概念（数据结构）

### 8.1 GameState（服务端权威）

定义：`server/src/types/game.ts`。

关键字段：

- 身份：`characterId`（数字 ID）、`name`
- 成长：`level`（1-100）、`qi`（灵气）、`statPoints`（可分配点数）
- 资源：`lingshi`（灵石，当前主要用于死亡惩罚与 UI 展示）
- 生存：`hp/maxHp`、`mp/maxMp`、`alive`
- 属性：
  - `baseStats`：基础属性（成长维度）
  - `combatStats`：派生战斗属性（面板维度，运行时刷新）
- 日志：`eventLog`（最多保留最近 100 条）
- 物品：`inventory`（固定 20 格，`(Item|null)[]`）、`equipment`（6 槽位）

### 8.2 客户端 GameState（显示用）

定义：`client/src/types/game.ts`。

注意：服务端会在返回给客户端时，对 `baseStats` 做一次"展示修正"：把装备提供的基础属性加成也加到 `baseStats` 上（`server/src/services/stateView.ts`）。

---

## 9. 玩法系统详解（按模块拆解）

### 9.1 角色创建与改名

入口 API：

- `POST /api/game/character/create`：创建角色（仅允许从默认名 `无名修士` 创建一次）
- `POST /api/game/character/rename`：改名（2-10 字符）

创建时会确保：

- `characterId` 存在（没有则生成），生成逻辑：`server/src/state/defaultState.ts`。
- 写入事件日志：`logLine(...)`（`server/src/services/logger.ts`）。

### 9.2 升级（进境）与灵气表

升级 API：`POST /api/game/actions/levelup`

规则：

- 达到当前等级所需灵气 `needQi(state)` 才能升级；
- 升级后：`level + 1`，`statPoints + 5`，并回满 `hp/mp`；
- 最高等级：100。

灵气需求表：`server/data/levelQiTable.json`（客户端也有一份：`client/src/data/levelQiTable.json`）。

### 9.3 属性加点与派生战斗属性

加点 API：`POST /api/game/actions/allocate-stats`

规则：

- 请求体可以包含：`{ str, agi, vit, int, spi }`（非负整数）
- 总点数必须 > 0 且不超过 `state.statPoints`
- 扣点并叠加到 `state.baseStats`，然后刷新派生属性：`refreshDerivedStats(state)`

派生属性计算：`server/src/systems/stats.ts`。

设计特点：

- 不使用"等级系数"，角色成长主要来自"每级 5 点自由加点"；
- 线性公式、整数面板，便于平衡与理解；
- 装备会对：
  - 基础属性：以"绿字"形式加到基础属性后再计算派生（打造装备特性）
  - 战斗属性：最终额外叠加到派生结果上（数值相加）

仓库内也有一份"概念设计表"说明属性影响：`属性影响关系.md`（注意：该文件与 `server/src/systems/stats.ts` 的具体系数并不完全一致，属于设计文档/历史参考）。

### 9.4 疗伤（恢复生命）

API：`POST /api/game/actions/heal`

规则：

- 生命已满 → 失败
- 灵气不足 15 → 失败
- 消耗灵气：15~25（不超过当前灵气）
- 治疗量：`cost * (1.2 ~ 1.8)`，向下取整
- 写入日志：`疗伤：消耗灵气 X，生命 +Y ...`

实现：`server/src/systems/actions.ts`。

### 9.5 物品系统（背包/装备/使用）

#### 9.5.1 数据模型

服务端：`server/src/types/item.ts`；客户端：`client/src/types/item.ts`。

- `Item.type`：`equipment | consumable | material`
- `inventory`：固定 20 格（`(Item|null)[]`）
- `equipment`：6 槽位：`weapon/helmet/armor/leggings/boots/accessory`

#### 9.5.2 背包规则

实现：`server/src/systems/items.ts`。

- 背包固定大小 20：不足补 `null`，超出截断；
- 可堆叠：消耗品/材料同 `templateId` 尝试堆叠（最大 99）；
- 背包满则添加失败；
- 支持重排：`reorderItems(state, itemIds, allowDiscard)`
  - `itemIds` 长度会被归一到 20
  - `allowDiscard=true` 时，未包含的物品会被销毁并写日志

#### 9.5.3 装备/卸下规则

API：

- `POST /api/game/items/equip`：从背包装备到槽位
- `POST /api/game/items/unequip`：从槽位卸回背包

规则要点：

- 装备检查：`state.level >= item.requiredLevel`；
- 装备时如槽位已有装备，会先尝试把旧装备放回背包空格（否则失败）；
- 每次装备/卸下都会刷新派生属性；
- 都会写事件日志（"装备/卸下/无法装备原因"等）。

#### 9.5.4 使用消耗品

API：`POST /api/game/items/use`

实现：`server/src/systems/items.ts` 中 `useConsumable`。

目前效果类型：

- `heal`：恢复生命
- `mana`：恢复法力
- `buff`：仅记录日志（TODO：buff 系统）
- `stat`：仅记录日志（TODO：永久属性提升）

使用后：堆叠 `-1`，降到 0 则移除。

### 9.6 装备模板与数值生成（核心"掉落/打造"逻辑）

#### 9.6.1 数据来源（JSON）

位于 `server/data/`：

- `equipment.json`：装备模板（武器 21，防具 105；总计 126，6 槽位各 21）
- `itemConfig.json`：装备数值基准与随机范围系数（按 tier）
- `consumables.json`：消耗品模板（当前 3 个）
- `materials.json`：材料模板（当前 2 个）

#### 9.6.2 装备等级段（模板 ID 约定）

装备模板用 `templateId` 的后缀三位数字表达"等级段"：

- `*_001`：1~4 级段（需求等级会被解释为 0）
- `*_005`：5~9 级段
- `*_010`：10~14 级段
- ... 一直到 `*_100`

计算函数：`getRequiredLevelFromTemplateId`（`server/src/services/itemService.ts`）。

#### 9.6.3 "tier"概念（用于平衡与文案）

`itemConfig.json` 的 `tierBase` 用 tier（1..21）作为键；tier 与模板后缀关系：

- `_001` → tier 1
- `_005` → tier 2
- `_010` → tier 3
- ...
- `_100` → tier 21

对应函数：`getTierFromTemplateId`（`server/src/services/itemService.ts`）。

#### 9.6.4 运行时校验与"自动修正范围"

服务端启动加载 `equipment.json` 时，会调用 `validateEquipmentData(...)`：

- 校验每个模板槽位与属性类型是否匹配（例如靴子必须只有 `spd`）
- 关键点：会按 `itemConfig.json` 规则计算期望区间，并覆盖模板里的 `combatStats.min/max`
  - 这意味着：**JSON 里写的 min/max 更像占位/参考，运行时以规则计算为准**。

实现：`server/src/services/itemService.ts`。

#### 9.6.5 随机生成装备（system / crafted）

实现：`server/src/services/ItemGenerator.ts`。

生成流程概述：

1. 输入 `level` → 映射到等级段（1,5,10...）→ 选出匹配后缀的模板；
2. 若找不到对应段，会向下寻找最近可用段；
3. 用模板的 `combatStats` 生成属性：
   - 对"副属性"（头盔/护腿/饰品的第二条）按概率跳过：
     - `systemChance = 0.2`
     - `craftedChance = 0.6`
   - 数值区间：按 `itemConfig.json` 的倍率做浮动。
4. 若是打造装备（`source=crafted`）：
   - 可能出现"绿字基础属性"（`baseStats`），由 `equipment.json` 的 `baseAffixConfig` 控制；
   - 绿字有一定概率为负数（`negativeChance`，默认 0.18）；
   - 描述会追加"（打造装备）"。

#### 9.6.6 装备文案（名称/描述 Lore）

当模板未填写 name/description 或为空时，会按 tier 自动生成带"修仙味"的文案：

- `TIER_EPITHETS`（21 个前缀：青霭、玄铁、灵木...大道）
- `TIER_LORE`（每 tier 一句简短背景）
- 不同槽位对应不同名词（武器会按法系/物系选择"法杖/拂尘/长剑/战刀"等）

实现：`server/src/services/equipmentLore.ts`。

### 9.7 管理员功能（GM 工具）

#### 9.7.1 赠送物品

API：`POST /api/game/admin/give-item`

支持参数：

- 目标：`targetUserId` 或 `targetCharacterId`（二选一）
- 物品：`itemType`（可选），`templateId`（可选，装备才有意义），`slot`（可选），`level`（可选）
- 装备来源：`crafted: boolean`（可选，装备才有意义）

逻辑：

- 如果给的是装备且指定 `templateId`，则按模板生成；否则按槽位/来源随机；
- 生成后塞入目标背包（满则失败）；
- 会把"获得 xxx"日志替换成更详细的"管理员赠送"日志；
- 保存并通过 WebSocket 推送更新。

#### 9.7.2 赠送经验（灵气）

API：`POST /api/game/admin/give-exp`

- 目标：同上
- 数量：`amount > 0`

---

## 10. HTTP API 说明（含用途与典型错误）

### 10.1 认证（无需登录态）

- `POST /api/auth/register`：注册（用户名 3-20，密码 ≥6）
- `POST /api/auth/login`：登录

响应会返回：`token` 与 `user`（含 `isAdmin`）。

### 10.2 游戏（需要 `Authorization: Bearer <token>`）

- `GET /api/game/state`：获取状态（包含派生属性刷新）
- `POST /api/game/character/create`
- `POST /api/game/character/rename`
- `POST /api/game/actions/heal`
- `POST /api/game/actions/levelup`
- `POST /api/game/actions/allocate-stats`
- `POST /api/game/items/equip`
- `POST /api/game/items/unequip`
- `POST /api/game/items/use`
- `GET /api/game/items/templates`
- `POST /api/game/items/reorder`
- `POST /api/game/admin/give-item`（管理员）
- `POST /api/game/admin/give-exp`（管理员）

### 10.3 其他

- `GET /health`：健康检查（无需鉴权）

---

## 11. WebSocket 事件（实时推送）

服务端只要调用 `updateUserGameState`，且该用户当前有活跃 socket，就会广播：

- `game:state`：`{ state: <clientState> }`

客户端在 `useGameState` 中监听并直接 `setState(data.state)`：`client/src/hooks/useGameState.ts`。

补充：服务端也监听了 `game:action`（客户端→服务端），但目前只是回一个 `game:action:response` 占位消息，主玩法动作仍以 REST API 为主：`server/src/index.ts`。

---

## 12. 客户端 UI/交互说明（按功能拆解）

### 12.1 页面流转

入口：`client/src/App.tsx`

- 未登录：展示 `Login`
- 已登录但未创建角色（`name === '无名修士'`）：展示 `CharacterCreation`
- 已创建角色：展示主界面（状态栏、日志、操作、可打开的控制面板）

### 12.2 面板系统（可拖拽窗口）

- 面板类型：`bag | stats | settings | admin`（`client/src/types/panel.ts`）
- 面板管理：`ModalManager`（打开/关闭/置顶/更新位置）
- 面板容器：`ControlModal`（点击标题区域拖拽）

### 12.3 背包面板（拖拽换位 + 右键操作）

组件：`client/src/components/Inventory.tsx`

- 20 格固定展示；
- 支持：
  - 点击选择后再点击目标格实现交换/移动
  - 鼠标拖拽（含长按/拖拽状态覆盖层）
  - 右键弹出行为（在实现中会走 `MessageProvider` 之类的确认/提示）
- 与服务端联动：最终通过 `POST /api/game/items/reorder` 提交新的顺序。

### 12.4 物品卡与 Tooltip

组件：`client/src/components/ItemCard.tsx`

- 悬浮展示：名称、等级、槽位、堆叠、装备属性、绿字基础属性、描述；
- 装备显示"需求等级"并在角色等级不足时高亮提示；
- 左键默认行为：装备（装备类）/使用（消耗品类）；
- 右键默认行为：卸下（已装备）/使用（消耗品）。

### 12.5 人物属性面板（升级 + 加点）

组件：`client/src/components/MainStatus.tsx`

- 显示基础属性与战斗属性；
- 支持加点（+/-）与一次性提交；
- 显示灵气进度并支持升级；
- 支持复制 `characterId`（便于管理员按角色 ID 发放物品）。

### 12.6 管理员面板（赠送物品/经验）

组件：`client/src/components/AdminGiveItem.tsx`

- 目标：输入"角色ID"（`characterId`）
- 赠送物品：可选类型（装备/消耗品/材料/随机），装备可选具体模板，可勾选"打造装备"
- 赠送经验：输入灵气数量
- 装备模板列表来源：`GET /api/game/items/templates`

### 12.7 消息系统（Toast/Confirm/Alert）

组件：`client/src/components/MessageProvider.tsx`

- `toast(text)`：短提示
- `confirm(body)`：确认弹窗（支持 danger）
- `alert(body)`：提示弹窗

---

## 13. 重要平衡参数清单（给策划/数值）

### 13.1 升级灵气表

- 服务端：`server/data/levelQiTable.json`
- 客户端：`client/src/data/levelQiTable.json`

### 13.2 装备数值基准与随机系数

文件：`server/data/itemConfig.json`

- `tierBase[tier]`：每个 tier 对应的基准值（pdmg/mdmg/pdef/mdef/spd/hit/maxHp/maxMp）
- `secondary`：副属性出现概率与副属性缩放
- `crafted`：打造装备的随机倍率

### 13.3 战斗配置（目前未接入主流程）

文件：`server/src/config.ts` → `BATTLE_CONFIG`。

---

## 14. 已知限制 / 注意事项（避免踩坑）

- 当前探索玩法在前端显示为"正在开发"，服务端不再提供 `/api/game/actions/tick`。
- 战斗系统 `autoBattle` 已存在，但没有事件系统把它串起来；后续若要做"探索遇怪→战斗→掉落"，建议以 `server/src/systems/battle.ts` 为核心接入。
- `lingshi`（灵石）目前主要用于死亡惩罚与 UI 展示，尚未有产出/消耗路径（除管理员赠送物品外）。
- Buff/永久加成类消耗品效果是 TODO（当前只记录日志）。
- 管理员标记没有 API，只能手工设置数据库字段 `users.is_admin`。

---

## 15. Roadmap（建议的下一步接入顺序）

如果你要在 ChatGPT 里"项目化管理"，下面是最顺滑的推进顺序（基于仓库现状）：

1. 接回探索主循环：新增探索 API（例如恢复 `/actions/tick` 或设计新接口），用于真正执行事件。
2. 接入战斗：探索 → 随机妖兽（`BEASTS`）→ `autoBattle` → 胜负结算与掉落。
3. 掉落与经济：战斗奖励（灵气/灵石/物品），完善材料用途（打造/强化）。
4. Buff 系统：让 `consumable.effect.type=buff/stat` 真正影响战斗与面板。
5. 运营工具：管理员 UI 增加"查询用户/角色列表""一键设管理员"（谨慎）。
