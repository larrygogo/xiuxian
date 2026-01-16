"use strict";

module.exports = {
  // 服务器配置
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: "7d",

  // 数据库配置
  DB_PATH: process.env.DB_PATH || "./game.db",

  // 游戏配置（从原 config.js 迁移）
  SAVE_FILE: "save.json", // 保留用于兼容，实际使用数据库

  // tick 间隔（毫秒）
  TICK_MS: 5000,

  // 境界/阶段
  REALMS: ["练气", "筑基", "金丹", "元婴", "化神"],
  PHASE_NAMES: ["前期", "中期", "后期"],
  MAX_LEVEL: 9,

  // 每 tick 修炼基础灵气（按境界）
  BASE_QI_PER_TICK: [1, 1, 0, 0, 0],

  // 挂机"天"的概念（用于事件限流/刷新）
  TICKS_PER_DAY: 120,

  // 离线收益折扣（推荐 0.2~0.5）
  OFFLINE_FACTOR: 0.35,

  // 每日离线收益上限（按自然日，每个自然日最多获得）
  OFFLINE_DAILY_QI_LIMIT: 1000,    // 每日最多灵气
  OFFLINE_DAILY_HERB_LIMIT: 20,    // 每日最多灵草

  // 探索事件素材
  BEASTS: ["山魈", "血狼", "妖蛇", "腐尸", "黑熊精"],

  // 单次 tick 最多推进多少个小阶段（避免连跳）
  STEP_UP_LIMIT_PER_TICK: 2
};
