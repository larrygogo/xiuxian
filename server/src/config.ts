// 服务器与游戏配置，保持集中管理方便统一调整
export const PORT = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const JWT_EXPIRES_IN = "7d";

// 数据库配置
export const DB_PATH = process.env.DB_PATH || "./game.db";

// 游戏配置（兼容旧字段）
export const SAVE_FILE = "save.json";

// tick 间隔（毫秒）
export const TICK_MS = 5000;

// 等级体系
export const LEVEL_MAX = 100;
export const QI_NEED_BASE = 30;
export const QI_NEED_STEP = 6;
export const QI_PER_TICK_BASE = 1;
export const QI_PER_TICK_STEP = 0.05;
export const MISHAP_BASE = 0.008;
export const MISHAP_STEP = 0.00004;
export const LEVEL_SCALE_STEP = 0.015;

// 挂机“天”的概念（用于事件限流/刷新）
export const TICKS_PER_DAY = 120;


// 探索事件素材
export const BEASTS = ["山魈", "血狼", "妖蛇", "腐尸", "黑熊精"] as const;

// 回合制战斗配置
export const BATTLE_CONFIG = {
  baseHit: 0.75,
  minHit: 0.15,
  maxHit: 0.95,
  hitScale: 0.002,
  baseCrit: 0.05,
  minCrit: 0.01,
  maxCrit: 0.5,
  critScale: 0.002,
  baseCc: 0.05,
  minCc: 0.01,
  maxCc: 0.35,
  ccScale: 0.002,
  baseStatus: 0.05,
  minStatus: 0.01,
  maxStatus: 0.45,
  statusScale: 0.002,
  defenseK: 60,
  maxDr: 0.7,
  maxRounds: 20,
  dotTurns: 2,
  dotRatio: 0.08
} as const;

// 单次 tick 最多推进多少个小阶段（避免连跳）
export const STEP_UP_LIMIT_PER_TICK = 2;
